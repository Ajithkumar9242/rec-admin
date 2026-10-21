import api from './api.js';

export const notificationApi = {
  /**
   * Fetches paginated in-app notifications for the authenticated admin.
   */
  async getNotifications({ page = 1, limit = 20, isRead } = {}) {
    const params = { page, limit };
    if (typeof isRead === 'boolean') {
      params.isRead = isRead;
    }
    const response = await api.get('/notifications', { params });
    return response.data;
  },

  /**
   * Fetches the quick unread notification count.
   */
  async getUnreadCount() {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  },

  /**
   * Marks a single notification as read.
   */
  async markAsRead(id) {
    const response = await api.patch(`/notifications/${encodeURIComponent(id)}/read`);
    return response.data;
  },

  /**
   * Marks all unread notifications for the current admin as read.
   */
  async markAllAsRead() {
    const response = await api.patch('/notifications/read-all');
    return response.data;
  },

  /**
   * Registers or updates an FCM device token on the backend.
   */
  async registerDeviceToken({ token, platform = 'WEB', userAgent } = {}) {
    const response = await api.post('/notifications/devices/register', {
      token,
      platform,
      userAgent,
    });
    return response.data;
  },

  /**
   * Unregisters an FCM device token on the backend.
   */
  async unregisterDeviceToken({ token } = {}) {
    const response = await api.post('/notifications/devices/unregister', {
      token,
    });
    return response.data;
  },

  /**
   * Dispatches a test notification (strictly restricted to SUPER_ADMIN).
   */
  async sendTestNotification({ title, body, category = 'SYSTEM', deepLinkUrl, metadata } = {}) {
    const response = await api.post('/notifications/test-send', {
      title,
      body,
      category,
      deepLinkUrl,
      metadata,
    });
    return response.data;
  },

  /**
   * Fetches the push configuration diagnostic status from the backend.
   */
  async getConfigStatus() {
    const response = await api.get('/notifications/config-status');
    return response.data;
  },
};
