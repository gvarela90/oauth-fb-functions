const { admin } = require('../admin');

const authenticate = async ({ email }) => {
  const user = await admin.auth().getUserByEmail(email);
  return user;
};

const getUserByEmail = async email => {
  const user = await admin.auth().getUserByEmail(email);
  return user;
};

const needsTwofa = user => user.customClaims.twofa_enabled === true;

module.exports = {
  authenticate,
  getUserByEmail,
  needsTwofa
};
