'use strict';
require('dotenv').config();
const express = require('express');
const app = express();
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');

const session = require('express-session');
const passport = require('passport');
const ObjectID = require('mongodb').ObjectID;
const LocalStrategy = require('passport-local');
const bcrypt = require('bcrypt');


function ensureAuthenticated(req,res,next){
  if(req.isAuthenticated()) return next();
  res.redirect('/');
}

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

app.use(passport.initialize());
app.use(passport.session());

//Start of DB

myDB(async (client) => {
  const myDataBase = await client.db('database').collection('users');
  
  //ROUTES AND RENDERS
    app.route('/').get((req, res) => {
    // Change the response to render the Pug template
    res.render('pug', {
      title: 'Connected to Database',
      message: 'Please login',
      showLogin: true,
      showRegistration: true
    });
  });

  app.route("/login").post(passport.authenticate('local', {failureRedirect: '/'}), (req,res) => {
    res.render('/profile');
  });

  app.route('/profile').get(ensureAuthenticated, (req,res) => {
    res.render(process.cwd() + "/views/pug/profile", {username: req.user.username});
  });

  app.route('/logout').get((req,res) => {
    req.logout();
    res.redirect("/");
  });

  //So this effects the path under "register"
  app.route('/register').post((req,res, next) => {//So after registering we want to find a single user
    const hash = bcrypt.hashSync(req.body.password, 12);
    myDataBase.findOne({username: req.body.username}, function(err,user) {
      if(err){//If there's an error then we'll error out
        next(err);
      } else if(user) { //If the user already exists we'll just go back to home
        res.redirect('/');
      }else //Otherwise we'll insert a new object with Username and Password
      {
        myDataBase.insertOne({
          username: req.body.username,
          password: hash
        }, (err,doc) => {
          if(err){//If it can't do it then we reroute out
            res.redirect('/');
          }else{//if we do succeed we go to the next activity
            next(null, doc.ops[0]);
          }
        }
        )
      }
    })//Then we authenticate 
  }, passport.authenticate('local', {failureRedirect: '/'}), 
        (req,res,next) => {res.redirect('/profile');}
  );

  app.use((req,res,next) => {
      res.status(404)
        .type("text")
        .send("not found");
  });

  // Serialization and deserialization here...
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });
  passport.deserializeUser((id, done) => {
    myDataBase.findOne({ _id: new ObjectID(id) }, (err, doc) => {
      done(null, doc);
    });
  });
  passport.use(new LocalStrategy(
    function(username, password, done) {
      myDataBase.findOne({ username: username }, function (err, user) {
        console.log('User '+ username +' attempted to log in.');
        if (err) { return done(err); }
        if (!user) { return done(null, false); }
        //if (password !== user.password) { return done(null, false); }
        if(!bcrypt.compareSync(password, user.password)){return done(null, false);}
        return done(null, user);
      });
    }
  ));
  // Be sure to add this...
}).catch((e) => {
  app.route('/').get((req, res) => {
    res.render('pug', { title: e, message: 'Unable to login' });
  });
});

//End of DB 

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});


