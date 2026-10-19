import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api.js';

export const AuthState = {
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  PASSWORD_ACCEPTED_MFA_PENDING: 'PASSWORD_ACCEPTED_MFA_PENDING',
  MFA_ENROLLMENT_REQUIRED: 'MFA_ENROLLMENT_REQUIRED',
  AUTHENTICATED_MFA_VERIFIED: 'AUTHENTICATED_MFA_VERIFIED',
  SESSION_EXPIRED_OR_REVOKED: 'SESSION_EXPIRED_OR_REVOKED',
};

// Restore active session on application launch
export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      return rejectWithValue({
        error: error.response?.data?.error || 'Session unauthenticated',
        state: error.response?.data?.state || AuthState.UNAUTHENTICATED,
      });
    }
  }
);

// Sign in with email and password
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to authenticate');
    }
  }
);

// Verify TOTP during login
export const verify2FACode = createAsyncThunk(
  'auth/verify2FACode',
  async ({ adminId, code }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/verify-2fa', { adminId, code });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Invalid 2FA code');
    }
  }
);

// Verify Backup Code during login
export const verifyBackupCode = createAsyncThunk(
  'auth/verifyBackupCode',
  async ({ adminId, code }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/verify-backup-code', { adminId, code });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Invalid backup code');
    }
  }
);

// Confirm initial mandatory MFA enrollment
export const confirmMandatoryMFA = createAsyncThunk(
  'auth/confirmMandatoryMFA',
  async ({ code }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/2fa/confirm', { code });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to confirm MFA setup');
    }
  }
);

// Fetch effective user permissions
export const fetchMyPermissions = createAsyncThunk(
  'auth/fetchMyPermissions',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/roles/me');
      return response.data?.data || null;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch permissions');
    }
  }
);

// Logout
export const logoutUser = createAsyncThunk('auth/logoutUser', async () => {
  try {
    await api.post('/auth/logout');
  } catch (error) {
    // Continue clearing local state
  }
  return true;
});

const initialState = {
  user: null,
  authState: AuthState.UNAUTHENTICATED,
  isAuthenticated: false,
  isInitialized: false,
  loading: false,
  error: null,
  pendingAdminId: null,
  initialBackupCodes: null, // Shown once upon mandatory enrollment
  permissions: {},
  isSuperAdmin: false,
  roleCode: null,
  roleName: null,
  permissionsLoaded: false,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError: (state) => {
      state.error = null;
    },
    resetAuthState: (state) => {
      state.authState = AuthState.UNAUTHENTICATED;
      state.pendingAdminId = null;
      state.error = null;
    },
    clearInitialBackupCodes: (state) => {
      state.initialBackupCodes = null;
    },
    updateUserSecurityState: (state, action) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
  },
  extraReducers: (builder) => {
    // Session Restoration
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.authState = action.payload.state || AuthState.AUTHENTICATED_MFA_VERIFIED;
        state.isAuthenticated = state.authState === AuthState.AUTHENTICATED_MFA_VERIFIED;
        state.isInitialized = true;
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.user = null;
        state.authState = action.payload?.state || AuthState.UNAUTHENTICATED;
        state.isAuthenticated = false;
        state.isInitialized = true;
        state.loading = false;
      });

    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.authState = action.payload.state;
        state.pendingAdminId = action.payload.adminId;

        if (action.payload.state === AuthState.AUTHENTICATED_MFA_VERIFIED) {
          state.user = action.payload.user;
          state.isAuthenticated = true;
        } else {
          state.isAuthenticated = false;
          state.user = null;
        }
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.authState = AuthState.UNAUTHENTICATED;
      });

    // 2FA Verification
    builder
      .addCase(verify2FACode.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verify2FACode.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.authState = AuthState.AUTHENTICATED_MFA_VERIFIED;
        state.isAuthenticated = true;
        state.pendingAdminId = null;
      })
      .addCase(verify2FACode.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Backup Code Verification
    builder
      .addCase(verifyBackupCode.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyBackupCode.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.authState = AuthState.AUTHENTICATED_MFA_VERIFIED;
        state.isAuthenticated = true;
        state.pendingAdminId = null;
      })
      .addCase(verifyBackupCode.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Mandatory MFA Enrollment Confirmation
    builder
      .addCase(confirmMandatoryMFA.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(confirmMandatoryMFA.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.authState = AuthState.AUTHENTICATED_MFA_VERIFIED;
        state.isAuthenticated = true;
        state.pendingAdminId = null;
        state.initialBackupCodes = action.payload.backupCodes || [];
      })
      .addCase(confirmMandatoryMFA.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Fetch Effective Permissions
    builder
      .addCase(fetchMyPermissions.fulfilled, (state, action) => {
        if (action.payload) {
          state.permissions = action.payload.permissions || {};
          state.isSuperAdmin = Boolean(action.payload.isSuperAdmin);
          state.roleCode = action.payload.roleCode || null;
          state.roleName = action.payload.roleName || null;
          state.permissionsLoaded = true;
        }
      })
      .addCase(fetchMyPermissions.rejected, (state) => {
        state.permissionsLoaded = true;
      });

    // Logout
    builder.addCase(logoutUser.fulfilled, (state) => {
      state.user = null;
      state.authState = AuthState.UNAUTHENTICATED;
      state.isAuthenticated = false;
      state.pendingAdminId = null;
      state.initialBackupCodes = null;
      state.error = null;
      state.permissions = {};
      state.isSuperAdmin = false;
      state.roleCode = null;
      state.roleName = null;
      state.permissionsLoaded = false;
    });
  },
});

export const {
  clearAuthError,
  resetAuthState,
  clearInitialBackupCodes,
  updateUserSecurityState,
} = authSlice.actions;

export default authSlice.reducer;
