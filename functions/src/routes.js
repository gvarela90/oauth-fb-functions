// const speakeasy = require('speakeasy');
// const QRCode = require('qrcode');
const request = require('request');
const { check, validationResult } = require('express-validator/check');
const utils = require('./utils');
// Config
const { RECAPTCHA_SECRET_KEY } = require('./config');

module.exports = app => {
  app.post(
    '/recaptcha/verify',
    [
      check('grecaptcha')
        .exists()
        .isLength({ min: 5 })
    ],
    (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(422).json({ errors: errors.array() });
      } else {
        const url = `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET_KEY}&response=${
          req.body.grecaptcha
        }&remoteip=${req.connection.remoteAddress}`;
        request(url, (error, response, body) => {
          const result = JSON.parse(body);
          res.status(200).json({
            success: result.success
          });
        });
      }
    }
  );

  app.post('/token', [check('email').isEmail()], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(422).json({ errors: errors.array() });
    } else {
      const user = await utils.authenticate(req.body);
      if (user) {
        const accessToken = await utils.createAccessToken(user);
        const ret = {
          success: true,
          access_token: accessToken,
          needs_twofa: user.customClaims.twofa_enabled
        };
        if (!user.customClaims.twofa_enabled) {
          // TODO: test purpose, este claim se deberia de asignar cuando en realidad se verifica el 2fa.
          utils
            .createCustomAuthToken(user)
            .then(customToken => {
              ret.custom_token = customToken;
              res.json(ret);
            })
            .catch(error => {
              res.status(422).json(error);
            });
        } else {
          res.json(ret);
        }
      } else {
        res.status(422).json({ message: 'Invalid email or password' });
      }
    }
  });

  app.get('/2fa', [check('access_token').exists()], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    const { access_token: accessToken } = req.query;
    const accessTokenData = await utils.getAccessTokenInfo(accessToken);
    res.status(200).json(accessTokenData);
  });

  // app.post('/auth/2fa/verify', (req, res) => {
  //   res.status(200).send({
  //     message: '2fa verify endpoint'
  //   });
  // });

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

  // app.post('/auth/inactive', (req, res) => {
  //   res.status(200).send({
  //     message: 'inactive endpoint'
  //   });
  // });

  // app.post('/auth/refresh-token', (req, res) => {
  //   res.status(200).send({
  //     message: 'Refresh token endpoint'
  //   });
  // });

  app.get('*', (req, res) => {
    res.status(404).json({ message: 'Endpoint not found' });
  });
};
