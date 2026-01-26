
// Import the Firebase app and messaging packages
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// This is a placeholder for the config object.
// The client-side code will send the actual config object via postMessage.
let firebaseConfig = {};

let app;
let messaging;

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'FIREBASE_CONFIG') {
        firebaseConfig = event.data.firebaseConfig;
        console.log('[SW] Received Firebase config from client:', firebaseConfig);

        // Initialize Firebase
        if (firebase.apps.length === 0) {
            app = firebase.initializeApp(firebaseConfig);
            messaging = firebase.messaging(app);
            console.log('[SW] Firebase initialized successfully.');
        }
    }
});

// onBackgroundMessage is called when the app is in the background or closed.
self.addEventListener('push', (event) => {
    const payload = event.data.json();
    console.log('[SW] Push event received.', payload);

    // If the payload has a 'notification' object, the browser will likely
    // display it automatically. We should still call showNotification to ensure
    // we can handle the click event correctly with our custom link.
    // The browser is smart enough to not show two notifications if the tag is the same.
    
    let notificationTitle = "Nieuw Bericht";
    let notificationOptions = {
        body: "Je hebt een nieuw bericht.",
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        data: { link: '/' }, // Default link
        tag: 'default-tag',
        renotify: true,
    };

    if (payload.notification) {
        notificationTitle = payload.notification.title || notificationTitle;
        notificationOptions.body = payload.notification.body || notificationOptions.body;
        if(payload.notification.icon) notificationOptions.icon = payload.notification.icon;
        if(payload.notification.badge) notificationOptions.badge = payload.notification.badge;
    }
    
    if (payload.data) {
        // Prefer data from the 'data' payload for more control if it exists
        notificationTitle = payload.data.title || notificationTitle;
        notificationOptions.body = payload.data.body || notificationOptions.body;
        notificationOptions.data.link = payload.data.link || '/';
        notificationOptions.tag = payload.data.tag || 'default-tag';
        notificationOptions.icon = payload.data.icon || notificationOptions.icon;
        notificationOptions.badge = payload.data.badge || notificationOptions.badge;
    }

    console.log(`[SW] Showing notification with title: "${notificationTitle}" and options:`, notificationOptions);
    
    event.waitUntil(
        self.registration.showNotification(notificationTitle, notificationOptions)
    );
});


// notificationclick is called when the user clicks on a notification.
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification click received.', event.notification);
    event.notification.close();

    const link = event.notification.data?.link || '/';
    
    event.waitUntil(
        clients.matchAll({
            type: "window",
            includeUncontrolled: true
        }).then((clientList) => {
            // If a window for the app is already open, focus it.
            for (let i = 0; i < clientList.length; i++) {
                let client = clientList[i];
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    console.log(`[SW] Found open client, focusing and navigating to: ${link}`);
                    client.navigate(link);
                    return client.focus();
                }
            }
            // If no window is open, open a new one.
            if (clients.openWindow) {
                console.log(`[SW] No open client, opening new window to: ${link}`);
                return clients.openWindow(link);
            }
        })
    );
});
