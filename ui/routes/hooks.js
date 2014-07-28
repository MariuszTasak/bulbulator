var express = require('express');
var router = express.Router();
var moment = require('moment');

// config
var config = require('../config');

var mysql      = require('mysql');
var connection = mysql.createConnection({
  host     : config.BULBULATOR_MYSQL_HOST,
  user     : config.BULBULATOR_MYSQL_USER,
  password : config.BULBULATOR_MYSQL_PASSWORD
});
connection.connect();
connection.query('USE '+config.BULBULATOR_MYSQL_DB);

/* POST creation hook */
router.post('/creation', function(req, res) {
  // shorthand
  var post = req.body;

  // add the datetime
  post.created_at = moment().format('YYYY-MM-DD HH:mm:ss');

  var query = connection.query('INSERT INTO environments SET ?', post, function(err, result) {
    if (null === err) {
      res.send('OK');
    } else {
      res.send(err.code);
      console.log(err);
    }
  });
});

/* POST creation hook */
router.post('/deletion', function(req, res) {
  // shorthand
  var post = req.body;

  var query = connection.query('DELETE FROM environments where ?', post, function(err, result) {
    if (null === err) {
      res.send('OK');
    } else {
      res.send(err.code);
      console.log(err);
    }
  });
});

module.exports = router;