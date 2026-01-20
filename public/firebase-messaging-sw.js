
// Import the Firebase app and messaging packages.
// Using compat scripts for broader browser support.
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// A variable to hold the Firebase configuration.
let firebaseConfig = null;

// The service worker needs to be able to handle messages even when the
// main web page is not open. It does this via the 'message' event listener.
self.addEventListener('message', (event) => {
    // We receive the config from the main app thread.
    if (event.data && event.data.type === 'FIREBASE_CONFIG') {
        firebaseConfig = event.data.firebaseConfig;
        console.log('[SW] Received and stored Firebase config.');

        // Initialize Firebase ONLY if we have the config and it hasn't been initialized yet.
        if (firebaseConfig && !firebase.apps.length) {
            console.log('[SW] Initializing Firebase app in service worker.');
            firebase.initializeApp(firebaseConfig);
            const messaging = firebase.messaging();

            // Set up the background message handler right after initialization.
            messaging.onBackgroundMessage((payload) => {
                console.log('[SW] Background message received:', payload);

                // Extract notification data from the 'data' payload.
                const { title, body, tag, icon, badge, link } = payload.data;

                if (!title) {
                    console.error('[SW] Received a data-only message without a title, cannot display notification.');
                    return;
                }

                const notificationOptions = {
                    body: body || 'Je hebt een nieuw bericht.',
                    icon: icon || '/icons/icon-192x192.png',
                    badge: badge || '/icons/icon-72x72.png',
                    tag: tag || 'default-broos-tag', // Use tag for idempotency.
                    renotify: true, // Vibrate/play sound even if replacing an existing notification.
                    data: {
                        link: link || '/' // Pass link data to the notification click event.
                    }
                };

                // Use the service worker's registration to show the notification.
                // This is the core of background notifications.
                self.registration.showNotification(title, notificationOptions);
            });
        }
    }
});

// This event is fired when a user clicks on a notification.
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked. Event:', event);

    // Close the notification pop-up.
    event.notification.close();

    const link = event.notification.data?.link || '/';
    console.log(`[SW] Attempting to open or focus link: ${link}`);

    // This code checks if a window for your app is already open.
    // If so, it focuses that window. If not, it opens a new one.
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Check if there's a window already open with the same URL.
            const existingClient = clientList.find(client => {
                const clientUrl = new URL(client.url);
                return clientUrl.pathname === link;
            });
            
            if (existingClient) {
                console.log('[SW] Found existing client, focusing it.');
                return existingClient.focus();
            } else if (clients.openWindow) {
                console.log('[SW] No existing client found, opening new window.');
                // The URL is constructed relative to the service worker's scope.
                return clients.openWindow(link);
            }
        })
    );
});
