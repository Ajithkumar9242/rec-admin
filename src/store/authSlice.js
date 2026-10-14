import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api.js';

// Restore active session on application launch
export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/auth/me');
      return response.data.user;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Session unauthenticated');
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
      return response.data.user;
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
      return response.data.user;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Invalid backup code');
    }
  }
);

// Logout
export const logoutUser = createAsyncThunk('auth/logoutUser', async () => {
  try {
    await api.post('/auth/logout');
  } catch (error) {
    // Continue clearing local state even if backend was unreachable
  }
  return true;
});

const initialState = {
  user: null,
  isAuthenticated: false,
  isInitialized: false, // Prevents premature redirection on startup
  loading: false,
  error: null,
  pending2FA: {
    requires2FA: false,
    adminId: null,
  },
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError: (state) => {
      state.error = null;
    },
    resetPending2FA: (state) => {
      state.pending2FA = {
        requires2FA: false,
        adminId: null,
      };
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
        state.user = action.payload;
        state.isAuthenticated = true;
        state.isInitialized = true;
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.user = null;
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
        if (action.payload.requires2FA) {
          state.pending2FA = {
            requires2FA: true,
            adminId: action.payload.adminId,
          };
        } else {
          state.user = action.payload.user;
          state.isAuthenticated = true;
          state.pending2FA = { requires2FA: false, adminId: null };
        }
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // 2FA Verification
    builder
      .addCase(verify2FACode.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verify2FACode.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.pending2FA = { requires2FA: false, adminId: null };
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
        state.user = action.payload;
        state.isAuthenticated = true;
        state.pending2FA = { requires2FA: false, adminId: null };
      })
      .addCase(verifyBackupCode.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Logout
    builder.addCase(logoutUser.fulfilled, (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.pending2FA = { requires2FA: false, adminId: null };
      state.error = null;
    });
  },
});

export const { clearAuthError, resetPending2FA, updateUserSecurityState } = authSlice.actions;
export default authSlice.reducer;
