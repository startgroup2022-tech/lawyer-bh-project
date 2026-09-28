/* Lawyers.bh — Legal SOS service worker.
 *
 * Receives Web Push events for emergency-ready advocates and shows
 * a high-priority notification. Click → focuses or opens the lawyer
 * dashboard so the advocate can accept the case.
 *
 * Kept tiny and dependency-free so it ships with no build step. The
 * file is served from /sos-sw.js because the path of the service
 * worker file determines its scope; this scope ('/') covers the
 * whole app, which is what we want.
 */

self.addEventListener("install", (event) => {
  // Activate immediately on first install / update so the lawyer
  // doesn't have to refresh twice to start receiving pushes.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "Legal SOS", body: "New emergency request" };
  }

  const title = data.title || "Legal SOS";
  const options = {
    body: data.body || "Tap to view the case",
    icon: "/icon.png",
    badge: "/icon.png",
    tag: data.tag || "sos-default",
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 80, 200, 80, 200],
    data: {
      url: data.url || "/en/sos/lawyer/dashboard",
    },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/en/sos/lawyer/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      // If the dashboard (or any tab on lawyers.bh) is already open,
      // focus it and navigate. Otherwise open a fresh window.
      for (const w of wins) {
        if (w.url.includes("/sos/lawyer") && "focus" in w) {
          w.focus();
          if ("navigate" in w) w.navigate(targetUrl);
          return;
        }
      }
      if (self.clients.openWindow) self.clients.openWindow(targetUrl);
    }),
  );
});
