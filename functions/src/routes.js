// const speakeasy = require('speakeasy');
// const QRCode = require('qrcode');
const request = require('request-promise');
const { check } = require('express-validator/check');
const utils = require('./utils');
const { authenticated, validate } = require('./middlewares');
// Config
const { RECAPTCHA_SECRET_KEY } = require('./config');

module.exports = app => {
  app.post(
    '/verify/recaptcha/',
    [
      check('grecaptcha')
        .exists()
        .isLength({ min: 5 }),
      check('email')
        .isEmail()
        .exists()
    ],
    validate,
    (req, res) => {
      const url = `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET_KEY}&response=${
        req.body.grecaptcha
      }&remoteip=${req.connection.remoteAddress}`;
      const promises = [request(url), utils.getUserByEmail(req.body.email)];
      const result = {};

      Promise.all(promises)
        .then(async results => {
          const response = JSON.parse(results[0]);
          const user = results[1];
          result.success = response.success;
          if (result.success && user) {
            const accessToken = await utils.createAccessToken(user);
            result.access_token = utils.getAccessJWT(user, accessToken);
          }
          res.status(200).json(result);
        })
        .catch(() => res.status(200).json({ success: false }));
    }
  );

  app.post(
    '/verify/password',
    [
      check('email')
        .isEmail()
        .exists(),
      check('access_token')
        .exists()
        .isLength({ min: 5 }),
      check('password_token')
        .exists()
        .isLength({ min: 5 })
    ],
    async (req, res) => {
      const promises = [
        utils.isPasswordToken(req.body.password_token),
        utils.decodeAndVerifyJWT(req.body.access_token, req.body.email)
      ];

      Promise.all(promises)
        .then(async results => {
          const [isPasswordToken, decodedToken] = results;
          if (isPasswordToken) {
            await utils.setPasswordStep(decodedToken.accessToken.uid);
            res.json({ success: true, access_token: req.body.access_token });
          } else {
            res.json({ success: false, code: 'invalid_password_token' });
          }
        })
        .catch(() => res.json({ success: false }));
    }
  );

  app.post(
    '/verify/twofa',
    [
      check('email')
        .isEmail()
        .exists(),
      check('access_token')
        .exists()
        .isLength({ min: 5 }),
      check('token')
        .exists()
        .isLength({ min: 6 })
    ],
    async (req, res) => {
      const decodedToken = await utils.decodeAndVerifyJWT(req.body.access_token, req.body.email);
      if (utils.needsTwofa(decodedToken.user)) {
        utils
          .getUserProfile(decodedToken.user.uid)
          .then(async userProfile => {
            if (utils.verifyOTP(userProfile.twofa_otp_secret, req.body.token)) {
              await utils.setTwofaStep(decodedToken.accessToken.uid);
              res.json({ success: true, access_token: req.body.access_token });
            } else {
              res.json({ success: false, code: 'invalid_otp' });
            }
          })
          .catch(() => res.json({ success: false, code: 'user_profile_not_found' }));
      } else {
        res.json({ success: false, code: 'twofa_is_not_enabled' });
      }
    }
  );

  app.post(
    '/token',
    [
      check('email')
        .isEmail()
        .exists(),
      check('access_token')
        .exists()
        .isLength({ min: 5 })
    ],
    async (req, res) => {
      const { accessToken, user } = await utils.decodeAndVerifyJWT(
        req.body.access_token,
        req.body.email
      );

      const needsTwofa = utils.needsTwofa(user);

      if (utils.alreadyLoggedIn(accessToken)) {
        res.json({ success: false, code: 'Already_logged_in' });
      } else if (
        (!needsTwofa && utils.checkRecaptchaAndPassword(accessToken)) ||
        (needsTwofa && utils.checkRecaptchaAndPasswordAndTwofa(accessToken))
      ) {
        const customToken = await utils.createCustomAuthToken(user);
        res.json({
          success: true,
          custom_token: customToken
        });
      } else {
        res.json({ success: false, code: 'unverified_access_token', needs_twofa: needsTwofa });
      }
    }
  );

  app.get('/twofa/setup', authenticated, async (req, res) => {
    if (req.user.twofa_enabled) {
      res.json({
        success: false,
        code: 'twofa_is_already_enabled'
      });
    } else {
      const twofaData = await utils.twofaSetup(req.user);
      res.json({
        success: true,
        ...twofaData
      });
    }
  });

  app.post(
    '/twofa/setup',
    authenticated,
    check('otp_token')
      .exists()
      .isLength({ min: 6 }),
    async (req, res) => {
      if (req.user.twofa_enabled) {
        res.json({
          success: false,
          code: 'twofa_is_already_enabled'
        });
      } else {
        utils
          .getUserProfile(req.user.uid)
          .then(userProfile => {
            if (utils.verifyOTP(userProfile.twofa_otp_temp_secret, req.body.otp_token)) {
              utils
                .enableTwofa(req.user, userProfile)
                .then(() => {
                  res.json({
                    success: true
                  });
                })
                .catch(() => {
                  res.json({
                    success: false
                  });
                });
            } else {
              res.json({
                success: false,
                code: 'invalid_token'
              });
            }
          })
          .catch(() => res.json({ success: false, code: 'user_profile_not_found' }));
      }
    }
  );

  app.delete('/twofa/setup', authenticated, async (req, res) => {
    if (req.user.twofa_enabled) {
      await utils.disableTwofa(req.user);
      res.json({
        success: true
      });
    } else {
      res.json({
        success: false,
        code: 'twofa_is_not_enabled'
      });
    }
  });

  app.get('*', (req, res) => {
    res.status(404).json({ message: 'Endpoint not found' });
  });
};
