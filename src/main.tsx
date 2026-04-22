import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Service worker management: ensure users always get the latest version on refresh
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com") ||
  window.location.hostname.includes("lovable.app") &&
    window.location.hostname.includes("--");

if ("serviceWorker" in navigator) {
  if (isPreviewHost || isInIframe) {
    // Unregister any service workers in preview/iframe contexts to avoid stale caches
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((r) => r.unregister());
    });
    // Also clear any existing caches
    if ("caches" in window) {
      caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
    }
  } else {
    // In production: when a new SW takes control, reload so users see the latest build
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }
}

createRoot(document.getElementById("root")!).render(<App />);
