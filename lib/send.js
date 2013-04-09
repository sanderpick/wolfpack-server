/*
 * send.js: Email handling.
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
exports.welcome = function (user, cb) {
  send({
    to: user.email,
    from: defaults.from,
    subject: '[Wolfpack] Welcome',
  }, {
    file: 'welcome.jade',
    html: true,
    locals: {user: user}
  }, cb || function(){});
}

/**
 * Send the morning mail.
 * @param object user
 * @param function cb
 */
exports.morning = function (user, cb) {
  send({
    to: user.email,
    from: defaults.from,
    'reply-to': 'notifications+' + user._id.toString() + '@grr.io',
    subject: '[Wolfpack] Good Morning',
  }, {
    file: 'morning.jade',
    html: true,
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
exports.notify = function (mail, from, to, team, cb) {
  var body = mail.body.replace(/\n/g, '<br/>');
  send({
    to: to.email,
    from: defaults.from,
    'reply-to': from.username + ' <' + from.email + '>',
    subject: '[' + team.name + '] ' + mail.subject
  }, {
    file: 'update.jade',
    html: true,
    locals: {user: from, body: body}
  }, cb || function(){});
}