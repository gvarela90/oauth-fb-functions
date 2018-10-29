const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

db.settings({
  timestampsInSnapshots: true
});

module.exports = {
  db,
  admin
};
