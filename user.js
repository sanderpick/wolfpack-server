/*
 * user.js: Handling for the user resource.
 *
 */

var resourceful = require('resourceful');
resourceful.use('memory');
var _ = require('underscore');
_.mixin(require('underscore.string'));

/* e.g.,
  {
    id: 'eightysteele',
    name: 'Aaron Steele',
    resource: 'User'
  }
*/

var User = module.exports = resourceful.define('user', function () {

  // Specify a storage engine
  // this.use('mongoDb');

  // Specify some properties with validation
  this.string('name');
  this.string('email');

  // Specify timestamp properties
  this.timestamps();

});

// Create routes inside the `/user` scope.
User.path = /\/user\/(\w+)/;
User.handler = function () {

  // The `this` context of the function passed to `.path()`
  // is the Router itself.

  // create
  this.post(function (id) {
    this.res.writeHead(200, { 'Content-Type': 'text/plain' });
    User.create({
      id: id,
      name: this.req.body.name
    }, _.bind(function (err, doc) {
      this.res.end(JSON.stringify(doc));
    }, this));
  });

  // read
  this.get(function (id) {
    this.res.writeHead(200, { 'Content-Type': 'text/plain' });
    User.get({id: id}, _.bind(function (err, doc) {
      this.res.end(JSON.stringify(doc));
    }, this));
  });

  // update
  this.put(function (id) {
    this.res.writeHead(200, { 'Content-Type': 'text/plain' });
    User.update(this.req.body, _.bind(function (err, doc) {
      this.res.end(JSON.stringify(doc));
    }, this));
  });

  // delete
  this.delete(function (id) {
    this.res.writeHead(200, { 'Content-Type': 'text/plain' });
    User.destroy({id: id}, _.bind(function (err) {
      this.res.end(1);
    }, this));
  });

}