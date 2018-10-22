// const speakeasy = require('speakeasy');
// const QRCode = require('qrcode');
const { check, validationResult } = require('express-validator/check');
const utils = require('./utils');
// Config
// const config = require('./config');

module.exports = app => {
  app.post(
    '/signup',
    [
      check('email').isEmail(),
      check('password').isLength({ min: 5 }),
      check('passwordConfirmation')
        .exists()
        .custom((value, { req }) => value === req.body.password)
        .withMessage('passwordConfirmation field must have the same value as the password field')
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }
      const user = await utils.getUserByEmail(req.body.email);
      if (user.exist) {
        res.status(422).json({ code: 'ALREADY_EXIST' });
        return Promise.resolve();
      }

      const userRecord = utils.createUser(req.body);
      userRecord
        .then(newUser => {
          res.status(200).json({
            id: newUser.id
          });
        })
        .catch(error => res.status(422).json(error.errorInfo));

      return Promise.resolve();
    }
  );

  app.post(
    '/login',
    [check('email').isEmail(), check('password').isLength({ min: 5 })],
    async (req, res) => {
      const user = await utils.authenticate(req.body);
      if (user) {
        const accessToken = utils.createAccessToken(user);
        accessToken
          .then(token => {
            const ret = {
              access_token: token.id,
              needs_twofa: user.twofa.enabled
            };
            if (!user.twofa.enabled) {
              utils
                .createCustomAuthToken(user)
                .then(customToken => {
                  ret.auth_token = customToken;
                  res.json(ret);
                })
                .catch(error => {
                  res.status(422).json(error);
                });
            } else {
              res.status(200).json(ret);
            }
          })
          .catch(error => {
            console.log(error);
            res.status(422).json(error);
          });
      } else {
        res.status(422).send('Invalid email or password');
      }
    }
  );

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
    res.status(404).send({ message: 'Page not found' });
  });
};
