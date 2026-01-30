// utils/firebase/server.ts
import * as admin from "firebase-admin";

let app: admin.app.App | null = null;

function getAdminApp() {
  if (app) return app;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is missing");
  }

  const serviceAccount = JSON.parse(raw);

  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  return app;
}

export function getAuth() {
  return getAdminApp().auth();
}
