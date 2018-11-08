/* eslint no-console: ["error", { allow: ["warn", "error"] }] */

import { generateSecret, totp } from "speakeasy";
import * as QRCode from "qrcode";
import { admin, firebase } from "../admin";
import config from "../config";
import { UserProfiles } from "../collections";
import { TwofaSetupResult } from "../types";

const getUserByEmail = async (
  email: string
): Promise<admin.auth.UserRecord> => {
  const user = await admin.auth().getUserByEmail(email);
  return user;
};

const signInWithEmailAndPassword = async (
  email: string,
  password: string
): Promise<void> => {
  await firebase.auth().signInWithEmailAndPassword(email, password);
};

const getUserProfile = async (
  uid: string
): Promise<FirebaseFirestore.DocumentData> =>
  new Promise((resolve, reject) => {
    UserProfiles.doc(uid)
      .get()
      .then(userProfileDoc => {
        if (userProfileDoc.exists) {
          resolve(userProfileDoc.data());
        }
        reject(new Error("User profile not found."));
      });
  });

const needsTwofa = (user: admin.auth.UserRecord): boolean =>
  user.customClaims && user.customClaims["twofa_enabled"] === true;

const verifyOTP = (secret: string, otpToken: string): boolean =>
  totp.verify({
    secret,
    encoding: "base32",
    window: 1,
    token: otpToken
  });

const twofaSetup = async (
  user: admin.auth.DecodedIdToken
): Promise<TwofaSetupResult> => {
  const options = {
    name: `${config.GOOGLE_AUTHENTICATOR_NAME} - ${user.email}`,
    length: 64
  };
  const secret = generateSecret(options);
  return new Promise<TwofaSetupResult>((resolve, reject) => {
    QRCode.toDataURL(secret.otpauth_url, async (error, dataURL: string) => {
      if (error) {
        reject(error);
      }
      UserProfiles.doc(user.uid)
        .set({ twofa_otp_temp_secret: secret.base32 }, { merge: true })
        .then(() => {
          resolve(<TwofaSetupResult>{
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

const enableTwofa = async (
  user: admin.auth.DecodedIdToken,
  profile: FirebaseFirestore.DocumentData
): Promise<void> =>
  new Promise<void>(async (resolve, reject) => {
    const userProfile =
      profile || (await getUserProfile(user.uid).catch(err => reject(err)));
    if (userProfile["twofa_otp_temp_secret"]) {
      await Promise.all([
        UserProfiles.doc(user.uid).set(
          { twofa_otp_secret: userProfile["twofa_otp_temp_secret"] },
          { merge: true }
        ),
        admin.auth().setCustomUserClaims(user.uid, {
          twofa_enabled: true,
          twofa_verified: true
        })
      ]);
      resolve();
    }
    reject(new Error("User profile not set properly."));
  });

const disableTwofa = async (user: admin.auth.DecodedIdToken): Promise<void> => {
  await admin.auth().setCustomUserClaims(user.uid, { twofa_enabled: false });
};

export {
  getUserByEmail,
  needsTwofa,
  verifyOTP,
  twofaSetup,
  enableTwofa,
  disableTwofa,
  getUserProfile,
  signInWithEmailAndPassword
};
