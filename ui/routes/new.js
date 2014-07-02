var express = require('express');
var router = express.Router();

var mysql      = require('mysql');
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'bulbulator',
  password : 'wXmMVGCFxaZudT5B'
});
connection.connect();

// connect to DB
connection.query('USE bulbulator');

/* GET home page. */
router.get('/', function(req, res) {
  res.render('new', { environments : rows, user: req.user });
});

module.exports = router;
