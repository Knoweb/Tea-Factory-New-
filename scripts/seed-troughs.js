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
  const factoryId = "-OtcfxoZ8rThjgirvTwN"; // Talangaha Tea Factor
  console.log(`Seeding troughs for factory: ${factoryId}`);

  const troughs = {
    trough_1: { id: "trough_1", name: "Trough 1", createdAt: new Date().toISOString() },
    trough_2: { id: "trough_2", name: "Trough 2", createdAt: new Date().toISOString() },
    trough_3: { id: "trough_3", name: "Trough 3", createdAt: new Date().toISOString() },
  };

  await db.ref(`factories/${factoryId}/troughs`).set(troughs);
  console.log("Troughs registered under factory.");

  // Seed readings for trough_1, trough_2, trough_3
  const now = Date.now();
  for (const troughId of ["trough_1", "trough_2", "trough_3"]) {
    console.log(`Seeding readings for: ${troughId}`);
    
    // Create 10 historical readings in 5-minute intervals
    const readings = {};
    for (let i = 0; i < 10; i++) {
      const timeMs = now - (10 - i) * 5 * 60 * 1000;
      const key = `-${Math.random().toString(36).substr(2, 9)}`; // Mock push ID
      
      const dryTemp = 75 + Math.random() * 8;
      const rh = 60 + Math.random() * 10;
      const wetTemp = dryTemp - (4 + Math.random() * 4); // Wet bulb temp is lower
      const depression = dryTemp - wetTemp;
      const louverPercent = Math.random() > 0.5 ? 100 : 50;

      readings[key] = {
        timestamp: new Date(timeMs).toISOString(),
        dryTempC: dryTemp,
        rh: rh,
        wetTempC: wetTemp,
        depression: depression,
        louverPercent: louverPercent,
        louverStatus: `${louverPercent}% Open`,
      };
    }

    // Add latest marker
    const latestDry = 75 + Math.random() * 8;
    const latestRh = 60 + Math.random() * 10;
    const latestWet = latestDry - (4 + Math.random() * 4);
    const latestDepression = latestDry - latestWet;
    const latestLouverPercent = 50;
    
    readings["latest"] = {
      timestamp: new Date(now).toISOString(),
      dryTempC: latestDry,
      rh: latestRh,
      wetTempC: latestWet,
      depression: latestDepression,
      louverPercent: latestLouverPercent,
      louverStatus: `${latestLouverPercent}% Open`,
    };

    await db.ref(`readings/${troughId}`).set(readings);
  }

  console.log("Seeding completed successfully.");
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
