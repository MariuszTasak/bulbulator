var express = require('express');
var router = express.Router();

var moment = require('moment');

var mysql      = require('mysql');
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'bulbulator',
  password : 'wXmMVGCFxaZudT5B'
});
connection.connect();

// connect to DB
connection.query('USE bulbulator');

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

module.exports = router;