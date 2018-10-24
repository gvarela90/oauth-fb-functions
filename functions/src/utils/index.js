const user = require('./user');
const customToken = require('./customToken');
const accessToken = require('./accessToken');

module.exports = {
  ...user,
  ...customToken,
  ...accessToken
};
