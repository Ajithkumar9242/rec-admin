import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { AuthLayout } from '../components/AuthLayout.jsx';
import { ProtectedRoute } from '../components/ProtectedRoute.jsx';
import { AdminShell } from '../components/AdminShell.jsx';
import { LoginPage } from '../features/auth/LoginPage.jsx';
import { ForgotPasswordPage } from '../features/auth/ForgotPasswordPage.jsx';
import { ResetPasswordPage } from '../features/auth/ResetPasswordPage.jsx';
import { OverviewPage } from '../features/dashboard/OverviewPage.jsx';
import { SecuritySettingsPage } from '../features/settings/SecuritySettingsPage.jsx';

function RootRedirect() {
  const { isAuthenticated, isInitialized } = useSelector((state) => state.auth);

  if (!isInitialized) {
    return null; // App will render loader
  }

  return isAuthenticated ? <Navigate to="/admin" replace /> : <Navigate to="/login" replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Root redirection */}
      <Route path="/" element={<RootRedirect />} />

      {/* Public Authentication Routes */}
      <Route
        path="/login"
        element={
          <AuthLayout>
            <LoginPage />
          </AuthLayout>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <AuthLayout>
            <ForgotPasswordPage />
          </AuthLayout>
        }
      />
      <Route
        path="/reset-password"
        element={
          <AuthLayout>
            <ResetPasswordPage />
          </AuthLayout>
        }
      />

      {/* Protected Admin Shell Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<OverviewPage />} />
        <Route path="security" element={<SecuritySettingsPage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
