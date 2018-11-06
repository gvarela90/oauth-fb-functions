const { verifyIdToken } = require('./utils');

const authenticated = async req =>
  new Promise((resolve, reject) => {
    verifyIdToken(req.body.token || req.query.token)
      .then(user => {
        if (user.firebase.sign_in_provider === 'custom') {
          resolve(user);
        }
        reject(new Error('unauthorized_token'));
      })
      .catch(() => {
        reject(new Error('unauthorized_token'));
      });
  });

module.exports = {
  authenticated
};
