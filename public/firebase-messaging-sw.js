// DO NOT MODIFY - This file is managed by the App Prototyper.
// It will be overwritten with the correct implementation.
// --- V3 ---
try {
  self.importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
  self.importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
} catch (e) {
  console.error('[SW] Failed to import Firebase scripts:', e);
}

let firebaseApp;
let messaging;

// The app will post its config to the service worker when it's ready.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    if (!firebase.apps.length) {
      console.log('[SW] Received Firebase config. Initializing app...');
      firebaseApp = firebase.initializeApp(event.data.firebaseConfig);
      messaging = firebase.messaging();
      console.log('[SW] Firebase app initialized successfully.');
    } else {
      console.log('[SW] Firebase app already initialized.');
      firebaseApp = firebase.app();
      messaging = firebase.messaging();
    }
  }
});


// Handle background messages
if (typeof firebase !== 'undefined') {
  try {
    firebase.messaging().onBackgroundMessage((payload) => {
      console.log('[SW] Background message received:', payload);
      
      // KEY FIX: If the payload already has a 'notification' object, the browser
      // will handle displaying it. We must NOT call showNotification ourselves,
      // as that would cause a duplicate or the "site has been updated" message.
      if (payload.notification) {
        console.log('[SW] Browser will display the notification from the payload. Doing nothing.');
        return; 
      }
      
      // Only show a notification if the payload is data-only.
      const notificationTitle = payload.data.title || 'Nieuw Bericht';
      const notificationOptions = {
        body: payload.data.body,
        icon: payload.data.icon || '/icons/icon-192x192.png',
        badge: payload.data.badge || '/icons/icon-192x192.png',
        tag: payload.data.tag,
        data: {
          link: payload.data.link || '/',
        },
      };

      console.log(`[SW] Showing data-only notification: "${notificationTitle}"`);
      return self.registration.showNotification(notificationTitle, notificationOptions);
    });
  } catch (e) {
    console.error('[SW] Error setting up onBackgroundMessage handler. Is firebase initialized?', e);
  }
} else {
    console.warn('[SW] Firebase is not defined. Cannot set up onBackgroundMessage handler.');
}


// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click received.', event.notification);
  event.notification.close();

  const link = event.notification.data?.link || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if a window for this app is already open.
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
            console.log(`[SW] App window found. Focusing and navigating to: ${link}`);
            return client.focus().then(c => c.navigate(link));
        }
      }
      // If no window is open, open a new one.
      if (clients.openWindow) {
        console.log(`[SW] No app window found. Opening new window to: ${link}`);
        return clients.openWindow(link);
      }
    })
  );
});
