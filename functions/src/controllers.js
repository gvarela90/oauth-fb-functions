const rp = require('request-promise');
const utils = require('./utils');
const { authenticated } = require('./authentication');
const { RECAPTCHA_SECRET_KEY } = require('./config');

const cors = res => {
  res.header('Content-Type', 'application/json');
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
};

const login = async (req, res) => {
  const requestOptions = {
    method: 'POST',
    uri: 'https://www.google.com/recaptcha/api/siteverify',
    form: {
      secret: RECAPTCHA_SECRET_KEY,
      response: req.body.grecaptcha,
      remoteip: req.connection.remoteAddress
    },
    json: true
  };

  try {
    cors(res);
    const user = await utils.getUserByEmail(req.body.email);
    const needsTwofa = utils.needsTwofa(user);
    if (needsTwofa && !req.body.otp_token) {
      return res.status(422).json({ success: false, code: 'twofa_needed' });
    }

    const response = await rp(requestOptions);
    if (!response.success) {
      return res.status(422).json({ success: false, code: 'recaptcha_is_not_valid' });
    }

    const [, userProfile] = await Promise.all([
      utils.signInWithEmailAndPassword(req.body.email, req.body.password),
      utils.getUserProfile(user.uid)
    ]);

    if (
      needsTwofa &&
      userProfile &&
      !utils.verifyOTP(userProfile.twofa_otp_secret, req.body.otp_token)
    ) {
      return res.status(422).json({ success: false, code: 'invalid_otp' });
    }

    const customToken = await utils.createCustomAuthToken(user);
    return res.json({
      success: true,
      custom_token: customToken
    });
  } catch (e) {
    const result = {
      success: false
    };
    if (e.code) {
      result.code = e.code;
    }
    return res.status(422).json(result);
  }
};

const getSetUp2fa = async (req, res) => {
  try {
    cors(res);
    const user = await authenticated(req);
    if (user.twofa_enabled) {
      return res.status(422).json({
        success: false,
        code: 'twofa_is_already_enabled'
      });
    }

    const twofaData = await utils.twofaSetup(user);
    return res.json({
      success: true,
      ...twofaData
    });
  } catch (error) {
    return res.status(422).json({
      success: false,
      code: 'unauthorized_token'
    });
  }
};

const postSetUp2fa = async (req, res) => {
  try {
    cors(res);
    const user = await authenticated(req);
    if (user.twofa_enabled) {
      return res.status(422).json({
        success: false,
        code: 'twofa_is_already_enabled'
      });
    }

    try {
      const userProfile = await utils.getUserProfile(user.uid);
      if (utils.verifyOTP(userProfile.twofa_otp_temp_secret, req.body.otp_token)) {
        await utils.enableTwofa(user, userProfile);
        return res.json({
          success: true
        });
      }
      return res.status(422).json({
        success: false,
        code: 'invalid_token'
      });
    } catch (e) {
      return res.status(422).json({ success: false, code: 'user_profile_not_found' });
    }
  } catch (error) {
    return res.status(422).json({
      success: false,
      code: 'unauthorized_token'
    });
  }
};

const deleteSetUp2fa = async (req, res) => {
  try {
    cors(res);
    const user = await authenticated(req);
    if (user.twofa_enabled) {
      await utils.disableTwofa(user);
      return res.json({
        success: true
      });
    }
    return res.status(422).json({
      success: false,
      code: 'twofa_is_not_enabled'
    });
  } catch (error) {
    return res.status(422).json({
      success: false,
      code: 'unauthorized_token'
    });
  }
};

module.exports = {
  login,
  getSetUp2fa,
  postSetUp2fa,
  deleteSetUp2fa
};
