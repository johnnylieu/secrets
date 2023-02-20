require('dotenv').config();
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;
const FacebookStrategy = require('passport-facebook');
const findOrCreate = require('mongoose-findorcreate');

// const encrypt = require('mongoose-encryption');

// var md5 = require('md5');

// const bcrypt = require('bcrypt');
// const saltRounds = 10;

const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');

port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static('public'));

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('mongodb://localhost:27017/userDB');

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    facebookId: String,
});

// hash and salt passwords and save users
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ['password']});

const User = mongoose.model('User', userSchema);

passport.use(User.createStrategy());
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
// passport.deserializeUser(function(user, done) {
// done(null, user);
// });

passport.deserializeUser(function(id, done){
    User.findById(id, function(err, user) {
        done(err, user);
    });
});

passport.use(new GoogleStrategy({
    clientID:     process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(request, accessToken, refreshToken, profile, done) {
    console.log(`Google profile: ${profile}`);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return done(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(`Facebook profile: ${profile}`);
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get('/', function(req, res){
    res.render('home');
});

app.get('/auth/google',
    passport.authenticate('google', {scope: ['profile']})
);

app.get('/auth/google/secrets',
    passport.authenticate('google', {failureRedirect: '/login'}),
    function(req, res){
        res.redirect('/secrets');
    }
);

app.get('/auth/facebook',
  passport.authenticate('facebook')
);

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
});

app.get('/logout', function(req, res){
    req.logout(function(err){
        if (err) {
            console.log(err);
        } else { res.redirect('/'); }
    });
});

// app.post('/logout', function(req, res, next){
//     req.logout(function(err) {
//       if (err) { return next(err); }
//       res.redirect('/');
//     });
//   });

app.get('/secrets', function(req, res){
    if (req.isAuthenticated()) {
        res.render('secrets');
    } else { res.redirect('/login'); }
});

app.route('/login')
    .get(function(req, res){
        res.render('login');
    })
    .post(function(req, res){
        const user = new User({
            username: req.body.username,
            password: req.body.password
        });

        req.login(user, function(err){
            if (err) {
                console.log(err);
                res.redirect('/login');
            } else {
                passport.authenticate("local")(req, res, function(){
                res.redirect('secrets');
            });
        }
        });

        // User.findOne({email: req.body.username}, function(err, result){
        //     if (err) {
        //         console.log(err);
        //     } else if (!result) {
        //         res.send(`<h1>No such user exists, please check your spelling or sign up.</h1>`);
        //     } else if (result) {
        //         bcrypt.compare(req.body.password, result.password, function(err, results){
        //             if (results === true){
        //                 res.render(`secrets`);
        //             }
        //             else {res.send(`<h1>Incorrect password, please try again.</h1>`);}
        //         });
        //     };
        // });
    });

app.route('/register')
    .get(function(req, res){
        res.render('register');
    })
    .post(function(req, res){
        User.register({username: req.body.username}, req.body.password, function(err, user){
            if (err) {
                console.log(err);
                res.redirect("register");
            } else {
                passport.authenticate("local")(req, res, function(){
                    res.redirect('secrets');
                });
            }
        });

        // bcrypt.hash(req.body.password, saltRounds, function(err, hash){
        //     newUser = new User({
        //         email: req.body.username,
        //         password: hash
        //     });
        //     newUser.save(function(err, result){
        //         if (!err) {
        //             res.render('secrets');
        //         } else {res.send(err);}
        //     });
        // });
    });

app.listen(port, function(){
    console.log(`Listening on port ${port}`);
});