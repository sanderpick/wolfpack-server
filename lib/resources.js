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
  'user': {
    indexes: [{username: 1}, {email: 1}],
    uniques: [true, true]
  },
  'team': {
    indexes: [{name: 1}, {user_id: 1}],
    uniques: [true, false]
  },
  'mail': {
    indexes: [{user_id: 1}, {team_id: 1}],
    uniques: [false, false]
  }
};

// Prepare resources.
exports.init = function (app, cb) {

  // Add resource collections and routes.
  _.each(collections, function (conf, name) {
    app.get('db').add(name, conf, function (err) {
      var res = require('./resources/' + name);
      res.routes(app);
      res.jobs(app);
    });
  });

  // Start server.
  http.createServer(app).listen(app.get('port'), cb);
}