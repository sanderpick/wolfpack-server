/*
 * bot.js: Listen for email updates and handle forwarding.
 *
 */

// Module Dependencies
var ObjectID = require('mongodb').BSONPure.ObjectID;
var listener = require('mail-notifier2');
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
function parse(mail) {
  var re = /^notifications\+([a-z0-9]{24})@grr\.io$/i;
  var match;
  _.each(mail.to, function (to) {
    match = to.address.match(re) || match;
  });

  if (match) {
    var last = mail.text.match(/^(.*wrote:\n)/im)[1];
    var body = last ?
        mail.text.substr(0, mail.text.indexOf(last)).trim():
        mail.text;
    
    Users.findOne({_id: new ObjectID(match[1])}, function (err, user) {

      // Save it.
      Mails.create({
        body: body,
        subject: mail.subject,
        user_id: user._id
      }, function (err, doc) {
        if (err)
          return util.error(err);

        // Find any teams that this user is on.
        Teams.find({}).toArray(function (err, teams) {
          _.each(teams, function (team) {
            if (!team.users) return;
            var on = _.find(team.users, function (u) {
              return u.username === user.username;
            });
            if (!on) return;

            // Notify the team owner of the update.
            Users.findOne({_id: team.user_id}, function (err, owner) {
              send.notify(doc, user, owner, team);
            });

          });
        });

      });
    
    });
  }
}

// Listen for new mail.
listener({
  username: 'notifications@grr.io',
  password: 'w0lfpackm0d3',
  host: 'imap.gmail.com',
  port: 993,
  secure: true
}).on('mail', parse).start();