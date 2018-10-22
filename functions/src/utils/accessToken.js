const { admin, db } = require('../admin');

const AccessToken = db.collection('access_tokens');
const User = db.collection('users1');

const createAccessToken = async user => {
  const accessToken = await AccessToken.add({
    user: {
      uid: user.uid,
      email: user.email
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    clientId: ''
  });
  return accessToken;
};

const getAccessToken = async accessToken => {
  const accessTokenRef = await AccessToken.doc(accessToken).get();
  if (accessTokenRef.exists) {
    const accessTokenData = {
      uid: accessTokenRef.id,
      ...accessTokenRef.data()
    };
    console.log('accessTokenRef', accessTokenData);
    const userRef = await User.doc(accessTokenData.user.uid).get();
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
