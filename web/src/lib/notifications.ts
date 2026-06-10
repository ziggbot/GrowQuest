// Browser notification helpers — popup-style alerts the parent can opt
// into via Settings. Triggered client-side from the same realtime
// channels we already use for the dashboard counts.
//
// Caveats:
// - Permission has to come from a user gesture (the toggle in Settings
//   counts as one); we never request it on app load.
// - Visible while a tab is open in any modern browser. Installed PWAs
//   on Android keep delivering them via the service worker. iOS Safari
//   requires the user to "Add to Home Screen" and iOS 16.4+.
// - True background push (app closed everywhere) needs VAPID + Web Push
//   subscriptions stored server-side; not in scope here.

const ENABLED_KEY = "growquest:notifications";

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationsEnabled(): boolean {
  if (!notificationsSupported()) return false;
  if (Notification.permission !== "granted") return false;
  try {
    return localStorage.getItem(ENABLED_KEY) === "1";
  } catch {
    return false;
  }
}

export function notificationsPermission(): NotificationPermission | "unsupported" {
  if (!notificationsSupported()) return "unsupported";
  return Notification.permission;
}

export async function enableNotifications(): Promise<{
  ok: boolean;
  reason?: "unsupported" | "denied";
}> {
  if (!notificationsSupported()) return { ok: false, reason: "unsupported" };
  let perm = Notification.permission;
  if (perm === "default") perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, reason: "denied" };
  try {
    localStorage.setItem(ENABLED_KEY, "1");
  } catch {
    /* ignore */
  }
  return { ok: true };
}

export function disableNotifications(): void {
  try {
    localStorage.removeItem(ENABLED_KEY);
  } catch {
    /* ignore */
  }
}

interface NotifyOptions {
  body: string;
  tag?: string;
  url?: string;
}

export function notify(title: string, opts: NotifyOptions): void {
  if (!notificationsEnabled()) return;
  const { body, tag, url } = opts;
  const params: NotificationOptions = {
    body,
    tag,
    icon: "/icon.svg",
    badge: "/icon.svg"
  };
  try {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.ready
        .then((reg) =>
          reg.showNotification(title, { ...params, data: url ? { url } : undefined })
        )
        .catch(() => fallbackNotify(title, params));
    } else {
      fallbackNotify(title, params);
    }
  } catch {
    /* ignore */
  }
}

function fallbackNotify(title: string, params: NotificationOptions): void {
  try {
    new Notification(title, params);
  } catch {
    /* ignore */
  }
}
