
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Shim process.env for browser environments to prevent ReferenceErrors
// This ensures that any third-party libraries or services accessing process.env.API_KEY do not crash the app.
if (typeof window !== 'undefined') {
  (window as any).process = (window as any).process || { env: {} };
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
