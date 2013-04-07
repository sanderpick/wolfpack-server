#!/usr/bin/env node
/*
 * server.js: Entry point for the Wolfpack Server and API.
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
var cronJob = require('cron').CronJob;
var notifier = require('mail-notifier');
var path = require('path');
var util = require('util');
var Step = require('step');
var _ = require('underscore');
_.mixin(require('underscore.string'));
var Connection = require('./lib/db.js').Connection;
var resources = require('./lib/resources');
var email = require('./lib/email');

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

// Handle email replies
function broadcastReply(mail) {
  var re = /^notifications\+([a-z0-9]{24})@grr\.io$/i;
  var match;
  _.each(mail.to, function (to) {
    match = to.address.match(re) || match;
  });
  if (match) {
    var last = mail.text.match(/^(.*wrote:\n)/im)[1];
    var body = last ?
              mail.text.substr(0, mail.text.indexOf(last)).trim():
              mail.text;
    packDb.collections.pack.findOne({_id: new ObjectID(match[1])},
          function (err, p) {
      email.reply(mail.from, p, function () {
        // util.log('Emailed "' + p.name + '".');
      });
    });
  }
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
        util.log(err || 'API server listening on port ' + app.get('port') + '.');
      });

      // start the cron jobs
      // new cronJob('1 * * * * *', function () {
      //     db.collections.team.find({}).toArray(function (err, ps) {
      //       _.each(ps, function (p) {
      //         email.morning(p, function () {
      //           console.log('Emailed "' + p.name + '".');
      //         });
      //       });
      //     });
      //   },
      //   function () {}, true, 'America/Los_Angeles');
      // util.log('Started email cron jobs.');

      // Listen for new mail.
      // notifier({
      //   username: 'notifications@grr.io',
      //   password: 'w0lfpackm0d3',
      //   host: 'imap.gmail.com',
      //   port: 993,
      //   secure: true
      // }).on('mail', broadcastReply).start();

    }
  );
}