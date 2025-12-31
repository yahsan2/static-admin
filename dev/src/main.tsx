import React from 'react';
import { createRoot } from 'react-dom/client';
import { StaticAdminApp } from '@static-admin/ui';
import '@static-admin/ui/styles.css';
import config from './config';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <StaticAdminApp
        config={config}
        basePath="/admin"
        apiBasePath="/api"
      />
    </React.StrictMode>
  );
}
