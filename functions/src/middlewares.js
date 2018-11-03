const { validationResult } = require('express-validator/check');
const { verifyIdToken } = require('./utils');

const authenticated = async (req, res, next) => {
  verifyIdToken(req.body.token || req.query.token)
    .then(user => {
      if (user.firebase.sign_in_provider === 'custom') {
        req.user = user;
        next();
      } else {
        res.status(401).json({
          success: false,
          code: 'unauthorized_token'
        });
      }
    })
    .catch(() => {
      res.status(401).json({
        success: false,
        code: 'unauthorized_token'
      });
    });
};

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    next();
  } else {
    res.status(400).json({ success: false, errors: errors.array() });
  }
};

module.exports = {
  authenticated,
  validate
};
