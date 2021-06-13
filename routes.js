const passport = require('passport');
const bcrypt = require('bcrypt');

module.exports = function (app,myDataBase){

  
function ensureAuthenticated(req,res,next){
  if(req.isAuthenticated()) return next();
  res.redirect('/');
}

   //ROUTES AND RENDERS
    app.route('/').get((req, res) => {
    // Change the response to render the Pug template
    res.render('pug', {
      title: 'Connected to Database',
      message: 'Please login',
      showLogin: true,
      showRegistration: true,
      showSocialAuth: true
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


  app.route('/chat').get(ensureAuthenticated, (req,res) =>{
    res.render("/chat", {user: req.user});
  });

  app.route('/auth/github').get(passport.authenticate('github'));

  app.route('/auth/github/callback').get(passport.authenticate('github',{failureRedirect: '/'}), (req,res) => {
    req.session.user_id = req.user.id;
    res.redirect('/chat'); 
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

}