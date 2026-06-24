import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let initialized = false;

function ensureAdminApp() {
  if (!initialized) {
    if (!getApps().length) {
      initializeApp({
        credential: applicationDefault(),
      });
    }
    initialized = true;
  }

  return getAuth();
}

export function getFirebaseAdminAuth() {
  return ensureAdminApp();
}
