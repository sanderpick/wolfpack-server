#!/usr/bin/env node
/*
 * main.js: Entry point for the Wolfpack API and mail bot.
 *
 */

// Arguments
var optimist = require('optimist');
var argv = optimist
    .describe('help', 'Get help')
    .describe('dev', 'Environment')
      .boolean('dev')
    .describe('port', 'Port to listen on')
      .default('port', 9090)
    .describe('db', 'MongoDb URL to connect to')
      .default('db', 'mongodb://nodejitsu_sanderpick:'
              + '2tibce5mvs61d0s4373kknogu7'
              + '@ds051947.mongolab.com:51947/'
              + 'nodejitsu_sanderpick_nodejitsudb4770110165')
    .argv;

if (argv.dev)
  argv.db = 'mongodb://localhost:27018/wolfpack';

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

// Development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

if (!module.parent) {
  Step(
    function () {
      new Connection(argv.db, {ensureIndexes: true}, this);
    },
    function (err, db) {
      if (err) {
        console.log(err);
        process.exit(1);
        return;
      }

      // Attach a db ref to app.
      app.set('db', db);

      // Init resources.
      resources.init(app, function (err) {
        util.log(err || 'API server listening on port ' + app.get('port'));

        // Start the mail bot.
        require('./lib/bot');
      });

    }
  );
}