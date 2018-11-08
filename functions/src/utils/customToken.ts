import { admin } from "../admin";

const createCustomAuthToken = async (
  user: admin.auth.UserRecord,
  claims?
): Promise<string> => {
  const customToken = await admin.auth().createCustomToken(user.uid, claims);

  return customToken;
};

const verifyIdToken = async (
  idToken: string
): Promise<admin.auth.DecodedIdToken> => {
  const token = await admin.auth().verifyIdToken(idToken);
  return token;
};

export { createCustomAuthToken, verifyIdToken };
