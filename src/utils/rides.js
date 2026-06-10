// Ride CRUD utilities
import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, arrayUnion, arrayRemove
} from 'firebase/firestore';
import { db } from '../firebase.js';
import { queueNotification } from './notifications.js';

const RIDES_COLLECTION = 'rides';
const TIMEZONE = 'America/Los_Angeles';
const MAX_RSVP = 7;

/**
 * Get the current date string in the vanpool timezone
 * @returns {string} YYYY-MM-DD
 */
export function getTodayString() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE });
}

/**
 * Get rides for a given month
 * @param {number} year
 * @param {number} month - 0-indexed
 * @returns {Promise<object[]>}
 */
export async function getRidesForMonth(year, month) {
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endMonth = month === 11 ? 0 : month + 1;
  const endYear = month === 11 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth + 1).padStart(2, '0')}-01`;

  const q = query(
    collection(db, RIDES_COLLECTION),
    where('date', '>=', startDate),
    where('date', '<', endDate),
    orderBy('date', 'asc')
  );

  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Get rides for a date range (for export)
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {Promise<object[]>}
 */
export async function getRidesForRange(startDate, endDate) {
  const q = query(
    collection(db, RIDES_COLLECTION),
    where('date', '>=', startDate),
    where('date', '<=', endDate),
    orderBy('date', 'asc')
  );

  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Get a single ride by ID
 * @param {string} rideId
 * @returns {Promise<object|null>}
 */
export async function getRide(rideId) {
  const snap = await getDoc(doc(db, RIDES_COLLECTION, rideId));
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() };
  }
  return null;
}

/**
 * Create a single ride
 * @param {object} data
 * @returns {Promise<string>} ride document ID
 */
export async function createRide(data) {
  const rideData = {
    date: data.date,
    departureFromTC: data.departureFromTC || '05:55',
    departureFromWork: data.departureFromWork || '15:00',
    status: data.status,
    driverId: data.driverId || null,
    driverName: data.driverName || null,
    rsvps: data.rsvps || [],
    createdBy: data.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, RIDES_COLLECTION), rideData);

  // Queue notification for new ride request
  if (data.status === 'requested') {
    await queueNotification('ride_requested', {
      date: data.date,
      departureFromTC: rideData.departureFromTC,
    });
  }

  return ref.id;
}

/**
 * Create recurring rides
 * @param {object} baseRide - Base ride data
 * @param {'daily'|'weekly'} pattern - 'daily' (Mon-Fri) or 'weekly'
 * @param {string} endDate - YYYY-MM-DD
 * @returns {Promise<string[]>} created ride IDs
 */
export async function createRecurringRides(baseRide, pattern, endDate) {
  const ids = [];
  const start = new Date(baseRide.date + 'T12:00:00');
  const end = new Date(endDate + 'T12:00:00');
  const startDay = start.getDay();

  let current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    let shouldCreate = false;

    if (pattern === 'daily') {
      // Monday (1) through Friday (5)
      shouldCreate = dayOfWeek >= 1 && dayOfWeek <= 5;
    } else if (pattern === 'weekly') {
      // Same day of week as the start date
      shouldCreate = dayOfWeek === startDay;
    }

    if (shouldCreate) {
      const dateStr = current.toISOString().split('T')[0];
      const id = await createRide({
        ...baseRide,
        date: dateStr,
      });
      ids.push(id);
    }

    current.setDate(current.getDate() + 1);
  }

  return ids;
}

/**
 * Update a ride
 * @param {string} rideId
 * @param {object} data - Fields to update
 */
export async function updateRide(rideId, data) {
  await updateDoc(doc(db, RIDES_COLLECTION, rideId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a ride (cancel)
 * @param {string} rideId
 * @param {object} rideData - Current ride data for notification
 */
export async function deleteRide(rideId, rideData) {
  await deleteDoc(doc(db, RIDES_COLLECTION, rideId));

  // Queue notification for cancelled ride
  if (rideData) {
    await queueNotification('ride_cancelled', {
      date: rideData.date,
      driverName: rideData.driverName,
    });
  }
}

/**
 * Claim a requested ride (driver action)
 * @param {string} rideId
 * @param {string} driverId
 * @param {string} driverName
 */
export async function claimRide(rideId, driverId, driverName) {
  await updateDoc(doc(db, RIDES_COLLECTION, rideId), {
    status: 'scheduled',
    driverId,
    driverName,
    updatedAt: serverTimestamp(),
  });

  // Queue notification
  const ride = await getRide(rideId);
  await queueNotification('ride_claimed', {
    date: ride.date,
    driverName,
  });
}

/**
 * Toggle RSVP for a ride
 * @param {string} rideId
 * @param {string} userId
 * @returns {Promise<'added'|'removed'|'full'>}
 */
export async function toggleRsvp(rideId, userId) {
  const ride = await getRide(rideId);
  if (!ride) throw new Error('Ride not found');

  const rsvps = ride.rsvps || [];

  if (rsvps.includes(userId)) {
    // Remove RSVP
    await updateDoc(doc(db, RIDES_COLLECTION, rideId), {
      rsvps: arrayRemove(userId),
      updatedAt: serverTimestamp(),
    });
    return 'removed';
  } else {
    // Add RSVP (check capacity)
    if (rsvps.length >= MAX_RSVP) {
      return 'full';
    }
    await updateDoc(doc(db, RIDES_COLLECTION, rideId), {
      rsvps: arrayUnion(userId),
      updatedAt: serverTimestamp(),
    });
    return 'added';
  }
}

/**
 * Format time from 24h to 12h display
 * @param {string} time24 - e.g., '05:55'
 * @returns {string} e.g., '5:55 AM'
 */
export function formatTime(time24) {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

/**
 * Format date string to readable
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {string}
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}
