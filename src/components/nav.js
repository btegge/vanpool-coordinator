// Bottom navigation component
import { navigate } from '../router.js';
import { auth } from '../firebase.js';
import { getUserProfile } from '../utils/auth.js';

const calendarIcon = `<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
const profileIcon = `<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
const usersIcon = `<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;

/**
 * Render the bottom navigation bar
 * @param {string} activeRoute - Current active route
 */
export function renderNav(activeRoute) {
  // Remove existing nav
  const existing = document.querySelector('.bottom-nav');
  if (existing) existing.remove();

  const user = auth.currentUser;
  if (!user) return;

  const nav = document.createElement('nav');
  nav.className = 'bottom-nav';
  nav.setAttribute('role', 'navigation');
  nav.setAttribute('aria-label', 'Main navigation');

  const items = [
    { path: '/calendar', label: 'Calendar', icon: calendarIcon, id: 'nav-calendar' },
    { path: '/profile', label: 'Profile', icon: profileIcon, id: 'nav-profile' },
  ];

  // We'll check admin status and add the admin tab
  const inner = document.createElement('div');
  inner.className = 'bottom-nav__inner';

  items.forEach(item => {
    const link = document.createElement('a');
    link.href = `#${item.path}`;
    link.className = `bottom-nav__item${activeRoute === item.path ? ' bottom-nav__item--active' : ''}`;
    link.id = item.id;
    link.setAttribute('aria-label', item.label);
    link.innerHTML = `
      <span class="bottom-nav__icon">${item.icon}</span>
      <span>${item.label}</span>
    `;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(item.path);
    });
    inner.appendChild(link);
  });

  nav.appendChild(inner);
  document.body.appendChild(nav);

  // Async check for admin tab
  getUserProfile(user.uid).then(profile => {
    if (profile?.isAdmin) {
      const adminLink = document.createElement('a');
      adminLink.href = '#/admin/users';
      adminLink.className = `bottom-nav__item${activeRoute.startsWith('/admin') ? ' bottom-nav__item--active' : ''}`;
      adminLink.id = 'nav-admin';
      adminLink.setAttribute('aria-label', 'Admin');
      adminLink.innerHTML = `
        <span class="bottom-nav__icon">${usersIcon}</span>
        <span>Admin</span>
      `;
      adminLink.addEventListener('click', (e) => {
        e.preventDefault();
        navigate('/admin/users');
      });
      inner.appendChild(adminLink);
    }
  });
}
