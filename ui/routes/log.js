var express = require('express');
var router = express.Router();

// connect to redis
var redis       = require('redis'),
    redisClient = redis.createClient();

redisClient.on('error', function(err) {
  console.log('Error ' + err);
});

/* GET environments page. */
router.get('/:hash', function(req, res) {
  var hash = req.params.hash;
  redisClient.lrange(hash, '0', '-1', function(err, logs) {
    res.render('logs', { logs : logs });
  });
});

module.exports = router;