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

/**
 * Send an email.
 * @param object options
 * @param object template
 * @param function cb
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

/**
 * Send the welcome mail for a new user.
 * @param object user
 * @param function cb
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

/**
 * Send a team invite to a user.
 * @param object inviter
 * @param object invitee
 * @param object team
 * @param string env
 * @param function cb
 */
exports.invite = function (inviter, invitee, team, env, cb) {
  var pre = 'development' === env ? 'dev_notifications+': 'notifications+';
  send({
    to: invitee.email,
    from: defaults.from,
    'reply-to': pre + inviter._id.toString()
        + team._id.toString() + 'i@grr.io',
    subject: '[Wolfpack] ' + inviter.username
        + ' wants to add you to team "' + team.name + '"',
  }, {
    file: 'invite.jade',
    html: true,
    locals: {}
  }, cb || function(){});
}

/**
 * Notify inviter that invitee accepted a team invite.
 * @param object inviter
 * @param object invitee
 * @param object team
 * @param function cb
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

/**
 * Notify inviter that invitee declined a team invite.
 * @param object inviter
 * @param object invitee
 * @param object team
 * @param function cb
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

/**
 * Send the morning mail.
 * @param object user
 * @param string env
 * @param function cb
 */
exports.morning = function (user, env, cb) {
  var pre = 'development' === env ? 'dev_notifications+': 'notifications+';
  send({
    to: user.email,
    from: defaults.from,
    'reply-to': pre + 'morning@grr.io',
    subject: '[Wolfpack] Good Morning, ' + user.username,
  }, {
    file: 'morning.jade',
    html: true,
  }, cb || function(){});
}

exports.report = function (user, env, cb) {
  var pre = 'development' === env ? 'dev_notifications+': 'notifications+';


  // Find any teams that this user is on.
  var query = {};
  var body = '';
  query['users.' + user.username] = {$exists: true};
  Teams.find(query).toArray(function (err, teams) {
    if (err) return util.error(err);

    // Notify team co-members.
    _.each(teams, function (team) {
      _.each(team.users, function (u, un) {
        if (un === user.username) return;
        // TODOs 
        // Get most recent update from team member 
        // 1. Just append them all to var body
        // 2. Later start to smart fold/order the updates
        // 3. Later later, do the syntax parsing

        //just faking it for testing
        body += "<p> ";
        body += "[Team] " + team.name;
        body += "<br/> ";
        body += "[User] " + user.username;
        body += "</p> ";
      });
    });
  });


  send({
    to: user.email,
    from: defaults.from,
    'reply-to': pre + 'report@grr.io', //I'm not sure the functionality of a 'replay-to' here, but could be useful
    subject: '[Wolfpack] Today\'s report, ' + user.username,
  }, {
    file: 'update.jade',
    html: true,
    locals: {user: 'report@grr.io', body: body}
  }, cb || function(){});
}

/**
 * Notify team owners of an update from that team.
 * @param object mail
 * @param object from
 * @param object to
 * @param object team
 * @param function cb
 */
exports.update = function (mail, from, to, team, cb) {
  var body = mail.body.replace(/\n/g, '<br/>');
  send({
    to: to.email,
    from: defaults.from,
    'reply-to': from.username + ' <' + from.email + '>',
    subject: '[' + team.name + '] ' + mail.subject
  }, {
    file: 'update.jade',
    html: true,
    locals: {user: from, body: body, team: team}
  }, cb || function(){});
}