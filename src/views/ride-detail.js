// Ride detail view — View, RSVP, claim, edit, cancel a ride
import { auth } from '../firebase.js';
import { getUserProfile, getDisplayName, isAdmin, isDriver } from '../utils/auth.js';
import { getRide, formatTime, formatDate, toggleRsvp, claimRide, deleteRide } from '../utils/rides.js';
import { renderNav } from '../components/nav.js';
import { createAvatar } from '../components/avatar.js';
import { createBadge } from '../components/badge.js';
import { showConfirm } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { navigate } from '../router.js';
import { getAllUsers } from '../utils/users.js';
import { escapeHtml } from '../utils/helpers.js';

const backIcon = `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;

/**
 * Render the ride detail view
 * @param {HTMLElement} container
 * @param {{ id: string }} params
 */
export async function rideDetailView(container, params) {
  const rideId = params.id;
  const user = auth.currentUser;

  container.innerHTML = `<div class="loading-screen"><div class="spinner spinner--lg"></div><p class="loading-screen__text">Loading ride…</p></div>`;

  let ride, profile, userIsAdmin, userIsDriver;

  try {
    [ride, profile] = await Promise.all([
      getRide(rideId),
      getUserProfile(user.uid),
    ]);

    if (!ride) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">🔍</div>
          <div class="empty-state__title">Ride not found</div>
          <button class="btn btn--primary" onclick="location.hash='#/calendar'">Back to Calendar</button>
        </div>
      `;
      return;
    }

    userIsAdmin = profile?.isAdmin === true;
    userIsDriver = profile?.role === 'Driver';
  } catch (e) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state__icon">⚠️</div><div class="empty-state__title">${e.message}</div></div>`;
    return;
  }

  const canEdit = userIsAdmin || (ride.driverId === user.uid);
  const canClaim = userIsDriver && ride.status === 'requested';
  const rsvps = ride.rsvps || [];
  const isRsvped = rsvps.includes(user.uid);

  // Load RSVP user names
  let rsvpUsers = [];
  try {
    const allUsers = await getAllUsers();
    rsvpUsers = rsvps.map(uid => {
      const u = allUsers.find(u => u.id === uid);
      return u ? getDisplayName(u) : 'Unknown';
    });
  } catch (e) {
    rsvpUsers = rsvps.map(() => 'Member');
  }

  container.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <button class="btn btn--ghost btn--icon" id="ride-back" aria-label="Back">
          ${backIcon}
        </button>
        <span class="page-header__title">Ride Details</span>
        <div class="page-header__actions">
          ${canEdit ? `
            <button class="btn btn--ghost btn--sm" id="ride-edit">Edit</button>
            <button class="btn btn--danger btn--sm" id="ride-cancel">Cancel</button>
          ` : ''}
        </div>
      </div>

      <div class="section">
        <div class="card" style="margin-bottom: var(--space-lg);">
          <div style="display: flex; align-items: center; gap: var(--space-md); margin-bottom: var(--space-lg);">
            ${createBadge(ride.status).outerHTML}
            <span style="font-size: var(--font-size-xs); color: var(--color-text-muted);">
              ${ride.status === 'scheduled' ? 'Driver confirmed' : 'Needs a driver'}
            </span>
          </div>

          <div style="display: grid; gap: var(--space-md);">
            <div>
              <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px;">Date</div>
              <div style="font-weight: var(--font-weight-semibold);">${formatDate(ride.date)}</div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md);">
              <div>
                <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px;">From Transit Center</div>
                <div style="font-weight: var(--font-weight-semibold); font-size: var(--font-size-lg);">${formatTime(ride.departureFromTC)}</div>
              </div>
              <div>
                <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px;">From Work</div>
                <div style="font-weight: var(--font-weight-semibold); font-size: var(--font-size-lg);">${formatTime(ride.departureFromWork)}</div>
              </div>
            </div>

            ${ride.status === 'scheduled' ? `
              <div>
                <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px;">Driver</div>
                <div style="font-weight: var(--font-weight-semibold);">${escapeHtml(ride.driverName) || 'Unknown'}</div>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- RSVP Section -->
        <div class="card">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-md);">
            <span style="font-weight: var(--font-weight-semibold);">Riders (${rsvps.length}/7)</span>
            <button class="btn ${isRsvped ? 'btn--secondary' : 'btn--primary'} btn--sm" id="rsvp-toggle" ${rsvps.length >= 7 && !isRsvped ? 'disabled' : ''}>
              ${isRsvped ? '✓ RSVP\'d' : 'RSVP'}
            </button>
          </div>

          ${rsvpUsers.length > 0 ? `
            <div style="display: flex; flex-direction: column; gap: var(--space-sm);">
              ${rsvpUsers.map((name, i) => `
                <div style="display: flex; align-items: center; gap: var(--space-sm); padding: var(--space-xs) 0; font-size: var(--font-size-sm); color: var(--color-text-secondary);">
                  <span style="width: 6px; height: 6px; border-radius: 50%; background: var(--color-primary); flex-shrink: 0;"></span>
                  ${escapeHtml(name)}
                </div>
              `).join('')}
            </div>
          ` : `
            <div style="font-size: var(--font-size-sm); color: var(--color-text-muted); text-align: center; padding: var(--space-md);">
              No riders yet. Be the first to RSVP!
            </div>
          `}
        </div>

        <!-- Claim Button (for drivers on requested rides) -->
        ${canClaim ? `
          <button class="btn btn--primary btn--lg btn--block" id="claim-ride" style="margin-top: var(--space-lg);">
            🚗 Claim This Ride
          </button>
        ` : ''}
      </div>
    </div>
  `;

  renderNav('/calendar');

  // Bind events
  container.querySelector('#ride-back')?.addEventListener('click', () => {
    navigate('/calendar');
  });

  container.querySelector('#ride-edit')?.addEventListener('click', () => {
    navigate(`/rides/edit/${rideId}`);
  });

  container.querySelector('#ride-cancel')?.addEventListener('click', async () => {
    const confirmed = await showConfirm({
      title: 'Cancel Ride',
      message: `Are you sure you want to cancel the ride on ${formatDate(ride.date)}? All RSVPs will be lost.`,
      confirmLabel: 'Cancel Ride',
      danger: true,
    });
    if (confirmed) {
      try {
        await deleteRide(rideId, ride);
        showToast('Ride cancelled', 'success');
        navigate('/calendar');
      } catch (e) {
        showToast('Failed to cancel ride', 'error');
      }
    }
  });

  container.querySelector('#rsvp-toggle')?.addEventListener('click', async () => {
    const btn = container.querySelector('#rsvp-toggle');
    btn.disabled = true;
    try {
      const result = await toggleRsvp(rideId, user.uid);
      if (result === 'full') {
        showToast('Ride is full (7/7 riders)', 'error');
      } else if (result === 'added') {
        showToast('RSVP\'d!', 'success');
      } else {
        showToast('RSVP removed', 'info');
      }
      // Re-render
      await rideDetailView(container, params);
    } catch (e) {
      showToast('Failed to update RSVP', 'error');
      btn.disabled = false;
    }
  });

  container.querySelector('#claim-ride')?.addEventListener('click', async () => {
    const btn = container.querySelector('#claim-ride');
    btn.disabled = true;
    btn.textContent = 'Claiming…';
    try {
      await claimRide(rideId, user.uid, getDisplayName(profile), ride.date);
      showToast('Ride claimed! You\'re the driver.', 'success');
      await rideDetailView(container, params);
    } catch (e) {
      showToast('Failed to claim ride', 'error');
      btn.disabled = false;
      btn.textContent = '🚗 Claim This Ride';
    }
  });

  return () => {
    const nav = document.querySelector('.bottom-nav');
    if (nav) nav.remove();
  };
}
