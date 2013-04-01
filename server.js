#!/usr/bin/env node

var union = require('union');
var director = require('director');
var _ = require('underscore');
_.mixin(require('underscore.string'));

var resources = [
  require('./resources/users'),
  require('./resources/teams')
];

var router = new director.http.Router();
var server = union.createServer({
  before: [
    function (req, res) {
      var found = router.dispatch(req, res);
      if (!found) {
        res.emit('next');
      }
    }
  ]
});

resources.forEach(function (r) {
  router.path(r.path, r.handler);
});

server.listen(9090);

console.log('Union with Director running on 9090.');