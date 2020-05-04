const { admin, db } = require('../util/admin');
const firebaseConfig = require('../util/config');

// Require and Initialize Firebase
const firebase = require('firebase');
firebase.initializeApp(firebaseConfig);

const { validateSignUpData, validateLoginData, reduerUserDetails } = require('../util/validators');

// Signup
exports.signUp = (request, response)=>{

    // Get new user details from the request body
    const newUser = {
        email: request.body.email,
        password: request.body.password,
        confirmPassword: request.body.confirmPassword,
        handle: request.body.handle
    }

    // Setup default image
    const noImg = 'no-img.png';
    let token,userId;

    const { valid, errors } = validateSignUpData(newUser);

    if(!valid) {
        return response.status(400).json(errors);
    }

    // Set User Handle to User Document
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
                    imageUrl: `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${noImg}?alt=media`,
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
    
}

// Login
exports.login = (request, response)=>{
    const user = {
        email: request.body.email,
        password: request.body.password
    };

    const { valid, errors } = validateLoginData(user);

    if(!valid) {
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
}

// Add User Details
exports.addUserDetails = (request, response) => {
    let userDetails = reduerUserDetails(request.body);

    console.log(`The user Details ${userDetails}`);
    console.log(userDetails);

    db.doc(`/users/${request.user.handle}`).update(userDetails)
    .then(()=> {
        return response.status(200).json({ message: 'Details added successfully' });
    })
    .catch(err => {
        console.error(err);
        response.status(500).json({ error: err.code });
    })
}

// Get Authenticated User Details
exports.getAuthenticatedUser = (request, response) => {
    let userData = {};

    db.doc(`/users/${request.user.handle}`).get()
    .then(doc => {
        if(doc.exists){
            userData.credentials = doc.data();
            return db.collection('likes').where('userHandle', '==', request.user.handle).get()
            .then(data => {
                userData.likes = [];
                data.forEach(doc => {
                    userData.likes.push(doc.data());
                })

                return response.status(200).json(userData);
            })
            .catch(err => {
                console.error(err);
                return response.status(500).json({ error : err.code});
            })
        }
    })
}

// Upload User Image
exports.uploadImage = (request, response)=>{
    const BusBoy = require('busboy');
    const path = require('path');
    const os = require('os');
    const fs = require('fs');

    let imageFileName;
    let imageToBeUploaded = {};

    // Initialize Busboy
    const busBoy = BusBoy({ headers: request.headers });

    // Busboy on Upload event
    busBoy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        
        if(mimetype !== 'image/jpeg' && mimetype !== 'image/png') {
            return response.status(400).json({ error: 'wrong file type submitted' });
        }
        // Get the file extension Type
        const imageExtension = filename.split('.')[filename.split('.').length -1];
        // Generate a random file name
        imageFileName = `${Math.round(Math.random()*1000000000000)}.${imageExtension}`;
        // Get File Path
        const filepath = path.join(os.tmpdir(), imageFileName);
        imageToBeUploaded = { filepath, mimetype };
        // Write File
        file.pipe(fs.createWriteStream(filepath));
    })

    // Busboy Finish event 
    busBoy.on('finish', ()=>{
        // Upload the File that has been  to Fire Storage
        admin.storage().bucket().upload(imageToBeUploaded.filepath, {
            resumable: false,
            metadata: {
                metadata: {
                    contentType: imageToBeUploaded.mimetype
                }
            }
        })
        .then(()=>{
            // URL Schema is {https://firebasestorage.googleapis.com/v0/b/}{storageBucketKey in Config file}{/o/}{imageFileName}{?alt=media}
            const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${imageFileName}?alt=media`;

            // Update the image URL to the User Details Document
            // Since Users is configured with Protected MiddleWare FBAuth request will contain user data
            return db.doc(`/users/${request.user.handle}`).update({
                imageUrl
            })
            .then(()=>{
                return response.status(200).json({ mesage: 'Image uploaded successfully' });
            })
            .catch((err)=> {
                console.error(err);
                return response.status(500).json({ error: err.code });
            });
        });
    });

    busBoy.end(request.rawBody);
}