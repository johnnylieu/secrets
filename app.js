require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');

// const encrypt = require('mongoose-encryption');

// var md5 = require('md5');

// const bcrypt = require('bcrypt');
// const saltRounds = 10;

const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');

port = process.env.PORT || 3000;

const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static('public'));

app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('mongodb://localhost:27017/userDB');

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

userSchema.plugin(passportLocalMongoose);

// userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ['password']});

const User = mongoose.model('User', userSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get('/', function(req, res){
    res.render('home');
});

app.get('/logout', function(req, res){
    req.logout(function(err){
        if (err) {
            console.log(err);
        } else { res.redirect('/'); }
    });
});

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