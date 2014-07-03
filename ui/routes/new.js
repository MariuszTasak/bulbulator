var express = require('express');
var router = express.Router();

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
  type: 'basic',
  username: 'nexwaybot',
  password: 'Nexwaybot14'
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
  connection.query('SELECT * FROM environments', function(err, rows) {
    res.render('new', { environments : rows });
  });
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

/* GET github repository website available environments */
router.get('/getCommit', function(req, res) {
  var user    = req.query.user,
      sha     = req.query.sha;

  github.repos.getCommit({
    user: user,
    repo: repo,
    sha:  sha
  }, function(err, results) {
    res.json(results);
  });
});

module.exports = router;