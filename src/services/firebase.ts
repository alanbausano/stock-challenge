import { initializeApp } from 'firebase/app';
import { getMessaging, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

/**
 * Requests browser notification permission.
 * We use the native Notification API for in-app price alerts (see useAlerts.ts).
 * FCM server-push can be integrated later when a backend is available.
 */
export const requestNotificationPermission = async (): Promise<void> => {
  try {
    await Notification.requestPermission();
  } catch (err) {
    console.warn('Notification permission request failed:', err);
  }
};

export { messaging, onMessage };

