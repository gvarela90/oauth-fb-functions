// const speakeasy = require('speakeasy');
// const QRCode = require('qrcode');
const request = require('request-promise');
const { check, validationResult } = require('express-validator/check');
const utils = require('./utils');
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
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(404).json({ errors: errors.array() });
      } else {
        const url = `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET_KEY}&response=${
          req.body.grecaptcha
        }&remoteip=${req.connection.remoteAddress}`;
        const promises = [request(url), utils.getUserByEmail(req.body.email)];
        const result = {};

        Promise.all(promises)
          .then(async results => {
            const response = JSON.parse(results[0]);
            const user = results[1];
            // console.log(response);
            // console.log(user);
            result.success = response.success;
            if (result.success && user) {
              const accessToken = await utils.createAccessToken(user);
              utils.setRecaptchaStep(accessToken.uid);
              result.access_token = utils.getAccessJWT(user, accessToken);
            }
            res.status(200).json(result);
          })
          .catch(() => res.status(200).json({ success: false }));
      }
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
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(404).json({ errors: errors.array() });
      } else {
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
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(404).json({ errors: errors.array() });
      } else {
        const { accessToken, user } = await utils.decodeAndVerifyJWT(
          req.body.access_token,
          req.body.email
        );

        if (utils.alreadyLoggedIn(accessToken)) {
          res.json({ success: false, code: 'Already_logged_in' });
        } else if (utils.needsTwofa(user)) {
          // TODO: 2fa code
        } else if (utils.checkRecaptchaAndPassword(accessToken)) {
          const customToken = await utils.createCustomAuthToken(user);
          res.json({
            success: true,
            custom_token: customToken
          });
        } else {
          res.json({ success: false, code: 'unverified_access_token' });
        }
      }
    }
  );

  // app.post('/auth/2fa/setup', (req, res) => {
  //   const options = {
  //     name: config.GOOGLE_AUTHENTICATOR_NAME,
  //     length: 64
  //   };
  //   const secret = speakeasy.generateSecret(options);
  //   QRCode.toDataURL(secret.otpauth_url, (err, data_url) => {
  //     //save to logged in user.
  //     user.twofactor = {
  //       secret: '',
  //       tempSecret: secret.base32,
  //       dataURL: data_url,
  //       otpURL: secret.otpauth_url
  //     };
  //     return res.json({
  //       message: 'Verify OTP',
  //       tempSecret: secret.base32,
  //       dataURL: data_url,
  //       otpURL: secret.otpauth_url
  //     });
  //   });
  // });

  app.get('*', (req, res) => {
    res.status(404).json({ message: 'Endpoint not found' });
  });
};
