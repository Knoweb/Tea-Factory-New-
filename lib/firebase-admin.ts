import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          // Replace literal \n with actual newlines in private key
          privateKey,
        }),
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://tea-withering-system-4d483-default-rtdb.firebaseio.com",
      });
    } catch (error) {
      console.error('Firebase admin initialization error', error);
    }
  } else {
    console.warn('Firebase Admin: missing credentials, skipping initialization (build-time only).');
  }
}

// Only access database/auth if the admin app was successfully initialized
const adminDb = admin.apps.length ? admin.database() : null as unknown as admin.database.Database;
const adminAuth = admin.apps.length ? admin.auth() : null as unknown as admin.auth.Auth;

export { adminDb, adminAuth };
