#!/usr/bin/env node
/*
 * main.js: Entry point for the Wolfpack API and mail bot.
 *
 */

// Arguments
var optimist = require('optimist');
var argv = optimist
    .describe('help', 'Get help')
    .describe('port', 'Port to listen on')
      .default('port', 9090)
    .describe('db', 'MongoDb URL to connect to')
      .default('db', 'mongodb://nodejitsu_sanderpick:'
              + '2tibce5mvs61d0s4373kknogu7'
              + '@ds051947.mongolab.com:51947/'
              + 'nodejitsu_sanderpick_nodejitsudb4770110165')
    .describe('index', 'Ensure indexes on MongoDB collections')
      .boolean('index')
    .argv;

if (argv._.length || argv.help) {
  optimist.showHelp();
  process.exit(1);
}

// Module Dependencies
var express = require('express');
var path = require('path');
var util = require('util');
var Step = require('step');
var _ = require('underscore');
_.mixin(require('underscore.string'));
var Connection = require('./lib/db.js').Connection;
var resources = require('./lib/resources');

// Setup Environments
var app = express();
app.set('port', process.env.PORT || argv.port);
app.set('templates', __dirname + '/templates');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.errorHandler({showStack: true, dumpExceptions: true}));

// Development only
if ('development' === app.get('env')) {
  argv.db = 'mongodb://localhost:27017/wolfpack';
}

if (!module.parent) {
  Step(
    function () {
      var ei = 'production' === app.get('env') || argv.index;
      new Connection(argv.db, {ensureIndexes: ei}, this);
    },
    function (err, db) {
      if (err) {
        util.error(err);
        process.exit(1);
        return;
      }

      // Attach a db ref to app.
      app.set('db', db);

      // Init resources.
      resources.init(app, function (err) {
        if (err)
          return util.error(err);
        util.log('API server listening on port ' + app.get('port'));

        // Start the mail bot.
        require('./lib/bot').init(app);
      });

    }
  );
}