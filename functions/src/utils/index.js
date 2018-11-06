const user = require('./user');
const customToken = require('./customToken');

module.exports = {
  ...user,
  ...customToken
};
