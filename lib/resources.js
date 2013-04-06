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
  'user': {id: 1}
};

// Prepare resources.
exports.init = function (app, cb) {

  // Add resource collections and routes.
  _.each(collections, function (index, name) {
    app.get('db').add(name, index, function (err) {
      require('./resources/' + name).route(app);
    });
  });

  // Start server.
  http.createServer(app).listen(app.get('port'), cb);
}