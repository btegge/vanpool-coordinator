// Simple hash-based SPA router with auth guards

import { auth } from './firebase.js';
import { getUserProfile } from './utils/auth.js';

/** @type {Map<string, {view: Function, requiresAuth: boolean, requiresAdmin: boolean}>} */
const routes = new Map();
let currentCleanup = null;

/**
 * Register a route
 * @param {string} path - Route pattern (e.g., '/calendar', '/rides/:id')
 * @param {Function} viewFn - Async function that renders the view, returns cleanup function
 * @param {{ requiresAuth?: boolean, requiresAdmin?: boolean }} options
 */
export function registerRoute(path, viewFn, options = {}) {
  routes.set(path, {
    view: viewFn,
    requiresAuth: options.requiresAuth !== false,
    requiresAdmin: options.requiresAdmin || false,
  });
}

/**
 * Navigate to a route
 * @param {string} path
 */
export function navigate(path) {
  window.location.hash = path;
}

/**
 * Get the current route path
 */
function getCurrentPath() {
  const hash = window.location.hash.slice(1) || '/login';
  // Strip query parameters for routing matching
  return hash.split('?')[0];
}

/**
 * Parse route params from a pattern
 * @param {string} pattern - e.g., '/rides/:id'
 * @param {string} path - e.g., '/rides/abc123'
 * @returns {object|null} - e.g., { id: 'abc123' } or null if no match
 */
function matchRoute(pattern, path) {
  const patternParts = pattern.split('/');
  const pathParts = path.split('/');

  if (patternParts.length !== pathParts.length) return null;

  const params = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }
  return params;
}

/**
 * Resolve the current path to a matching route
 */
function resolveRoute(path) {
  // Exact match first
  if (routes.has(path)) {
    return { route: routes.get(path), params: {} };
  }
  // Pattern match
  for (const [pattern, route] of routes) {
    const params = matchRoute(pattern, path);
    if (params) {
      return { route, params };
    }
  }
  return null;
}

/**
 * Handle route change
 */
async function handleRouteChange() {
  const path = getCurrentPath();
  const appEl = document.getElementById('app');

  // Cleanup previous view
  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }

  const resolved = resolveRoute(path);

  if (!resolved) {
    navigate('/calendar');
    return;
  }

  const { route, params } = resolved;

  // Auth guard
  if (route.requiresAuth) {
    const user = auth.currentUser;
    if (!user) {
      navigate('/login');
      return;
    }

    // Admin guard
    if (route.requiresAdmin) {
      try {
        const profile = await getUserProfile(user.uid);
        if (!profile || !profile.isAdmin) {
          navigate('/calendar');
          return;
        }
      } catch (e) {
        navigate('/calendar');
        return;
      }
    }
  }

  // Render the view
  try {
    appEl.innerHTML = '';
    currentCleanup = await route.view(appEl, params);
  } catch (error) {
    console.error('Error rendering view:', error);
    appEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">⚠️</div>
        <div class="empty-state__title">Something went wrong</div>
        <div class="empty-state__text">${error.message}</div>
        <button class="btn btn--primary" onclick="location.hash='#/calendar'">Go Home</button>
      </div>
    `;
  }
}

/**
 * Initialize the router
 */
export function initRouter() {
  window.addEventListener('hashchange', handleRouteChange);
  handleRouteChange();
}

/**
 * Trigger a re-render of the current route
 */
export function refreshRoute() {
  handleRouteChange();
}
