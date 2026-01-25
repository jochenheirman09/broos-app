// public/firebase-messaging-sw.js
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

// This message is a placeholder. The AppProviders component will post the
// actual config when the service worker is ready.
let firebaseConfig = {};
let isInitialized = false;

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'FIREBASE_CONFIG') {
        if (isInitialized) return;
        
        console.log('[SW] Received Firebase config:', event.data.firebaseConfig);
        firebaseConfig = event.data.firebaseConfig;
        
        // Initialize Firebase App after receiving the config
        try {
            const app = initializeApp(firebaseConfig);
            const messaging = getMessaging(app);
            isInitialized = true;
            console.log('[SW] Firebase Initialized.');

            onBackgroundMessage(messaging, (payload) => {
                console.log('[SW] Background message received. ', payload);

                // If the payload already has a notification object, the browser will handle it automatically.
                // We do nothing to prevent a duplicate notification. This is the key fix.
                if (payload.notification) {
                    console.log('[SW] Notification payload found, browser will display it. Skipping showNotification().');
                    return;
                }

                // Only show a notification if it's a data-only message.
                // This is now a fallback for older payload structures.
                const notificationTitle = payload.data.title || "Nieuw bericht";
                const notificationOptions = {
                    body: payload.data.body,
                    icon: "/icons/icon-192x192.png", // Use an icon that exists
                    badge: "/icons/icon-192x192.png", // Use a valid icon path
                    data: {
                        link: payload.data.link || '/'
                    },
                    tag: payload.data.tag,
                    renotify: true,
                };
            
                return self.registration.showNotification(notificationTitle, notificationOptions);
            });

        } catch (e) {
            console.error('[SW] Error during initialization or background message handling:', e);
        }
    }
});


self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification click Received.');

    event.notification.close();

    const link = event.notification.data.link || '/';

    event.waitUntil(
        clients.matchAll({
            type: "window"
        }).then((clientList) => {
            // Check if there's already a client running with the correct URL
            for (const client of clientList) {
                // Use includes() for more flexible matching, e.g., ignoring search params
                if (client.url.includes(link) && 'focus' in client) {
                    return client.focus();
                }
            }
            // If no client is found, open a new window
            if (clients.openWindow) {
                return clients.openWindow(link);
            }
        })
    );
});
