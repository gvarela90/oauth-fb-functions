import { auth } from "firebase-admin";
const rp = require("request-promise");
import {
  getUserByEmail,
  needsTwofa,
  signInWithEmailAndPassword,
  getUserProfile,
  createCustomAuthToken,
  twofaSetup,
  enableTwofa,
  disableTwofa,
  verifyOTP
} from "./utils";
import { authenticated } from "./authentication";
import config from "./config";
import { ERROR_CODES } from "./constants";

const login = async (req, res) => {
  let user: auth.UserRecord;
  const recaptchaRequestOptionsVerify = {
    method: "POST",
    uri: "https://www.google.com/recaptcha/api/siteverify",
    form: {
      secret: config.RECAPTCHA_SECRET_KEY,
      response: req.body.grecaptcha,
      remoteip: req.connection.remoteAddress
    },
    json: true
  };

  try {
    user = await getUserByEmail(req.body.email);
  } catch (e) {
    return res.status(400).json({
      code: e.code,
      message: e.message
    });
  }

  const isTwofaEnabled = needsTwofa(user);
  if (isTwofaEnabled && !req.body.otp_token) {
    return res.status(400).json({ code: ERROR_CODES.TWOFA_NEEDED });
  }

  try {
    const response = await rp(recaptchaRequestOptionsVerify);
    if (!response.success) {
      return res.status(400).json({ code: ERROR_CODES.RECAPTCHA_INVALID });
    }
  } catch (e) {
    return res.status(500).json({
      code: e.code,
      message: e.message
    });
  }

  try {
    const [, userProfile] = await Promise.all([
      signInWithEmailAndPassword(req.body.email, req.body.password),
      getUserProfile(user.uid)
    ]);

    if (
      isTwofaEnabled &&
      userProfile &&
      !verifyOTP(userProfile.twofa_otp_secret, req.body.otp_token)
    ) {
      return res.status(400).json({ code: ERROR_CODES.OTP_INVALID });
    }

    const customToken = await createCustomAuthToken(user);
    return res.json({
      customToken: customToken
    });
  } catch (e) {
    return res.status(400).json({
      code: e.code,
      message: e.message
    });
  }
};

const getSetUp2fa = async (req, res) => {
  let user: auth.DecodedIdToken;
  try {
    user = await authenticated(req);
  } catch (error) {
    return res.status(401).json({
      code: ERROR_CODES.TOKEN_INVALID,
      message: error.message
    });
  }

  if (user.twofa_enabled) {
    return res.status(400).json({
      code: ERROR_CODES.TWOFA_ENABLED
    });
  }
  try {
    const twofaData = await twofaSetup(user);
    return res.json({
      ...twofaData
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
      code: error.code
    });
  }
};

const postSetUp2fa = async (req, res) => {
  let user: auth.DecodedIdToken;
  let userProfile: FirebaseFirestore.DocumentData;

  try {
    user = await authenticated(req);
  } catch (error) {
    return res.status(401).json({
      code: ERROR_CODES.TOKEN_INVALID,
      message: error.message
    });
  }

  if (user.twofa_enabled) {
    return res.status(400).json({
      code: ERROR_CODES.TWOFA_ENABLED
    });
  }
  try {
    userProfile = await getUserProfile(user.uid);
  } catch (error) {
    return res.status(400).json({
      code: ERROR_CODES.PROFILE_NOT_FOUND,
      message: error.message
    });
  }

  if (verifyOTP(userProfile.twofa_otp_temp_secret, req.body.otp_token)) {
    try {
      await enableTwofa(user, userProfile);
      return res.json({});
    } catch (e) {
      return res.status(400).json({ code: e.code, message: e.message });
    }
  }

  return res.status(400).json({
    code: ERROR_CODES.OTP_INVALID
  });
};

const deleteSetUp2fa = async (req, res) => {
  let user: auth.DecodedIdToken;
  try {
    user = await authenticated(req);
  } catch (error) {
    return res.status(401).json({
      code: ERROR_CODES.TOKEN_INVALID,
      message: error.message
    });
  }

  if (user.twofa_enabled) {
    try {
      await disableTwofa(user);
      return res.json({});
    } catch (e) {
      return res.status(400).json({ code: e.code, message: e.message });
    }
  }
  return res.status(400).json({
    code: ERROR_CODES.TWOFA_DISABLED
  });
};

export { login, getSetUp2fa, postSetUp2fa, deleteSetUp2fa };
