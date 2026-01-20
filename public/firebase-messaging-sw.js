// /public/firebase-messaging-sw.js

// This file must be in the public folder to be served at the root of the site.

// Using the compat libraries for broader compatibility with Firebase v8 and v9 examples.
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// --- IMPORTANT ---
// The configuration object is hardcoded here. This is intentional.
// It removes the race condition of waiting for a message from the main thread.
// This is a public configuration and does not contain any secret keys.
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

// Handler for background messages.
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message: ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icons/icon-192x192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
