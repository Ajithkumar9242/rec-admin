import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getMessaging,
  getToken,
  deleteToken,
  onMessage,
  isSupported as isMessagingSupported,
} from 'firebase/messaging';
import { notificationApi } from './notificationApi.js';

const STORAGE_KEY_TOKEN = 'rt_fcm_device_token';
const STORAGE_KEY_ENABLED = 'rt_fcm_push_enabled';

/**
 * Validates whether all necessary public web Firebase credentials are configured.
 */
export function isFirebaseWebConfigured() {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

  if (!apiKey || !projectId || !vapidKey) {
    return false;
  }

  // Reject placeholder values
  if (
    apiKey.includes('placeholder') ||
    projectId.includes('placeholder') ||
    vapidKey.includes('placeholder')
  ) {
    return false;
  }

  return true;
}

/**
 * Returns public Firebase web configuration.
 * Never includes or logs private credentials.
 */
export function getFirebaseConfig() {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  };
}

/**
 * Lazily gets or initializes the Firebase Web App.
 */
export function getFirebaseApp() {
  if (!isFirebaseWebConfigured()) {
    return null;
  }

  const existingApps = getApps();
  if (existingApps.length > 0) {
    return getApp();
  }

  try {
    return initializeApp(getFirebaseConfig());
  } catch {
    return null;
  }
}

/**
 * Checks whether the current browser environment supports Service Workers, Notification API,
 * and Firebase Messaging.
 */
export async function isPushNotificationSupported() {
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window)) return false;
  if (!('serviceWorker' in navigator)) return false;

  try {
    const supported = await isMessagingSupported();
    return Boolean(supported);
  } catch {
    return false;
  }
}

/**
 * Returns the current browser notification permission: 'granted' | 'denied' | 'default' | 'unsupported'.
 */
export function getNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Registers the background service worker once with public configuration params.
 */
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers are not supported by this browser.');
  }

  const config = getFirebaseConfig();
  const queryParams = new URLSearchParams({
    apiKey: config.apiKey,
    projectId: config.projectId,
    messagingSenderId: config.messagingSenderId,
    appId: config.appId,
  }).toString();

  const swUrl = `/firebase-messaging-sw.js?${queryParams}`;

  return await navigator.serviceWorker.register(swUrl, { scope: '/' });
}

/**
 * Explicit user-initiated flow to request permission, retrieve FCM token, and register with backend.
 */
export async function enablePushNotifications() {
  if (!isFirebaseWebConfigured()) {
    return {
      success: false,
      reason: 'MISSING_CONFIG',
      message: 'Push notifications are not configured on this server.',
    };
  }

  const supported = await isPushNotificationSupported();
  if (!supported) {
    return {
      success: false,
      reason: 'UNSUPPORTED',
      message: 'Push notifications are not supported in this browser.',
    };
  }

  // Request explicit permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return {
      success: false,
      reason: 'PERMISSION_DENIED',
      permission,
      message: 'Notification permission was not granted.',
    };
  }

  const app = getFirebaseApp();
  if (!app) {
    return {
      success: false,
      reason: 'INITIALIZATION_FAILED',
      message: 'Failed to initialize Firebase client application.',
    };
  }

  try {
    const messaging = getMessaging(app);
    const swRegistration = await registerServiceWorker();

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swRegistration,
    });

    if (!token) {
      return {
        success: false,
        reason: 'TOKEN_EMPTY',
        message: 'No device registration token returned by Firebase Messaging.',
      };
    }

    // Register token with backend using authenticated API client
    await notificationApi.registerDeviceToken({
      token,
      platform: 'WEB',
      userAgent: navigator.userAgent,
    });

    // Store token securely in memory/sessionStorage (never log raw tokens)
    try {
      sessionStorage.setItem(STORAGE_KEY_TOKEN, token);
      localStorage.setItem(STORAGE_KEY_ENABLED, 'true');
    } catch {
      // Ignore storage restrictions
    }

    return {
      success: true,
      permission: 'granted',
    };
  } catch (err) {
    return {
      success: false,
      reason: 'REGISTRATION_ERROR',
      message: err.response?.data?.error || err.message || 'Failed to complete push notification setup.',
    };
  }
}

/**
 * User-initiated flow to explicitly disable push notifications, delete FCM token, and unregister on backend.
 */
export async function disablePushNotifications() {
  let storedToken = null;
  try {
    storedToken = sessionStorage.getItem(STORAGE_KEY_TOKEN);
  } catch {
    // Ignore storage restrictions
  }

  const app = getFirebaseApp();
  if (app) {
    try {
      const messaging = getMessaging(app);
      // Revoke the FCM token using Firebase SDK
      await deleteToken(messaging);
    } catch {
      // Continue to backend unregistration even if deleteToken fails
    }
  }

  if (storedToken) {
    try {
      await notificationApi.unregisterDeviceToken({ token: storedToken });
    } catch {
      // Token may already be unregistered or expired
    }
  }

  try {
    sessionStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_ENABLED);
  } catch {
    // Ignore storage restrictions
  }

  return {
    success: true,
  };
}

/**
 * Subscribes to foreground push messages while the application tab is active.
 */
export async function setupForegroundMessageListener(onNotificationReceived) {
  if (!isFirebaseWebConfigured()) return null;
  const supported = await isPushNotificationSupported();
  if (!supported) return null;

  const app = getFirebaseApp();
  if (!app) return null;

  try {
    const messaging = getMessaging(app);
    return onMessage(messaging, (payload) => {
      if (typeof onNotificationReceived === 'function') {
        onNotificationReceived(payload);
      }
    });
  } catch {
    return null;
  }
}
