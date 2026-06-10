// Avatar component
import { getInitials } from '../utils/auth.js';

/**
 * Create an avatar element
 * @param {object} profile - User profile with photoBase64, firstName, lastName
 * @param {'sm'|'md'|'lg'|'xl'} size
 * @returns {HTMLElement}
 */
export function createAvatar(profile, size = 'md') {
  const el = document.createElement('div');
  const sizeClass = size !== 'md' ? ` avatar--${size}` : '';
  el.className = `avatar${sizeClass}`;

  if (profile?.photoBase64) {
    el.innerHTML = `<img src="${profile.photoBase64}" alt="${profile.firstName || 'User'}" loading="lazy" />`;
  } else {
    el.textContent = getInitials(profile);
  }

  return el;
}
