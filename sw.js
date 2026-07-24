// Service worker untuk Meyow Dimsum Kasir
// Fungsinya: (1) membuat aplikasi "installable" sebagai PWA,
// (2) cache file inti (shell) agar tetap bisa dibuka walau koneksi lemah.
// Data transaksi tetap online (fetch ke Google Apps Script), jadi
// service worker ini TIDAK meng-cache data/API, hanya file statis.
//
// PENTING: setiap kali index.html diupdate & di-push ke GitHub,
// naikkan angka versi di CACHE_NAME di bawah ini (v2 -> v3 -> dst).
// Kalau tidak dinaikkan, browser akan mengira sw.js "tidak berubah"
// dan tetap memakai cache lama walau kode di GitHub sudah baru.
const CACHE_NAME = "meyow-kasir-shell-v3";

const APP_SHELL = [
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
  const req = event.request;
  const url = new URL(req.url);

  // Jangan campur tangan request ke Google Apps Script (data harus selalu fresh)
  if (url.hostname.includes("script.google.com")) {
    return;
  }

  // index.html / navigasi ke halaman: NETWORK-FIRST.
  // Selalu coba ambil versi terbaru dari internet dulu, baru fallback
  // ke cache kalau sedang offline. Ini mencegah kasir "kejebak"
  // versi lama saat kode aplikasi diupdate.
  const isHTML = req.mode === "navigate" || url.pathname.endsWith("index.html") || url.pathname.endsWith("/");
  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Untuk aset statis lain (ikon, manifest): cache-first, fallback network
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).catch(() => cached))
  );
});
