// Using compat scripts for broader compatibility as recommended in Firebase docs for SW.
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

let firebaseConfig = null;

// Listen for the config message from the main app thread.
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    if (!firebase.apps.length) {
      firebaseConfig = event.data.firebaseConfig;
      console.log('[SW] Received and stored Firebase config. Initializing...');
      firebase.initializeApp(firebaseConfig);
      console.log('[SW] Firebase initialized in Service Worker.');
    }
  }
});

// This must be declared early to be picked up by the browser.
const messaging = firebase.messaging();

// Handler for background messages.
messaging.onBackgroundMessage((payload) => {
  console.log('[SW onBackgroundMessage] Received background message:', payload);

  // CRITICAL: Ensure firebase is initialized before proceeding.
  if (!firebase.apps.length) {
    console.error('[SW] Firebase not initialized, cannot show notification.');
    return;
  }
  
  // Extract data from the data payload
  const notificationTitle = payload.data.title || "Nieuw bericht";
  const notificationOptions = {
    body: payload.data.body || "Je hebt een nieuw bericht ontvangen.",
    icon: payload.data.icon || '/icons/icon-192x192.png',
    badge: payload.data.badge || '/icons/icon-72x72.png',
    tag: payload.data.tag || 'chat-notification', // Idempotency key
    renotify: true, // Vibrate/alert even if tag is the same
    vibrate: [200, 100, 200], // Vibration pattern for Android
    requireInteraction: true, // The notification stays until the user interacts
    data: {
      link: payload.data.link || '/' // Store the URL for the click handler
    }
  };

  // This return is CRUCIAL. It tells the browser to wait for this promise.
  return self.registration.showNotification(notificationTitle, notificationOptions);
});


// Handles what happens when a user clicks the notification.
self.addEventListener('notificationclick', (event) => {
  console.log('[SW notificationclick] Notification click received.', event.notification);
  
  // Close the notification.
  event.notification.close();

  const targetLink = event.notification.data.link || '/';
  
  // This waitUntil() ensures the browser doesn't terminate the service worker
  // before our async operation (opening/focusing a window) is complete.
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if a window for this app is already open.
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          console.log(`[SW] Found active client. Focusing and navigating to: ${targetLink}`);
          // Navigate the existing client before focusing it.
          client.navigate(targetLink);
          return client.focus();
        }
      }
      
      // If no window is open, open a new one.
      if (clients.openWindow) {
        console.log(`[SW] No active client found. Opening new window to: ${targetLink}`);
        return clients.openWindow(targetLink);
      }
    })
  );
});
