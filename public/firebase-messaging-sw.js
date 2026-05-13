importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js')

// Firebase 설정값
firebase.initializeApp({
  apiKey: "AIzaSyBJusLt5QpexpSilrDEjmUM8DhI4pZUXbs",
  authDomain: "fresh-rescue-4a51f.firebaseapp.com",
  projectId: "fresh-rescue-4a51f",
  messagingSenderId: "973005911537",
  appId: "1:973005911537:web:61ad66e4ee2cc113528050"
})

const messaging = firebase.messaging()

// 백그라운드 메시지 수신
messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || '신선구조대'
  const notificationOptions = {
    body: payload.notification?.body || '새 구조상품이 등록됐습니다!',
    icon: '/logo.png',
    badge: '/favicon.png',
    data: payload.data || {},
  }
  return self.registration.showNotification(notificationTitle, notificationOptions)
})
