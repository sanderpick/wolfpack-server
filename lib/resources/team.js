/*
 * team.js: Handling for the teams resource.
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
    name: 'andrewxhill/homies',
    users: {
      eightysteele: {
        _id: <ObjectID>,
        recaps: {
          daily: true,
          weekly: true
        },
        updates: {
          daily: true,
          micro: false
        }
      }
    },
    created: <ISODate>,
    updated: <ISODate>
  }
*/

/**
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

// Define routes.
exports.routes = function (app) {

  // list
  app.get('/teams/:un', function (req, res) {
    db.Users.read({username: req.params.un}, function (err, user) {
      if (error(err, res, user, 'user')) return;
      var query = {};
      query['users.' + user.username] = {$exists: true};
      db.Teams.find(query).toArray(function (err, teams) {
        if (error(err, res)) return;
        _.each(teams, function (team) {
          delete team.created;
          delete team._id;
        });
        res.send({teams: teams});
      });
    });
  });

  // create
  app.post('/teams/:n', function (req, res) {
    var username = req.body.username;

    db.Users.read({username: username}, function (err, user) {
      if (error(err, res, user, 'user')) return;
      var props = {name: req.params.n, users: {}};
      props.users[user.username] = {
        _id: user._id,
        updates: {daily: true, micro: false},
        recaps: {daily: true, weekly: true}
      };
      db.Teams.create(props, function (err, doc) {
        if (error(err, res)) return;
        res.send(doc);
      });
    });

  });

  // read
  app.get('/teams/:n', function (req, res) {

    db.Teams.read({name: req.params.n}, function (err, doc) {
      if (error(err, res, doc, 'team')) return;
      res.send(doc);
    });

  });

  // update
  app.put('/teams/:n', function (req, res) {

    db.Teams.update({name: req.params.n}, {$set: req.body}, function (err, stat) {
      if (error(err, res, stat, 'team')) return;
      res.send({updated: true});
    });

  });

  // delete
  app.delete('/teams/:n', function (req, res) {

    db.Teams.delete({name: req.params.n}, function (err, stat) {
      if (error(err, res, stat, 'team')) return;
      res.send({deleted: true});
    });

  });

  // available
  app.get('/teams/:n/available', function (req, res) {

    db.Teams.available({name: req.params.n}, function (err, available) {
      if (error(err, res)) return;
      res.send(available ? 200 : 403);
    });

  });

  // invite
  app.post('/teams/:n/invite', function (req, res) {

    Step(
      function () {
        db.Users.read({username: req.body.inviter}, this.parallel());
        db.Users.read({username: req.body.invitee}, this.parallel());
      },
      function (err, inviter, invitee) {
        if (error(err, res, inviter, 'inviter')) return;
        if (error(err, res, invitee, 'invitee')) return;

        db.Teams.read({name: req.params.n}, function (err, team) {
          if (error(err, res, team, 'team')) return;

          if (!team.users[inviter.username])
            return res.send(401, {error: 'insufficient privileges'});
          if (team.users[invitee.username])
            return res.send(403, {error: 'invitee is already a member'});

          send.invite(inviter, invitee, team, app.get('env'));
          res.send(200);
        });
        
      }
    );

  });

}

// Scheduled tasks.
exports.jobs = function (cb) {
  util.log('Started scheduled jobs for Teams resource');
}