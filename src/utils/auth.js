// Auth utility functions
import { doc, getDoc, setDoc, getDocs, deleteDoc, collection, query, limit, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase.js';

/** Cache for user profiles to reduce Firestore reads */
const profileCache = new Map();

/**
 * Get a user profile from Firestore
 * @param {string} uid
 * @returns {Promise<object|null>}
 */
export async function getUserProfile(uid) {
  if (profileCache.has(uid)) {
    return profileCache.get(uid);
  }
  const snap = await getDoc(doc(db, 'users', uid));
  if (snap.exists()) {
    const profile = { id: snap.id, ...snap.data() };
    profileCache.set(uid, profile);
    return profile;
  }
  return null;
}

/**
 * Clear the profile cache for a user (or all)
 * @param {string} [uid]
 */
export function clearProfileCache(uid) {
  if (uid) {
    profileCache.delete(uid);
  } else {
    profileCache.clear();
  }
}

/**
 * Check if any users exist in the database (for first-user bootstrap)
 * @returns {Promise<boolean>}
 */
export async function hasAnyUsers() {
  const q = query(collection(db, 'users'), limit(1));
  const snap = await getDocs(q);
  return !snap.empty;
}

/**
 * Create the first admin user (bootstrap)
 * @param {string} uid
 * @param {{ firstName: string, lastName: string, email: string }} data
 */
export async function createFirstAdmin(uid, data) {
  await setDoc(doc(db, 'users', uid), {
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    role: 'Driver',
    isAdmin: true,
    photoBase64: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  clearProfileCache(uid);
}

/**
 * Create or update a user profile after sign-in
 * Links an existing user doc (created by admin) with the auth UID
 * @param {string} uid
 * @param {string} email
 */
export async function linkUserProfile(uid, email) {
  // Check if user doc already exists for this UID
  const existingDoc = await getDoc(doc(db, 'users', uid));
  if (existingDoc.exists()) {
    return existingDoc.data();
  }

  // Look up by email in users collection (admin may have pre-created)
  const allUsers = await getDocs(collection(db, 'users'));
  for (const userDoc of allUsers.docs) {
    const data = userDoc.data();
    if (data.email === email && userDoc.id !== uid) {
      // Found a pre-created user doc. Copy it to the new UID-based doc
      await setDoc(doc(db, 'users', uid), {
        ...data,
        updatedAt: serverTimestamp(),
      });
      // Delete the old doc (it had a temp ID)
      await deleteDoc(doc(db, 'users', userDoc.id));
      clearProfileCache();
      return data;
    }
  }

  return null;
}

/**
 * Check if a user is an admin
 * @param {string} uid
 * @returns {Promise<boolean>}
 */
export async function isAdmin(uid) {
  const profile = await getUserProfile(uid);
  return profile?.isAdmin === true;
}

/**
 * Check if a user is a driver
 * @param {string} uid
 * @returns {Promise<boolean>}
 */
export async function isDriver(uid) {
  const profile = await getUserProfile(uid);
  return profile?.role === 'Driver';
}

/**
 * Get current user's full display name
 * @param {object} profile
 * @returns {string}
 */
export function getDisplayName(profile) {
  if (!profile) return 'Unknown';
  return `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Unknown';
}

/**
 * Get user initials for avatar fallback
 * @param {object} profile
 * @returns {string}
 */
export function getInitials(profile) {
  if (!profile) return '?';
  const first = (profile.firstName || '')[0] || '';
  const last = (profile.lastName || '')[0] || '';
  return (first + last).toUpperCase() || '?';
}
