var express = require('express');
var router = express.Router();

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

/* GET environments page. */
router.get('/', function(req, res) {
  connection.query('SELECT * FROM environments', function(err, rows) {
    res.render('environments', { environments : rows });
  });
});

module.exports = router;
