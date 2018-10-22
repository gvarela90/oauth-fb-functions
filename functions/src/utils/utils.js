const bcrypt = require('bcrypt');
const { admin, db } = require('../admin');

const SALT_ROUNDS = 10;

const Users = db.collection('users1');

const createUser = async ({ email, password }) => {
  const hash = bcrypt.hashSync(password, SALT_ROUNDS);
  const userData = {
    email,
    twofa: {
      enabled: false,
      verified: false
    },
    passwordHash: hash,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };
  const user = await Users.add(userData);
  return user;
};

const createCustomAuthToken = async user => {
  const customToken = await admin.auth().createCustomToken(user.uid);

  return customToken;
};

const getUserByEmail = async email => {
  let user = {
    exist: false
  };
  try {
    const snapshot = await Users.where('email', '==', email)
      .limit(1)
      .get();
    snapshot.forEach(doc => {
      user = { uid: doc.id, exist: true, ...doc.data() };
    });
  } catch (error) {
    console.log(error);
  }
  return user;
};

// const getAccessToken = async accessToken => {};

const authenticate = async ({ email, password }) => {
  admin
    .auth()
    .getUserByEmail(email)
    .then(user => console.log('USER: ', user, user.uid))
    .catch(error => {
      console.log(error);
    });

  try {
    const user = await getUserByEmail(email);
    if (user.exist && bcrypt.compareSync(password, user.passwordHash)) {
      return user;
    }
  } catch (error) {
    console.log(error);
  }
  return undefined;
};

module.exports = {
  createUser,
  createCustomAuthToken,
  getUserByEmail,
  authenticate
};
