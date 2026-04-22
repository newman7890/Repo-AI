import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

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
  (window.location.hostname.includes("lovable.app") &&
    window.location.hostname.includes("--"));

if ("serviceWorker" in navigator && (isPreviewHost || isInIframe)) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  });

  if ("caches" in window) {
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => caches.delete(key))),
    );
  }
}

createRoot(document.getElementById("root")!).render(<App />);
