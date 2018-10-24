const jwt = require('jsonwebtoken');
const { admin } = require('../admin');
const { Users, AccessTokens } = require('../collections');
const { JWT_SECRET } = require('../config');

const createAccessToken = async user => {
  const accessToken = await AccessTokens.add({
    user: {
      uid: user.uid,
      email: user.email
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    clientId: ''
  });

  const jwtData = {
    access_token: accessToken.id,
    user: user.uid
  };

  return jwt.sign(jwtData, JWT_SECRET, { expiresIn: '10m' });
};

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
  getAccessTokenInfo
};
