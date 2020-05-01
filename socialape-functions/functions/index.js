// Require and Initialize Firebase Functions and Admin
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

const firebaseConfig = {
    apiKey: "AIzaSyCWSncwQbMwewVgmChsa_c5tWaew5QiIjg",
    authDomain: "socialape-46d95.firebaseapp.com",
    databaseURL: "https://socialape-46d95.firebaseio.com",
    projectId: "socialape-46d95",
    storageBucket: "socialape-46d95.appspot.com",
    messagingSenderId: "67082907437",
    appId: "1:67082907437:web:e7814324a89886ad0feda4",
    measurementId: "G-97FST4VB8Q"
};

// Require and Initialize Firebase
const firebase = require('firebase');
firebase.initializeApp(firebaseConfig);

// Require and Initialize ExpressJS
const express = require('express');
const app = express();

// Get Screams
app.get('/screams', (request, response)=>{
    db.collection('screams').orderBy('createdAt','desc').get()
    .then(data => {
        let screams = [];
        data.forEach(doc=>{
            screams.push({
                screamId: doc.id,
                body: doc.data().body,
                userHandle: doc.data().userHandle,
                createdAt: doc.data().createdAt
            });
        });

        return response.json(screams)
    })
    .catch((err)=> {
        console.error(err);
    });
});

// Create Screams
app.post('/screams', (request, response)=>{
    const newScream = {
        body: request.body.body,
        userHandle: request.body.userHandle,
        createdAt: new Date().toISOString()
    };

    db.collection('screams').add(newScream)
        .then(doc => {
            response.json({ message: `document ${doc.id} created successfully` });
        })
        .catch(err => {
            response.status(500).json({error : 'something went wrong'});
            console.error(err);
        })
});

// Helper Function - Check if provided string is empty
const isEmpty = (string) => {
    if(string.trim() === '') {
        return true;
    } else {
        return false;
    }
}

// Helper Function - Checki if provided email is valid
const isEmail = (email) => {
    const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    if(email.match(emailRegEx)) {
        return true;
    } else {
        return false;
    }
}

// Signup User
app.post('/createUser', (request, response)=>{

    // Get new user details from the request body
    const newUser = {
        email: request.body.email,
        password: request.body.password,
        confirmPassword: request.body.confirmPassword,
        handle: request.body.handle
    }
    let token,userId;
    let errors = {};

    if(isEmpty(newUser.email)){
        errors.email= 'Must not be empty'
    } else if (!isEmail(newUser.email)){
        errors.email= 'Must be a valid email Address'
    }

    if(isEmpty(newUser.password)){
        errors.password = 'Must not be empty'
    }
    if(newUser.password !== newUser.confirmPassword){
        errors.confirmPassword = 'Passwords must be the same'
    }

    if(isEmpty(newUser.handle)){
        errors.handle = 'Must not be empty'
    }

    if(Object.keys(errors).length > 0){
        return response.status(400).json(errors);
    }

    db.doc(`/users/${newUser.handle}`).get()
    .then(doc => {
        if(doc.exists){
            return response.status(400).json({ handle : 'This handle is already taken' });
        } else {
            return firebase.auth().createUserWithEmailAndPassword(newUser.email, newUser.password)
            .then((data)=>{
                userId = data.user.uid;
                return data.user.getIdToken();
            })
            .then(idToken => {
                token = idToken;
                const userCredentials = {
                    handle: newUser.handle,
                    email: newUser.email,
                    createdAt: new Date().toISOString(),
                    userId: userId
                };
                return db.doc(`/users/${newUser.handle}`).set(userCredentials);
            })
            .then(() => {
                return response.status(201).json({ token });
            })
            .catch((err)=>{
                console.error(err);
                if(err.code === "auth/email-already-in-use"){
                    return response.status(400).json({ email: 'Email is already in use' });
                } else if(err.code === "auth/weak-password") {
                    return response.status(400).json({ password: 'Password too weak' });
                } else {
                    return response.status(500).json({ error: err.code });
                }
            }); 
        }
    })
    
});

// Login User
app.post('/login', (request, response)=>{
    const user = {
        email: request.body.email,
        password: request.body.password
    };
    let errors = {};

    if(isEmpty(user.email)){
        errors.email= 'Must not be empty';
    }
    if(isEmpty(user.password)){
        errors.password= 'Must not be empty';
    }

    if(Object.keys(errors).length > 0){
        return response.status(400).json(errors);
    }

    firebase.auth().signInWithEmailAndPassword(user.email, user.password)
    .then((data)=>{
        console.log(`getIdToken ${data.user.getIdToken()}`);
        return data.user.getIdToken();
    })
    .then((token)=>{
        return response.json({token});
    })
    .catch(err => {
        console.log(err);
        if(err.code === "auth/wrong-password"){
            return response.status(400).json({general: 'Incorrect Passoword'});
        } else {
            return response.status(500).json({error: err.code});
        }
    }); 
})

exports.api = functions.https.onRequest(app);   