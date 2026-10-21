import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getMessaging,
  getToken,
  deleteToken,
  onMessage,
  isSupported as isMessagingSupported,
} from 'firebase/messaging';
import { notificationApi } from './notificationApi.js';
import { validateDeepLink } from '../utils/deepLink.js';

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

// In-memory deduplication cache with a 10-second TTL to avoid duplicate notifications
const recentNotificationTags = new Map();

/**
 * Resets the in-memory notification tag cache (used for unit testing).
 */
export function _resetRecentNotificationTags() {
  recentNotificationTags.clear();
}

/**
 * Checks whether a notification tag was displayed recently.
 */
function isRecentlyDisplayed(tag) {
  if (!tag) return false;
  const now = Date.now();
  for (const [key, timestamp] of recentNotificationTags.entries()) {
    if (now - timestamp > 10000) {
      recentNotificationTags.delete(key);
    }
  }
  if (recentNotificationTags.has(tag)) {
    return true;
  }
  recentNotificationTags.set(tag, now);
  return false;
}

/**
 * Displays a native browser desktop notification while the tab is active/foreground,
 * if supported by the browser and permission is currently granted.
 *
 * @param {object} payload - The raw FCM payload received from onMessage
 * @param {object} [options] - Optional settings
 * @param {function} [options.onClick] - Callback invoked when notification is clicked with validated safe path
 * @returns {Notification|null} The created Notification instance, or null if skipped/unsupported
 */
export function displayForegroundNativeNotification(payload, { onClick } = {}) {
  if (!payload || typeof window === 'undefined' || !('Notification' in window)) {
    return null;
  }

  // Strictly require permission to already be 'granted'; NEVER prompt automatically
  if (Notification.permission !== 'granted') {
    return null;
  }

  const rawTitle = payload?.notification?.title || payload?.data?.title;
  const rawBody = payload?.notification?.body || payload?.data?.body;

  // Ignore payloads that carry neither title nor body (e.g. internal sync pings)
  if (!rawTitle && !rawBody) {
    return null;
  }

  const title = String(rawTitle || 'RecruiTrain Notification');
  const body = String(rawBody || '');
  const rawDeepLink = payload?.data?.deepLinkUrl || payload?.data?.deepLink || payload?.data?.linkUrl;
  const safeDeepLink = validateDeepLink(rawDeepLink);

  const tag =
    payload?.data?.eventId ||
    payload?.messageId ||
    payload?.fcmMessageId ||
    `recrui_${payload?.data?.eventType || 'event'}_${title}_${body}`;

  // Prevent duplicate native notifications
  if (isRecentlyDisplayed(tag)) {
    return null;
  }

  const notificationOptions = {
    body,
    icon: '/logo.png',
    badge: '/logo.png',
    tag,
    data: {
      ...payload?.data,
      deepLinkUrl: safeDeepLink,
    },
  };

  try {
    const notification = new Notification(title, notificationOptions);

    notification.onclick = (event) => {
      event.preventDefault();
      try {
        window.focus();
      } catch {
        // Ignore focus errors
      }

      if (typeof onClick === 'function') {
        onClick(safeDeepLink);
      }

      try {
        notification.close();
      } catch {
        // Ignore close errors
      }
    };

    return notification;
  } catch {
    // In environments where new Notification() throws (e.g. mobile environments requiring SW),
    // attempt fallback via registration.showNotification
    if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready
        .then((registration) => {
          registration.showNotification(title, notificationOptions);
        })
        .catch(() => {});
    }
    return null;
  }
}

