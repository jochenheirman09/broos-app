
// This file needs to be in the public directory
importScripts("https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js");

// This config is public and can be exposed.
const firebaseConfig = {
  apiKey: "AIzaSyBVOId-CRlTD6oKqvZ0CxKSFxObOoHEHd8",
  authDomain: "studio-5690519872-e0869.firebaseapp.com",
  projectId: "studio-5690519872-e0869",
  storageBucket: "studio-5690519872-e0869.appspot.com",
  messagingSenderId: "796529432751",
  appId: "1:796529432751:web:da147b13f407d67aaf9c5a",
  measurementId: "G-14976CYFEK"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Optional: Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );

  // Update the app badge
  if (navigator.setAppBadge) {
    navigator.setAppBadge(1);
  }

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/icons/icon-192x192.png",
    data: {
        FCM_OPTIONS: payload.fcmOptions
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});


self.addEventListener('notificationclick', (event) => {
    console.log('[Service Worker] Notification click received.', event);
    event.notification.close();

    // Clear the badge when the user interacts with a notification.
    if (navigator.clearAppBadge) {
        navigator.clearAppBadge();
    }
    
    // This looks for an open window with the same URL as the notification's link.
    // If one is found, it focuses that window. If not, it opens a new window.
    const link = event.notification?.data?.FCM_OPTIONS?.link;
    if (link) {
        event.waitUntil(clients.matchAll({
            type: 'window',
            includeUncontrolled: true,
        }).then((clientList) => {
            // Check if a window is already open at the target URL.
            for (const client of clientList) {
                // Use URL objects to compare paths without origin
                const clientPath = new URL(client.url).pathname;
                const linkPath = new URL(link, self.location.origin).pathname;
                if (clientPath === linkPath && 'focus' in client) {
                    return client.focus();
                }
            }
            // If no window is found, open a new one.
            if (clients.openWindow) {
                return clients.openWindow(link);
            }
        }));
    }
});


    