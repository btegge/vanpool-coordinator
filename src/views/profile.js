// Profile view — Edit own profile
import { auth } from '../firebase.js';
import { getUserProfile, getDisplayName, clearProfileCache } from '../utils/auth.js';
import { updateUser, resizeAndEncodePhoto } from '../utils/users.js';
import { renderNav } from '../components/nav.js';
import { createAvatar } from '../components/avatar.js';
import { createBadge } from '../components/badge.js';
import { showToast } from '../components/toast.js';
import { navigate } from '../router.js';
import { signOut } from 'firebase/auth';

const editIcon = `<svg viewBox="0 0 24 24"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>`;
const logoutIcon = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`;

/**
 * Render the profile view
 * @param {HTMLElement} container
 */
export async function profileView(container) {
  const user = auth.currentUser;
  const profile = await getUserProfile(user.uid);

  if (!profile) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">👤</div>
        <div class="empty-state__title">Profile not found</div>
        <div class="empty-state__text">Your account may not be fully set up yet.</div>
      </div>
    `;
    renderNav('/profile');
    return;
  }

  container.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <span></span>
        <span class="page-header__title">Profile</span>
        <button class="btn btn--ghost btn--icon" id="sign-out" aria-label="Sign out" title="Sign out">
          ${logoutIcon}
        </button>
      </div>

      <div class="profile-page">
        <div class="profile-header">
          <div class="photo-upload">
            <div class="photo-upload__preview">
              ${createAvatar(profile, 'xl').outerHTML}
              <label class="photo-upload__edit-btn" for="photo-input" aria-label="Change photo">
                ${editIcon}
              </label>
              <input type="file" class="photo-upload__input" id="photo-input" accept="image/*" />
            </div>
          </div>
          <h2 class="profile-header__name">${getDisplayName(profile)}</h2>
          <div class="profile-header__meta">
            ${createBadge(profile.role.toLowerCase()).outerHTML}
            ${profile.isAdmin ? createBadge('admin', 'Admin').outerHTML : ''}
          </div>
        </div>

        <form class="form" id="profile-form">
          <div class="form-group">
            <label class="form-group__label" for="profile-first-name">First Name</label>
            <input class="input" type="text" id="profile-first-name" name="firstName"
              value="${profile.firstName || ''}" required maxlength="50" autocomplete="given-name" />
          </div>

          <div class="form-group">
            <label class="form-group__label" for="profile-last-name">Last Name</label>
            <input class="input" type="text" id="profile-last-name" name="lastName"
              value="${profile.lastName || ''}" required maxlength="50" autocomplete="family-name" />
          </div>

          <div class="form-group">
            <label class="form-group__label" for="profile-email">Email</label>
            <input class="input" type="email" id="profile-email" name="email"
              value="${profile.email || ''}" required maxlength="254" autocomplete="email" />
          </div>

          <div class="form-group" style="opacity: 0.5;">
            <label class="form-group__label">Role</label>
            <div class="input" style="cursor: not-allowed;">${profile.role}</div>
            <p class="form-group__hint">Contact an admin to change your role.</p>
          </div>

          <button class="btn btn--primary btn--block" type="submit" id="profile-save">
            Save Changes
          </button>
        </form>
      </div>
    </div>
  `;

  renderNav('/profile');

  // Photo upload
  container.querySelector('#photo-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      showToast('Processing photo…', 'info');
      const base64 = await resizeAndEncodePhoto(file);
      await updateUser(user.uid, { photoBase64: base64 });
      clearProfileCache(user.uid);
      showToast('Photo updated!', 'success');
      // Re-render to show new photo
      await profileView(container);
    } catch (error) {
      showToast(error.message || 'Failed to upload photo', 'error');
    }
  });

  // Save profile
  container.querySelector('#profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = container.querySelector('#profile-save');
    btn.disabled = true;
    btn.textContent = 'Saving…';

    try {
      const form = e.target;
      await updateUser(user.uid, {
        firstName: form.firstName.value.trim(),
        lastName: form.lastName.value.trim(),
        email: form.email.value.trim(),
      });
      clearProfileCache(user.uid);
      showToast('Profile updated!', 'success');
      await profileView(container);
    } catch (error) {
      showToast(error.message || 'Failed to save profile', 'error');
      btn.disabled = false;
      btn.textContent = 'Save Changes';
    }
  });

  // Sign out
  container.querySelector('#sign-out').addEventListener('click', async () => {
    await signOut(auth);
    clearProfileCache();
    navigate('/login');
  });

  return () => {
    const nav = document.querySelector('.bottom-nav');
    if (nav) nav.remove();
  };
}
