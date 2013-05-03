/*
 * send.js: Mail handling.
 *
 */

// Module dependencies.
var mailer = require('emailjs');
var jade = require('jade');
var _ = require('underscore');
_.mixin(require('underscore.string'));
var path = require('path');
var Step = require('step');

var SMTP;
var server = {
  user: 'robot@grr.io',
  password: 'w0lfpackm0d3',
  host: 'smtp.gmail.com',
  ssl: true,
};
var defaults = {
  from: 'Wolfpack <robot@grr.io>',
};

/*
 * Get email username based on env.
 * @string env
 */
function prefix(env) {
  return 'development' === env ? 'dev_notifications+': 'notifications+';
}

/*
 * Send an email.
 * @object options
 * @object template
 * @function cb
 */
var send = exports.send = function (options, template, cb) {
  if ('function' === typeof template) {
    cb = template;
    template = false;
  }

  // connect to server
  if (!SMTP)
    SMTP = mailer.server.connect(server);

  // merge options
  _.defaults(options, defaults);
  
  if (template)
    jade.renderFile(path.join(__dirname, '../views', template.file),
        template.locals || {}, function (err, body) {
      if (err) return cb ? cb(): null;
      
      // create the message
      var message;
      if (template.html) {
        message = mailer.message.create(options);
        message.attach_alternative(body);
      } else message = options;
      message.text = body;
      
      // send email
      SMTP.send(message, cb);
    });
  else
    // send email
    SMTP.send(options, cb);
};

/*
 * Send the welcome mail for a new user.
 * @object user
 * @function cb
 */
exports.welcome = function (user, env, cb) {
  send({
    to: user.email,
    from: defaults.from,
    subject: '[Wolfpack] Welcome, ' + user.username,
  }, {
    file: 'welcome.jade',
    html: true,
    locals: {user: user, flags: 'development' === env ? '-d' : ''}
  }, cb || function(){});
}

/*
 * Send a team invite to a user.
 * @object inviter
 * @object invitee
 * @object team
 * @string env
 * @function cb
 */
exports.invite = function (inviter, invitee, team, env, cb) {
  send({
    to: invitee.email,
    from: defaults.from,
    'reply-to': prefix(env) + inviter._id.toString()
        + team._id.toString() + 'i@grr.io',
    subject: '[Wolfpack] ' + inviter.username
        + ' wants to add you to team "' + team.name + '"',
  }, {
    file: 'invite.jade',
    html: true,
    locals: {}
  }, cb || function(){});
}

/*
 * Notify inviter that invitee accepted a team invite.
 * @object inviter
 * @object invitee
 * @object team
 * @function cb
 */
exports.accepted = function (inviter, invitee, team, cb) {
  send({
    to: inviter.email,
    from: defaults.from,
    subject: '[Wolfpack] ' + invitee.username
        + ' accepted your invite to team "' + team.name + '"',
  }, {
    file: 'accepted.jade',
    html: true,
    locals: {}
  }, cb || function(){});
}

/*
 * Notify inviter that invitee declined a team invite.
 * @object inviter
 * @object invitee
 * @object team
 * @function cb
 */
exports.declined = function (inviter, invitee, team, cb) {
  send({
    to: inviter.email,
    from: defaults.from,
    subject: '[Wolfpack] ' + invitee.username
        + ' declined your invite to team "' + team.name + '"',
  }, {
    file: 'declined.jade',
    html: true,
    locals: {}
  }, cb || function(){});
}

/*
 * Send the morning mail.
 * @object user
 * @string env
 * @function cb
 */
exports.morning = function (user, env, cb) {
  send({
    to: user.email,
    from: defaults.from,
    'reply-to': prefix(env) + 'morning@grr.io',
    subject: '[Wolfpack] Good Morning, ' + user.username,
  }, {
    file: 'morning.jade',
    html: true,
  }, cb || function(){});
}

/*
 * Send the lunchtime report.
 * @object user
 * @string env
 * @function cb
 */
exports.report = function (user, teams, env, cb) {
  send({
    to: user.email,
    from: defaults.from,
    'reply-to': prefix(env) + 'report@grr.io',
    subject: '[Wolfpack] Stand-up'
  }, {
    file: 'report.jade',
    html: true,
    locals: {teams: teams}
  }, cb || function(){});
}

// exports.report = function (user, env, cb) {
//   var pre = 'development' === env ? 'dev_notifications+': 'notifications+';

//   // Find any teams that this user is on.
//   var query = {};
//   var body = '';
//   query['users.' + user.username] = {$exists: true};
//   Teams.find(query).toArray(function (err, teams) {
//     if (err) return util.error(err);

//     // Notify team co-members.
//     _.each(teams, function (team) {
//       _.each(team.users, function (u, un) {
//         if (un === user.username) return;
//         // TODOs 
//         // Get most recent update from team member 
//         // 1. Just append them all to var body
//         // 2. Later start to smart fold/order the updates
//         // 3. Later later, do the syntax parsing

//         // Mails.getById ?

//         // just faking it for testing
//         // how to test?
//         body += "<p> ";
//         body += "[Team] " + team.name;
//         body += "<br/> ";
//         body += "[User] " + user.username;
//         body += "</p> ";
//       });
//     });
//   });

//   send({
//     to: user.email,
//     from: defaults.from,
//     'reply-to': pre + 'report@grr.io',
//     subject: '[Wolfpack] Today\'s report, ' + user.username,
//   }, {
//     file: 'update.jade',
//     html: true,
//     locals: {user: 'report@grr.io', body: body}
//   }, cb || function(){});
// }