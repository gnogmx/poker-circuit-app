import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/react-app/index.css";
import App from "@/react-app/App.tsx";

// KILL SWITCH: Force unregister any existing Service Workers and clear caches
if ('serviceWorker' in navigator) {
  // Unregister all service workers
  navigator.serviceWorker.getRegistrations().then(function (registrations) {
    for (let registration of registrations) {
      console.log('🧹 Force unregistering zombie SW:', registration);
      registration.unregister();
    }
  });

  // Also clear all caches
  if ('caches' in window) {
    caches.keys().then(function (cacheNames) {
      cacheNames.forEach(function (cacheName) {
        console.log('🗑️ Deleting cache:', cacheName);
        caches.delete(cacheName);
      });
    });
  }
}

import { LanguageProvider } from "@/react-app/hooks/useLanguage";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>
);
