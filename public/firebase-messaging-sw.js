// public/firebase-messaging-sw.js

// This file must be in the public directory
if (typeof self.importScripts === 'function') {
    self.importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
    self.importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
}

let firebaseConfig = null;
let messaging;

// Listen for the config from the main app
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'FIREBASE_CONFIG') {
        if (!firebaseConfig) { // Only initialize once
            firebaseConfig = event.data.firebaseConfig;
            console.log('[SW] Firebase config received:', firebaseConfig);
            
            if (firebaseConfig && self.firebase && !self.firebase.apps.length) {
                try {
                    self.firebase.initializeApp(firebaseConfig);
                    console.log('[SW] Firebase Initialized.');
                    messaging = self.firebase.messaging();
                    
                    // Set up the background message handler *after* initialization
                    messaging.onBackgroundMessage((payload) => {
                        console.log('[SW] Background message received:', payload);
                        
                        // IMPORTANT: If the payload has a 'notification' object, the browser handles it automatically.
                        // Doing nothing here prevents a duplicate notification when the app is in the foreground/background.
                        if (payload.notification) {
                            console.log('[SW] Browser is handling the notification display, SW will not show another.');
                            return;
                        }

                        // If only a 'data' payload is present (fallback), we must manually show the notification.
                        console.log('[SW] Data-only message received. Manually showing notification.');
                        const notificationTitle = payload.data.title || "Nieuw Bericht";
                        const notificationOptions = {
                            body: payload.data.body,
                            icon: payload.data.icon || '/icons/icon-192x192.png',
                            badge: payload.data.badge || '/icons/icon-192x192.png',
                            tag: payload.data.tag || 'broos-general',
                            renotify: true,
                            data: {
                                link: payload.data.link || '/'
                            }
                        };
                    
                        event.waitUntil(self.registration.showNotification(notificationTitle, notificationOptions));
                    });
                } catch (e) {
                    console.error('[SW] Error during Firebase initialization:', e);
                }
            }
        }
    }
});


self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const link = event.notification.data?.link || '/';
  
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // Check if a window for this app is already open
        for (const client of clientList) {
          // If a window is already open and at the target URL, just focus it.
          if (client.url === self.location.origin + link && 'focus' in client) {
            return client.focus();
          }
        }
        // If no window is open, or not at the right URL, open a new one.
        if (clients.openWindow) {
          return clients.openWindow(link);
        }
      })
    );
});
