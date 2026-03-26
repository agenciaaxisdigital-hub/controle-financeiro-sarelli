import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Registro do Service Worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(reg => {
        // Verifica atualização do SW periodicamente
        setInterval(() => reg.update(), 60 * 60 * 1000);
      })
      .catch(err => console.warn('[SW] Falha no registro:', err));
  });
}

createRoot(document.getElementById("root")!).render(<App />);
