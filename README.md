# Vanpool Coordinator 🚐

A mobile-first web application designed to help small vanpool groups (up to ~10 people) effortlessly coordinate daily rides, request drivers, and RSVP. 

Built with **Vanilla JavaScript**, **Vite**, and **Firebase**, it features a beautiful, dynamic dark theme with smooth micro-animations and a robust role-based security system.

---

## ✨ Features

- **Passwordless Authentication**: Users log in securely using "Magic Links" sent to their email. No passwords to remember.
- **Visual Calendar Interface**: A clean, easy-to-read monthly calendar showing requested rides, scheduled rides, and current driver assignments.
- **Role-Based Access**:
  - **Admin**: The first user to log in is automatically an Admin. They can manage users, assign roles, export data, and delete any ride.
  - **Drivers**: Can schedule rides, assign themselves as the driver, and claim open ride requests.
  - **Riders**: Can RSVP to scheduled rides and submit new ride requests.
- **RSVP System**: Riders can reserve a seat (up to a maximum capacity of 7 riders per ride).
- **Automated Notifications**: A custom Firebase Cloud Function utilizes `nodemailer` to automatically send email notifications via a custom Gmail address whenever a ride is requested, claimed, or cancelled.

## 🛠 Tech Stack

- **Frontend**: Vanilla JavaScript (ES Modules), Vite
- **Styling**: Vanilla CSS (Mobile-first, Custom CSS variables, Glassmorphism, Dark mode)
- **Backend / Database**: Firebase (Auth, Firestore, Hosting)
- **Cloud Functions**: Node.js (Firebase Functions v2)

---

## 🚀 Setup & Installation

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [Firebase CLI](https://firebase.google.com/docs/cli) (`npm install -g firebase-tools`)

### 2. Local Setup
Clone the repository and install dependencies for both the frontend and the Cloud Functions:

```bash
npm install
cd functions && npm install && cd ..
```

### 3. Firebase Configuration
1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. Navigate to **Authentication** -> **Sign-in method**. Enable **Email/Password** AND the **Email link (passwordless sign-in)** toggle.
3. Navigate to **Firestore Database** and create a new database.
4. Obtain your Firebase Project Configuration object and paste it into `src/firebase.js`.
5. Update your `.firebaserc` file to point to your new project ID.

### 4. Email Notifications (Gmail Setup)
To allow the app to send notification emails, you must provide a Gmail App Password to Firebase's Secret Manager.
1. Go to your Google Account -> Security -> **App Passwords** and generate a 16-character code.
2. Deploy the functions (you will be prompted to enter the email and the App Password):
   ```bash
   firebase deploy --only functions
   ```

### 5. Running Locally
To run the local Vite development server:
```bash
npm run dev
```

### 6. Deployment
To build the production bundle and deploy the app to Firebase Hosting (along with your Firestore Security Rules):
```bash
npm run build
firebase deploy --only hosting,firestore:rules
```

---

## 🔒 Security Architecture

- **Firestore Rules**: Strict schema validation ensures data integrity. Only the Admin can mutate user roles. Riders cannot spoof driver actions.
- **First-User Bootstrap**: The app detects the first user to successfully authenticate and automatically grants them the Admin role to bootstrap the group.
- **Secrets Management**: Email credentials are securely stored using Google Cloud Secret Manager and injected into the Cloud Function at runtime.
