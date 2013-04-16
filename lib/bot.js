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
function parse(env, mail) {
  var re = 'development' === env ? 
      /^dev_notifications\+([a-z0-9]{24})@grr\.io$/i:
      /^notifications\+([a-z0-9]{24})@grr\.io$/i
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
        var query = {};
        query['users.' + user.username] = {$exists: true};
        Teams.find(query).toArray(function (err, teams) {
          _.each(teams, function (team) {

            // Notify the team owner of the update.
            Users.findOne({_id: team.user_id}, function (err, owner) {
              send.update(doc, user, owner, team);
              util.log('Sent an update from '
                  + user.username + ' to ' + owner.username);
            });

          });
        });

      });
    
    });
  }
}

exports.init = function (app) {

  // Listen for new mail.
  listener({
    username: 'development' === app.get('env') ?
        'dev_notifications@grr.io': 'notifications@grr.io',
    password: 'w0lfpackm0d3',
    host: 'imap.gmail.com',
    port: 993,
    secure: true
  }).on('mail', _.bind(parse, this, app.get('env'))).start();

}