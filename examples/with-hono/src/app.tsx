import React from 'react';
import { createRoot } from 'react-dom/client';
import { StaticAdminApp } from '@static-admin/ui';
import '@static-admin/ui/styles.css';

function App() {
  return <StaticAdminApp basePath="" apiBasePath="/api/admin" />;
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
