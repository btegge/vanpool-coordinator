// User management utilities
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  serverTimestamp, addDoc
} from 'firebase/firestore';
import { db } from '../firebase.js';
import { clearProfileCache } from './auth.js';

const USERS_COLLECTION = 'users';
const MAX_PHOTO_SIZE = 75000; // ~55KB image as base64
const PHOTO_MAX_DIMENSION = 200;

/**
 * Get all users
 * @returns {Promise<object[]>}
 */
export async function getAllUsers() {
  const snap = await getDocs(collection(db, USERS_COLLECTION));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Get a single user
 * @param {string} uid
 * @returns {Promise<object|null>}
 */
export async function getUser(uid) {
  const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() };
  }
  return null;
}

/**
 * Create a new user (admin action)
 * Uses a temporary document ID. When the user first signs in via magic link,
 * their auth UID will be linked via linkUserProfile().
 * @param {object} data - { firstName, lastName, email, role, isAdmin }
 * @returns {Promise<string>} document ID
 */
export async function createUser(data) {
  const userData = {
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    role: data.role,
    isAdmin: data.isAdmin || false,
    photoBase64: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, USERS_COLLECTION), userData);
  return ref.id;
}

/**
 * Update a user
 * @param {string} uid
 * @param {object} data - Fields to update
 */
export async function updateUser(uid, data) {
  const updateData = { ...data, updatedAt: serverTimestamp() };
  await updateDoc(doc(db, USERS_COLLECTION, uid), updateData);
  clearProfileCache(uid);
}

/**
 * Delete a user
 * @param {string} uid
 */
export async function deleteUser(uid) {
  await deleteDoc(doc(db, USERS_COLLECTION, uid));
  clearProfileCache(uid);
}

/**
 * Resize an image file and encode as base64
 * @param {File} file
 * @returns {Promise<string>} base64 encoded string (data URL)
 */
export function resizeAndEncodePhoto(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Invalid image file'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Scale down to fit within PHOTO_MAX_DIMENSION
        if (width > height) {
          if (width > PHOTO_MAX_DIMENSION) {
            height = Math.round(height * (PHOTO_MAX_DIMENSION / width));
            width = PHOTO_MAX_DIMENSION;
          }
        } else {
          if (height > PHOTO_MAX_DIMENSION) {
            width = Math.round(width * (PHOTO_MAX_DIMENSION / height));
            height = PHOTO_MAX_DIMENSION;
          }
        }

        // Crop to square
        const size = Math.min(width, height);
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext('2d');
        const sx = (img.width - img.width * (size / width)) / 2;
        const sy = (img.height - img.height * (size / height)) / 2;
        const sSize = Math.min(img.width, img.height);

        ctx.drawImage(
          img,
          (img.width - sSize) / 2,
          (img.height - sSize) / 2,
          sSize,
          sSize,
          0,
          0,
          size,
          size
        );

        // Encode as JPEG with quality reduction until under limit
        let quality = 0.8;
        let base64 = canvas.toDataURL('image/jpeg', quality);

        while (base64.length > MAX_PHOTO_SIZE && quality > 0.1) {
          quality -= 0.1;
          base64 = canvas.toDataURL('image/jpeg', quality);
        }

        if (base64.length > MAX_PHOTO_SIZE) {
          reject(new Error('Image too large. Please use a smaller photo.'));
          return;
        }

        resolve(base64);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
