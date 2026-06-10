# Vanpool Coordinator — Task List

## 1. Project Setup
- [x] Initialize Vite project
- [x] Install Firebase SDK
- [x] Create `index.html` with mobile viewport, SEO meta, font imports
- [x] Vite config (default works)

## 2. CSS Design System
- [x] `src/styles/index.css` — Custom properties, resets, dark mode, responsive breakpoints
- [x] `src/styles/components.css` — Buttons, cards, modals, inputs, badges, avatars, nav
- [x] `src/styles/calendar.css` — Calendar grid, day cell states, animations
- [x] `src/styles/forms.css` — Form layout, validation states

## 3. Firebase Configuration
- [x] `src/firebase.js` — App init, Auth, Firestore exports
- [x] `firebase.json` — Hosting, Auth, Firestore config
- [x] `.firebaserc` — Project alias
- [x] `firestore.rules` — Security rules
- [x] `firestore.indexes.json` — Composite indexes

## 4. Core Infrastructure
- [x] `src/router.js` — Hash-based SPA router with auth guards
- [x] `src/main.js` — Entry point, auth state listener, router boot

## 5. Utilities
- [x] `src/utils/auth.js` — User profile helpers, admin/driver checks
- [x] `src/utils/rides.js` — Ride CRUD, claim, RSVP, recurring creation
- [x] `src/utils/users.js` — User CRUD, photo resize/encode
- [x] `src/utils/notifications.js` — Notification queue (stubbed email)

## 6. Shared Components
- [x] `src/components/nav.js` — Bottom navigation bar
- [x] `src/components/modal.js` — Reusable modal dialog
- [x] `src/components/toast.js` — Toast notification system
- [x] `src/components/avatar.js` — Avatar (base64 or initials fallback)
- [x] `src/components/badge.js` — Role/status badges

## 7. Views
- [x] `src/views/login.js` — Magic link sign-in, first-user setup
- [x] `src/views/calendar.js` — Monthly calendar with ride indicators
- [x] `src/views/ride-detail.js` — Ride details, RSVP, claim, edit/cancel
- [x] `src/views/ride-form.js` — Add/edit ride, recurring options
- [x] `src/views/profile.js` — Edit own profile + photo upload
- [x] `src/views/admin-users.js` — User list, add/edit/remove
- [x] `src/views/admin-export.js` — CSV export for date range

## 8. Verification
- [x] Build compiles without errors (0 warnings)
- [x] Dev server runs and renders login page
- [ ] Firebase project creation & deployment
