// Minimal service worker: caches the router shell and mapping.json so
// a short network blip doesn't leave a screen blank. This is NOT trying
// to cache the destination signage pages themselves — those are
// expected to be reachable directly by the browser once we redirect.

const CACHE_NAME = "signage-router-v1";
const CORE_ASSETS = ["./index.html", "./mapping.json", "./manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isCoreAsset = CORE_ASSETS.some((asset) => url.pathname.endsWith(asset.replace("./", "")));

  if (!isCoreAsset) return; // let everything else hit the network normally

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Keep the cache fresh whenever the network succeeds.
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
