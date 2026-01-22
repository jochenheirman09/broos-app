// DO NOT EDIT - This file will be overwritten by the build process
// Import the Firebase messaging service worker scripts
try {
    importScripts('https://www.gstatic.com/firebasejs/11.9.1/firebase-app-compat.js');
    importScripts('https://www.gstatic.com/firebasejs/11.9.1/firebase-messaging-compat.js');
    console.log('[SW] Firebase scripts imported successfully.');
} catch (e) {
    console.error('[SW] Error importing Firebase scripts:', e);
}

// This is a placeholder for the config that will be sent by the client
let firebaseConfig = null;

// The service worker needs to be able to handle messages to set the config
self.addEventListener('message', (event) => {  
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    firebaseConfig = event.data.firebaseConfig;
    console.log('[SW] Firebase config received and set.');
    
    // Initialize Firebase App after config is received
    if (firebaseConfig && firebase.apps.length === 0) {
      firebase.initializeApp(firebaseConfig);
      const messaging = firebase.messaging();
      console.log('[SW] Firebase Messaging initialized.');
      
      messaging.onBackgroundMessage((payload) => {
        console.log('[SW] Received background message: ', payload);
        
        const notificationTitle = payload.data.title || 'Broos 2.0';
        const notificationOptions = {
          body: payload.data.body || 'Je hebt een nieuw bericht.',
          icon: payload.data.icon || '/icons/icon-192x192.png',
          badge: payload.data.badge || '/icons/icon-72x72.png',
          data: {
            link: payload.data.link || '/'
          },
          tag: payload.data.tag || 'broos-notification'
        };

        self.registration.showNotification(notificationTitle, notificationOptions);
      });
    }
  }
});

// Event listener for when a user clicks on the notification
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click received.', event);
  event.notification.close();
  const link = event.notification.data.link || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a tab open for this app
      if (clientList.length > 0) {
          clientList[0].navigate(link);
          return clientList[0].focus();
      }
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow(link);
      }
    })
  );
});

// A simple service worker event to ensure it activates quickly
self.addEventListener('install', (event) => {
  console.log('[SW] Service worker installing...');
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Service worker activating...');
  event.waitUntil(self.clients.claim());
});
