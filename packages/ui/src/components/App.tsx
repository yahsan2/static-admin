import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { StaticAdminConfig } from '@static-admin/core';
import { AdminProvider, useAdmin } from '../context/AdminContext';
import { AdminLayout } from './layout/AdminLayout';
import { CollectionListPage } from './pages/CollectionListPage';
import { EntryListPage } from './pages/EntryListPage';
import { EntryEditPage } from './pages/EntryEditPage';
import { LoginPage } from './pages/LoginPage';

export interface StaticAdminAppProps {
  config: StaticAdminConfig;
  basePath?: string;
  apiBasePath?: string;
}

export function StaticAdminApp({
  config,
  basePath = '/admin',
  apiBasePath = '/admin/api',
}: StaticAdminAppProps) {
  return (
    <AdminProvider config={config} apiBasePath={apiBasePath}>
      <BrowserRouter basename={basePath}>
        <AppRoutes />
      </BrowserRouter>
    </AdminProvider>
  );
}

function AppRoutes() {
  const { config, user, isLoading } = useAdmin();

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  // Require login if auth is configured and user is not logged in
  if (config.auth && !user) {
    return <LoginPage />;
  }

  return (
    <Routes>
      <Route path="/" element={<AdminLayout />}>
        {/* Dashboard / Collection list */}
        <Route index element={<CollectionListPage />} />

        {/* Collection entry list */}
        <Route path="collections/:collection" element={<EntryListPage />} />

        {/* Create new entry */}
        <Route path="collections/:collection/new" element={<EntryEditPage />} />

        {/* Edit existing entry */}
        <Route path="collections/:collection/:slug" element={<EntryEditPage />} />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
