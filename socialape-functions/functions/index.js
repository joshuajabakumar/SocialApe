// Require and Initialize Firebase Functions and Admin
const functions = require('firebase-functions');

// Require and Initialize ExpressJS
const express = require('express');
const app = express();

const { getAllScreams, postOneScream } = require('./handlers/screams');
const { signUp, login, uploadImage } = require('./handlers/users');
const FBAuth = require('./util/FBAuth');

// Signup Route
app.post('/createUser', signUp);

// Login Route
app.post('/login', login)

// Upload User Image
app.post('/user/image', FBAuth, uploadImage);

// Get Screams Route
app.get('/screams', getAllScreams);

// Create Screams Route
app.post('/screams', FBAuth, postOneScream);

exports.api = functions.https.onRequest(app);   