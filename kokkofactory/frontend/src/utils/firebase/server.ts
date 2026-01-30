// utils/firebase/server.ts
import * as admin from "firebase-admin";

let app: admin.app.App | null = null;

function getAdminApp() {
  if (app) return app;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error("Missing service account");

  app = admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(raw)),
  });

  return app;
}

export function getFirestore() {
  return getAdminApp().firestore();
}

export function getAuth() {
  return getAdminApp().auth();
}
