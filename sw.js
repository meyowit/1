// Service worker sederhana untuk Meyow Dimsum Kasir
// Fungsinya: (1) membuat aplikasi "installable" sebagai PWA,
// (2) cache file inti (shell) agar tetap bisa dibuka walau koneksi lemah.
// Data transaksi tetap online (fetch ke Google Apps Script), jadi
// service worker ini TIDAK meng-cache data/API, hanya file statis.

const CACHE_NAME = "meyow-kasir-shell-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Jangan cache request ke Google Apps Script (data harus selalu fresh)
  if (url.hostname.includes("script.google.com")) {
    return; // biarkan lewat langsung ke network
  }

  // Untuk file shell: cache-first, fallback ke network
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).catch(() => cached)
      );
    })
  );
});
