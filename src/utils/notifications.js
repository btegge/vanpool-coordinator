// Notification queue utilities (configured for custom Gmail Cloud Function)
// Writes notification documents to Firestore. The custom `sendNotificationEmail`
// Cloud Function automatically picks these up and sends them via Gmail SMTP.
//
// Document schema: { to: string[], message: { subject, text, html }, createdAt }
//
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase.js';

const NOTIFICATIONS_COLLECTION = 'notifications';

/**
 * Get all user emails for broadcast notifications
 * @returns {Promise<string[]>}
 */
async function getAllUserEmails() {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs
    .map(d => d.data().email)
    .filter(Boolean);
}

/**
 * Queue a notification for sending
 * @param {'ride_requested'|'ride_claimed'|'ride_cancelled'|'user_invite'} type
 * @param {object} data - Context data for the notification
 */
export async function queueNotification(type, data) {
  try {
    const templates = {
      ride_requested: {
        subject: `🚐 Ride Requested — ${data.date}`,
        body: `A ride has been requested for ${data.date} (departs TC at ${data.departureFromTC}). If you're available to drive, open the app to claim this ride.`,
      },
      ride_claimed: {
        subject: `✅ Ride Scheduled — ${data.date}`,
        body: `Great news! ${data.driverName} has claimed the ride for ${data.date}. Open the app to RSVP.`,
      },
      ride_cancelled: {
        subject: `❌ Ride Cancelled — ${data.date}`,
        body: `The ride for ${data.date}${data.driverName ? ` (Driver: ${data.driverName})` : ''} has been cancelled.`,
      },
      user_invite: {
        subject: `🚐 You're Invited to Vanpool Coordinator`,
        body: `Welcome! You've been added to the vanpool. Click the magic link in a separate email to sign in and get started.`,
      },
    };

    const template = templates[type];
    if (!template) {
      console.warn('Unknown notification type:', type);
      return;
    }

    // For user_invite, send only to the specific user
    let recipientEmails;
    if (type === 'user_invite') {
      recipientEmails = [data.email];
    } else {
      recipientEmails = await getAllUserEmails();
    }

    if (recipientEmails.length === 0) return;

    await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
      to: recipientEmails,
      message: {
        subject: template.subject,
        text: template.body,
        html: `<p>${template.body.replace(/\n/g, '<br>')}</p>`,
      },
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    // Don't fail the main operation if notification queueing fails
    console.warn('Failed to queue notification:', error);
  }
}
