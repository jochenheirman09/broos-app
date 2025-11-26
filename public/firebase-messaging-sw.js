
// This file must be in the public directory.

// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here, other Firebase services
// are not available in the service worker.
import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging/sw";

const firebaseConfig = {
  apiKey: "AIzaSyBVOId-CRlTD6oKqvZ0CxKSFxObOoHEHd8",
  authDomain: "studio-5690519872-e0869.firebaseapp.com",
  projectId: "studio-5690519872-e0869",
  storageBucket: "studio-5690519872-e0869.appspot.com",
  messagingSenderId: "796529432751",
  appId: "1:796529432751:web:da147b13f407d67aaf9c5a",
  measurementId: "G-14976CYFEK"
};

// Initialize the Firebase app in the service worker with the same config
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// If you need to handle background messages, you can do so here.
// self.addEventListener('push', (event) => {
//   console.log('Push received', event);
//   const { title, body } = event.data.json().notification;
//   event.waitUntil(
//     self.registration.showNotification(title, {
//       body: body,
//       icon: '/icons/icon-192x192.png'
//     })
//   );
// });

console.log("Firebase Messaging Service Worker initialized.");
