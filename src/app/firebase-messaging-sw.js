
// IMPORTANT: This file MUST be in the /src/app directory to be served from the root.

// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here, other Firebase services
// are not available in the service worker.
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

console.log('[SW] Firebase Messaging Service Worker script executing.');

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
    const app = initializeApp(firebaseConfig);
    console.log('[SW] Firebase app initialized in service worker.');
    
    const messaging = getMessaging(app);
    console.log('[SW] Firebase Messaging instance created.');

    onBackgroundMessage(messaging, (payload) => {
        console.log('[SW] Received background message: ', payload);

        const notificationTitle = payload.notification?.title || 'Nieuw Bericht';
        const notificationOptions = {
            body: payload.notification?.body || 'Je hebt een nieuw bericht.',
            icon: payload.notification?.icon || '/icons/icon-192x192.png'
        };

        self.registration.showNotification(notificationTitle, notificationOptions);

        if ('setAppBadge' in self.navigator) {
            console.log('[SW] Setting app badge.');
            self.navigator.setAppBadge(1);
        }
    });

} catch (error) {
    console.error('[SW] CRITICAL: Error initializing Firebase in service worker:', error);
}
