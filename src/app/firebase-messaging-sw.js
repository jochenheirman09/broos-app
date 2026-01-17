// public/firebase-messaging-sw.js

// Force the new service worker to activate immediately.
self.addEventListener('install', (event) => {
  console.log('[SW] New version installing...');
  self.skipWaiting();
});

// Take control of all open clients (tabs, windows) as soon as the new SW activates.
self.addEventListener('activate', (event) => {
  console.log('[SW] New version activating...');
  event.waitUntil(clients.claim());
});


importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

let isInitialized = false;

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG' && !isInitialized) {
    firebase.initializeApp(event.data.firebaseConfig);
    const messaging = firebase.messaging();
    isInitialized = true;
    console.log('[SW] Firebase Initialized.');

    messaging.onBackgroundMessage((payload) => {
      console.log('[SW] Received background message: ', payload);
      
      const notificationTitle = payload.notification?.title || 'New Message';
      const notificationOptions = {
        body: payload.notification?.body,
        icon: payload.notification?.icon || '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        data: { link: payload.data?.link || '/' } // Pass link data
      };

      self.registration.showNotification(notificationTitle, notificationOptions);
    });
  }
});

self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked. Data:', event.notification.data);
    event.notification.close();

    const link = event.notification.data?.link || '/';

    // This looks for an existing window and focuses it, or opens a new one.
    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
            if (clientList.length > 0) {
                let client = clientList[0];
                for (let i = 0; i < clientList.length; i++) {
                    if (clientList[i].focused) {
                        client = clientList[i];
                    }
                }
                return client.focus().then(c => c.navigate(link));
            }
            return clients.openWindow(link);
        })
    );
});
