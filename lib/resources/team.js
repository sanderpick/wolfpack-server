/*
 * team.js: Handling for the teams resource.
 *
 */

// Module Dependencies
var Users = require('../db.js').Users;
var Teams = require('../db.js').Teams;
var encrypt = require('../db.js').encrypt;
var util = require('util');
var Step = require('step');
var _ = require('underscore');
_.mixin(require('underscore.string'));

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
exports.route = function (app) {

  // create
  app.post('/teams/:un/:n', function (req, res) {
    var name = [req.params.un, req.params.n].join('/');
    Users.read({username: req.params.un}, function (err, user) {
      if (err)
        return res.send(500, {error: 'server error'});
      else if (!user)
        return res.send(404, {error: req.params.un + ' not found'});
      Teams.create({
        name: name,
        user_id: user._id,
      }, function (err, doc) {
        res.send(doc);
      });
    });
  });

  // read
  app.get('/teams/:un/:n', function (req, res) {
    Teams.read({username: req.params.un}, function (err, doc) {
      res.send(doc);
    });
  });

  // update
  app.put('/teams/:un/:n', function (req, res) {
    Users.update({username: req.params.un}, req.body,
                function (err, doc) {
      res.send(doc);
    });
  });

  // delete
  app.delete('/teams/:un/:n', function (req, res) {
    Users.delete({username: req.params.un}, function (err) {
      res.send(true);
    });
  });

  // available
  app.get('/teams/:un/:n/available', function (req, res) {
    var name = [req.params.un, req.params.n].join('/');
    Teams.available({name: name}, function (err, available) {
      res.send(available ? 200 : 403);
    });
  });

}