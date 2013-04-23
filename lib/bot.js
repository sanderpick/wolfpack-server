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
 * Handle email replies.
 */
function parse(env, mail) {
  var re = 'development' === env ? 
      /^dev_notifications\+([a-z0-9]{24})@grr\.io$/i:
      /^notifications\+([a-z0-9]{24})@grr\.io$/i

  var from_id;
  _.each(mail.to, function (to) {
    from_id = to.address.match(re) || from_id;
  });
  if (!from_id)
    return util.log('Unrecognized mail: ' + util.inspect(mail));

  var lastline = mail.text.match(/^(.*wrote:\n)/im);
  var body = lastline ?
      mail.text.substr(0, mail.text.indexOf(lastline[1])).trim():
      mail.text;

  Users.findOne({_id: new ObjectID(from_id[1])}, function (err, user) {
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
        _.each(teams, function (team) {

          // Notify the team owner of the update.
          Users.findOne({_id: team.user_id}, function (err, owner) {
            if (err) return util.error(err);
            if (!owner)
              return util.log('Team owner not found : ' + util.inspect(team));
            send.update(doc, user, owner, team);
            util.log('Sent an update from '
                + user.username + ' to ' + owner.username);
          });

        });
      });

    });
  
  });
}

exports.init = function (app) {

  var username = 'development' === app.get('env') ?
      'dev_notifications@grr.io': 'notifications@grr.io';

  // Listen for new mail.
  var notifier = new Notifier({
    username: username,
    password: 'w0lfpackm0d3',
    host: 'imap.gmail.com',
    port: 993,
    secure: true
  })
  .on('open', function () {
    util.log('Opened INBOX ' + username);
  })
  .on('error', function (err) { util.error(err); })
  .on('mail', _.bind(parse, this, app.get('env')));

  notifier.start();

}