require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const encrypt = require('mongoose-encryption');

port = process.env.PORT || 3000;

const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static('public'));

mongoose.connect('mongodb://localhost:27017/userDB');

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ['password']});

const User = mongoose.model('User', userSchema);

app.get('/', function(req, res){
    res.render('home');
});

app.route('/login')
    .get(function(req, res){
        res.render('login');
    })
    .post(function(req, res){
        User.findOne({email: req.body.username}, function(err, result){
            if (err) {
                console.log(err);
            } else if (!result) {
                res.send(`<h1>No such user exists, please check your spelling or sign up.</h1>`);
            } else if (result) {
                if (result.password === req.body.password) {
                    res.render(`secrets`);
                } else {res.send(`<h1>Incorrect password, please try again.</h1>`);}
            };
        });
    });

app.route('/register')
    .get(function(req, res){
        res.render('register');
    })
    .post(function(req, res){
        newUser = new User({
            email: req.body.username,
            password: req.body.password
        });
        newUser.save(function(err, result){
            if (!err) {
                res.render('secrets');
            } else {res.send(err);}
        });
    });

app.listen(port, function(){
    console.log(`Listening on port ${port}`);
});