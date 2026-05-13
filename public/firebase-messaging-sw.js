importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js')

// Firebase 설정값 (다음 값들을 Firebase Console에서 복사한 값으로 교체)
firebase.initializeApp({
  apiKey: "NEXT_PUBLIC_FIREBASE_API_KEY",
  authDomain: "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  projectId: "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  messagingSenderId: "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  appId: "NEXT_PUBLIC_FIREBASE_APP_ID"
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
