# Vanpool Coordinator — Development Walkthrough

We've successfully built the frontend and core logic for the Vanpool Coordinator application. The application is a mobile-first, single-page application (SPA) built with Vanilla JavaScript, Vite, and Firebase.

## Accomplishments

### 1. Design System & UI
- **Mobile-First Layout**: Created a fully responsive design optimized for mobile devices, using CSS Custom Properties for easy theming.
- **Dark Theme Aesthetics**: Implemented a sleek, modern dark theme with gradient accents, subtle borders, and glass-like overlays.
- **Custom Components**: Built lightweight, reusable UI components including:
  - Bottom navigation bar with SVG icons.
  - Modal dialog system with backdrop and escape-key handling.
  - Toast notifications for user feedback.
  - Avatar component with photo display and initials fallback.
  - Status badges for roles and ride states.

### 2. Authentication Flow (Passwordless)
- **Magic Links**: Configured the UI to support Firebase Auth's email link authentication (passwordless).
- **First-User Bootstrap**: Implemented a flow where the very first person to sign up automatically becomes an Admin and sets up their profile name during the email entry step.
- **Profile Linking**: Added logic to automatically link the newly authenticated user UID with their pre-created (or bootstrap) profile document in Firestore.

### 3. Core Features
- **Interactive Calendar**: 
  - Built a custom monthly calendar view.
  - Displays dots for rides (green for scheduled, amber for requested).
  - Navigation restricted to current and future months.
  - Tapping a day shows the rides for that day in a list below.
- **Ride Management**:
  - **Create**: Forms to add one-time rides, daily (Mon-Fri) recurring rides, or weekly recurring rides.
  - **View/Detail**: See departure times, driver info, and current RSVP count.
  - **RSVP**: Riders can toggle their RSVP status, with capacity automatically capped at 7.
  - **Claim**: Drivers can instantly claim a "requested" ride, changing it to "scheduled".
- **Profile & Users**:
  - **Client-side Image Resize**: Profile photos are automatically cropped to a square, resized, and compressed to fit under a 75KB limit before being saved directly to the Firestore document (saving costs by avoiding Cloud Storage).
  - **User Management**: Admins can view all users, add new users (which queues an invite), edit roles, and remove users.
- **Admin Export**:
  - Added a dedicated view for admins to select a date range and download a CSV report of all rides and driver assignments.

### 4. Database & Security
- **Data Modeling**: Denormalized essential data (like `driverName` on the ride document) to minimize the number of reads needed to display the calendar and ride details.
- **Security Rules**: Wrote comprehensive, production-ready Firestore Security Rules (`firestore.rules`) enforcing Role-Based Access Control (RBAC):
  - **Admins**: Can read/write everything.
  - **Drivers**: Can create scheduled rides, claim requested rides, and manage their own rides.
  - **Riders**: Can only create requested rides and update RSVPs on existing rides.
  - Immutable fields (like `createdAt`) and data validation are strictly enforced.

### 5. Notifications
- **Notification Queue**: Implemented a Firestore-based notification queue (`src/utils/notifications.js`).
- When actions occur (ride requested, claimed, cancelled, or user invited), a document is written to the `notifications` collection.
- **Cloud Function**: Built a custom Firebase Cloud Function (`functions/index.js`) using `nodemailer` that automatically listens to the `notifications` collection and sends emails using your personal Gmail account.

## Visual Verification
We verified the build compiles without errors and the development server serves the initial login page correctly, showcasing the dark theme and gradient typography.

![Login Page Verification](/Users/benjamintegge/.gemini/antigravity-ide/brain/6fb250de-6b5e-4c09-b1e6-46acc305068a/login_page_initial_1781058610353.png)

## Next Steps for Deployment

To make the app live, you will need to:
1. **Create a Firebase Project** in the Firebase Console.
2. **Enable Authentication**: Turn on "Email/Password" and enable the "Email link (passwordless sign-in)" option.
3. **Enable Firestore**: Create a Firestore database.
4. **Update Config**: Replace the placeholder `firebaseConfig` in `src/firebase.js` with your actual project config.
5. **Update `.firebaserc`**: Change `vanpool-coordinator` to your actual Firebase project ID.
6. **Deploy**: Run `firebase deploy` using the Firebase CLI to deploy the hosting files and security rules.
7. **Email Setup**: 
   - Generate an "App Password" in your Google Account settings (Security -> 2-Step Verification -> App Passwords).
   - Run `firebase deploy --only functions` in your terminal. You will be prompted to enter your `GMAIL_EMAIL` and `GMAIL_APP_PASSWORD` for the Secret Manager.
