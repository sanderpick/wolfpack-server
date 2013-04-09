/*
 * resources.js: Handling for resource routing.
 *
 */

// Module Dependencies
var http = require('http');
var util = require('util');
var Step = require('step');
var _ = require('underscore');
_.mixin(require('underscore.string'));

// Resource collections.
var collections = {
  'user': {username: 1},
  'team': {name: 1, user_id: 1},
  'mail': {user_id: 1, team_id: 1}
};

// Prepare resources.
exports.init = function (app, cb) {

  // Add resource collections and routes.
  _.each(collections, function (index, name) {
    app.get('db').add(name, index, function (err) {
      var res = require('./resources/' + name);
      res.routes(app);
      res.jobs();
    });
  });

  // Start server.
  http.createServer(app).listen(app.get('port'), cb);
}