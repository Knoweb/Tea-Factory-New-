
const data = {
 "2026-03-30T21:30:18": { diffF: 6, dryTempF: 87, wetTempF: 81 },
 "vfd_device_02": { "-Oolo": { diff: 3, level: 0 } },
 "latest": { diffF: 6, dryTempF: 87, wetTempF: 81 }
};
const keys = Object.keys(data).sort();
let latestKey = "";
let latestReading = null;
for (let i = keys.length - 1; i >= 0; i--) {
  const k = keys[i];
  const obj = data[k];
  if (k === "latest") continue;
  if (obj && typeof obj === "object") {
    if (obj.dryTempF !== undefined || obj.diffF !== undefined) {
      latestKey = k;
      latestReading = obj;
      break;
    }
  }
}
console.log(latestKey);
console.log(latestReading);
