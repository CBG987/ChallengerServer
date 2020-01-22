var bodyParser = require('body-parser');
var express = require('express');
var app = express();
var http = require('http').createServer(app);
var path = require('path');
var mysql = require('mysql');
var io = require('socket.io').listen(http);
var cookieParser = require('cookie-parser');
//var session = require('express-session');

/*var sessionMiddleware = session({
  secret: "keyboard cat"
});
io.use(function (socket, next) {
  sessionMiddleware(socket.request, socket.request.res, next);
});*/
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(__dirname+'/public'));
//app.use(sessionMiddleware);
//app.use(cookieParser());

var con;
function handleDisconnect(){
	con = mysql.createConnection({
		host     : 'localhost',
		user     : 'kingkong',
		password : 'BonesGravseth2',
		database : 'challengeapp'
	});
	con.connect(function(err){
		if(err){
				console.log('error when connecting to db:', err);
				setTimeout(handleDisconnect, 2000);
		}
		console.log("Connected!");
		//getInfo();
	});
	con.on('error', function(err) {
    console.log('db error', err);
    if(err.code === 'PROTOCOL_CONNECTION_LOST') {
      handleDisconnect();
    } else {
      throw err;
    }
  });
}
handleDisconnect();

app.get('/', function(req, res){
  res.sendFile(path.join(__dirname + '/public/main.html'));
});
app.get('/newuser', function(req, res){
  res.sendFile(path.join(__dirname + '/public/createuser.html'));
});
app.get('/forgotpassword', function(req, res){
  res.sendFile(path.join(__dirname + '/public/forgotpassword.html'));
});
app.get('/cancel', function(req, res){
	res.redirect('/');
})

io.on('connection', function(socket){
  console.log('a user connected');
  socket.on('connectionLogin', (data) => {
    console.log(data);
		con.query("SELECT * FROM challengeapp.users WHERE username ='"+data.username+"' AND passord ='"+data.password+"'", function(err, result, fields){
			if (err) {
				console.log("Er i error område");
				throw err
			}
			if (result.length == 0) {
				console.log("er i ikke korrekt område");
				io.emit('loginconfirmed', {message: 'Feil brukernavn eller passord'});
			}else {
				console.log("er i ok området");
				io.set('session', data.username);
				io.emit('loginconfirmed', {message: "success", session: data.username});
			}
		});
  });
	socket.on('getuserinfo', (data) => {
    console.log(data);
		var brukernavn; var object;
		var id; var navn; var epost;
		var total; var today; var overtotal;
		con.query("SELECT * FROM challengeapp.users WHERE username ='"+data.username+"'", function(err, result, fields){
			if (err) {
				console.log("Er i error område");
				throw err
			}
			if (result.length == 0) {
				console.log("er i ikke korrekt område");
				io.emit('loginconfirmed', {message: 'Ga ingen resultat'});
			}else {
				console.log("er i ok området");
				id = result[0].id; navn = result[0].navn;
				epost = result[0].email; brukernavn = result[0].username;
			}
		});
		setTimeout(function(){
			con.query("SELECT * FROM challengeapp.challenges WHERE username ='"+data.username+"'", function(err, result, fields){
				if (err) {
					console.log("Er i error område");
					throw err
				}
				if (result.length == 0) {
					console.log("er i ikke korrekt område");
					io.emit('loginconfirmed', {message: 'Ga ingen resultat'});
				}else {
					console.log("er i ok området");
					total = result[0].total;
					today = result[0].today;
					overtotal = result[0].overtotal;
				}
			});
			setTimeout(function(){
				//object = {id: id, navn: navn, epost: epost, brukernavn: brukernavn, pushups: pushups};
				object = {id: id, navn: navn, epost: epost, brukernavn: brukernavn, total: total, today: today, overtotal: overtotal};
				console.log(object);
				io.emit('userinfo', {message: object});
				console.log("Sending ...");
			}, 250);
		}, 250);

  });
	//setTimeout(function(){
	var userbase;
	socket.on('getallusers', (data) => {
		con.query("SELECT * FROM challengeapp.challenges", function(err, result, fields){
			if (err) {
				throw err
			}else {
				for (var i = 0; i < result.length; i++) {
					userbase = userbase + result[i].username+"//"+result[i].navn+"//"+result[i].total+"//"+result[i].today+"//"+result[i].overtotal + "/-/";
				}
				console.log("er i ok området");
				console.log(userbase);
				io.emit('alluserinfo', {message: userbase});
				userbase = "";
			}
		});
	});
	socket.on('addcounter', (message) => {
		var counter;
		if(message.counter >= 100){
			counter = 100;
		}else{
			con.query("UPDATE challengeapp.challenges SET total = total+"+message.counter+" WHERE username = '"+message.username+"'");
		}
		setTimeout(function(){
			con.query("SELECT * FROM challengeapp.challenges", function(err, result, fields){
				if (err) {
					throw err
				}else {
					for (var i = 0; i < result.length; i++) {
						userbase = userbase + result[i].username+"//"+result[i].navn+"//"+result[i].total+"//"+result[i].today+"//"+result[i].overtotal + "/-/";
					}
					console.log("er i ok området");
					console.log(userbase);
					io.emit('alluserinfo', {message: userbase});
					userbase = "";
				}
			});
			con.query("SELECT * FROM challengeapp.challenges WHERE username ='"+message.username+"'", function(err, result, fields){
				if (err) {
					throw err
				}else {
					console.log("er i ok området");
					total = result[0].total;
					today = result[0].today;
					overtotal = result[0].overtotal;
				}
			});
			setTimeout(function() {


			}, 250);
		}, 250);
	});
  socket.on('newuser', (message) => {
		console.log(message);
		var data = message.split("//");
		con.query("INSERT INTO challengeapp.users (navn, email, username, passord) VALUES('"+data[0]+"', '"+data[1]+"', '"+data[2]+"', '"+data[3]+"')");

		con.query("INSERT INTO challengeapp.challenges (username, navn, total, today, overtotal) VALUES('"+data[2]+"','"+data[0]+"','"+0+"','"+0+"','"+0+"')");
		//io.emit('message', message)
	});

  socket.on('disconnect', function() {
		console.log("User disconnected");
	});
});
/*module.exports = {
    restart: function(){
        io.emit('serverrestart', "");
    }
};
require('make-runnable');*/


var server = http.listen(2525, () => {
  console.log('Server is running on PORT:',2525);
});
