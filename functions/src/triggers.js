const { db, admin } = require('./admin');

const createProfile = userRecord =>
  db
    .collection('users')
    .doc(userRecord.uid)
    .set({
      email: userRecord.email,
      twofa: {
        enabled: false,
        verified: false
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    })
    .catch(console.error);

const createAuthUser = snap => {
  const newValue = snap.data();
  return admin
    .auth()
    .createUser({
      uid: snap.id,
      email: newValue.email,
      password: 'password'
    })
    .catch(console.error);
};

module.exports = {
  createProfile,
  createAuthUser
};
