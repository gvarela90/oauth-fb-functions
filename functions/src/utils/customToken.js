const { admin } = require('../admin');

const createCustomAuthToken = async (user, claims) => {
  const customToken = await admin.auth().createCustomToken(user.uid, claims);

  return customToken;
};

const verifyIdToken = async idToken => {
  const token = await admin.auth().verifyIdToken(idToken);
  return token;
};

module.exports = {
  createCustomAuthToken,
  verifyIdToken
};
