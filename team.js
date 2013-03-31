/*
 * team.js: Handling for the user resource.
 *
 */

var resourceful = require('resourceful');
resourceful.use('memory');
var _ = require('underscore');
_.mixin(require('underscore.string'));

/* e.g.,
  {
    id: 'dudes',
    resource: 'Team',
    user_ids: ['eightysteele']
  }
*/

var Team = module.exports = resourceful.define('team', function () {

  // Specify a storage engine
  // this.use('mongoDb');

  // Specify some properties with validation
  this.array('user_ids');

  // Specify timestamp properties
  this.timestamps();

});

// Create routes inside the `/team` scope.
Team.path = /\/team\/(\w+)/;
Team.handler = function () {

  // The `this` context of the function passed to `.path()`
  // is the Router itself.

  // create
  this.post(function (id) {
    this.res.writeHead(200, { 'Content-Type': 'text/plain' });
    Team.create({
      id: id,
      user_ids: [this.req.body.user_id]
    }, _.bind(function (err, doc) {
      this.res.end(JSON.stringify(doc));
    }, this));
  });

  // read
  this.get(function (id) {
    this.res.writeHead(200, { 'Content-Type': 'text/plain' });
    Team.get({id: id}, _.bind(function (err, doc) {
      this.res.end(JSON.stringify(doc));
    }, this));
  });

  // update
  this.put(function (id) {
    this.res.writeHead(200, { 'Content-Type': 'text/plain' });
    Team.update(this.req.body, _.bind(function (err, doc) {
      this.res.end(JSON.stringify(doc));
    }, this));
  });

  // delete
  this.delete(function (id) {
    this.res.writeHead(200, { 'Content-Type': 'text/plain' });
    Team.destroy({id: id}, _.bind(function (err) {
      this.res.end(1);
    }, this));
  });

}