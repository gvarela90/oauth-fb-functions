const { db } = require('./admin');

const Users = db.collection('users');
const AccessTokens = db.collection('access_tokens');

module.exports = {
  Users,
  AccessTokens
};
