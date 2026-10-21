import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { notificationApi } from '../services/notificationApi.js';
import {
  enablePushNotifications as enablePushService,
  disablePushNotifications as disablePushService,
  getNotificationPermission,
  isPushNotificationSupported,
} from '../services/firebaseClient.js';

export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async ({ page = 1, limit = 20, isRead } = {}, { rejectWithValue }) => {
    try {
      const response = await notificationApi.getNotifications({ page, limit, isRead });
      return response;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to load notifications');
    }
  }
);

export const fetchUnreadCount = createAsyncThunk(
  'notifications/fetchUnreadCount',
  async (_, { rejectWithValue }) => {
    try {
      const response = await notificationApi.getUnreadCount();
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to get unread count');
    }
  }
);

export const markAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async (id, { rejectWithValue }) => {
    try {
      const response = await notificationApi.markAsRead(id);
      return { id, data: response.data };
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to mark notification as read');
    }
  }
);

export const markAllAsRead = createAsyncThunk(
  'notifications/markAllAsRead',
  async (_, { rejectWithValue }) => {
    try {
      const response = await notificationApi.markAllAsRead();
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to mark all as read');
    }
  }
);

export const registerPush = createAsyncThunk(
  'notifications/registerPush',
  async (_, { rejectWithValue }) => {
    try {
      const result = await enablePushService();
      if (!result.success) {
        return rejectWithValue(result.message || 'Push permission was not granted');
      }
      return result;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to register push');
    }
  }
);

export const unregisterPush = createAsyncThunk(
  'notifications/unregisterPush',
  async (_, { rejectWithValue }) => {
    try {
      await disablePushService();
      return { success: true };
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to unregister push');
    }
  }
);

export const checkPushSupport = createAsyncThunk(
  'notifications/checkPushSupport',
  async () => {
    const supported = await isPushNotificationSupported();
    const permission = getNotificationPermission();
    let enabled = false;
    try {
      enabled = localStorage.getItem('rt_fcm_push_enabled') === 'true' && permission === 'granted';
    } catch {
      enabled = false;
    }
    return { supported, permission, enabled };
  }
);

export const sendTestPush = createAsyncThunk(
  'notifications/sendTestPush',
  async (payload, { rejectWithValue, dispatch }) => {
    try {
      const response = await notificationApi.sendTestNotification(payload);
      // Refresh notifications list and unread count after sending test push
      dispatch(fetchNotifications({ page: 1, limit: 20 }));
      dispatch(fetchUnreadCount());
      return response;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to send test notification');
    }
  }
);

const initialState = {
  items: [],
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    unreadCount: 0,
  },
  unreadCount: 0,
  loading: false,
  actionLoading: false,
  error: null,
  pushError: null,
  pushSupported: false,
  pushPermission: 'default',
  pushEnabled: false,
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    incrementUnread(state) {
      state.unreadCount += 1;
      state.pagination.unreadCount += 1;
    },
    prependNotification(state, action) {
      state.items.unshift(action.payload);
      state.unreadCount += 1;
      state.pagination.total += 1;
      state.pagination.unreadCount += 1;
    },
    clearError(state) {
      state.error = null;
    },
    clearPushError(state) {
      state.pushError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchNotifications
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data || [];
        if (action.payload.pagination) {
          state.pagination = action.payload.pagination;
          state.unreadCount = action.payload.pagination.unreadCount || 0;
        }
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to load notifications';
      })

      // fetchUnreadCount
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload?.unreadCount || 0;
        state.pagination.unreadCount = action.payload?.unreadCount || 0;
      })

      // markAsRead
      .addCase(markAsRead.fulfilled, (state, action) => {
        const item = state.items.find((n) => n.id === action.payload.id);
        if (item && !item.isRead) {
          item.isRead = true;
          item.readAt = action.payload.data?.readAt || new Date().toISOString();
          state.unreadCount = Math.max(0, state.unreadCount - 1);
          state.pagination.unreadCount = Math.max(0, state.pagination.unreadCount - 1);
        }
      })

      // markAllAsRead
      .addCase(markAllAsRead.fulfilled, (state) => {
        state.items.forEach((n) => {
          n.isRead = true;
          n.readAt = n.readAt || new Date().toISOString();
        });
        state.unreadCount = 0;
        state.pagination.unreadCount = 0;
      })

      // checkPushSupport
      .addCase(checkPushSupport.fulfilled, (state, action) => {
        state.pushSupported = action.payload.supported;
        state.pushPermission = action.payload.permission;
        state.pushEnabled = action.payload.enabled;
      })

      // registerPush
      .addCase(registerPush.pending, (state) => {
        state.actionLoading = true;
        state.pushError = null;
      })
      .addCase(registerPush.fulfilled, (state) => {
        state.actionLoading = false;
        state.pushEnabled = true;
        state.pushPermission = 'granted';
        state.pushError = null;
      })
      .addCase(registerPush.rejected, (state, action) => {
        state.actionLoading = false;
        state.pushEnabled = false;
        state.pushPermission = getNotificationPermission();
        state.pushError = action.payload || 'Push registration failed';
      })

      // unregisterPush
      .addCase(unregisterPush.pending, (state) => {
        state.actionLoading = true;
        state.pushError = null;
      })
      .addCase(unregisterPush.fulfilled, (state) => {
        state.actionLoading = false;
        state.pushEnabled = false;
        state.pushError = null;
      })
      .addCase(unregisterPush.rejected, (state, action) => {
        state.actionLoading = false;
        state.pushError = action.payload || 'Failed to unregister push';
      });
  },
});

export const { incrementUnread, prependNotification, clearError, clearPushError } = notificationSlice.actions;
export default notificationSlice.reducer;
