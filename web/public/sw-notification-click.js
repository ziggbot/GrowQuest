// Imported into the Workbox-generated service worker via
// vite-plugin-pwa's workbox.importScripts. Handles notification taps:
// focus an existing tab on the target URL if one is open, otherwise
// open a new window there.

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true
      });
      for (const client of all) {
        // Same-origin tab — focus it and ask it to navigate.
        try {
          await client.focus();
          if ("navigate" in client) {
            await client.navigate(target);
          }
          return;
        } catch {
          /* try next */
        }
      }
      await self.clients.openWindow(target);
    })()
  );
});
