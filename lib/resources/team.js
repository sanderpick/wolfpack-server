/*
 * teams.js: Handling for the teams resource.
 *
 */

// Module Dependencies
var _ = require('underscore');
_.mixin(require('underscore.string'));

/* e.g.,
  {
    id: 'dudes',
    resource: 'Teams',
    user_ids: ['eightysteele']
  }
*/

var Teams = module.exports = resourceful.define('teams', function () {

  // Specify a storage engine
  // this.use('mongoDb');

  // Specify some properties with validation
  this.array('user_ids');

  // Specify timestamp properties
  this.timestamps();

});

// Create routes inside the `/team` scope.
Teams.path = /\/teams\/(\w+)/;
Teams.handler = function () {

  // The `this` context of the function passed to `.path()`
  // is the Router itself.

  // create
  this.post(function (id) {
    this.res.writeHead(200, { 'Content-Type': 'text/plain' });
    Teams.create({
      id: id,
      user_ids: [this.req.body.user_id]
    }, _.bind(function (err, doc) {
      this.res.end(JSON.stringify(doc));
    }, this));
  });

  // read
  this.get(function (id) {
    this.res.writeHead(200, { 'Content-Type': 'text/plain' });
    Teams.get({id: id}, _.bind(function (err, doc) {
      this.res.end(JSON.stringify(doc));
    }, this));
  });

  // update
  this.put(function (id) {
    this.res.writeHead(200, { 'Content-Type': 'text/plain' });
    Teams.update(this.req.body, _.bind(function (err, doc) {
      this.res.end(JSON.stringify(doc));
    }, this));
  });

  // delete
  this.delete(function (id) {
    this.res.writeHead(200, { 'Content-Type': 'text/plain' });
    Teams.destroy({id: id}, _.bind(function (err) {
      this.res.end(1);
    }, this));
  });

  // available
  this.get(/\/available/, function (id) {
    this.res.writeHead(200, { 'Content-Type': 'text/plain' });
    this.res.end(JSON.stringify({available:true}));
  });

}