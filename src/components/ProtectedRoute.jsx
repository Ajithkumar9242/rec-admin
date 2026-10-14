import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { useTranslation } from 'react-i18next';

export function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, isInitialized, user } = useSelector((state) => state.auth);
  const location = useLocation();
  const { t } = useTranslation();

  // Wait until session is verified with backend before making navigation decisions
  if (!isInitialized) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
        }}
      >
        <Spin size="large" />
        <span style={{ color: '#5c7480', fontSize: 14 }}>{t('common.loading')}</span>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role authorization if specified
  if (requiredRole && user.role !== 'SUPER_ADMIN' && user.role !== requiredRole) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}
