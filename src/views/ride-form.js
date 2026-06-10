// Ride form view — Add or edit a ride
import { auth } from '../firebase.js';
import { getUserProfile, getDisplayName, isDriver as checkIsDriver } from '../utils/auth.js';
import { createRide, createRecurringRides, updateRide, getRide, getTodayString } from '../utils/rides.js';
import { renderNav } from '../components/nav.js';
import { showToast } from '../components/toast.js';
import { navigate } from '../router.js';

const backIcon = `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;

/**
 * Render the ride form view (add or edit)
 * @param {HTMLElement} container
 * @param {{ id?: string }} params - If params.id exists, editing; otherwise creating
 */
export async function rideFormView(container, params) {
  const user = auth.currentUser;
  const isEdit = !!params.id;
  const profile = await getUserProfile(user.uid);
  const userIsDriver = profile?.role === 'Driver';
  const userIsAdmin = profile?.isAdmin === true;

  // Parse query params for pre-filled date
  const hashParts = window.location.hash.split('?');
  const queryParams = new URLSearchParams(hashParts[1] || '');
  const prefillDate = queryParams.get('date') || getTodayString();

  let existingRide = null;
  if (isEdit) {
    existingRide = await getRide(params.id);
    if (!existingRide) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state__icon">🔍</div><div class="empty-state__title">Ride not found</div></div>`;
      return;
    }
  }

  const defaultDate = existingRide?.date || prefillDate;
  const defaultTC = existingRide?.departureFromTC || '05:55';
  const defaultWork = existingRide?.departureFromWork || '15:00';
  const defaultStatus = existingRide?.status || (userIsDriver ? 'scheduled' : 'requested');

  container.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <button class="btn btn--ghost btn--icon" id="form-back" aria-label="Back">
          ${backIcon}
        </button>
        <span class="page-header__title">${isEdit ? 'Edit Ride' : 'Add Ride'}</span>
        <div style="width: 40px;"></div>
      </div>

      <div class="section">
        <form class="form" id="ride-form">
          <div class="form-group">
            <label class="form-group__label" for="ride-date">Date</label>
            <input class="input" type="date" id="ride-date" name="date"
              value="${defaultDate}" min="${getTodayString()}" required />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md);">
            <div class="form-group">
              <label class="form-group__label" for="ride-tc">Depart Transit Center</label>
              <input class="input" type="time" id="ride-tc" name="departureFromTC"
                value="${defaultTC}" required />
            </div>
            <div class="form-group">
              <label class="form-group__label" for="ride-work">Depart Work</label>
              <input class="input" type="time" id="ride-work" name="departureFromWork"
                value="${defaultWork}" required />
            </div>
          </div>

          ${userIsDriver ? `
            <div class="form-group">
              <label class="form-group__label">Status</label>
              <div class="radio-group">
                <div class="radio-option">
                  <input type="radio" name="status" value="scheduled" id="status-scheduled"
                    ${defaultStatus === 'scheduled' ? 'checked' : ''} />
                  <label class="radio-option__label" for="status-scheduled">Scheduled</label>
                </div>
                <div class="radio-option">
                  <input type="radio" name="status" value="requested" id="status-requested"
                    ${defaultStatus === 'requested' ? 'checked' : ''} />
                  <label class="radio-option__label" for="status-requested">Requested</label>
                </div>
              </div>
              <p class="form-group__hint" id="status-hint">
                ${defaultStatus === 'scheduled' ? 'You\'ll be assigned as the driver.' : 'Requesting a driver for this ride.'}
              </p>
            </div>
          ` : `
            <input type="hidden" name="status" value="requested" />
            <div class="card" style="padding: var(--space-md); background: var(--color-requested-bg); border-color: rgba(245, 158, 11, 0.2);">
              <div style="font-size: var(--font-size-sm); color: var(--color-requested);">
                ⚡ This ride will be posted as a request. A driver can claim it from the calendar.
              </div>
            </div>
          `}

          ${!isEdit ? `
            <div class="form-group">
              <label class="form-group__label">Repeat</label>
              <div class="radio-group" style="flex-wrap: wrap;">
                <div class="radio-option">
                  <input type="radio" name="repeat" value="none" id="repeat-none" checked />
                  <label class="radio-option__label" for="repeat-none">One-time</label>
                </div>
                <div class="radio-option">
                  <input type="radio" name="repeat" value="daily" id="repeat-daily" />
                  <label class="radio-option__label" for="repeat-daily">Mon–Fri</label>
                </div>
                <div class="radio-option">
                  <input type="radio" name="repeat" value="weekly" id="repeat-weekly" />
                  <label class="radio-option__label" for="repeat-weekly">Weekly</label>
                </div>
              </div>
            </div>

            <div class="form-group" id="end-date-group" style="display: none;">
              <label class="form-group__label" for="ride-end-date">Repeat Until</label>
              <input class="input" type="date" id="ride-end-date" name="endDate" min="${getTodayString()}" />
            </div>
          ` : ''}

          <div class="form-actions">
            <button class="btn btn--secondary" type="button" id="form-cancel">Cancel</button>
            <button class="btn btn--primary" type="submit" id="form-submit">
              ${isEdit ? 'Save Changes' : 'Add Ride'}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  renderNav('/calendar');

  const form = container.querySelector('#ride-form');

  // Status change hint
  if (userIsDriver) {
    form.querySelectorAll('input[name="status"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const hint = container.querySelector('#status-hint');
        hint.textContent = radio.value === 'scheduled'
          ? 'You\'ll be assigned as the driver.'
          : 'Requesting a driver for this ride.';
      });
    });
  }

  // Repeat toggle
  if (!isEdit) {
    form.querySelectorAll('input[name="repeat"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const endDateGroup = container.querySelector('#end-date-group');
        endDateGroup.style.display = radio.value === 'none' ? 'none' : 'flex';
        if (radio.value !== 'none') {
          container.querySelector('#ride-end-date').required = true;
        } else {
          container.querySelector('#ride-end-date').required = false;
        }
      });
    });
  }

  // Back / Cancel
  container.querySelector('#form-back').addEventListener('click', () => history.back());
  container.querySelector('#form-cancel').addEventListener('click', () => history.back());

  // Submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = container.querySelector('#form-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = isEdit ? 'Saving…' : 'Adding…';

    try {
      const formData = new FormData(form);
      const date = formData.get('date');
      const departureFromTC = formData.get('departureFromTC');
      const departureFromWork = formData.get('departureFromWork');
      const status = formData.get('status');
      const repeat = formData.get('repeat') || 'none';
      const endDate = formData.get('endDate');

      const rideData = {
        date,
        departureFromTC,
        departureFromWork,
        status,
        driverId: status === 'scheduled' ? user.uid : null,
        driverName: status === 'scheduled' ? getDisplayName(profile) : null,
        createdBy: user.uid,
      };

      if (isEdit) {
        const { createdBy, ...updateData } = rideData;
        await updateRide(params.id, updateData);
        showToast('Ride updated', 'success');
        navigate(`/rides/${params.id}`);
      } else if (repeat !== 'none' && endDate) {
        const ids = await createRecurringRides(rideData, repeat, endDate);
        showToast(`${ids.length} rides created`, 'success');
        navigate('/calendar');
      } else {
        await createRide(rideData);
        showToast('Ride added', 'success');
        navigate('/calendar');
      }
    } catch (error) {
      console.error('Error saving ride:', error);
      showToast(error.message || 'Failed to save ride', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = isEdit ? 'Save Changes' : 'Add Ride';
    }
  });

  return () => {
    const nav = document.querySelector('.bottom-nav');
    if (nav) nav.remove();
  };
}
