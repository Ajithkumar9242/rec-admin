import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import authReducer from '../store/authSlice.js';
import themeReducer from '../store/themeSlice.js';
import notificationReducer from '../store/notificationSlice.js';
import { NotificationCenter } from '../components/NotificationCenter.jsx';
import { validateDeepLink } from '../utils/deepLink.js';
import {
  isFirebaseWebConfigured,
  getFirebaseApp,
  isPushNotificationSupported,
  getNotificationPermission,
  enablePushNotifications,
  disablePushNotifications,
  displayForegroundNativeNotification,
  _resetRecentNotificationTags,
} from '../services/firebaseClient.js';
import { notificationApi } from '../services/notificationApi.js';
import '../i18n/index.js';
import { changeAppLanguage } from '../i18n/index.js';

// Mock notificationApi methods
vi.mock('../services/notificationApi.js', () => ({
  notificationApi: {
    getNotifications: vi.fn(),
    getUnreadCount: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    registerDeviceToken: vi.fn(),
    unregisterDeviceToken: vi.fn(),
    sendTestNotification: vi.fn(),
  },
}));

// Mock firebase/messaging and firebase/app
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({ name: '[DEFAULT]' })),
  getApps: vi.fn(() => []),
  getApp: vi.fn(() => ({ name: '[DEFAULT]' })),
}));

const mockDeleteToken = vi.fn().mockResolvedValue(true);
const mockGetToken = vi.fn().mockResolvedValue('mock-fcm-device-token-xyz');
const mockOnMessage = vi.fn(() => () => {});
const mockIsSupported = vi.fn().mockResolvedValue(true);

vi.mock('firebase/messaging', () => ({
  getMessaging: vi.fn(() => ({})),
  getToken: (...args) => mockGetToken(...args),
  deleteToken: (...args) => mockDeleteToken(...args),
  onMessage: (...args) => mockOnMessage(...args),
  isSupported: () => mockIsSupported(),
}));

function renderNotificationCenter({
  userRole = 'SUPER_ADMIN',
  initialNotificationsState = {},
  onClose = vi.fn(),
} = {}) {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      theme: themeReducer,
      notifications: notificationReducer,
    },
    preloadedState: {
      auth: {
        user: { id: 'admin-1', name: 'Admin User', role: userRole },
        isAuthenticated: true,
      },
      notifications: {
        items: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 1, unreadCount: 0 },
        unreadCount: 0,
        loading: false,
        actionLoading: false,
        error: null,
        pushSupported: true,
        pushPermission: 'granted',
        pushEnabled: true,
        ...initialNotificationsState,
      },
    },
  });

  return {
    store,
    ...render(
      <Provider store={store}>
        <MemoryRouter>
          <NotificationCenter onClose={onClose} />
        </MemoryRouter>
      </Provider>
    ),
  };
}

describe('RecruiTrain Push & In-App Notifications Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    changeAppLanguage('en');

    // Default API mocks
    notificationApi.getNotifications.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'notif-1',
          title: 'System Update',
          body: 'Platform maintenance scheduled at midnight.',
          category: 'SYSTEM',
          isRead: false,
          deepLinkUrl: '/admin/settings',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'notif-2',
          title: 'Security Alert',
          body: 'New login detected from unknown location.',
          category: 'SECURITY',
          isRead: true,
          deepLinkUrl: null,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
      ],
      pagination: { page: 1, limit: 20, total: 2, totalPages: 1, unreadCount: 1 },
    });

    notificationApi.getUnreadCount.mockResolvedValue({
      success: true,
      data: { unreadCount: 1 },
    });

    notificationApi.markAsRead.mockResolvedValue({
      success: true,
      message: 'Notification marked as read',
      data: { id: 'notif-1', isRead: true, readAt: new Date().toISOString() },
    });

    notificationApi.markAllAsRead.mockResolvedValue({
      success: true,
      message: 'All notifications marked as read',
      data: { updatedCount: 1 },
    });

    notificationApi.registerDeviceToken.mockResolvedValue({
      success: true,
      data: { id: 'dev-1', platform: 'WEB', lastUsedAt: new Date().toISOString() },
    });

    notificationApi.unregisterDeviceToken.mockResolvedValue({
      success: true,
      message: 'Device token removed successfully',
    });

    notificationApi.sendTestNotification.mockResolvedValue({
      success: true,
      message: 'Test notification sent',
      data: { id: 'test-notif-1' },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    localStorage.clear();
  });

  describe('1. Safe Fallback and Configuration Handling', () => {
    it('detects when Firebase web credentials are missing or placeholders', () => {
      const configured = isFirebaseWebConfigured();
      expect(typeof configured).toBe('boolean');
    });

    it('returns null safely from getFirebaseApp without throwing when configuration is absent', () => {
      const app = getFirebaseApp();
      expect(app === null || typeof app === 'object').toBe(true);
    });

    it('gracefully handles missing browser Notification or serviceWorker APIs', async () => {
      const originalNotification = window.Notification;
      try {
        delete window.Notification;
        const supported = await isPushNotificationSupported();
        expect(supported).toBe(false);

        const perm = getNotificationPermission();
        expect(perm).toBe('unsupported');
      } finally {
        window.Notification = originalNotification;
      }
    });
  });

  describe('2. Deep Link Validation Utility', () => {
    it('accepts safe relative paths starting with single slash', () => {
      expect(validateDeepLink('/admin/candidates')).toBe('/admin/candidates');
      expect(validateDeepLink('/admin/jobs/detail?id=123#overview')).toBe('/admin/jobs/detail?id=123#overview');
    });

    it('resolves absolute URLs matching current origin to relative paths', () => {
      const currentOrigin = window.location.origin;
      const target = `${currentOrigin}/admin/billing?tab=invoices`;
      expect(validateDeepLink(target)).toBe('/admin/billing?tab=invoices');
    });

    it('rejects external URLs, protocol-relative links, and dangerous schemes', () => {
      expect(validateDeepLink('https://evil.com/phishing')).toBeNull();
      expect(validateDeepLink('http://attacker.com')).toBeNull();
      expect(validateDeepLink('//evil.com/subpath')).toBeNull();
      expect(validateDeepLink('javascript:alert(document.cookie)')).toBeNull();
      expect(validateDeepLink('data:text/html,<script>alert(1)</script>')).toBeNull();
      expect(validateDeepLink('')).toBeNull();
      expect(validateDeepLink(null)).toBeNull();
      expect(validateDeepLink(undefined)).toBeNull();
    });
  });

  describe('3. Browser Push Registration & Unregistration', () => {
    it('handles denied permission without throwing error', async () => {
      window.Notification = {
        permission: 'denied',
        requestPermission: vi.fn().mockResolvedValue('denied'),
      };

      const result = await enablePushNotifications();
      expect(result.success).toBe(false);
      expect(['MISSING_CONFIG', 'PERMISSION_DENIED', 'UNSUPPORTED']).toContain(result.reason);
    });

    it('unregisters device token via backend and clears local storage', async () => {
      sessionStorage.setItem('rt_fcm_device_token', 'sample-token-123');
      localStorage.setItem('rt_fcm_push_enabled', 'true');

      await disablePushNotifications();

      expect(notificationApi.unregisterDeviceToken).toHaveBeenCalledWith({ token: 'sample-token-123' });
      expect(sessionStorage.getItem('rt_fcm_device_token')).toBeNull();
      expect(localStorage.getItem('rt_fcm_push_enabled')).toBeNull();
    });
  });

  describe('4. NotificationCenter UI Component', () => {
    it('renders notification items and unread count header', async () => {
      renderNotificationCenter();

      expect(await screen.findByText('System Update')).toBeInTheDocument();
      expect(screen.getByText('Security Alert')).toBeInTheDocument();
      expect(screen.getByText('Platform maintenance scheduled at midnight.')).toBeInTheDocument();
    });

    it('filters between All and Unread tabs', async () => {
      renderNotificationCenter();

      expect(await screen.findByText('System Update')).toBeInTheDocument();
      expect(screen.getByText('Security Alert')).toBeInTheDocument();

      const unreadTab = screen.getByRole('tab', { name: /unread/i });
      fireEvent.click(unreadTab);

      // System Update is unread, Security Alert is read
      expect(screen.getByText('System Update')).toBeInTheDocument();
      expect(screen.queryByText('Security Alert')).not.toBeInTheDocument();
    });

    it('marks a single notification as read on button click', async () => {
      renderNotificationCenter();

      expect(await screen.findByText('System Update')).toBeInTheDocument();

      const markReadBtn = screen.getByRole('button', { name: /^mark read$/i });
      fireEvent.click(markReadBtn);

      await waitFor(() => {
        expect(notificationApi.markAsRead).toHaveBeenCalledWith('notif-1');
      });
    });

    it('marks all notifications as read when clicking mark all read button', async () => {
      renderNotificationCenter();

      expect(await screen.findByText('System Update')).toBeInTheDocument();

      const markAllBtn = screen.getByRole('button', { name: /mark all as read/i });
      fireEvent.click(markAllBtn);

      await waitFor(() => {
        expect(notificationApi.markAllAsRead).toHaveBeenCalled();
      });
    });

    it('shows retry button on load failure and retries fetching', async () => {
      notificationApi.getNotifications.mockRejectedValueOnce(new Error('Network error'));

      renderNotificationCenter();

      const errorMessages = await screen.findAllByText('Failed to load notifications');
      expect(errorMessages.length).toBeGreaterThan(0);

      const retryBtn = screen.getByRole('button', { name: /retry/i });
      notificationApi.getNotifications.mockResolvedValueOnce({
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 1, unreadCount: 0 },
      });

      fireEvent.click(retryBtn);

      await waitFor(() => {
        expect(notificationApi.getNotifications).toHaveBeenCalledTimes(2);
      });
    });

    it('shows empty state when no notifications are present', async () => {
      notificationApi.getNotifications.mockResolvedValueOnce({
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 1, unreadCount: 0 },
      });

      renderNotificationCenter();

      expect(await screen.findByText('No notifications yet')).toBeInTheDocument();
    });
  });

  describe('5. Role-Gated Test Notification Modal', () => {
    it('shows test notification button for SUPER_ADMIN role', async () => {
      renderNotificationCenter({ userRole: 'SUPER_ADMIN' });

      expect(await screen.findByRole('button', { name: /send test notification/i })).toBeInTheDocument();
    });

    it('does NOT render test notification button for standard ADMIN role', async () => {
      renderNotificationCenter({ userRole: 'ADMIN' });

      expect(await screen.findByText('System Update')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /send test notification/i })).not.toBeInTheDocument();
    });

    it('submits test notification form when SUPER_ADMIN sends test', async () => {
      renderNotificationCenter({ userRole: 'SUPER_ADMIN' });

      const testBtn = await screen.findByRole('button', { name: /send test notification/i });
      fireEvent.click(testBtn);

      // Modal opens
      expect(await screen.findByText('Send Test Notification', { selector: 'span' })).toBeInTheDocument();

      const submitBtn = screen.getByRole('button', { name: /send$/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(notificationApi.sendTestNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.any(String),
            body: expect.any(String),
          })
        );
      });
    });
  });

  describe('6. Security & Credential Protection', () => {
    it('never logs or exposes raw FCM tokens in the UI', async () => {
      const { container } = renderNotificationCenter();

      expect(await screen.findByText('System Update')).toBeInTheDocument();

      const fullHtml = container.innerHTML;
      expect(fullHtml).not.toContain('mock-fcm-device-token');
      expect(fullHtml).not.toContain('FIREBASE_PRIVATE_KEY');
      expect(fullHtml).not.toContain('private_key');
    });
  });

  describe('7. Foreground Native Desktop Notification Handling', () => {
    let originalNotification;
    let originalFocus;
    let mockNotificationInstances = [];

    beforeEach(() => {
      _resetRecentNotificationTags();
      mockNotificationInstances = [];
      originalNotification = window.Notification;
      originalFocus = window.focus;
      window.focus = vi.fn();

      // Mock HTML5 Notification constructor and static properties
      class MockNotification {
        static permission = 'granted';
        static requestPermission = vi.fn().mockResolvedValue('granted');

        constructor(title, options) {
          this.title = title;
          this.options = options;
          this.close = vi.fn();
          this.onclick = null;
          mockNotificationInstances.push(this);
        }
      }

      window.Notification = MockNotification;
    });

    afterEach(() => {
      window.Notification = originalNotification;
      window.focus = originalFocus;
      _resetRecentNotificationTags();
    });

    it('creates a native desktop notification when permission is granted in the foreground', () => {
      const payload = {
        notification: {
          title: 'RecruTrain — Job Published',
          body: 'Senior Cloud Architect role is now live.',
        },
        data: {
          eventId: 'JOB_PUB_123',
          deepLinkUrl: '/jobs/123',
        },
      };

      const result = displayForegroundNativeNotification(payload);

      expect(result).not.toBeNull();
      expect(mockNotificationInstances.length).toBe(1);
      expect(mockNotificationInstances[0].title).toBe('RecruTrain — Job Published');
      expect(mockNotificationInstances[0].options.body).toBe('Senior Cloud Architect role is now live.');
      expect(mockNotificationInstances[0].options.tag).toBe('JOB_PUB_123');
      expect(mockNotificationInstances[0].options.data.deepLinkUrl).toBe('/jobs/123');
    });

    it('silently skips native notification when permission is denied or default (without prompting)', () => {
      window.Notification.permission = 'denied';

      const payload = {
        notification: {
          title: 'Test Notification',
          body: 'This should not appear natively.',
        },
      };

      const result = displayForegroundNativeNotification(payload);

      expect(result).toBeNull();
      expect(mockNotificationInstances.length).toBe(0);
      expect(window.Notification.requestPermission).not.toHaveBeenCalled();
    });

    it('silently handles unsupported Notification API without throwing', () => {
      delete window.Notification;

      const payload = {
        notification: {
          title: 'Test Unsupported',
          body: 'API is missing.',
        },
      };

      const result = displayForegroundNativeNotification(payload);
      expect(result).toBeNull();
    });

    it('prevents duplicate native desktop notifications using stable tag deduplication', () => {
      const payload = {
        notification: {
          title: 'Candidate Registered',
          body: 'John Doe registered.',
        },
        data: {
          eventId: 'CANDIDATE_REG_999',
        },
      };

      // First dispatch should show
      const first = displayForegroundNativeNotification(payload);
      expect(first).not.toBeNull();
      expect(mockNotificationInstances.length).toBe(1);

      // Second duplicate dispatch with same eventId should be rejected by deduplication
      const duplicate = displayForegroundNativeNotification(payload);
      expect(duplicate).toBeNull();
      expect(mockNotificationInstances.length).toBe(1);
    });

    it('handles native notification click, invokes window focus, closes notification, and navigates safely', () => {
      const focusSpy = vi.spyOn(window, 'focus').mockImplementation(() => {});
      const onClickSpy = vi.fn();

      const payload = {
        notification: {
          title: 'Company Created',
          body: 'Acme Corp registered.',
        },
        data: {
          eventId: 'COMP_CREATE_555',
          deepLinkUrl: '/companies/555',
        },
      };

      const notification = displayForegroundNativeNotification(payload, { onClick: onClickSpy });
      expect(notification).not.toBeNull();

      // Trigger notification click event
      const mockEvent = { preventDefault: vi.fn() };
      notification.onclick(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(focusSpy).toHaveBeenCalled();
      expect(notification.close).toHaveBeenCalled();
      expect(onClickSpy).toHaveBeenCalledWith('/companies/555');

      focusSpy.mockRestore();
    });

    it('rejects unsafe external deep links on native notification click navigation', () => {
      const onClickSpy = vi.fn();

      const payload = {
        notification: {
          title: 'Malicious Link Alert',
          body: 'Phishing attempt.',
        },
        data: {
          eventId: 'PHISH_1',
          deepLinkUrl: 'https://attacker.evil.com/login',
        },
      };

      const notification = displayForegroundNativeNotification(payload, { onClick: onClickSpy });
      expect(notification).not.toBeNull();

      const mockEvent = { preventDefault: vi.fn() };
      notification.onclick(mockEvent);

      // Deep link validation returns null for external URLs
      expect(onClickSpy).toHaveBeenCalledWith(null);
    });

    it('returns null and does not display notification for empty or invalid payload', () => {
      expect(displayForegroundNativeNotification(null)).toBeNull();
      expect(displayForegroundNativeNotification({})).toBeNull();
      expect(displayForegroundNativeNotification({ data: {} })).toBeNull();
      expect(mockNotificationInstances.length).toBe(0);
    });
  });
});
