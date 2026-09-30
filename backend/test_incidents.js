import { haversineKm } from "./src/routes/incidents.routes.js";
import assert from "node:assert";

console.log("Testing haversineKm distance calculation...");
// Mexico City to Puebla is ~105 km
const d1 = haversineKm(19.4326, -99.1332, 19.0414, -98.2063);
assert(d1 > 100 && d1 < 115, `Expected ~106 km, got ${d1}`);

// Same point is 0 km
const d0 = haversineKm(0, 0, 0, 0);
assert(Math.abs(d0) < 0.001, `Expected 0 km, got ${d0}`);

// Tokyo to Yokohama is ~28 km (within 35km proximity threshold)
const dTokyoYokohama = haversineKm(35.6762, 139.6503, 35.4437, 139.6380);
assert(dTokyoYokohama > 20 && dTokyoYokohama < 32, `Expected ~26 km, got ${dTokyoYokohama}`);

console.log("Haversine calculations verified!");
