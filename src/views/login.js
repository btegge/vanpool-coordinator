// Login view — Magic link (passwordless) sign-in
import { auth } from '../firebase.js';
import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from 'firebase/auth';
import { hasAnyUsers, createFirstAdmin, linkUserProfile } from '../utils/auth.js';
import { navigate } from '../router.js';
import { showToast } from '../components/toast.js';

const ACTION_CODE_SETTINGS = {
  url: window.location.origin + window.location.pathname + '#/login',
  handleCodeInApp: true,
};

/**
 * Render the login view
 * @param {HTMLElement} container
 */
export async function loginView(container) {
  // Check if this is a sign-in link completion
  if (isSignInWithEmailLink(auth, window.location.href)) {
    await handleSignInLink(container);
    return;
  }

  // Check if the user is already signed in
  if (auth.currentUser) {
    navigate('/calendar');
    return;
  }

  // Check if this is the first user (show setup form)
  let isFirstUser = false;
  try {
    isFirstUser = !(await hasAnyUsers());
  } catch (e) {
    // If we can't check, assume not first user
  }

  container.innerHTML = `
    <div class="login-page fade-in">
      <div class="login-page__logo">🚐</div>
      <h1 class="login-page__title">Vanpool</h1>
      <p class="login-page__subtitle">${isFirstUser ? 'Set up your vanpool coordinator' : 'Sign in to continue'}</p>

      <form class="login-page__form form" id="login-form">
        ${isFirstUser ? `
          <div class="form-group">
            <label class="form-group__label" for="login-first-name">First Name</label>
            <input class="input" type="text" id="login-first-name" name="firstName" required autocomplete="given-name" placeholder="John" />
          </div>
          <div class="form-group">
            <label class="form-group__label" for="login-last-name">Last Name</label>
            <input class="input" type="text" id="login-last-name" name="lastName" required autocomplete="family-name" placeholder="Doe" />
          </div>
        ` : ''}

        <div class="form-group">
          <label class="form-group__label" for="login-email">Email Address</label>
          <input class="input" type="email" id="login-email" name="email" required autocomplete="email"
            placeholder="you@example.com"
            value="${window.localStorage.getItem('emailForSignIn') || ''}" />
        </div>

        <button class="btn btn--primary btn--lg btn--block" type="submit" id="login-submit">
          ${isFirstUser ? '✨ Create Account & Send Link' : '📧 Send Magic Link'}
        </button>

        <p class="login-page__footer">
          ${isFirstUser
      ? 'You\'ll be the admin of this vanpool.'
      : 'We\'ll email you a link to sign in — no password needed.'}
        </p>
      </form>

      <div id="login-status" style="display:none; text-align:center; padding: var(--space-xl);">
        <div class="spinner spinner--lg" style="margin: 0 auto var(--space-lg);"></div>
        <p id="login-status-text" style="color: var(--color-text-secondary); font-size: var(--font-size-sm);"></p>
      </div>
    </div>
  `;

  const form = container.querySelector('#login-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.querySelector('#login-email').value.trim();
    const firstName = form.querySelector('#login-first-name')?.value.trim();
    const lastName = form.querySelector('#login-last-name')?.value.trim();

    if (!email) return;

    const submitBtn = form.querySelector('#login-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    try {
      // Store email and setup data for after sign-in
      window.localStorage.setItem('emailForSignIn', email);
      if (isFirstUser && firstName && lastName) {
        window.localStorage.setItem('setupData', JSON.stringify({ firstName, lastName }));
      }

      await sendSignInLinkToEmail(auth, email, ACTION_CODE_SETTINGS);

      form.style.display = 'none';
      const status = container.querySelector('#login-status');
      status.style.display = 'block';
      status.querySelector('#login-status-text').textContent =
        `Magic link sent to ${email}. Check your inbox and click the link to sign in.`;

      // Remove spinner, show success
      status.querySelector('.spinner').remove();
      status.insertAdjacentHTML('afterbegin', '<div style="font-size: 3rem; margin-bottom: var(--space-md);">📬</div>');

    } catch (error) {
      console.error('Error sending magic link:', error);
      submitBtn.disabled = false;
      submitBtn.textContent = isFirstUser ? '✨ Create Account & Send Link' : '📧 Send Magic Link';
      showToast(error.message || 'Failed to send magic link', 'error');
    }
  });
}

/**
 * Handle the magic link sign-in completion
 */
async function handleSignInLink(container) {
  container.innerHTML = `
    <div class="loading-screen">
      <div class="spinner spinner--lg"></div>
      <p class="loading-screen__text">Signing you in…</p>
    </div>
  `;

  try {
    let email = window.localStorage.getItem('emailForSignIn');
    if (!email) {
      // If the user opens the link on a different device
      email = window.prompt('Please enter your email address to confirm sign-in:');
    }

    if (!email || !email.trim()) {
      showToast('Email required to complete sign-in', 'error');
      navigate('/login');
      return;
    }

    email = email.trim();

    const result = await signInWithEmailLink(auth, email, window.location.href);
    const user = result.user;

    window.localStorage.removeItem('emailForSignIn');

    // Check if this is the first user (setup)
    const setupDataStr = window.localStorage.getItem('setupData');
    if (setupDataStr) {
      const setupData = JSON.parse(setupDataStr);
      await createFirstAdmin(user.uid, {
        firstName: setupData.firstName,
        lastName: setupData.lastName,
        email: user.email,
      });
      window.localStorage.removeItem('setupData');
      showToast('Welcome! You\'re the admin.', 'success');
    } else {
      // Try to link with pre-created user doc
      await linkUserProfile(user.uid, user.email);
    }

    // Clean up the URL (remove the sign-in link params)
    window.history.replaceState(null, '', window.location.pathname + '#/calendar');
    navigate('/calendar');

  } catch (error) {
    console.error('Error completing sign-in:', error);
    showToast(error.message || 'Sign-in failed. The link may have expired.', 'error');
    window.history.replaceState(null, '', window.location.pathname + '#/login');
    navigate('/login');
  }
}
