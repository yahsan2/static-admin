import React from 'react';
import { createRoot } from 'react-dom/client';
import { StaticAdminApp } from '@static-admin/ui';
import '@static-admin/ui/styles.css';
import { Home } from './pages/Home';

function App() {
  const path = window.location.pathname;

  // Admin routes
  if (path.startsWith('/admin')) {
    return <StaticAdminApp basePath="/admin" apiBasePath="/api" />;
  }

  // Home page
  return <Home />;
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
