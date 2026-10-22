import * as admin from "firebase-admin";

interface FirebaseAdminConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

function getFirebaseAdminApp() {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.warn(
      "[Firebase Admin] Credentials not fully configured. API Route authorization might fail if ID token check is enforced."
    );
    // Allow fallback or dummy init in non-configured dev mode
    return null;
  }

  // Handle newline characters in private key when set via single-line environment variable
  privateKey = privateKey.replace(/\\n/g, "\n");

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

export async function verifyFirebaseToken(token: string) {
  const adminApp = getFirebaseAdminApp();
  if (!adminApp) {
    throw new Error(
      "Firebase Admin is not configured. Please supply FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY."
    );
  }

  return await admin.auth(adminApp).verifyIdToken(token);
}
