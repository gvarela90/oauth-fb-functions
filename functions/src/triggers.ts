/* eslint no-console: ["error", { allow: ["warn", "error"] }] */
import { admin } from "./admin";
import { UserProfiles } from "./collections";

const createProfile = (userRecord: admin.auth.UserRecord): void => {
  UserProfiles.doc(userRecord.uid)
    .set({ createdAt: admin.firestore.FieldValue.serverTimestamp() })
    .catch(err => console.error(err));
};

export { createProfile };
