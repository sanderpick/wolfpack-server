/*
 * bot.js: Listen for email updates and handle forwarding.
 *
 */

// Module Dependencies
var ObjectID = require('mongodb').BSONPure.ObjectID;
var Notifier = require('mail-notifier2');
var util = require('util');
var Step = require('step');
var _ = require('underscore');
_.mixin(require('underscore.string'));
var Users = require('./db.js').Users;
var Teams = require('./db.js').Teams;
var Mails = require('./db.js').Mails;
var send = require('./send');

/*
 * Parse incoming mail.
 */
function parse(env, mail) {
  var re = 'development' === env ? 
      /^dev_notifications\+([a-z0-9]{24})?([a-z0-9]{24})?([a-z]+)@grr\.io$/i:
      /^notifications\+([a-z0-9]{24})?([a-z0-9]{24})?([a-z]+)@grr\.io$/i

  // Match the "to" address.
  var match;
  _.each(mail.to, function (to) {
    match = to.address.match(re) || match;
  });
  if (!match)
    return util.log('Unrecognized mail: ' + util.inspect(mail));

  // Get the token and directive.
  var tokens = [];
  for (var i=1; i < match.length-1; ++i)
    tokens.push(match[i]);
  var directive = match[3];

  // Get the mail body.
  var last = mail.text.match(/^(.*wrote:\n)/im);
  var body = last ?
      mail.text.substr(0, mail.text.indexOf(last[1])).trim():
      mail.text;

  // Choose action from directive.
  var fn;
  switch (directive) {
    case 'i':
      if (tokens.length === 2)
        fn = invite;
      break;
    case 'morning': fn = update; break;
  }

  // Handle the action.
  if (!fn)
    return util.log('Invalid mail action: ' + util.inspect(mail));
  fn(tokens, mail, body);

}

/*
 * Handle mail updates.
 */
var update = function (tokens, mail, body) {

  Users.read({email: mail.from[0].address}, function (err, user) {
    if (err) return util.error(err);
    if (!user)
      return util.log('User not found : ' + util.inspect(mail));

    // Save it.
    Mails.create({
      body: body,
      subject: mail.subject,
      user_id: user._id
    }, function (err, doc) {
      if (err) return util.error(err);

      // Find any teams that this user is on.
      var query = {};
      query['users.' + user.username] = {$exists: true};
      Teams.find(query).toArray(function (err, teams) {
        if (err) return util.error(err);

        // Notify team co-members.
        _.each(teams, function (team) {
          _.each(team.users, function (u, un) {
            if (un === user.username) return;
            Users.read({_id: u._id}, function (err, mem) {
              if (err) return util.error(err);
              if (!mem)
                return util.log('Team member not found : '
                    + util.inspect(team));
              send.update(doc, user, mem, team);
              util.log('Sent an update from '
                  + user.username + ' to ' + mem.username);
            });
          });
        });
      });

    });
  
  });

}

/*
 * Handle team mail invites.
 */
var invite = function (tokens, mail, body) {

  Users.read({_id: new ObjectID(tokens[0])}, function (err, inviter) {
    if (err) return util.error(err);
    if (!inviter)
      return util.log('Inviter not found : ' + util.inspect(mail));

    Users.read({email: mail.from[0].address}, function (err, invitee) {
      if (err) return util.error(err);
      if (!invitee)
        return util.log('Invitee not found : ' + util.inspect(mail));

      // Find the team only if the inviter is a member and the invitee is not.
      var query = {_id: new ObjectID(tokens[1])};
      query['users.' + inviter.username] = {$exists: true};
      query['users.' + invitee.username] = {$exists: false};
      Teams.read(query, function (err, team) {
        if (err) return util.error(err);
        if (!team)
          return util.log('Team not found, inviter insufficient privileges,'
              + ' or invitee already member: ' + util.inspect(mail));

        // Determine user response.
        var re = /\bno\b/g;
        if (re.test(body))
          return send.declined(inviter, invitee, team);

        // User accepted.
        props = {};
        props['users.' + invitee.username] = {
          _id: invitee._id,
          updates: {daily: true, micro: false},
          recaps: {daily: true, weekly: true}
        };
        Teams.update({_id: team._id}, {$set: props}, function (err, stat) {
          if (err) return util.error(err);
          send.accepted(inviter, invitee, team);
          util.log('Added ' + invitee.username + ' to ' + team.name);
        });

      });

    });

  });

}

/*
 * Initialize and start notifier.
 */
exports.init = function (app) {

  var username = 'development' === app.get('env') ?
      'dev_notifications@grr.io': 'notifications@grr.io';

  // Listen for new mail.
  var notifier;
  (function connect() {
    notifier = new Notifier({
      username: username,
      password: 'w0lfpackm0d3',
      host: 'imap.gmail.com',
      port: 993,
      secure: true
    })
    .on('open', function () {
      util.log('Opened INBOX ' + username);
    })
    .on('mail', _.bind(parse, this, app.get('env')))
    .on('error', function (err) { util.error(err); })
    .on('end', function () {
      util.log('[bot] Reconnecting...');
      connect();
    }).start();
  })();

}