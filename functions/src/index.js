const functions = require('firebase-functions');
const cors = require('cors');
const express = require('express');

const triggers = require('./triggers');

/* Express with CORS & automatic trailing '/' solution */
const app = express();
app.use(cors());

// not as clean, but a better endpoint to consume
const api = functions.https.onRequest((request, response) => {
  if (!request.path) {
    request.url = `/${request.url}`; // prepend '/' to keep query params if any
  }
  return app(request, response);
});

require('./routes')(app);

module.exports = {
  auth: api,
  userOnCreate: functions.firestore.document('users/{userId}').onCreate(triggers.createAuthUser)
  // authOnCreate: functions.auth.user().onCreate(triggers.createProfile)
};
