const CACHE_NAME = "alhamd-stock-shell-v2";

const APP_SHELL = [
  "./",
  "./index.html",
  "./favicon.svg",
  "./favicon.ico",
  "./sw.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .catch(() => {})
  );

  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  // نهتم بطلبات GET فقط
  if (request.method !== "GET") {
    return;
  }

  /*
   * مهم جدًا:
   * لا تجعل Service Worker يتدخل في Supabase.
   *
   * نظام Offline First الموجود داخل index.html
   * هو المسؤول عن IndexedDB والـ Queue والمزامنة.
   */
  if (
    url.hostname.includes("supabase.co") ||
    url.pathname.includes("/rest/v1/") ||
    url.pathname.includes("/auth/v1/")
  ) {
    return;
  }

  /*
   * فتح الموقع:
   * حاول الاتصال بالإنترنت أولًا،
   * ولو الإنترنت غير موجود استخدم index.html المحفوظ.
   */
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();

            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, copy);
            });
          }

          return response;
        })
        .catch(() => {
          return caches.match("./index.html");
        })
    );

    return;
  }

  /*
   * ملفات الموقع مثل:
   * CSS
   * JavaScript
   * الصور
   * favicon
   *
   * Network First ثم Cache عند انقطاع الإنترنت.
   */
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response && response.ok) {
          const copy = response.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, copy);
          });
        }

        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});
