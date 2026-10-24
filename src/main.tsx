import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './fonts.css';
import './styles.css';
import './tailwind.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

/* Offline app shell. Registered only in production builds so Vite HMR is never
 * served stale assets from the cache; virtual navigation keeps working offline. */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      /* offline support is an enhancement: the app still runs online */
    });
  });
}
