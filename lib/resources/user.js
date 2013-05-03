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
var db = require('../db.js');
var send = require('../send');

/* e.g.,
  {
    username: 'eightysteele',
    email: 'eightysteele@gmail.com',
    password: <hash>,
    invite: '<String>',
    status: 'pending || confirmed',
    created: <ISODate>,
    updated: <ISODate>,
    _id: <ObjectID>,
  }
*/

/*
 * Error wrap request response.
 */
function error(err, res, data, estr) {
  if (typeof data === 'string') {
    estr = data;
    data = null;
  }
  if (err)
    return res.send(500, {error: 'server error'});
  else if (!data && estr)
    return res.send(404, {error: estr + ' not found'});
  else return false;
}

/*
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
    db.Users.find({}).toArray(function (err, users) {
      if (error(err, res)) return;
      res.send({users: _.pluck(users, 'username')});
    });
  });

  // create
  app.post('/users/:un', function (req, res) {
    var salt = Math.round((new Date().valueOf() * Math.random())) + '';
    db.Users.create({
      username: req.params.un,
      email: req.body.email,
      password: db.encrypt(req.body.password, salt),
      salt: salt,
      status: 'pending',
      invite: getInvite()
    }, function (err, doc) {
      if (error(err, res)) return;
      send.welcome(doc, app.get('env'));
      res.send(doc);
    });
  });

  // read
  app.get('/users/:un', function (req, res) {
    db.Users.read({username: req.params.un}, function (err, doc) {
      if (error(err, res, doc, 'user')) return;
      res.send(doc);
    });
  });

  // update
  app.put('/users/:un', function (req, res) {
    db.Users.update({username: req.params.un}, {$set: req.body},
        function (err, stat) {
      if (error(err, res, stat, 'user')) return;
      res.send({updated: true});
    });
  });

  // delete
  app.delete('/users/:un', function (req, res) {
    db.Users.delete({username: req.params.un}, function (err, stat) {
      if (error(err, res, stat, 'user')) return;
      res.send({deleted: true});
    });
  });

  // available
  app.get('/users/:un/available', function (req, res) {
    db.Users.available({username: req.params.un}, function (err, available) {
      if (error(err, res)) return;
      res.send({available: available});
    });
  });

  // confirm
  app.post('/users/:un/confirm', function (req, res) {
    db.Users.read({username: req.params.un}, function (err, doc) {
      if (error(err, res, doc, 'user')) return;
      if (doc.invite === req.body.invite)
        db.Users.update({_id: doc._id}, {$set: {
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
    db.Users.update({username: req.params.un}, {$set: {
      password: db.encrypt(req.body.password, salt),
      salt: salt
    }}, function (err, doc) {
      if (error(err, res, doc, 'user')) return;
      res.send({forgot: true});
    });
  });

  // auth
  app.get('/auth', function (req, res) {
    var basic = req.headers.authorization.split(' ')[1];
    var parsed = new Buffer(basic, 'base64').toString('ascii').split(':');
    var username = parsed[0], password = parsed[1];
    db.Users.read({username: username}, function (err, doc) {
      if (error(err, res, doc, 'user')) return;
      if (db.encrypt(password, doc.salt) !== doc.password)
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

  /*
   * Send an email to all users every morning.
   */
  var mornings = new Job('00 8 * * 1-5', function () {
    db.Users.list({}, function (err, users) {
      _.each(users, function (user) {
        send.morning(user, app.get('env'));
      });
    });
    util.log('Sent the morning mail');
  },
  function () {}, true, 'America/Los_Angeles');

  /*
   * Gather team reports at lunchtime.
   * TODO create user config setting for t.o.d.
   */
  var reports = new Job('00 13 * * 1-5', function () {
    
    // Date for query ... we only want updates from today.
    var date = new Date(Date.now() - (12*60*60*1000));

    db.Users.list({}, function (err, users) {
      _.each(users, function (user) {
        var query = {};
        query['users.' + user.username] = {$exists: true};
        db.Teams.list(query, function (err, teams) {
          var next = _.after(teams.length, function () {
            send.report(user, teams, app.get('env'));
          });
          _.each(teams, function (team) {
            delete team.users[user.username];
            var user_ids = _.map(team.users, function (u) {
              return u._id;
            });
            db.Mails.list({user_id: {$in: user_ids}, created: {$gte: date}},
                {sort: {created: 1}, inflate: true, ensure: ['user']},
                function (err, mails) {
              team.mails = mails;
              next();
            });
          });

        });
      });
    });
    util.log('Sent the updates');
  },
  function () {}, true, 'America/Los_Angeles');

  util.log('Started scheduled jobs for Users resource');

}