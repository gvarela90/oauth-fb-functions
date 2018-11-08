import { auth } from "firebase-admin";
import { verifyIdToken } from "./utils";

const authenticated = async (req): Promise<auth.DecodedIdToken> =>
  new Promise<auth.DecodedIdToken>((resolve, reject) => {
    verifyIdToken(req.body.token || req.query.token)
      .then(user => {
        if (user.firebase.sign_in_provider === "custom") {
          resolve(user);
        }
        reject(new Error("Invalid token"));
      })
      .catch(() => {
        reject(new Error("Invalid token"));
      });
  });

export { authenticated };
