const { db } = require('./admin');

const Users = db.collection('users');
const UserProfiles = db.collection('user_profiles');
const AccessTokens = db.collection('access_tokens');

module.exports = {
  Users,
  AccessTokens,
  UserProfiles
};
