/*
 * user.js: Handling for the users resource.
 *
 */

// Module Dependencies
var Job = require('cron').CronJob;
var util = require('util');
var Step = require('step');
var _ = require('underscore');
_.mixin(require('underscore.string'));
var Users = require('../db.js').Users;
var encrypt = require('../db.js').encrypt;
var send = require('../send');

/* e.g.,
  {
    username: 'eightysteele',
    email: 'eightysteele@gmail.com',
    password: <hash>,
    invite: '<String>',
    status: 'pending || confirmed',
    created : <ISODate>,
    _id: <ObjectID>,
  }
*/

/**
  * Generate invite codes.
  */
function getInvite() {

  // Random strings.
  function frag(len) {
    var f = '';
    var p = '0123456789abcdef0123456789';
    for (var i = 0; i < len; ++i)
      f += p.charAt(Math.floor(Math.random() * p.length));
    return f;
  }

  // Join em.
  return [frag(8), frag(4), frag(4), frag(4), frag(12)].join('-');
}

// Define routes.
exports.routes = function (app) {

  // list
  app.get('/users', function (req, res) {
    Users.find({}).toArray(function (err, users) {
      if (err)
        return res.send(500, {error: 'server error'});
      res.send({users: _.pluck(users, 'username')});
    });
  });

  // create
  app.post('/users/:un', function (req, res) {
    var salt = Math.round((new Date().valueOf() * Math.random())) + '';
    Users.create({
      username: req.params.un,
      email: req.body.email,
      password: encrypt(req.body.password, salt),
      salt: salt,
      status: 'pending',
      invite: getInvite()
    }, function (err, doc) {
      if (err)
        return res.send(500, {error: 'server error'});
      send.welcome(doc, app.get('env'));
      res.send(doc);
    });
  });

  // read
  app.get('/users/:un', function (req, res) {
    Users.read({username: req.params.un}, function (err, doc) {
      if (err)
        res.send(500, {error: 'server error'});
      else if (!doc)
        res.send(404, {error: 'user not found'});
      else res.send(doc);
    });
  });

  // update
  app.put('/users/:un', function (req, res) {
    Users.update({username: req.params.un}, {$set: req.body},
        function (err, stat) {
      if (err)
        res.send(500, {error: 'server error'});
      else if (!stat)
        res.send(404, {error: 'user not found'});
      else res.send({updated: true});
    });
  });

  // delete
  app.delete('/users/:un', function (req, res) {
    Users.delete({username: req.params.un}, function (err, stat) {
      if (err)
        res.send(500, {error: 'server error'});
      else if (!stat)
        res.send(404, {error: 'user not found'});
      else res.send({deleted: true});
    });
  });

  // available
  app.get('/users/:un/available', function (req, res) {
    Users.available({username: req.params.un}, function (err, available) {
      if (err)
        return res.send(500, {error: 'server error'});
      res.send({available: available});
    });
  });

  // confirm
  app.post('/users/:un/confirm', function (req, res) {
    Users.read({username: req.params.un}, function (err, doc) {
      if (err)
        return res.send(500, {error: 'server error'});
      else if (!doc)
        res.send(404, {error: 'user not found'});
      else if (doc.invite === req.body.invite)
        Users.update({_id: doc._id}, {$set: {
          status: 'confirmed'
        }}, function (err, doc) {
          if (err)
            return res.send(500, {error: 'server error'});
          res.send({confirmed: true});
        });
      else
        res.send(401, {error: 'Confirmation failed with'
                            + ' the provided credentials.'});
    });
  });

  // forgot
  app.post('/users/:un/forgot', function (req, res) {
    var salt = Math.round((new Date().valueOf() * Math.random())) + '';
    Users.update({username: req.params.un}, {$set: {
      password: encrypt(req.body.password, salt),
      salt: salt
    }}, function (err, doc) {
      if (err)
        res.send(500, {error: 'server error'});
      else if (!stat)
        res.send(404, {error: 'user not found'});
      else res.send({forgot: true});
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
        res.send(404, {error: 'user not found'});
      else if (encrypt(password, doc.salt) !== doc.password)
        res.send(401, {error: 'Authorization failed with'
                            + ' the provided credentials.'});
      else if ('confirmed' !== doc.status)
        res.send(403, {error: 'Account not confirmed.'});
      else
        res.send({user: username, authorized: true, role: 'user'});
    });
  });

}

// Scheduled tasks.
exports.jobs = function (app) {

  // Send an email to all users every morning.
  var mornings = new Job('45 10 * * 1-5', function () {
    Users.find({}).toArray(function (err, users) {
      _.each(users, function (user) {
        send.morning(user, app.get('env'));
      });
    });
    util.log('Sent the morning mail');
  },
  function () {}, true, 'America/Los_Angeles');
  util.log('Started scheduled jobs for Users');

}