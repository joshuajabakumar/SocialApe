// Require and Initialize Firebase Functions and Admin
const functions = require('firebase-functions');

// Require and Initialize ExpressJS
const express = require('express');
const app = express();

const { getAllScreams, postOneScream, getScream, commentOnScream, likeScream, unLikeScream, deleteScream } = require('./handlers/screams');
const { signUp, login, uploadImage, addUserDetails, getAuthenticatedUser } = require('./handlers/users');
const FBAuth = require('./util/FBAuth');

/**** User Routes ****/

// Signup Route
app.post('/createUser', signUp);
// Login Route
app.post('/login', login)
// Upload User Image
app.post('/user/image', FBAuth, uploadImage);
// Add User Details
app.post('/user', FBAuth, addUserDetails);
// Get Authenticated User Details
app.get('/user', FBAuth, getAuthenticatedUser);

/**** Scream Routes ****/

// Get All Screams Route
app.get('/screams', getAllScreams);
// Create Screams Route
app.post('/screams', FBAuth, postOneScream);
// Get a Scream
app.get('/screams/:screamId', getScream);
// Delete a Scream
app.delete('/screams/:screamId/', FBAuth, deleteScream);
// Like a Scream
app.get('/screams/:screamId/like', FBAuth, likeScream);
// Todo Unlike a Scream
app.get('/screams/:screamId/unLike', FBAuth, unLikeScream);
// Add a comment to a Scream
app.post('/screams/:screamId/comment', FBAuth, commentOnScream);

exports.api = functions.region('asia-northeast1').https.onRequest(app);

//exports.api = functions.region('asia-northeast1')