// Admin export view — CSV download of driver history
import { auth } from '../firebase.js';
import { getRidesForRange, formatDate, formatTime, getTodayString } from '../utils/rides.js';
import { renderNav } from '../components/nav.js';
import { showToast } from '../components/toast.js';
import { navigate } from '../router.js';

const backIcon = `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;

/**
 * Render the admin export view
 * @param {HTMLElement} container
 */
export async function adminExportView(container) {
  const today = getTodayString();
  // Default: last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const defaultStart = thirtyDaysAgo.toISOString().split('T')[0];

  container.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <button class="btn btn--ghost btn--icon" id="export-back" aria-label="Back">
          ${backIcon}
        </button>
        <span class="page-header__title">Driver Report</span>
        <div style="width: 40px;"></div>
      </div>

      <div class="section">
        <div class="card">
          <form class="form" id="export-form">
            <p style="font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-bottom: var(--space-md);">
              Export a CSV report of all rides within a date range, including driver assignments and RSVP counts.
            </p>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md);">
              <div class="form-group">
                <label class="form-group__label" for="export-start">Start Date</label>
                <input class="input" type="date" id="export-start" name="startDate"
                  value="${defaultStart}" required />
              </div>
              <div class="form-group">
                <label class="form-group__label" for="export-end">End Date</label>
                <input class="input" type="date" id="export-end" name="endDate"
                  value="${today}" required />
              </div>
            </div>

            <button class="btn btn--primary btn--block" type="submit" id="export-submit">
              📊 Generate & Download CSV
            </button>
          </form>
        </div>

        <div id="export-preview" style="margin-top: var(--space-lg);"></div>
      </div>
    </div>
  `;

  renderNav('/admin/users');

  container.querySelector('#export-back').addEventListener('click', () => navigate('/admin/users'));

  container.querySelector('#export-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = container.querySelector('#export-submit');
    btn.disabled = true;
    btn.textContent = 'Generating…';

    try {
      const form = e.target;
      const startDate = form.startDate.value;
      const endDate = form.endDate.value;

      if (startDate > endDate) {
        showToast('Start date must be before end date', 'error');
        btn.disabled = false;
        btn.textContent = '📊 Generate & Download CSV';
        return;
      }

      const rides = await getRidesForRange(startDate, endDate);

      if (rides.length === 0) {
        showToast('No rides found in this date range', 'info');
        btn.disabled = false;
        btn.textContent = '📊 Generate & Download CSV';
        return;
      }

      // Generate CSV
      const csvRows = [
        ['Date', 'Status', 'Driver', 'Departure (TC)', 'Departure (Work)', 'RSVP Count'].join(','),
      ];

      rides.forEach(ride => {
        csvRows.push([
          ride.date,
          ride.status,
          `"${ride.driverName || 'None'}"`,
          ride.departureFromTC,
          ride.departureFromWork,
          (ride.rsvps || []).length,
        ].join(','));
      });

      const csv = csvRows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vanpool-report-${startDate}-to-${endDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      showToast(`Downloaded ${rides.length} rides`, 'success');

      // Show summary preview
      const driverCounts = {};
      rides.forEach(r => {
        if (r.driverName) {
          driverCounts[r.driverName] = (driverCounts[r.driverName] || 0) + 1;
        }
      });

      const preview = container.querySelector('#export-preview');
      preview.innerHTML = `
        <div class="card slide-up">
          <h3 style="font-weight: var(--font-weight-semibold); margin-bottom: var(--space-md);">Summary</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md); margin-bottom: var(--space-md);">
            <div>
              <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); text-transform: uppercase;">Total Rides</div>
              <div style="font-size: var(--font-size-xl); font-weight: var(--font-weight-bold);">${rides.length}</div>
            </div>
            <div>
              <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); text-transform: uppercase;">Unique Drivers</div>
              <div style="font-size: var(--font-size-xl); font-weight: var(--font-weight-bold);">${Object.keys(driverCounts).length}</div>
            </div>
          </div>
          ${Object.keys(driverCounts).length > 0 ? `
            <div class="divider"></div>
            <h4 style="font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); margin: var(--space-md) 0 var(--space-sm);">Drives per Driver</h4>
            ${Object.entries(driverCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([name, count]) => `
                <div style="display: flex; justify-content: space-between; padding: var(--space-xs) 0; font-size: var(--font-size-sm);">
                  <span>${name}</span>
                  <span style="font-weight: var(--font-weight-semibold); color: var(--color-primary-hover);">${count}</span>
                </div>
              `).join('')}
          ` : ''}
        </div>
      `;
    } catch (error) {
      showToast('Failed to generate report', 'error');
    }

    btn.disabled = false;
    btn.textContent = '📊 Generate & Download CSV';
  });

  return () => {
    const nav = document.querySelector('.bottom-nav');
    if (nav) nav.remove();
  };
}
