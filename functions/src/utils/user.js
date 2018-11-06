/* eslint no-console: ["error", { allow: ["warn", "error"] }] */

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { admin, firebase } = require('../admin');
const { GOOGLE_AUTHENTICATOR_NAME } = require('../config');
const { UserProfiles } = require('../collections');

const getUserByEmail = async email => {
  const user = await admin.auth().getUserByEmail(email);
  return user;
};

const signInWithEmailAndPassword = async (email, password) => {
  const user = await firebase.auth().signInWithEmailAndPassword(email, password);
  return user;
};

const getUserProfile = async uid =>
  new Promise((resolve, reject) => {
    UserProfiles.doc(uid)
      .get()
      .then(userProfileDoc => {
        if (userProfileDoc.exists) {
          resolve(userProfileDoc.data());
        }
        reject(new Error('User profile not found.'));
      });
  });

const needsTwofa = user => user.customClaims && user.customClaims.twofa_enabled === true;

const verifyOTP = (secret, otpToken) =>
  speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    window: 1,
    token: otpToken
  });

const twofaSetup = async user => {
  const options = {
    name: `${GOOGLE_AUTHENTICATOR_NAME} - ${user.email}`,
    length: 64
  };
  const secret = speakeasy.generateSecret(options);
  return new Promise((resolve, reject) => {
    QRCode.toDataURL(secret.otpauth_url, async (error, dataURL) => {
      if (error) {
        reject(error);
      }
      UserProfiles.doc(user.uid)
        .set({ twofa_otp_temp_secret: secret.base32 }, { merge: true })
        .then(() => {
          resolve({
            dataURL,
            otpURL: secret.otpauth_url
          });
        })
        .catch(err => {
          console.error(err);
        });
    });
  });
};

const enableTwofa = async (user, profile) =>
  new Promise(async (resolve, reject) => {
    const userProfile = profile || (await getUserProfile(user.uid).catch(err => reject(err)));
    if (userProfile.twofa_otp_temp_secret) {
      Promise.all([
        UserProfiles.doc(user.uid).set(
          { twofa_otp_secret: userProfile.twofa_otp_temp_secret },
          { merge: true }
        ),
        admin.auth().setCustomUserClaims(user.uid, { twofa_enabled: true, twofa_verified: true })
      ]);
      resolve();
    }
    reject(new Error('User profile not set properly.'));
  });

const disableTwofa = async user => {
  await admin.auth().setCustomUserClaims(user.uid, { twofa_enabled: false });
};

module.exports = {
  getUserByEmail,
  needsTwofa,
  verifyOTP,
  twofaSetup,
  enableTwofa,
  disableTwofa,
  getUserProfile,
  signInWithEmailAndPassword
};
