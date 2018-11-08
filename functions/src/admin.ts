import * as admin from "firebase-admin";
const firebase = require("firebase");
import config from "./config";

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

export { db, admin, firebase };
