/*
 * user.js: Handling for the users resource.
 *
 */

// Module Dependencies
var Users = require('../db.js').Users;
var encrypt = require('../db.js').encrypt;
var Job = require('cron').CronJob;
var notifier = require('mail-notifier');
var util = require('util');
var Step = require('step');
var _ = require('underscore');
_.mixin(require('underscore.string'));
var email = require('../email');

/* e.g.,
  {
    username: 'eightysteele',
    email: 'eightysteele@gmail.com',
    password: <hash>,
    created : <ISODate>,
    _id: <ObjectID>,
  }
*/

// Define routes.
exports.routes = function (app) {

  // create
  app.post('/users/:un', function (req, res) {
    var salt = Math.round((new Date().valueOf() * Math.random())) + '';
    Users.create({
      username: req.params.un,
      email: req.body.email,
      password: encrypt(req.body.password, salt),
      salt: salt
    }, function (err, doc) {
      res.send(doc);
    });
  });

  // read
  app.get('/users/:un', function (req, res) {
    Users.read({username: req.params.un}, function (err, doc) {
      res.send(doc);
    });
  });

  // update
  app.put('/users/:un', function (req, res) {
    Users.update({username: req.params.un}, req.body,
                function (err, doc) {
      res.send(doc);
    });
  });

  // delete
  app.delete('/users/:un', function (req, res) {
    Users.delete({username: req.params.un}, function (err) {
      res.send(true);
    });
  });

  // available
  app.get('/users/:un/available', function (req, res) {
    Users.available({username: req.params.un}, function (err, available) {
      res.send({available: available});
    });
  });

  // auth
  app.get('/auth', function (req, res) {
    var basic = req.headers.authorization.split(' ')[1];
    var parsed = new Buffer(basic, 'base64').toString('ascii').split(':');
    var username = parsed[0], password = parsed[1];
    Users.read({username: username}, function (err, doc) {
      if (err)
        res.send(500, {error: 'server error'});
      else if (!doc)
        res.send(404, {error: username + ' not found'});
      else if (encrypt(password, doc.salt) !== doc.password)
        res.send(401, {error: 'Authorization failed with'
                            + ' the provided credentials.'});
      else
        res.send({user: username, authorized: true, role: 'user'});
    });
  });

  // forgot
  app.post('/users/:un/forgot', function (req, res) {
    var salt = Math.round((new Date().valueOf() * Math.random())) + '';
    Users.update({username: req.params.un}, {
      password: encrypt(req.body.password, salt),
      salt: salt
    }, function (err, doc) {
      res.send(doc);
    });
  });

}

// Scheduled tasks.
exports.jobs = function (cb) {

  // Send an email to all users every morning.
  var mornings = new Job('00 10 * * 1-5', function () {
    Users.find({}).toArray(function (err, users) {
      _.each(users, function (user) {
        email.morning(user, function () {
          console.log('Emailing ' + user.username + '');
        });
      });
    });
  },
  function () {}, true, 'America/Los_Angeles');
  util.log('Started scheduled jobs for `Users`.');

}