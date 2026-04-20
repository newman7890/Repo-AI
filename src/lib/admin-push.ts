// Browser notification helper for admin. Works as a foreground notification
// (when the admin tab/PWA is open). Real background push would require a
// push server (VAPID + service worker subscriptions), which is not enabled.

const STORAGE_KEY = "renderme_admin_push_enabled";

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getPermission(): NotificationPermission | "unsupported" {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!isNotificationSupported()) return "unsupported";
  if (Notification.permission === "granted") {
    localStorage.setItem(STORAGE_KEY, "1");
    return "granted";
  }
  if (Notification.permission === "denied") return "denied";
  const result = await Notification.requestPermission();
  if (result === "granted") localStorage.setItem(STORAGE_KEY, "1");
  return result;
}

export function isPushEnabled(): boolean {
  if (!isNotificationSupported()) return false;
  if (Notification.permission !== "granted") return false;
  return localStorage.getItem(STORAGE_KEY) === "1";
}

export function disablePush() {
  localStorage.removeItem(STORAGE_KEY);
}

export async function showAdminNotification(title: string, body: string, tag = "admin-payment") {
  if (!isPushEnabled()) return;
  try {
    // Prefer service worker registration so the notification appears even if the tab is hidden.
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification(title, {
          body,
          tag,
          icon: "/pwa-192x192.png",
          badge: "/pwa-192x192.png",
          requireInteraction: false,
        });
        return;
      }
    }
    // Fallback: page-level notification
    new Notification(title, { body, tag, icon: "/pwa-192x192.png" });
  } catch (e) {
    console.error("Failed to show notification:", e);
  }
}
