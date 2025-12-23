// Import the Firebase app and messaging modules
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

// Your web app's Firebase configuration
// This is publicly visible and safe to include
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
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

console.log('[SW] Firebase Messaging Service Worker initialized');

// Handler for background messages (when the app is not in the foreground)
onBackgroundMessage(messaging, (payload) => {
  console.log('[SW] Received background message ', payload);

  const notificationTitle = payload.notification?.title || 'Nieuw Bericht';
  const notificationOptions = {
    body: payload.notification?.body,
    icon: payload.notification?.icon || '/icons/icon-192x192.png',
    data: payload.data, // Pass along the data payload
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handler for when a user clicks on a notification
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click Received.', event);

  event.notification.close();

  const link = event.notification.data?.link || '/';
  
  // This looks for an existing window/tab with the same origin (your app)
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    }).then((clientList) => {
      // If a window for your app is already open, focus it and navigate
      for (const client of clientList) {
        const clientUrl = new URL(client.url);
        const linkUrl = new URL(link, client.url);
        // Compare origins and pathnames to see if it's the right app instance
        if (clientUrl.origin === linkUrl.origin && 'navigate' in client) {
          client.navigate(link);
          return client.focus();
        }
      }
      // If no window is found, open a new one
      if (clients.openWindow) {
        return clients.openWindow(link);
      }
    })
  );
});
