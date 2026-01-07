// IMPORTANT: This file MUST be in the /src/app directory to be served from the root.

// Using compat versions for robust service worker support
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js');
import { precacheAndRoute } from 'workbox-precaching';

// This line is required for next-pwa to inject the manifest.
precacheAndRoute(self.__WB_MANIFEST || []);


// This function will be called by the PWA's service worker (sw.js)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    const firebaseConfig = event.data.firebaseConfig;
    console.log('[SW] Received FIREBASE_CONFIG message.');
    
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log('[SW] Firebase app initialized with compat library via message.');
        } else {
            console.log('[SW] Firebase app already initialized.');
        }
        
        const messaging = firebase.messaging();
        console.log('[SW] Firebase Messaging (compat) instance created.');

        // Set up the background message handler
        messaging.onBackgroundMessage((payload) => {
            console.log('[SW] Received background message ', payload);

            if (!payload.notification) {
                console.warn('[SW] Received background message without notification payload. Cannot display.');
                return;
            }

            const notificationTitle = payload.notification.title || 'Nieuw Bericht';
            const notificationOptions = {
                body: payload.notification.body || 'Je hebt een nieuw bericht.',
                icon: payload.notification.icon || '/icons/icon-192x192.png',
                data: {
                  link: payload.fcmOptions?.link || payload.data?.link || '/'
                }
            };

            console.log(`[SW] Showing notification: "${notificationTitle}"`);
            self.registration.showNotification(notificationTitle, notificationOptions);

            if ('setAppBadge' in self.navigator) {
                console.log('[SW] App supports badging. Setting badge.');
                self.navigator.setAppBadge(1).catch(e => console.error('[SW] Error setting app badge:', e));
            }
        });

        self.addEventListener('notificationclick', (event) => {
          console.log('[SW] Notification click received.', event.notification.data);
          event.notification.close();
        
          const link = event.notification.data?.link || '/';
          console.log(`[SW] Opening window: ${link}`);
        
          event.waitUntil(
            self.clients.matchAll({
              type: 'window',
              includeUncontrolled: true
            }).then((clientList) => {
              // Check if a window with the same URL is already open.
              for (const client of clientList) {
                // Use URL objects to compare paths without query parameters if needed.
                const clientUrl = new URL(client.url);
                const targetUrl = new URL(link, self.location.origin);
                
                if (clientUrl.pathname === targetUrl.pathname && 'focus' in client) {
                  console.log('[SW] Found existing window. Focusing it.');
                  return client.focus();
                }
              }
              // If no window is found, open a new one.
              if (self.clients.openWindow) {
                console.log('[SW] No existing window found. Opening new one.');
                return self.clients.openWindow(link);
              }
            })
          );
        });


    } catch (error) {
        console.error('[SW] CRITICAL: Error initializing Firebase compat in service worker:', error);
    }
  }
});
