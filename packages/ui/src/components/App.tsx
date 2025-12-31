import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { StaticAdminConfig } from '../types';
import { AdminProvider, useAdmin } from '../context/AdminContext';
import { AdminLayout } from './layout/AdminLayout';
import { CollectionListPage } from './pages/CollectionListPage';
import { EntryListPage } from './pages/EntryListPage';
import { EntryEditPage } from './pages/EntryEditPage';
import { LoginPage } from './pages/LoginPage';
import { InstallPage } from './pages/InstallPage';

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
  const { config, user, isLoading, needsSetup } = useAdmin();

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Install page */}
      <Route
        path="/install"
        element={
          config.auth && needsSetup ? (
            <InstallPage />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      {/* Login page */}
      <Route
        path="/login"
        element={
          config.auth && !user && !needsSetup ? (
            <LoginPage />
          ) : needsSetup ? (
            <Navigate to="/install" replace />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          config.auth && needsSetup ? (
            <Navigate to="/install" replace />
          ) : config.auth && !user ? (
            <Navigate to="/login" replace />
          ) : (
            <AdminLayout />
          )
        }
      >
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
      <Route
        path="*"
        element={
          config.auth && needsSetup ? (
            <Navigate to="/install" replace />
          ) : config.auth && !user ? (
            <Navigate to="/login" replace />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
    </Routes>
  );
}
