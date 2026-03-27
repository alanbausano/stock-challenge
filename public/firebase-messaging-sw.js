// Firebase Cloud Messaging Service Worker
// Must be at the root of the public directory

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyAJpHfSks3QZH-pISim-dIIwDgdZugEyp0',
  authDomain: 'stock-challenge-25c32.firebaseapp.com',
  projectId: 'stock-challenge-25c32',
  storageBucket: 'stock-challenge-25c32.firebasestorage.app',
  messagingSenderId: '790902346806',
  appId: '1:790902346806:web:00399c80f03da48178b497',
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  const { title = 'Stock Alert', body = '' } = payload.notification ?? {};
  self.registration.showNotification(title, {
    body,
  });
});
