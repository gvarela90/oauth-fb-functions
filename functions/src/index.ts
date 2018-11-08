const functions = require('firebase-functions');
const controllers = require('./controllers');

const triggers = require('./triggers');

module.exports = {
  authOnCreate: functions.auth.user().onCreate(triggers.createProfile),
  login: functions.https.onRequest(controllers.login),
  getSetUp2fa: functions.https.onRequest(controllers.getSetUp2fa),
  postSetUp2fa: functions.https.onRequest(controllers.postSetUp2fa),
  deleteSetUp2fa: functions.https.onRequest(controllers.deleteSetUp2fa)
};
