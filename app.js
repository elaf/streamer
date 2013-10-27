
/**
 * Module dependencies.
 */
var settings = require('./settings.json')
var passport = require('passport')
var passport_local = require('passport-local')
var expect = require('expect.js')
var express = require('express')
  , http = require('http')
  , path = require('path')
  , mongoose = require('mongoose');
var MongoStore = require('connect-mongo')(express);  
var sessionStore = new MongoStore({db:settings.db.name});

var db = mongoose.connect('mongodb://'+settings.db.host+'/'+settings.db.name);
var schemas = {
	user:{
		username:'string',
		password: 'string',
		name: 'string'
	},
	track:{
		title: 'string',
		location: 'string',
		size: 'number',
		user: 'string',
	}
}
var User = mongoose.model("users",schemas.user);
var Track = mongoose.model("tracks", schemas.track);
var app = express();

passport.use(new passport_local.Strategy({
		usernameField: 'username',
		passwordField: 'password'
		},
	function(username, password, done){
		console.log('auth');
		User.findOne({username: username, password: password}, function(err, user){
			if(err) throw err;
			console.log(user, "authenticate");
			done(err, user);
		})	
	}
));

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(id, done) {
  done(null, id);
});
// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.cookieParser('x'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.session({ secret: 'x', store: sessionStore, cookie: { maxAge: 1000 * 60 * 60 * 7 * 1000 ,httpOnly: false, secure: false}}));
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}
app.get('/', function(req, res){
	if(req.isAuthenticated()){
		res.render('index');
	}else{
		res.end("<h2>PLEASE LOGIN!</h2>");
	}
});
app.get('/users', function(req, res){res.render('users')});
app.post('/users', function(req, res){
	expect(req.body.username).to.be.ok()
	expect(req.body.password).to.be.ok()
	expect(req.body.name).to.be.ok();
	
	var user = new User({
		username:req.body.username,
		password: req.body.password,
		name: req.body.name
	});
	user.save(function(err, user){
		if(err)throw err;
		res.json(user);
	})
});
app.get('/failed', function(req,res){
	res.end('failed to login');
})
app.post(
	'/login',
	passport.authenticate('local', {
		successRedirect:'/',
		failureRedirect:'/failed'
	})
);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
