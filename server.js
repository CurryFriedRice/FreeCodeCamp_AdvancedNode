'use strict';
require('dotenv').config();
const express = require('express');
const app = express();
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');

//const passport = require('passport');
const session = require('express-session');
//const LocalStrategy = require('passport-local');
const ObjectID = require('mongodb').ObjectID;
//const bcrypt = require('bcrypt');

const routes = require('./routes.js');
const auth = require('./auth.js');

const http = require('http').createServer(app);
const io = require('socket.io')(http);

const passportSocketIo = require('passport.socketio');
const cookieParser = require('cookie-parser');
const MongoStore = require('connect-mongo')(session);
const URI = process.env.MONGO_URI;
const store = new MongoStore({url: URI});

let currentUsers = 0;





app.set('view engine', 'pug');
fccTesting(app); //For FCC testing purposes

app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false }
}));


  io.use(
    passportSocketIo.authorize({
      cookieParser: cookieParser,
      key: 'express.sid',
      secret: process.env.SESSION_SECRET,
      store: store,
      success: onAuthorizeSuccess,
      fail: onAuthorizeFail
    })
  );
//app.use(passport.initialize());
//app.use(passport.session());

//Start of DB

myDB(async (client) => {
  const myDataBase = await client.db('database').collection('users');
  routes(app, myDataBase);
  auth(app,myDataBase);


  io.on('connection', socket => {
    console.log('A user has connected');
    ++connectedUsers;

    io.emit('user', {
      name: socket.request.user.name,
      currentUsers,
      connected: true
    });
  });



  socket.on('disconnect', () => {
    //What should the client do when it disconnects.
    console.log('A user has disconnected');
    --currentUsers;

    io.emit('user', {
      name: socket.request.user.name,
      currentUsers,
      connected: false
    });
  });

  socket.on('chat message', () =>{
    io.emit('chat message', () =>{
      name = socket.request.user.name;
      message = messageToSend;
    });
  });
  console.log("user " + socket.request.user.name + ' connected');
  // Be sure to add this...
}).catch((e) => {
  app.route('/').get((req, res) => {
    res.render('pug', { title: e, message: 'Unable to login' });
  });
});

//End of DB 

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  ++currentUsers;
  //io.emit('user count', currentUsers);

  console.log('Listening on port ' + PORT);
});

function onAuthorizeSuccess(data, accept){
  console.log('successful connection to socket.io');

  accept(null, true);
}

function onAuthorizeFail(data, message, error, accept){
  if(error) throw new Error(message);
  console.log('failed connection to socket.io:', message);
  accept(null,false);
}
