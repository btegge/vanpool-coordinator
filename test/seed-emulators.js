// Seed script for Firebase emulators — populates Auth + Firestore with test data
//
// Usage: FIRESTORE_EMULATOR_HOST=localhost:8080 FIREBASE_AUTH_EMULATOR_HOST=localhost:9099 node test/seed-emulators.js

import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Ensure emulator env vars are set
process.env.FIRESTORE_EMULATOR_HOST ??= 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= 'localhost:9099';

const PROJECT_ID = 'vanpool-coordinator';
const TEST_PASSWORD = 'testpass123';

const app = initializeApp({ projectId: PROJECT_ID });
const auth = getAuth(app);
const db = getFirestore(app);

// --- Helpers ---

/** Get a YYYY-MM-DD string for N days from now in Pacific time */
function dateStr(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

/** Clear all emulator data via REST */
async function clearEmulators() {
  console.log('🗑  Clearing emulator data…');
  await fetch(`http://localhost:8080/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, { method: 'DELETE' });
  await fetch(`http://localhost:9099/emulator/v1/projects/${PROJECT_ID}/accounts`, { method: 'DELETE' });
}

// --- Test Data Definitions ---

const TEST_USERS = [
  { uid: 'alice-uid', email: 'alice@test.com', firstName: 'Alice', lastName: 'Chen',     role: 'Driver', isAdmin: true  },
  { uid: 'bob-uid',   email: 'bob@test.com',   firstName: 'Bob',   lastName: 'Martinez', role: 'Driver', isAdmin: false },
  { uid: 'carol-uid', email: 'carol@test.com', firstName: 'Carol', lastName: 'Park',     role: 'Rider',  isAdmin: false },
  { uid: 'dave-uid',  email: 'dave@test.com',  firstName: 'Dave',  lastName: 'Wilson',   role: 'Rider',  isAdmin: false },
];

const TEST_RIDES = [
  {
    date: dateStr(0), // Today
    departureFromTC: '05:55',
    departureFromWork: '15:00',
    status: 'scheduled',
    driverId: 'alice-uid',
    driverName: 'Alice Chen',
    rsvps: ['bob-uid', 'carol-uid', 'dave-uid'],
    createdBy: 'alice-uid',
  },
  {
    date: dateStr(1), // Tomorrow
    departureFromTC: '06:00',
    departureFromWork: '15:30',
    status: 'requested',
    driverId: null,
    driverName: null,
    rsvps: ['carol-uid'],
    createdBy: 'carol-uid',
  },
  {
    date: dateStr(2), // Day after tomorrow
    departureFromTC: '05:55',
    departureFromWork: '15:00',
    status: 'scheduled',
    driverId: 'bob-uid',
    driverName: 'Bob Martinez',
    rsvps: ['alice-uid', 'carol-uid'],
    createdBy: 'bob-uid',
  },
  {
    date: dateStr(7), // Next week
    departureFromTC: '05:55',
    departureFromWork: '15:00',
    status: 'requested',
    driverId: null,
    driverName: null,
    rsvps: [],
    createdBy: 'alice-uid',
  },
];

// --- Seeding ---

async function seedUsers() {
  console.log('👤 Creating test users…');
  for (const u of TEST_USERS) {
    // Auth user (with password for dev sign-in)
    await auth.createUser({
      uid: u.uid,
      email: u.email,
      password: TEST_PASSWORD,
      displayName: `${u.firstName} ${u.lastName}`,
      emailVerified: true,
    });

    // Firestore user doc
    await db.collection('users').doc(u.uid).set({
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      role: u.role,
      isAdmin: u.isAdmin,
      photoBase64: '',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`   ✓ ${u.firstName} ${u.lastName} (${u.email}) — ${u.role}${u.isAdmin ? ' / Admin' : ''}`);
  }
}

async function seedRides() {
  console.log('🚐 Creating test rides…');
  for (const r of TEST_RIDES) {
    const ref = await db.collection('rides').add({
      ...r,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log(`   ✓ ${r.date} — ${r.status} ${r.driverName ? `(${r.driverName})` : '(needs driver)'} [${r.rsvps.length} RSVPs]`);
  }
}

async function main() {
  console.log('\n🔧 Vanpool Coordinator — Emulator Seed Script\n');
  console.log(`   Firestore: ${process.env.FIRESTORE_EMULATOR_HOST}`);
  console.log(`   Auth:      ${process.env.FIREBASE_AUTH_EMULATOR_HOST}\n`);

  await clearEmulators();
  await seedUsers();
  await seedRides();

  console.log('\n✅ Done! Test accounts (password: testpass123):');
  for (const u of TEST_USERS) {
    console.log(`   ${u.email.padEnd(18)} — ${u.firstName} ${u.lastName} (${u.role}${u.isAdmin ? '/Admin' : ''})`);
  }
  console.log('\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
