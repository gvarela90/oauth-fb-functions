/* eslint no-console: ["error", { allow: ["warn", "error"] }] */
const { admin } = require('./admin');
const { UserProfiles } = require('./collections');

const createProfile = userRecord =>
  UserProfiles.doc(userRecord.uid)
    .set({ createdAt: admin.firestore.FieldValue.serverTimestamp() })
    .catch(err => console.error(err));

module.exports = {
  createProfile
};
