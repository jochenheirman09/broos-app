// public/firebase-messaging-sw.js

// 1. Import the v8 compatibility scripts (most stable for this environment)
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

// 2. Initialize with your HARDCODED config values
// IMPORTANT: Do not use process.env here. The service worker runs in a different context.
firebase.initializeApp({
  apiKey: "AIzaSyBVOId-CRlTD6oKqvZ0CxKSFxObOoHEHd8",
  authDomain: "studio-5690519872-e0869.firebaseapp.com",
  projectId: "studio-5690519872-e0869",
  storageBucket: "studio-5690519872-e0869.appspot.com",
  messagingSenderId: "796529432751",
  appId: "1:796529432751:web:da147b13f407d67aaf9c5a"
});

const messaging = firebase.messaging();

// 3. Handle background messages (required for FCM)
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Background message received ', payload);
  
  const notificationTitle = payload.notification.title || "Nieuw bericht";
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icons/icon-192x192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
