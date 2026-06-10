// Main entry point — Vanpool Coordinator
import './styles/index.css';
import './styles/components.css';
import './styles/calendar.css';
import './styles/forms.css';

import { auth } from './firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { registerRoute, initRouter, navigate } from './router.js';
import { linkUserProfile } from './utils/auth.js';

// Import views
import { loginView } from './views/login.js';
import { calendarView } from './views/calendar.js';
import { rideDetailView } from './views/ride-detail.js';
import { rideFormView } from './views/ride-form.js';
import { profileView } from './views/profile.js';
import { adminUsersView } from './views/admin-users.js';
import { adminExportView } from './views/admin-export.js';

// --- Register Routes ---

// Public routes
registerRoute('/login', loginView, { requiresAuth: false });

// Authenticated routes
registerRoute('/calendar', calendarView);
registerRoute('/profile', profileView);

// Ride routes
registerRoute('/rides/new', rideFormView);
registerRoute('/rides/edit/:id', (container, params) => rideFormView(container, params));
registerRoute('/rides/:id', rideDetailView);

// Admin routes
registerRoute('/admin/users', adminUsersView, { requiresAdmin: true });
registerRoute('/admin/export', adminExportView, { requiresAdmin: true });

// --- Auth State Listener ---

let authReady = false;

onAuthStateChanged(auth, async (user) => {
  if (!authReady) {
    authReady = true;

    // Show loading screen while we determine auth state
    const app = document.getElementById('app');
    app.innerHTML = '';

    if (user) {
      // Try to link profile if needed
      try {
        await linkUserProfile(user.uid, user.email);
      } catch (e) {
        console.warn('Could not link profile:', e);
      }

      // If on login page, redirect to calendar
      const currentPath = window.location.hash.slice(1);
      if (!currentPath || currentPath === '/login') {
        navigate('/calendar');
      }
    }

    // Boot the router
    initRouter();
    return;
  }

  // Subsequent auth state changes (sign-in / sign-out)
  if (user) {
    try {
      await linkUserProfile(user.uid, user.email);
    } catch (e) {
      console.warn('Could not link profile:', e);
    }
    navigate('/calendar');
  } else {
    navigate('/login');
  }
});
