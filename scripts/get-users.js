const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// Manually parse env file
try {
  const envContent = fs.readFileSync(path.resolve(__dirname, "../.env.local"), "utf8");
  envContent.split("\n").forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || "";
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
} catch (err) {
  console.log("Could not read env file, using defaults");
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
    databaseURL: "https://tea-withering-system-4d483-default-rtdb.firebaseio.com",
  });
}

const db = admin.database();

async function run() {
  console.log("Fetching factories from database...");
  const snap = await db.ref("factories").get();
  if (snap.exists()) {
    const factories = snap.val();
    console.log("Factories found:");
    Object.keys(factories).forEach(fid => {
      console.log(`- ID: ${fid}, Name: ${factories[fid].name}`);
      if (factories[fid].troughs) {
        console.log("  Troughs:");
        Object.keys(factories[fid].troughs).forEach(tid => {
          console.log(`    - ID: ${tid}, Name: ${factories[fid].troughs[tid].name}`);
        });
      } else {
        console.log("  No troughs registered for this factory.");
      }
    });
  } else {
    console.log("No factories found in database.");
  }
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
