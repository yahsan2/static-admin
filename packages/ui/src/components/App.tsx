import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { StaticAdminConfig } from '../types';
import { AdminProvider, useAdmin } from '../context/AdminContext';
import { AdminLayout } from './layout/AdminLayout';
import { CollectionListPage } from './pages/CollectionListPage';
import { EntryListPage } from './pages/EntryListPage';
import { EntryEditPage } from './pages/EntryEditPage';
import { UserListPage } from './pages/UserListPage';
import { UserEditPage } from './pages/UserEditPage';
import { LoginPage } from './pages/LoginPage';
import { InstallPage } from './pages/InstallPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';

export interface StaticAdminAppProps {
  config?: StaticAdminConfig;
  basePath?: string;
  apiBasePath?: string;
}

export function StaticAdminApp({
  config,
  basePath = '/admin',
  apiBasePath = '/admin/api',
}: StaticAdminAppProps) {
  return (
    <div data-theme="corporate" className="min-h-screen">
      <AdminProvider config={config} apiBasePath={apiBasePath}>
        <BrowserRouter basename={basePath}>
          <AppRoutes />
        </BrowserRouter>
      </AdminProvider>
    </div>
  );
}

function AppRoutes() {
  const { config, user, isLoading, needsSetup } = useAdmin();

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <span className="loading loading-spinner loading-lg"></span>
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

      {/* Forgot password page */}
      <Route
        path="/forgot-password"
        element={
          config.auth && !user ? (
            <ForgotPasswordPage />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      {/* Reset password page */}
      <Route
        path="/reset-password"
        element={
          config.auth && !user ? (
            <ResetPasswordPage />
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

        {/* User management - Admin only */}
        <Route
          path="users"
          element={user?.role === 'admin' ? <UserListPage /> : <Navigate to="/" replace />}
        />
        <Route
          path="users/new"
          element={user?.role === 'admin' ? <UserEditPage /> : <Navigate to="/" replace />}
        />
        <Route
          path="users/:id"
          element={user?.role === 'admin' ? <UserEditPage /> : <Navigate to="/" replace />}
        />
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
