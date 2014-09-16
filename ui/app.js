var express = require('express'),
    passport = require('passport'),
    GooglePlusStrategy = require('passport-google-plus');

var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var flash = require('connect-flash');
var gravatar = require('nodejs-gravatar');

var routes = require('./routes/index'),
    hooks = require('./routes/hooks'),
    environments = require('./routes/environments'),
    newEnv = require('./routes/new');

require('./prototype');

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  obj.gravatarLink = gravatar.imageUrl(obj.emails[0].value, { size: 20 });
  done(null, obj);
});

passport.use(new GooglePlusStrategy({
    clientId: '91361093476-035q8080kdb6ab42jep7n0kjqq7esror.apps.googleusercontent.com',
    clientSecret: 'MDd3XunOMdIAcd6M0kOZTn-k'
  },
  function(tokens, profile, done) {
    // Create or update user, call done() when complete...
    done(null, profile, tokens);
  }
));

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(favicon());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(flash());
app.use(session({secret: 'super bulbulatore', cookie: { maxAge: 3600000 }}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));

app.use(function(req, res, next) {
  // flash messages
  res.locals.success_messages = req.flash('success');
  res.locals.error_messages = req.flash('error');
  res.locals.warning_messages = req.flash('warning');
  res.locals.info_messages = req.flash('info');

  // user object
  res.locals.user = req.user;

  next();
});

//app.all('/new*', ensureAuthenticated);

app.use('/', routes);
app.use('/environments', environments);
app.use('/hooks', hooks);
app.use('/new', newEnv);

app.get('/auth/google/callback', passport.authenticate('google'), function(req, res) {
  // Return user back to client
  res.send(req.user);
});

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  req.flash('error', 'You have to be logged in to access this page.');
  res.redirect('/');
}

/// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

module.exports = app;