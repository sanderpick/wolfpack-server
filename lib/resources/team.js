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
var Users = require('../db.js').Users;
var Teams = require('../db.js').Teams;
var encrypt = require('../db.js').encrypt;
var send = require('../send');

/* e.g.,
  {
    name: 'andrewxhill/homies',
    users: [
      {
        username: 'eightysteele',
        weekly: true,
        daily: true,
        micro: false
      },
    ],
    created : <ISODate>,
    _id: <ObjectID>,
    user_id: <ObjectID>
  }
*/

// Define routes.
exports.routes = function (app) {

  // list
  app.get('/teams/:un', function (req, res) {
    Users.read({username: req.params.un}, function (err, user) {
      if (err)
        return res.send(500, {error: 'server error'});
      else if (!user)
        return res.send(404, {error: 'user not found'});
      Teams.find({user_id: user._id}).toArray(function (err, teams) {
        if (err)
          return res.send(500, {error: 'server error'});
        _.each(teams, function (team) {
          delete team.created;
          delete team._id;
          delete team.user_id;
        });
        res.send({teams: teams});
      });
    });
  });

  // create
  app.post('/teams/:un/:n', function (req, res) {
    var name = [req.params.un, req.params.n].join('/');

    Users.read({username: req.params.un}, function (err, user) {
      if (err)
        return res.send(500, {error: 'server error'});
      else if (!user)
        return res.send(404, {error: 'user not found'});
      Teams.create({
        name: name,
        user_id: user._id,
      }, function (err, doc) {
        if (err)
          return res.send(500, {error: 'server error'});
        res.send(doc);
      });
    });

  });

  // read
  app.get('/teams/:un/:n', function (req, res) {
    var name = [req.params.un, req.params.n].join('/');

    Teams.read({name: name}, function (err, doc) {
      if (err)
        res.send(500, {error: 'server error'});
      else if (!doc)
        res.send(404, {error: 'team not found'});
      else res.send(doc);
    });

  });

  // update
  app.put('/teams/:un/:n', function (req, res) {
    var name = [req.params.un, req.params.n].join('/');
    
    function update(full) {
      Teams.update({name: name}, full ? req.body: {$set: req.body},
          function (err, stat) {
        if (err)
          res.send(500, {error: 'server error'});
        else if (!stat)
          res.send(404, {error: 'team not found'});
        else res.send();
      });
    }

    if (req.body['$addToSet']) {
      var add = req.body['$addToSet'].users.username;
      Users.read({username: add}, function (err, user) {
        if (err)
          return res.send(500, {error: 'server error'});
        else if (!user)
          return res.send(404, {error: 'user not found'});
        update(true);
      });
    } else update();

  });

  // delete
  app.delete('/teams/:un/:n', function (req, res) {
    var name = [req.params.un, req.params.n].join('/');

    Teams.delete({name: name}, function (err, stat) {
      if (err)
        res.send(500, {error: 'server error'});
      else if (!stat)
        res.send(404, {error: 'team not found'});
      else res.send();
    });

  });

  // available
  app.get('/teams/:un/:n/available', function (req, res) {
    var name = [req.params.un, req.params.n].join('/');

    Teams.available({name: name}, function (err, available) {
      if (err)
        return res.send(500, {error: 'server error'});
      res.send(available ? 200 : 403);
    });

  });

}

// Scheduled tasks.
exports.jobs = function (cb) {}