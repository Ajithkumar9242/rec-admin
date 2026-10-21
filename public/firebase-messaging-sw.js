/* eslint-disable no-undef */
// RecruiTrain - Firebase Cloud Messaging Service Worker
// Compatible with Firebase Web SDK v10+ using official compat scripts

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

// Parse public configuration parameters passed during service worker registration
const searchParams = new URLSearchParams(self.location.search);
const apiKey = searchParams.get('apiKey');
const projectId = searchParams.get('projectId');
const messagingSenderId = searchParams.get('messagingSenderId');
const appId = searchParams.get('appId');

if (apiKey && projectId && !apiKey.includes('placeholder')) {
  try {
    firebase.initializeApp({
      apiKey,
      projectId,
      messagingSenderId,
      appId,
    });

    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      // Avoid duplicate notifications:
      // When payload has `notification` object, the browser automatically displays the notification.
      // We only manually invoke showNotification if payload is a data-only message without `notification`.
      if (!payload.notification && payload.data) {
        const title = payload.data.title || 'RecruiTrain Platform';
        const options = {
          body: payload.data.body || '',
          icon: '/logo.png',
          badge: '/logo.png',
          data: payload.data,
        };
        self.registration.showNotification(title, options);
      }
    });
  } catch (initErr) {
    // Graceful skip if already initialized or invalid
  }
}

// Notification click event handler with deep link validation
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const rawDeepLink = data.deepLinkUrl || data.linkUrl || data.url || '/admin';

  // Strictly validate deep-link destination to stay within trusted RecruTrain application
  let targetPath = '/admin';
  try {
    if (typeof rawDeepLink === 'string' && rawDeepLink.startsWith('/') && !rawDeepLink.startsWith('//')) {
      targetPath = rawDeepLink;
    } else if (typeof rawDeepLink === 'string') {
      const parsed = new URL(rawDeepLink);
      if (parsed.origin === self.location.origin) {
        targetPath = parsed.pathname + parsed.search + parsed.hash;
      }
    }
  } catch {
    targetPath = '/admin';
  }

  const destinationUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window if available and navigate to target
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          if ('navigate' in client && client.url !== destinationUrl) {
            client.navigate(destinationUrl);
          }
          return client.focus();
        }
      }
      // Open new window if none found
      if (clients.openWindow) {
        return clients.openWindow(destinationUrl);
      }
    })
  );
});
