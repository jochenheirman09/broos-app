// public/firebase-messaging-sw.js

// Make sure to import the scripts for the Firebase App and Messaging.
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

let firebaseConfig = null;

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    firebaseConfig = event.data.firebaseConfig;
    console.log('[SW] Firebase config received:', firebaseConfig);
    
    // Only initialize if we have the config and it hasn't been initialized yet.
    if (firebaseConfig && !firebase.apps.length) {
      console.log('[SW] Initializing Firebase...');
      firebase.initializeApp(firebaseConfig);
      
      const messaging = firebase.messaging();

      messaging.onBackgroundMessage((payload) => {
        console.log('[SW] Background message received:', payload);
        
        // --- THIS IS THE CRITICAL FIX ---
        // If the payload already has a 'notification' object, the browser will
        // display it automatically. We should NOT try to show another one.
        if (payload.notification) {
          console.log('[SW] Browser is handling the notification display. No action needed.');
          return;
        }

        // --- FALLBACK ---
        // If there's no 'notification' object (i.e., a true data-only message),
        // we must manually show the notification.
        console.log('[SW] Handling display of data-only message.');
        const notificationTitle = payload.data?.title || 'Nieuw bericht';
        const notificationOptions = {
          body: payload.data?.body,
          icon: payload.data?.icon || '/icons/icon-192x192.png',
          badge: payload.data?.badge || '/icons/icon-192x192.png',
          data: { link: payload.data?.link || '/' }
        };

        return self.registration.showNotification(notificationTitle, notificationOptions);
      });
    }
  }
});


// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.link || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if a window for this app is already open
      for (const client of clientList) {
        if (client.url === link && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow(link);
      }
    })
  );
});
