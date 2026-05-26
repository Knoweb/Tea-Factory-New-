import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

// Load .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      let key = match[1].trim();
      let val = match[2].trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  });
}

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const databaseURL = "https://tea-withering-system-4d483-default-rtdb.firebaseio.com";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    databaseURL
  });
}

const auth = admin.auth();
const db = admin.database();

async function createSuperAdmin() {
  const email = 'superadmin@sanota.com';
  const password = 'SuperPassword123!';

  try {
    let user;
    try {
      user = await auth.getUserByEmail(email);
      console.log('User already exists, updating password...');
      await auth.updateUser(user.uid, { password });
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        user = await auth.createUser({
          email,
          password,
          displayName: 'System Super Admin',
        });
        console.log('User created successfully.');
      } else {
        throw e;
      }
    }

    await db.ref(`users/${user.uid}`).set({
      email: email,
      name: 'System Super Admin',
      role: 'super_admin',
      status: 'approved',
      createdAt: new Date().toISOString()
    });

    console.log('\n--- SUPER ADMIN CREDENTIALS ---');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('-------------------------------\n');
    process.exit(0);
  } catch (err) {
    console.error('Error creating super admin:', err);
    process.exit(1);
  }
}

createSuperAdmin();
