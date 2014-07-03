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
  connection.query('SELECT * FROM environments', function(err, rows) {
    res.render('index', { environments : rows });
  });
});

module.exports = router;