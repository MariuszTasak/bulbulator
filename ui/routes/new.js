var express = require('express');
var router = express.Router();
var async = require('async');
var Connection = require('ssh2');

// connect to github
var repo = 'Nexway-3.0';
var GitHubApi = require('github');
var github = new GitHubApi({
  version: '3.0.0',
  //debug: true,
  protocol: 'https',
  timeout: 500
});
github.authenticate({
  type     : 'basic',
  username : 'nexwaybot',
  password : 'Nexwaybot14'
});

var mysql      = require('mysql');
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'bulbulator',
  password : 'wXmMVGCFxaZudT5B'
});
connection.connect();

// connect to DB
connection.query('USE bulbulator');

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
  console.log(req.body);
  // expectations:
  // 1. bulbulator.sh always in /var/www
  // 2. user bulbulator always exists on the host server with the same password
  // 3. remote server
});

/* GET github forks */
router.get('/getForks', function(req, res) {
  github.repos.getForks({
    user: 'NexwayGroup',
    repo: repo,
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
    repo: repo,
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
    repo: repo,
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
    repo: repo,
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
    repo: repo,
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
    repo:     repo,
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

module.exports = router;