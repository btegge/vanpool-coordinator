// Admin users view — User management
import { auth } from '../firebase.js';
import { getUserProfile, getDisplayName, clearProfileCache } from '../utils/auth.js';
import { getAllUsers, createUser, updateUser, deleteUser } from '../utils/users.js';
import { renderNav } from '../components/nav.js';
import { createAvatar } from '../components/avatar.js';
import { createBadge } from '../components/badge.js';
import { showModal, showConfirm } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { navigate } from '../router.js';
import { queueNotification } from '../utils/notifications.js';
import { sendSignInLinkToEmail } from 'firebase/auth';

const backIcon = `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
const plusIcon = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;

/**
 * Render the admin users view
 * @param {HTMLElement} container
 */
export async function adminUsersView(container) {
  const user = auth.currentUser;

  async function render() {
    let users;
    try {
      users = await getAllUsers();
    } catch (e) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state__icon">⚠️</div><div class="empty-state__title">${e.message}</div></div>`;
      return;
    }

    container.innerHTML = `
      <div class="fade-in">
        <div class="page-header">
          <span class="page-header__title">Manage Users</span>
          <div class="page-header__actions">
            <button class="btn btn--primary btn--sm" id="add-user">
              ${plusIcon} Add
            </button>
          </div>
        </div>

        <div style="padding: var(--space-sm) var(--space-lg);">
          <p style="font-size: var(--font-size-xs); color: var(--color-text-muted);">
            ${users.length} member${users.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div id="user-list">
          ${users.map(u => `
            <div class="list-item" data-user-id="${u.id}">
              ${createAvatar(u, 'sm').outerHTML}
              <div class="list-item__content">
                <div class="list-item__title">${getDisplayName(u)}</div>
                <div class="list-item__subtitle">${u.email || ''}</div>
              </div>
              <div class="list-item__meta">
                ${createBadge(u.role.toLowerCase()).outerHTML}
                ${u.isAdmin ? createBadge('admin', 'Admin').outerHTML : ''}
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Export link -->
        <div style="padding: var(--space-lg); text-align: center;">
          <a href="#/admin/export" style="font-size: var(--font-size-sm); color: var(--color-primary-hover);">
            📊 Export Driver Report
          </a>
        </div>
      </div>
    `;

    renderNav('/admin/users');

    // Bind events
    container.querySelector('#add-user')?.addEventListener('click', showAddUserModal);

    container.querySelectorAll('.list-item[data-user-id]').forEach(item => {
      item.addEventListener('click', () => {
        const userId = item.dataset.userId;
        showEditUserModal(userId, users.find(u => u.id === userId));
      });
    });
  }

  function showAddUserModal() {
    const content = document.createElement('div');
    content.innerHTML = `
      <form class="form" id="add-user-form">
        <div class="form-group">
          <label class="form-group__label" for="new-first-name">First Name</label>
          <input class="input" type="text" id="new-first-name" name="firstName" required maxlength="50" />
        </div>
        <div class="form-group">
          <label class="form-group__label" for="new-last-name">Last Name</label>
          <input class="input" type="text" id="new-last-name" name="lastName" required maxlength="50" />
        </div>
        <div class="form-group">
          <label class="form-group__label" for="new-email">Email</label>
          <input class="input" type="email" id="new-email" name="email" required maxlength="254" />
        </div>
        <div class="form-group">
          <label class="form-group__label">Role</label>
          <div class="radio-group">
            <div class="radio-option">
              <input type="radio" name="role" value="Rider" id="new-role-rider" checked />
              <label class="radio-option__label" for="new-role-rider">Rider</label>
            </div>
            <div class="radio-option">
              <input type="radio" name="role" value="Driver" id="new-role-driver" />
              <label class="radio-option__label" for="new-role-driver">Driver</label>
            </div>
          </div>
        </div>
        <label class="toggle">
          <span class="toggle__label">Admin</span>
          <input type="checkbox" name="isAdmin" />
          <span class="toggle__switch"></span>
        </label>
        <div class="form-actions" style="margin-top: var(--space-md);">
          <button class="btn btn--secondary" type="button" id="add-user-cancel">Cancel</button>
          <button class="btn btn--primary" type="submit">Add User</button>
        </div>
      </form>
    `;

    const modal = showModal({ title: 'Add User', content });

    content.querySelector('#add-user-cancel').addEventListener('click', () => modal.close());

    content.querySelector('#add-user-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Adding…';

      try {
        const userData = {
          firstName: form.firstName.value.trim(),
          lastName: form.lastName.value.trim(),
          email: form.email.value.trim(),
          role: form.role.value,
          isAdmin: form.isAdmin.checked,
        };

        await createUser(userData);

        // Send magic link invite
        try {
          const actionCodeSettings = {
            url: window.location.origin + window.location.pathname + '#/login',
            handleCodeInApp: true,
          };
          await sendSignInLinkToEmail(auth, userData.email, actionCodeSettings);
        } catch (emailError) {
          console.warn('Could not send magic link:', emailError);
          // Still queue notification even if magic link fails
        }

        // Queue invite notification
        await queueNotification('user_invite', { email: userData.email });

        modal.close();
        showToast(`${userData.firstName} added! Magic link sent.`, 'success');
        await render();
      } catch (error) {
        showToast(error.message || 'Failed to add user', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Add User';
      }
    });
  }

  function showEditUserModal(userId, userData) {
    const content = document.createElement('div');
    content.innerHTML = `
      <form class="form" id="edit-user-form">
        <div class="form-group">
          <label class="form-group__label" for="edit-first-name">First Name</label>
          <input class="input" type="text" id="edit-first-name" name="firstName" value="${userData.firstName || ''}" required maxlength="50" />
        </div>
        <div class="form-group">
          <label class="form-group__label" for="edit-last-name">Last Name</label>
          <input class="input" type="text" id="edit-last-name" name="lastName" value="${userData.lastName || ''}" required maxlength="50" />
        </div>
        <div class="form-group">
          <label class="form-group__label" for="edit-email">Email</label>
          <input class="input" type="email" id="edit-email" name="email" value="${userData.email || ''}" required maxlength="254" />
        </div>
        <div class="form-group">
          <label class="form-group__label">Role</label>
          <div class="radio-group">
            <div class="radio-option">
              <input type="radio" name="role" value="Rider" id="edit-role-rider" ${userData.role === 'Rider' ? 'checked' : ''} />
              <label class="radio-option__label" for="edit-role-rider">Rider</label>
            </div>
            <div class="radio-option">
              <input type="radio" name="role" value="Driver" id="edit-role-driver" ${userData.role === 'Driver' ? 'checked' : ''} />
              <label class="radio-option__label" for="edit-role-driver">Driver</label>
            </div>
          </div>
        </div>
        <label class="toggle">
          <span class="toggle__label">Admin</span>
          <input type="checkbox" name="isAdmin" ${userData.isAdmin ? 'checked' : ''} />
          <span class="toggle__switch"></span>
        </label>
        <div class="form-actions" style="margin-top: var(--space-md);">
          <button class="btn btn--danger btn--sm" type="button" id="edit-user-delete">Remove</button>
          <button class="btn btn--secondary" type="button" id="edit-user-cancel">Cancel</button>
          <button class="btn btn--primary" type="submit">Save</button>
        </div>
      </form>
    `;

    const modal = showModal({ title: 'Edit User', content });

    content.querySelector('#edit-user-cancel').addEventListener('click', () => modal.close());

    content.querySelector('#edit-user-delete').addEventListener('click', async () => {
      modal.close();
      const confirmed = await showConfirm({
        title: 'Remove User',
        message: `Are you sure you want to remove ${getDisplayName(userData)}? This cannot be undone.`,
        confirmLabel: 'Remove',
        danger: true,
      });
      if (confirmed) {
        try {
          await deleteUser(userId);
          showToast('User removed', 'success');
          await render();
        } catch (error) {
          showToast('Failed to remove user', 'error');
        }
      }
    });

    content.querySelector('#edit-user-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving…';

      try {
        await updateUser(userId, {
          firstName: form.firstName.value.trim(),
          lastName: form.lastName.value.trim(),
          email: form.email.value.trim(),
          role: form.role.value,
          isAdmin: form.isAdmin.checked,
        });
        clearProfileCache(userId);
        modal.close();
        showToast('User updated', 'success');
        await render();
      } catch (error) {
        showToast(error.message || 'Failed to update user', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save';
      }
    });
  }

  await render();

  return () => {
    const nav = document.querySelector('.bottom-nav');
    if (nav) nav.remove();
  };
}
