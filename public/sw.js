// Vite injects every JS/CSS chunk, including screens not opened yet.
const CACHE_NAME = `treino-shell-${self.__TREINO_BUILD_ID__ || "dev"}`;
const APP_SHELL = self.__TREINO_PRECACHE_URLS__ || ["/", "/manifest.webmanifest", "/favicon.png"];
const PRECACHED_PATHS = new Set(APP_SHELL);

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  // Updates wait for existing tabs to close, keeping their chunks usable.
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((key) => key.startsWith("treino-shell-") && key !== CACHE_NAME).map((key) => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    // Keep HTML and chunks from the same release, including on offline reload.
    event.respondWith(caches.open(CACHE_NAME).then(async (cache) => (await cache.match("/")) || fetch(request)));
    return;
  }
  if (!PRECACHED_PATHS.has(url.pathname) || url.search) return;
  event.respondWith(caches.open(CACHE_NAME).then(async (cache) => (await cache.match(request)) || fetch(request)));
});
