// The build substitutes the version and integrity of every required asset.
const version = "__VERSION__";
const entries = "__ENTRIES__";
const prefix = "querycraft-release-";
const cacheName = prefix + version;
const assets = new Set(entries.map((entry) => entry.path));
const cleanupKey = "/.querycraft-cache-cleanup";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(cacheName);
      await cache.addAll(
        entries.map(
          ({ path, integrity }) =>
            new Request(path, { integrity, cache: "reload" }),
        ),
      );
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const obsolete = (await caches.keys()).filter(
        (key) => key.startsWith(prefix) && key !== cacheName,
      );
      if (obsolete.length) {
        const cache = await caches.open(cacheName);
        await cache.put(cleanupKey, Response.json(obsolete));
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      if (event.data?.type === "activate-update") {
        if (windows.some((client) => client.id !== event.source?.id)) {
          event.source?.postMessage({ type: "other-tabs-open" });
        } else {
          await self.skipWaiting();
        }
      }
      // A fresh document confirms that it has loaded this worker's build.
      // Only delete pre-existing caches when no other tab can still use them.
      if (
        event.data?.type === "ready" &&
        event.data.version === version &&
        windows.length === 1 &&
        windows[0].id === event.source?.id
      ) {
        const cache = await caches.open(cacheName);
        const pending = await cache.match(cleanupKey);
        if (pending) {
          const obsolete = await pending.json();
          await Promise.all(obsolete.map((name) => caches.delete(name)));
          await cache.delete(cleanupKey);
        }
      }
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  const gameRoute =
    /^\/(?:|model\/?|settings\/?|levels(?:\/[\w-]+(?:\/debrief)?)?\/?)$/.test(
      url.pathname,
    );
  const file = request.mode === "navigate" && gameRoute ? "/" : url.pathname;
  if (assets.has(file)) {
    event.respondWith(
      (async () =>
        (await (await caches.open(cacheName)).match(file)) ?? fetch(request))(),
    );
  } else if (url.pathname.startsWith("/assets/")) {
    // A tab can still request a hashed chunk while transitioning to a new build.
    event.respondWith(
      (async () => {
        for (const name of (await caches.keys()).filter((key) =>
          key.startsWith(prefix),
        )) {
          const saved = await (await caches.open(name)).match(url.pathname);
          if (saved) return saved;
        }
        return new Response("Asset not found", { status: 404 });
      })(),
    );
  }
});
