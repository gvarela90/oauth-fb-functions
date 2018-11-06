const admin = require('firebase-admin');
const firebase = require('firebase');
const config = require('./config');

admin.initializeApp();
const db = admin.firestore();

firebase.initializeApp({
  apiKey: config.FIREBASE_API_KEY,
  authDomain: config.FIREBASE_AUTH_DOMAIN,
  databaseURL: config.FIREBASE_DATABASE_URL,
  projectId: config.FIREBASE_PROJECT_ID
});

db.settings({
  timestampsInSnapshots: true
});

module.exports = {
  db,
  admin,
  firebase
};
