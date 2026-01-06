// IMPORTANT: This file MUST be in the /src/app directory to be served from the root.

// Using compat versions for robust service worker support
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js');

// Your web app's Firebase configuration. This MUST be present.
const firebaseConfig = {
  apiKey: "AIzaSyBVOId-CRlTD6oKqvZ0CxKSFxObOoHEHd8",
  authDomain: "studio-5690519872-e0869.firebaseapp.com",
  projectId: "studio-5690519872-e0869",
  storageBucket: "studio-5690519872-e0869.appspot.com",
  messagingSenderId: "796529432751",
  appId: "1:796529432751:web:da147b13f407d67aaf9c5a",
  measurementId: "G-14976CYFEK"
};

// Initialize the Firebase app in the service worker
try {
    firebase.initializeApp(firebaseConfig);
    console.log('[SW] Firebase app initialized with compat library.');
    
    const messaging = firebase.messaging();
    console.log('[SW] Firebase Messaging (compat) instance created.');

    // THIS IS CRITICAL: Set up the background message handler
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
              link: payload.fcmOptions?.link || '/'
            }
        };

        self.registration.showNotification(notificationTitle, notificationOptions);

        if ('setAppBadge' in self.navigator) {
            console.log('[SW] Setting app badge.');
            self.navigator.setAppBadge(1);
        }
    });

    self.addEventListener('notificationclick', (event) => {
      console.log('[SW] Notification click received.', event.notification.data);
      event.notification.close();
    
      const link = event.notification.data?.link || '/';
    
      event.waitUntil(
        clients.matchAll({
          type: 'window',
          includeUncontrolled: true
        }).then((clientList) => {
          // If a window for the app is already open, focus it.
          for (const client of clientList) {
            // Check if the client's URL is already the target link.
            if (client.url === link && 'focus' in client) {
              return client.focus();
            }
          }
          // If no window is open or no window has the target URL, open a new one.
          if (clients.openWindow) {
            return clients.openWindow(link);
          }
        })
      );
    });


} catch (error) {
    console.error('[SW] CRITICAL: Error initializing Firebase compat in service worker:', error);
}
