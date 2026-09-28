import "server-only";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

type FirebaseAdminEnvironment = Record<string, string | undefined>;

export function firebaseAdminConfig(environment: FirebaseAdminEnvironment) {
  const names = [
    "FIREBASE_PROJECT_ID",
    "FIREBASE_CLIENT_EMAIL",
    "FIREBASE_PRIVATE_KEY",
  ] as const;
  const missing = names.filter((name) => !environment[name]?.trim());
  if (missing.length > 0) {
    throw new Error(`firebase_admin_not_configured:${missing.join(",")}`);
  }
  return {
    projectId: environment.FIREBASE_PROJECT_ID!.trim(),
    clientEmail: environment.FIREBASE_CLIENT_EMAIL!.trim(),
    privateKey: environment.FIREBASE_PRIVATE_KEY!.trim().replace(/\\n/g, "\n"),
  };
}

export function firebaseMessaging() {
  const app =
    getApps()[0] ??
    initializeApp({ credential: cert(firebaseAdminConfig(process.env)) });
  return getMessaging(app);
}
