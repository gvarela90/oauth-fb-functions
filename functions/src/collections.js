const { db } = require('./admin');

const UserProfiles = db.collection('user_profiles');

module.exports = {
  UserProfiles
};
