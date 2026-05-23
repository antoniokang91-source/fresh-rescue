// Service Worker 캐싱 전략 - 대역폭 최적화
const CACHE_NAME = 'fruit-rescue-v1';
const API_CACHE = 'fruit-rescue-api-v1';
const IMAGE_CACHE = 'fruit-rescue-images-v1';

const STATIC_ASSETS = [
  '/',
  '/logo.png',
  '/favicon.png',
  '/manifest.json',
];

const API_ENDPOINTS = [
  '/api/products',
  '/api/shops',
  '/api/banners',
];

// 설치 이벤트 - 정적 자산 캐싱
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // 일부 자산 누락 무시
      });
    })
  );
  self.skipWaiting();
});

// 활성화 이벤트 - 오래된 캐시 삭제
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE && cacheName !== IMAGE_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch 이벤트 - 네트워크 우선, 캐시 대체
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API 요청: 네트워크 우선 + 캐시 폴백
  if (url.pathname.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const cache = caches.open(API_CACHE);
          if (response.ok) {
            cache.then((c) => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            return cached || new Response('Offline', { status: 503 });
          });
        })
    );
  }
  // 이미지: 캐시 우선 + 네트워크 폴백 (1년 캐시)
  else if (request.destination === 'image' || url.pathname.includes('/storage/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            if (response.ok) {
              const cache = caches.open(IMAGE_CACHE);
              cache.then((c) => {
                const responseClone = response.clone();
                c.put(request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            // 기본 이미지 반환
            return new Response(null, { status: 404 });
          });
      })
    );
  }
  // 정적 자산: 캐시 우선
  else {
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached || fetch(request).then((response) => {
          if (response.ok) {
            const cache = caches.open(CACHE_NAME);
            cache.then((c) => c.put(request, response.clone()));
          }
          return response;
        });
      })
    );
  }
});
