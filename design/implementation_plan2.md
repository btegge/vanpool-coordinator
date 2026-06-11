# User Testing Plan — Vanpool Coordinator

Set up Firebase emulators as a local test backend, seed realistic data, and walk through every user flow in Chrome.

## Proposed Changes

### 1. Configure Firebase Emulators

#### [MODIFY] [firebase.json](file:///Users/benjamintegge/Development/vanpool-coordinator/firebase.json)

Add an `emulators` block configuring the Auth emulator (port 9099) and Firestore emulator (port 8080) with a UI on port 4000. The app already connects to these ports in [firebase.js](file:///Users/benjamintegge/Development/vanpool-coordinator/src/firebase.js#L22-L30) when running on `localhost`.

---

### 2. Create a Seed Script

#### [NEW] `test/seed-emulators.js`

A Node.js script that populates the emulators with test data using the Firebase Admin SDK with emulator connections. It will create:

**Users (Auth + Firestore):**
| Name | Email | Role | Admin? |
|------|-------|------|--------|
| Alice Chen | alice@test.com | Driver | ✅ (admin) |
| Bob Martinez | bob@test.com | Driver | ❌ |
| Carol Park | carol@test.com | Rider | ❌ |
| Dave Wilson | dave@test.com | Rider | ❌ |

**Rides (Firestore):**
| Date | Status | Driver | RSVPs |
|------|--------|--------|-------|
| Today | Scheduled | Alice Chen | Bob, Carol, Dave |
| Tomorrow | Requested | — | Carol |
| Day after tomorrow | Scheduled | Bob Martinez | Alice, Carol |
| Next week (Mon) | Requested | — | (none) |

This gives us a mix of statuses, RSVP counts, and driver assignments to exercise all the UI states.

---

### 3. Start Local Environment

Launch three processes:
1. `firebase emulators:start` — Auth + Firestore emulators
2. `node test/seed-emulators.js` — Seed the test data
3. `npm run dev` — Vite dev server

The app auto-connects to emulators when `location.hostname === 'localhost'`.

---

### 4. User Testing in Chrome

Walk through every major flow using Alice (admin/driver) as the primary test user, then verify role-based differences with Bob (driver) and Carol (rider).

#### Test Matrix

| # | Flow | Steps | What to verify |
|---|------|-------|----------------|
| 1 | **First-user bootstrap** | Clear emulator data, load app, fill setup form | Shows "Set up your vanpool coordinator", creates admin |
| 2 | **Login (magic link)** | On the emulator, use the Auth emulator's auto-generated sign-in link | Sign-in completes, redirects to calendar |
| 3 | **Calendar — browse months** | Click prev/next arrows, click on days | Past months load (Bug #9 fix), day rides appear, loading guard works (Bug #13 fix) |
| 4 | **Create a ride (driver)** | Click FAB → fill form → choose "Scheduled" → submit | Ride appears on calendar with green dot |
| 5 | **Create a ride (rider)** | Switch to Carol → FAB → form shows "requested" only | No status radio, ride gets amber dot |
| 6 | **Ride detail + RSVP** | Click a ride card → click RSVP | Count updates, user name appears in rider list |
| 7 | **Claim a ride** | As Bob, view a "requested" ride → click Claim | Status changes to "scheduled", Bob shown as driver |
| 8 | **Edit / Cancel a ride** | As Alice (admin), edit departure times, then cancel a ride | Changes persist, cancellation removes ride |
| 9 | **Profile page** | View profile, change name, verify email is read-only | Save works, email field is non-editable (Bug #10 fix) |
| 10 | **Admin — user management** | View user list, add a user, edit a user's role, delete a user | All CRUD operations work, badges render correctly (Bug #8 fix) |
| 11 | **Admin — CSV export** | Set date range → download CSV | File downloads with correct data, summary shows |
| 12 | **Sign out** | Click sign out from profile | Redirects to login page |

> [!IMPORTANT]
> The Firebase Auth emulator provides a special UI at `http://localhost:9099` where we can view accounts and obtain sign-in links directly — no real email needed. For testing, we'll sign in users by using the emulator's `signInWithEmailAndPassword` or by directly accessing the emulator's sign-in link generation.

## Open Questions

> [!NOTE]
> **Auth approach for testing:** Since magic link emails won't actually be sent in the emulator, I plan to temporarily add `signInWithEmailAndPassword` support in the seed script (create users with passwords in the Auth emulator) and use the Auth emulator UI to sign in. This won't affect production code. Does this approach work for you, or would you prefer a different method?

## Verification Plan

### Manual Verification
- Walk through each row of the test matrix in Chrome using the browser subagent
- Capture screenshots/recordings of each flow
- Document any issues found during testing
