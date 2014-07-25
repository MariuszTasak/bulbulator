'use strict';

var express = require('express');
var router = express.Router();
var async = require('async');
var crypto = require('crypto');
var nl2br  = require('nl2br');
var moment = require('moment');

// nodemailer
var path           = require('path'),
    templatesDir   = path.resolve(__dirname, '..', 'views/templates'),
    emailTemplates = require('email-templates'),
    nodemailer     = require('nodemailer'),
    ses            = require('nodemailer-ses-transport');

var transporter = nodemailer.createTransport(ses({
  accessKeyId: 'AKIAJGSKMYGOQRUYT5JA',
  secretAccessKey: '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',
  region: 'eu-west-1'
}));

// ssh connection
var Connection = require('ssh2');

// ansi-to-html converter
var Convert = require('ansi-to-html');
var convert = new Convert();

// config
var BULBULATOR_SSH_USER       = 'bulbulator',
    BULBULATOR_SSH_PASSWORD   = 'wXmMVGCFxaZudT5B',
    BULBULATOR_MYSQL_HOST     = 'localhost',
    BULBULATOR_MYSQL_USER     = 'bulbulator',
    BULBULATOR_MYSQL_PASSWORD = 'wXmMVGCFxaZudT5B',
    MAIN_REPOSITORY_NAME      = 'Nexway-3.0',
    GITHUB_USERNAME           = 'nexwaybot',
    GITHUB_PASSWORD           = 'Nexwaybot14';

// connect to github
var GitHubApi = require('github');
var github = new GitHubApi({
  version: '3.0.0',
  protocol: 'https',
  timeout: 500
});
github.authenticate({
  type     : 'basic',
  username : GITHUB_USERNAME,
  password : GITHUB_PASSWORD
});

// connect to mysql
var mysql      = require('mysql');
var connection = mysql.createConnection({
  host     : BULBULATOR_MYSQL_HOST,
  user     : BULBULATOR_MYSQL_USER,
  password : BULBULATOR_MYSQL_PASSWORD
});
connection.connect();
connection.query('USE bulbulator');

// connect to redis
var redis       = require('redis'),
    redisClient = redis.createClient();

redisClient.on('error', function(err) {
  console.log('Error ' + err);
});

/* GET new page. */
router.get('/', function(req, res) {
  async.parallel([
    function(callback) {
      connection.query('SELECT * FROM environments', function(err, rows) {
        callback(null, rows);
      });
    },
    function(callback) {
      connection.query('SELECT * FROM servers', function(err, rows) {
        callback(null, rows);
      });
    }
  ], function(err, results) {
    res.render('new', {
      environments : results[0],
      servers      : results[1]
    });
  });
});

/* POST new page. */
router.post('/', function(req, res) {
  var username    = req.body.repository,
      branch      = req.body.branch,
      commit      = req.body.commit,
      website     = req.body.website,
      environment = req.body.environment,
      server      = req.body.server;

  // expectations:
  // 1. user bulbulator always exists on the host server with the same password
  // 2. remote server

  async.waterfall([
      function(callback) {
        connection.query('SELECT * FROM servers WHERE hostname = ?', [server], function(err, results) {
          if (err) throw err;

          if (results.length !== 1) {
            throw new Error('Cannot find the server informations');
          }

          callback(null, results);
        });
      },
      function(results, callback) {
        var serverInfo = results[0];

        // build the BBL command line
        var bulbulatorCli = [
          './bulbulator.sh',
          '-r https://'+GITHUB_USERNAME+':'+GITHUB_PASSWORD+'@github.com/'+username+'/Nexway-3.0.git',
          '-b '+branch,
          '-c '+commit,
          '-e '+environment,
          '-w '+website,
          '-s '+serverInfo.sub_domain
        ].join(' ');

        // build expected global variables
        var bulbulatorVars = [
          'export BASE_SETUP_DIR_TO_CHECK="'+serverInfo.base_setup_dir_to_check+'"',
          'export BASE_SETUP_DIR="'+serverInfo.base_setup_dir+'"',
          'export MEDIA_DIR="'+serverInfo.media_dir+'"',
          'export MYSQL_USER="'+serverInfo.mysql_user+'"',
          'export MYSQL_PASSWORD="'+serverInfo.mysql_password+'"',
          'export MYSQL_DB_PREFIX="'+serverInfo.mysql_db_prefix+'"',
          'export MYSQL_DB_HOST="'+serverInfo.mysql_host+'"',
          'export ENV_CREATOR="'+req.user.emailAddress.split('@')[0]+'"'
        ];

        // deduce URL from configuration
        var expectedUrl = 'https://'+website+'-'+branch+'-'+serverInfo.sub_domain;

        // create unique hash per deployment
        var hash = crypto.createHash('md5').update(bulbulatorCli+bulbulatorVars).digest('hex');

        // export the hash as well
        bulbulatorVars.push('export ENV_HASH="'+hash+'"');

        // connect to the destination server
        var conn = new Connection();
        conn.on('ready', function() {
          console.log('Connection :: ready');
          var start = +(new Date);

          // track the deployment status
          // 0 = error, 1 = alright
          var deploymentStatus = 0;

          // join vars on a single line
          bulbulatorVars = bulbulatorVars.join('; ');

          // execute BBL
          conn.exec(bulbulatorVars+'; cd '+serverInfo.root_folder+' && '+bulbulatorCli, function(err, stream) {
            if (err) throw err;

            stream.on('exit', function(code, signal) {
              console.log('Stream :: exit :: code: ' + code + ', signal: ' + signal);
            }).on('close', function() {
              conn.end();

              var end = +(new Date), difference = end - start,
                  minutes = ((difference / (1000 * 60)) % 60).toFixed(2),
                  message;

              switch (deploymentStatus) {
                case 0:
                  message = errorMessage('<br/>Deployment failed (lasted '+minutes+' mins)');
                  emitWsMessage.failed(hash);
                  break;
                case 1:
                  message = successMessage('<br/>Deployment processed in '+minutes+' mins');
                  // TODO: check that URL is OK
                  emitWsMessage.created(hash);

                  if (req.body['send-email']) {
                    sendCreationNoticeEmail(
                      hash, req.user, expectedUrl, start, end, req.body
                    );
                  }
                  break;
              }

              emitWsMessage.creation(hash, message);

              console.log('Stream :: close (duration: '+minutes+' mins)');
            }).on('data', function(data) {
              // convert to string
              data = ''+data;

              // emit the BBLation infos
              emitWsMessage.creation(hash, convert.toHtml(nl2br(data)));

              // catch the BBL success message
              if (data.indexOf('I\'ve done all the work for you!') !== -1) {
                deploymentStatus = 1;
              }
            }).stderr.on('data', function(data) {
              // convert to string
              data = ''+data;

              // emit the BBLation infos
              emitWsMessage.creation(hash, errorMessage(nl2br(data)));
            });
          });
        }).connect({
          host: serverInfo.ip,
          port: serverInfo.ssh_port,
          username: BULBULATOR_SSH_USER,
          password: BULBULATOR_SSH_PASSWORD
        });

        callback(null, expectedUrl);
      }
  ], function (err, expectedUrl) {
    req.flash('success', 'The environment is currently being bulbulated.');
    res.redirect('/');
  });
});

/* GET github forks */
router.get('/getForks', function(req, res) {
  github.repos.getForks({
    user: 'NexwayGroup',
    repo: MAIN_REPOSITORY_NAME,
    sort: 'oldest'
  }, function(err, results) {
    res.json(results);
  });
});

/* GET github repository branches */
router.get('/getBranches', function(req, res) {
  var user = req.query.user;

  github.repos.getBranches({
    user: user,
    repo: MAIN_REPOSITORY_NAME,
  }, function(err, results) {
    res.json(results);
  });
});

/* GET github repository websites */
router.get('/getWebsites', function(req, res) {
  var user = req.query.user,
      ref  = req.query.ref;

  github.repos.getContent({
    user: user,
    repo: MAIN_REPOSITORY_NAME,
    ref:  ref,
    path: 'configuration'
  }, function(err, results) {
    if (results) {
      results = results.filter(function(o) {
        return 'dir' === o.type;
      });
      res.json(results);
    }
  });
});

/* GET github repository website available environments */
router.get('/getEnvironments', function(req, res) {
  var user    = req.query.user,
      ref     = req.query.ref,
      website = req.query.website;

  github.repos.getContent({
    user: user,
    repo: MAIN_REPOSITORY_NAME,
    ref:  ref,
    path: 'configuration/'+website
  }, function(err, results) {
    if (results) {
      results = results.filter(function(o) {
        return 'dir' === o.type && -1 === o.name.indexOf('common');
      });
      res.json(results);
    }
  });
});

/* GET retrieve the commit info */
router.get('/getCommit', function(req, res) {
  var user = req.query.user,
      sha  = req.query.sha;

  github.repos.getCommit({
    user: user,
    repo: MAIN_REPOSITORY_NAME,
    sha:  sha
  }, function(err, results) {
    res.json(results);
  });
});

/* GET get the list of commits */
router.get('/getCommits', function(req, res) {
  var user = req.query.user,
      sha  = req.query.sha,
      page = req.query.page || 1;

  github.repos.getCommits({
    user:     user,
    repo:     MAIN_REPOSITORY_NAME,
    sha:      sha,
    per_page: 100,
    page:     page
  }, function(err, results) {
    if (results) {
      results.forEach(function(o) {
        // workaround: ng-table doesn't support filtering on sub members
        o.message = o.commit.message;
      });
      res.json(results);
    }
  });
});

var successMessage = function(msg) {
  return '<span class="success">'+msg+'</span>';
};

var errorMessage = function(msg) {
  return '<span class="error">'+msg+'</span>';
};

var emitWsMessage = {
  creation: function(hash, message) {
    io.emit('bulbulator creation', {
      hash: hash,
      message: message
    });

    redisClient.rpush(hash, message);
  },
  created: function(hash) {
    io.emit('bulbulator created', {
      hash: hash
    });
  },
  failed: function(hash) {
    io.emit('bulbulator failed', {
      hash: hash
    });
  }
};

var sendCreationNoticeEmail = function(hash, user, url, creationAskDate, creationDoneDate, config) {
  creationAskDate  = moment(creationAskDate);
  creationDoneDate = moment(creationDoneDate);

  var creationDuration = creationDoneDate.diff(creationAskDate, 'minutes', true);
  creationDuration += ' minutes';

  emailTemplates(templatesDir, function(err, template) {
    if (err) {
      console.log(err);
    } else {
      var locals = {
        hash: hash,
        user: user,
        url: url,
        creationAskDate: creationAskDate.fromNow(),
        creationDoneDate: creationDoneDate.fromNow(),
        creationDuration: creationDuration,
        config: config
      };

      // Send a single email
      template('notice', locals, function(err, html) {
        if (err) {
          console.log(err);
        } else {
          transporter.sendMail({
              from: 'jgautheron@nexway.com',
              to: locals.user.emailAddress,
              subject: 'Your '+config.website+' environment is online',
              html: html
          }, function(err, responseStatus) {
            if (err) {
              console.log(err);
            }
          });
        }
      });
    }
  });
};

module.exports = router;