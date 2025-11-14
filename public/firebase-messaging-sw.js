
// This file must be in the public directory
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBDyKYdIZpO0WFKtnY6t01qzBIkIVDGCrU",
  authDomain: "studio-5690519872-e0869.firebaseapp.com",
  projectId: "studio-5690519872-e0869",
  storageBucket: "studio-5690519872-e0869.firebasestorage.app",
  messagingSenderId: "796529432751",
  appId: "1:796529432751:web:da147b13f407d67aaf9c5a"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icons/icon-192x192.png'
  };

  self.registration.showNotification(notificationTitle,
    notificationOptions);
});
