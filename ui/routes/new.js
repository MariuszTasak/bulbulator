var express = require('express');
var router = express.Router();
var async = require('async');
var crypto = require('crypto');
var nl2br  = require('nl2br');

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
  //debug: true,
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

// connect to DB
connection.query('USE bulbulator');

/* GET new page. */
router.get('/', function(req, res) {

  sendEmail('jgautheron@nexway.com', 'hi!', 'foo moo :)');

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
          'export MYSQL_DB_HOST="'+serverInfo.mysql_host+'"'
        ].join('; ');

        // create unique hash per deployment
        var hash = crypto.createHash('md5').update(bulbulatorCli+bulbulatorVars).digest('hex');

        // connect to the destination server
        var conn = new Connection();
        conn.on('ready', function() {
          console.log('Connection :: ready');
          var start = +(new Date);

          // execute BBL
          conn.exec(bulbulatorVars+'; cd '+serverInfo.root_folder+' && '+bulbulatorCli, function(err, stream) {
            if (err) throw err;

            stream.on('exit', function(code, signal) {
              console.log('Stream :: exit :: code: ' + code + ', signal: ' + signal);
            }).on('close', function() {
              conn.end();

              var end = +(new Date), difference = end - start,
                  minutes = ((difference / (1000 * 60)) % 60).toFixed(2);

              io.emit('bulbulator creation', {
                stdout: successMessage('<br/>Deployment processed in '+minutes+' mins'),
                hash: hash
              });
              console.log('Stream :: close (duration: '+minutes+' mins)');
            }).on('data', function(data) {
              // broadcast the BBLation infos
              io.emit('bulbulator creation', {
                stdout: convert.toHtml(nl2br(''+data)),
                hash: hash,
                cli: bulbulatorCli,
                vars: bulbulatorVars
              });
            }).stderr.on('data', function(data) {
              // broadcast the BBLation error
              io.emit('bulbulator creation', {
                stdout: errorMessage(nl2br(''+data)),
                hash: hash
              });
            });
          });
        }).connect({
          host: serverInfo.ip,
          port: serverInfo.ssh_port,
          username: BULBULATOR_SSH_USER,
          password: BULBULATOR_SSH_PASSWORD
        });

        callback(null, 'done');
      }
  ], function (err, result) {
     if (result === 'done') {
        req.flash('success', 'The environment is currently being bulbulated. Please wait 5 mins.');
        res.redirect('/');
     }
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

var sendEmail = function(to, subject, message) {
  var nodemailer = require('nodemailer');
  var ses = require('nodemailer-ses-transport');
  var transporter = nodemailer.createTransport(ses({
      accessKeyId: 'AKIAJGSKMYGOQRUYT5JA',
      secretAccessKey: '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',
      region: 'eu-west-1'
  }));
  transporter.sendMail({
      from: 'jgautheron@nexway.com',
      to: to,
      subject: subject,
      text: message
  });
};

module.exports = router;