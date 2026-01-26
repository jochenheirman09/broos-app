// This file MUST be in the /public directory

// Give the service worker access to the Firebase Messaging SDK.
try {
  importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
  console.log('[SW] Firebase scripts imported successfully.');
} catch (e) {
  console.error('[SW] Error importing Firebase scripts:', e);
}


let firebaseApp;

// This listener waits for the main app to send its Firebase config.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    if (!firebase.apps.length) {
      console.log('[SW] Received FIREBASE_CONFIG, initializing app.');
      firebaseApp = firebase.initializeApp(event.data.firebaseConfig);
    } else {
      console.log('[SW] Firebase app already initialized.');
      firebaseApp = firebase.app();
    }
  }
});


// Set up the background message handler.
if (typeof firebase !== 'undefined' && firebase.messaging) {
    const messaging = firebase.messaging();
    
    messaging.onBackgroundMessage((payload) => {
        console.log('[SW] Background message received:', payload);

        // --- IMPORTANT ---
        // If the payload has a 'notification' object, the browser will
        // automatically display it when the app is in the background or killed.
        // We do NOT need to call showNotification() again, as it would cause a duplicate.
        // The browser will still wake the SW for the 'notificationclick' event.
        if (payload.notification) {
            console.log('[SW] "notification" payload found. Browser will display it.');
            return;
        }

        // --- FALLBACK ---
        // If the payload is data-only (no 'notification' object), we must
        // manually show a notification. This is less reliable for killed apps.
        console.log('[SW] Data-only payload. Manually showing notification.');
        const notificationTitle = payload.data.title || "Nieuw Bericht";
        const notificationOptions = {
            body: payload.data.body || "Je hebt een nieuw bericht.",
            icon: payload.data.icon || '/icons/icon-192x192.png',
            badge: payload.data.badge || '/icons/icon-192x192.png',
            data: { 
                link: payload.data.link || '/' 
            },
        };

        return self.registration.showNotification(notificationTitle, notificationOptions);
    });
} else {
    console.warn('[SW] Firebase messaging is not available in the service worker. Background messages will not be handled.');
}

// Handle notification clicks.
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification click received.', event);
    event.notification.close();
    
    const link = event.notification.data?.link || '/';
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Check if there's already a window open for this app.
            if (clientList.length > 0) {
                let client = clientList[0];
                for (let i = 0; i < clientList.length; i++) {
                    if (clientList[i].focused) {
                        client = clientList[i];
                    }
                }
                // If a window is open, focus it and navigate.
                client.navigate(link);
                return client.focus();
            }
            // If not, open a new window.
            return clients.openWindow(link);
        })
    );
});
