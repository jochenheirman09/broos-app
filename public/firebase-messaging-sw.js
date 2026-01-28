
// Import the Firebase app and messaging packages.
// This is the v9 compat version, which is required for the traditional service worker setup.
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// This config MUST be defined in this file. It cannot be imported.
// The values are available in the Firebase console.
const firebaseConfig = {
    apiKey: "AIzaSyBVOId-CRlTD6oKqvZ0CxKSFxObOoHEHd8",
    authDomain: "studio-5690519872-e0869.firebaseapp.com",
    projectId: "studio-5690519872-e0869",
    storageBucket: "studio-5690519872-e0869.appspot.com",
    messagingSenderId: "796529432751",
    appId: "1:796529432751:web:da147b13f407d67aaf9c5a",
    measurementId: "G-14976CYFEK"
};

// Initialize the Firebase app in the service worker.
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

/**
 * Handles incoming messages when the app is in the background or completely closed.
 * It manually constructs and displays a notification using the data from the payload.
 */
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received:', payload);
  
  // Extract title and options. Use data payload as primary source, fallback to notification.
  const notificationTitle = payload.data?.title || payload.notification?.title || 'Nieuw bericht';
  const notificationOptions = {
    body: payload.data?.body || payload.notification?.body || 'Je hebt een nieuw bericht ontvangen.',
    icon: payload.data?.icon || '/icons/icon-192x192.png',
    badge: payload.data?.badge || '/icons/icon-192x192.png',
    tag: payload.data?.tag || 'broos-notification', // A tag to group notifications
    data: {
      url: payload.data?.link || '/' // URL to open on click
    }
  };

  // Display the notification to the user.
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

/**
 * Handles the click event on a notification.
 * It opens the correct URL and focuses the window if it's already open.
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received.', event);
  
  event.notification.close();
  const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if a window is already open with the target URL.
      for (let client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window is open, open a new one.
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
