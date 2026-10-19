import { useSelector, useDispatch } from 'react-redux';
import { useCallback, useEffect } from 'react';
import { fetchMyPermissions } from '../store/authSlice.js';

/**
 * Custom hook to check module and action level permissions for the current user session.
 * Automatically synchronizes with server-side effective permissions on /api/roles/me.
 */
export function usePermissions() {
  const dispatch = useDispatch();
  const {
    user,
    permissions,
    isSuperAdmin,
    roleCode,
    roleName,
    permissionsLoaded,
    isAuthenticated,
  } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated && !permissionsLoaded) {
      dispatch(fetchMyPermissions());
    }
  }, [isAuthenticated, permissionsLoaded, dispatch]);

  const can = useCallback(
    (module, action) => {
      if (!isAuthenticated) return false;
      if (isSuperAdmin || user?.role === 'SUPER_ADMIN') return true;
      if (!permissions || !module || !action) return false;
      return Boolean(permissions[module]?.[action]);
    },
    [isAuthenticated, isSuperAdmin, user?.role, permissions]
  );

  const refreshPermissions = useCallback(() => {
    return dispatch(fetchMyPermissions());
  }, [dispatch]);

  return {
    can,
    isSuperAdmin: Boolean(isSuperAdmin || user?.role === 'SUPER_ADMIN'),
    roleCode,
    roleName,
    permissions: permissions || {},
    refreshPermissions,
  };
}

export default usePermissions;
