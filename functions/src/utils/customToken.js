const { admin } = require('../admin');

const createCustomAuthToken = async (user, claims) => {
  const customToken = await admin.auth().createCustomToken(user.uid, claims);

  return customToken;
};

const verifyIdToken = async idToken => {
  const token = await admin.auth().verifyIdToken(idToken);
  return token;
};

const isPasswordToken = async idToken => {
  const decodedToken = await verifyIdToken(idToken);
  return decodedToken.firebase.sign_in_provider === 'password';
};

module.exports = {
  createCustomAuthToken,
  verifyIdToken,
  isPasswordToken
};
