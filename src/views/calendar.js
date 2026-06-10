// Calendar view — Monthly calendar with ride indicators
import { auth } from '../firebase.js';
import { getUserProfile } from '../utils/auth.js';
import { getRidesForMonth, getTodayString, formatTime } from '../utils/rides.js';
import { renderNav } from '../components/nav.js';
import { navigate } from '../router.js';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const chevronLeft = `<svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>`;
const chevronRight = `<svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>`;
const plusIcon = `<svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;

/**
 * Render the calendar view
 * @param {HTMLElement} container
 */
export async function calendarView(container) {
  const user = auth.currentUser;
  const todayStr = getTodayString();
  const todayParts = todayStr.split('-').map(Number);

  let viewYear = todayParts[0];
  let viewMonth = todayParts[1] - 1; // 0-indexed
  let rides = [];
  let selectedDate = null;

  async function loadRides() {
    try {
      rides = await getRidesForMonth(viewYear, viewMonth);
    } catch (e) {
      console.error('Error loading rides:', e);
      rides = [];
    }
  }

  function getRidesForDate(dateStr) {
    return rides.filter(r => r.date === dateStr);
  }

  function render() {
    const today = getTodayString();
    const currentMonthStart = `${todayParts[0]}-${String(todayParts[1]).padStart(2, '0')}`;
    const viewMonthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
    const isPastMonth = viewMonthStr < currentMonthStart;
    const isCurrentMonth = viewMonthStr === currentMonthStart;

    // Calendar header
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

    let calendarHTML = `
      <div class="calendar slide-up">
        <div class="calendar__nav">
          <button class="calendar__nav-btn" id="cal-prev" ${isPastMonth || isCurrentMonth ? 'disabled' : ''} aria-label="Previous month">
            ${chevronLeft}
          </button>
          <h2 class="calendar__month-label">${MONTH_NAMES[viewMonth]} ${viewYear}</h2>
          <button class="calendar__nav-btn" id="cal-next" aria-label="Next month">
            ${chevronRight}
          </button>
        </div>

        <div class="calendar__weekdays">
          ${WEEKDAYS.map(d => `<div class="calendar__weekday">${d}</div>`).join('')}
        </div>

        <div class="calendar__grid">
    `;

    // Empty cells before first day
    for (let i = 0; i < firstDayOfWeek; i++) {
      calendarHTML += `<div class="calendar__day calendar__day--empty"></div>`;
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = dateStr === today;
      const isPast = dateStr < today;
      const dayRides = getRidesForDate(dateStr);
      const isSelected = dateStr === selectedDate;

      let classes = 'calendar__day';
      if (isPast) classes += ' calendar__day--past';
      if (isToday) classes += ' calendar__day--today';
      if (isSelected) classes += ' calendar__day--selected';

      // Indicators
      let indicators = '';
      if (dayRides.length > 0) {
        const indicatorDots = dayRides.map(r =>
          `<div class="calendar__day-indicator calendar__day-indicator--${r.status}"></div>`
        ).join('');
        indicators = `<div class="calendar__day-indicators">${indicatorDots}</div>`;
      }

      calendarHTML += `
        <button class="${classes}" data-date="${dateStr}" ${isPast ? 'disabled' : ''} aria-label="${MONTH_NAMES[viewMonth]} ${day}">
          <span class="calendar__day-number">${day}</span>
          ${indicators}
        </button>
      `;
    }

    calendarHTML += `
        </div>

        <div class="calendar__legend">
          <div class="calendar__legend-item">
            <div class="calendar__legend-dot calendar__legend-dot--scheduled"></div>
            <span>Scheduled</span>
          </div>
          <div class="calendar__legend-item">
            <div class="calendar__legend-dot calendar__legend-dot--requested"></div>
            <span>Requested</span>
          </div>
        </div>
      </div>
    `;

    // Ride list for selected date
    if (selectedDate) {
      const dateRides = getRidesForDate(selectedDate);
      calendarHTML += `
        <div class="ride-list slide-up">
          <div class="ride-list__header">${formatDateShort(selectedDate)}</div>
          ${dateRides.length > 0 ? dateRides.map(ride => `
            <div class="ride-card" data-ride-id="${ride.id}">
              <div class="ride-card__status-bar ride-card__status-bar--${ride.status}"></div>
              <div class="ride-card__info">
                <div class="ride-card__time">${formatTime(ride.departureFromTC)} → ${formatTime(ride.departureFromWork)}</div>
                <div class="ride-card__meta">
                  ${ride.status === 'scheduled' ? `Driver: ${ride.driverName || 'Unknown'}` : 'Needs a driver'}
                </div>
              </div>
              <div class="ride-card__rsvp">
                <span style="font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold);">${(ride.rsvps || []).length}/7</span>
                <span style="display: block; font-size: 9px; color: var(--color-text-muted);">riders</span>
              </div>
            </div>
          `).join('') : `
            <div class="empty-state" style="padding: var(--space-lg);">
              <div class="empty-state__icon">🚐</div>
              <div class="empty-state__text">No rides on this day</div>
              <button class="btn btn--primary btn--sm" id="add-ride-empty">Add Ride</button>
            </div>
          `}
        </div>
      `;
    }

    // FAB
    calendarHTML += `
      <button class="fab" id="fab-add-ride" aria-label="Add ride">
        ${plusIcon}
      </button>
    `;

    container.innerHTML = calendarHTML;
    renderNav('/calendar');
    bindEvents();
  }

  function bindEvents() {
    // Month navigation
    container.querySelector('#cal-prev')?.addEventListener('click', async () => {
      viewMonth--;
      if (viewMonth < 0) { viewMonth = 11; viewYear--; }
      selectedDate = null;
      await loadRides();
      render();
    });

    container.querySelector('#cal-next')?.addEventListener('click', async () => {
      viewMonth++;
      if (viewMonth > 11) { viewMonth = 0; viewYear++; }
      selectedDate = null;
      await loadRides();
      render();
    });

    // Day click
    container.querySelectorAll('.calendar__day:not(.calendar__day--empty):not(.calendar__day--past)').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedDate = btn.dataset.date;
        render();
      });
    });

    // Ride card click
    container.querySelectorAll('.ride-card').forEach(card => {
      card.addEventListener('click', () => {
        navigate(`/rides/${card.dataset.rideId}`);
      });
    });

    // FAB
    container.querySelector('#fab-add-ride')?.addEventListener('click', () => {
      const date = selectedDate || getTodayString();
      navigate(`/rides/new?date=${date}`);
    });

    // Add ride from empty state
    container.querySelector('#add-ride-empty')?.addEventListener('click', () => {
      navigate(`/rides/new?date=${selectedDate}`);
    });
  }

  // Initial load
  await loadRides();
  render();

  return () => {
    // Cleanup
    const nav = document.querySelector('.bottom-nav');
    if (nav) nav.remove();
    const fab = document.querySelector('.fab');
    if (fab) fab.remove();
  };
}

function formatDateShort(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
