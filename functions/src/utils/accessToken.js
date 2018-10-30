const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { admin } = require('../admin');
const { Users, AccessTokens } = require('../collections');

const ACCESS_TOKEN_STEPS = {
  recaptcha: { recaptcha_verified: true },
  password: { password_verified: true },
  twofa: { twofa_verified: true }
};

const createAccessToken = async user => {
  const secret = crypto.randomBytes(20).toString('hex');
  const data = {
    user: {
      uid: user.uid,
      email: user.email
    },
    secret,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    clientId: '',
    loggedIn: false,
    ...ACCESS_TOKEN_STEPS.recaptcha
  };
  const accessToken = await AccessTokens.add(data);
  return {
    uid: accessToken.id,
    ...data
  };
};

const getAccessJWT = (user, accessToken) => {
  const jwtData = {
    access_token: accessToken.uid,
    user: user.uid
  };

  return jwt.sign(jwtData, accessToken.secret, { expiresIn: '10m', subject: user.email });
};

const updateAccessToken = async (uid, newData) => {
  await AccessTokens.doc(uid).update(newData);
};

const setRecaptchaStep = async uid => {
  await updateAccessToken(uid, ACCESS_TOKEN_STEPS.recaptcha);
};

const setPasswordStep = async uid => {
  await updateAccessToken(uid, ACCESS_TOKEN_STEPS.password);
};

const setTwofaStep = async uid => {
  await updateAccessToken(uid, ACCESS_TOKEN_STEPS.twofa);
};

const checkRecaptcha = accessToken => accessToken.recaptcha_verified === true;

const checkRecaptchaAndPassword = accessToken =>
  checkRecaptcha(accessToken) && accessToken.password_verified === true;

const checkRecaptchaAndPasswordAndTwofa = accessToken =>
  checkRecaptchaAndPassword(accessToken) && accessToken.twofa_verified === true;

const decodeAndVerifyJWT = async (jwtoken, email) => {
  const decodedJWT = jwt.decode(jwtoken);
  const accessTokenRef = await AccessTokens.doc(decodedJWT.access_token).get();
  const accessToken = {
    uid: accessTokenRef.id,
    ...accessTokenRef.data()
  };
  jwt.verify(jwtoken, accessToken.secret, { subject: email });
  delete accessToken.secret;
  const user = await admin.auth().getUser(decodedJWT.user);
  return {
    accessToken,
    user
  };
};

const alreadyLoggedIn = accessToken => accessToken.loggedIn === true;

const getAccessToken = async uid => {
  const accessTokenRef = await AccessTokens.doc(uid).get();
  if (accessTokenRef.exists) {
    const accessTokenData = {
      uid: accessTokenRef.id,
      ...accessTokenRef.data()
    };
    const userRef = await Users.doc(accessTokenData.user.uid).get();
    if (userRef.exists) {
      accessTokenData.user = {
        uid: userRef.id,
        ...userRef.data()
      };
    }
    return accessTokenData;
  }
  return {};
};

const getAccessTokenInfo = async accessToken => {
  await getAccessToken(accessToken);
};

module.exports = {
  createAccessToken,
  setRecaptchaStep,
  setPasswordStep,
  setTwofaStep,
  checkRecaptcha,
  checkRecaptchaAndPassword,
  checkRecaptchaAndPasswordAndTwofa,
  updateAccessToken,
  getAccessTokenInfo,
  getAccessJWT,
  decodeAndVerifyJWT,
  alreadyLoggedIn
};
