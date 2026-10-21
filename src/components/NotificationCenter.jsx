import React, { useState, useEffect } from 'react';
import {
  Space,
  Button,
  Badge,
  Tag,
  Spin,
  Empty,
  Alert,
  Tooltip,
  Modal,
  Form,
  Input,
  Select,
  Typography,
  message,
} from 'antd';
import {
  BellOutlined,
  CheckOutlined,
  SendOutlined,
  ReloadOutlined,
  LinkOutlined,
  NotificationOutlined,
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  fetchNotifications,
  fetchUnreadCount,
  markAsRead,
  markAllAsRead,
  checkPushSupport,
  registerPush,
  unregisterPush,
  sendTestPush,
} from '../store/notificationSlice.js';
import { validateDeepLink } from '../utils/deepLink.js';
import { brandTokens, lightSemanticTokens, darkSemanticTokens } from '../theme/tokens.js';

const { Text } = Typography;

const CATEGORY_COLORS = {
  SYSTEM: 'cyan',
  SECURITY: 'orange',
  BILLING: 'gold',
  APPLICATION: 'purple',
  CANDIDATE: 'blue',
  GENERAL: 'default',
};

function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function NotificationCenter({ onClose }) {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const {
    items,
    unreadCount,
    loading,
    actionLoading,
    error,
    pushSupported,
    pushPermission,
    pushEnabled,
  } = useSelector((state) => state.notifications);

  const { user } = useSelector((state) => state.auth);
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);
  const semantic = isDarkMode ? darkSemanticTokens : lightSemanticTokens;

  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'UNREAD'
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [form] = Form.useForm();

  // Load push status and notifications on mount
  useEffect(() => {
    dispatch(checkPushSupport());
    dispatch(fetchNotifications({ page: 1, limit: 20 }));
    dispatch(fetchUnreadCount());
  }, [dispatch]);

  // Handle push toggle
  const handleTogglePush = async () => {
    if (pushEnabled) {
      const res = await dispatch(unregisterPush());
      if (res.meta.requestStatus === 'fulfilled') {
        message.success(t('notifications.pushDisabledSuccess', 'Browser push notifications disabled.'));
      }
    } else {
      const res = await dispatch(registerPush());
      if (res.meta.requestStatus === 'fulfilled') {
        message.success(t('notifications.pushEnabledSuccess', 'Browser push notifications enabled successfully!'));
      } else {
        const errMsg = res.payload || t('notifications.pushToggleError', 'Failed to enable push notifications.');
        message.error(errMsg);
      }
    }
  };

  // Handle mark one read
  const handleMarkOneRead = async (id, e) => {
    if (e) e.stopPropagation();
    await dispatch(markAsRead(id));
  };

  // Handle mark all as read
  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    const res = await dispatch(markAllAsRead());
    if (res.meta.requestStatus === 'fulfilled') {
      message.success(t('notifications.allRead', 'All notifications marked as read.'));
    }
  };

  // Handle deep link click
  const handleItemClick = async (item) => {
    if (!item.isRead) {
      dispatch(markAsRead(item.id));
    }

    const validPath = validateDeepLink(item.deepLinkUrl);
    if (validPath) {
      if (onClose) onClose();
      navigate(validPath);
    }
  };

  // Handle test notification send (SUPER_ADMIN only)
  const handleSendTestNotification = async (values) => {
    try {
      const payload = {
        title: values.title.trim(),
        body: values.body.trim(),
        category: values.category || 'SYSTEM',
        deepLinkUrl: values.deepLinkUrl ? values.deepLinkUrl.trim() : undefined,
      };

      const res = await dispatch(sendTestPush(payload));
      if (res.meta.requestStatus === 'fulfilled') {
        const delivery = res.payload?.data?.delivery;
        if (delivery && delivery.failed > 0 && delivery.sent === 0) {
          const errCode = delivery.errorCodes?.length ? ` (${delivery.errorCodes.join(', ')})` : '';
          message.warning(
            t(
              'notifications.testPushFailed',
              `Notification saved to inbox, but browser push failed${errCode}. Please toggle push off and on to refresh your device registration.`
            )
          );
        } else if (delivery && delivery.skipped) {
          message.info(
            t(
              'notifications.testPushSkipped',
              'Notification saved to inbox. Browser push was skipped (no registered device tokens).'
            )
          );
        } else {
          message.success(t('notifications.testSentSuccess', 'Test notification dispatched and push delivered successfully!'));
        }
        setTestModalOpen(false);
        form.resetFields();
      } else {
        message.error(res.payload || 'Failed to dispatch test notification.');
      }
    } catch {
      // Form validation errors handled by Ant Design
    }
  };

  const filteredItems = activeTab === 'UNREAD' ? items.filter((n) => !n.isRead) : items;

  return (
    <div
      style={{
        width: 360,
        maxWidth: '90vw',
        background: semantic.bgSurface,
        borderRadius: 8,
      }}
    >
      {/* 1. Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: `1px solid ${semantic.borderSubtle}`,
        }}
      >
        <Space align="center" size={8}>
          <BellOutlined style={{ fontSize: 16, color: brandTokens.teal }} />
          <Text strong style={{ fontSize: 14, color: semantic.textPrimary }}>
            {t('notifications.title', 'Notifications')}
          </Text>
          {unreadCount > 0 && (
            <Badge
              count={unreadCount}
              style={{
                backgroundColor: brandTokens.teal,
                boxShadow: 'none',
                fontSize: 11,
              }}
            />
          )}
        </Space>

        <Space size={4}>
          <Tooltip title={t('common.refresh', 'Refresh')}>
            <Button
              type="text"
              size="small"
              icon={<ReloadOutlined style={{ fontSize: 13 }} />}
              onClick={() => {
                dispatch(fetchNotifications({ page: 1, limit: 20 }));
                dispatch(fetchUnreadCount());
              }}
              aria-label="Refresh notifications"
            />
          </Tooltip>

          {unreadCount > 0 && (
            <Tooltip title={t('notifications.markAllAsRead', 'Mark all as read')}>
              <Button
                type="text"
                size="small"
                icon={<CheckOutlined style={{ fontSize: 13, color: brandTokens.teal }} />}
                onClick={handleMarkAllRead}
                aria-label="Mark all as read"
              />
            </Tooltip>
          )}

          {user?.role === 'SUPER_ADMIN' && (
            <Tooltip title={t('notifications.testSend', 'Send Test Notification')}>
              <Button
                type="text"
                size="small"
                icon={<SendOutlined style={{ fontSize: 13, color: brandTokens.amber }} />}
                onClick={() => setTestModalOpen(true)}
                aria-label="Send test notification"
              />
            </Tooltip>
          )}
        </Space>
      </div>

      {/* 2. Push Status Bar / User Control */}
      <div
        style={{
          padding: '8px 16px',
          background: isDarkMode ? '#10222d' : '#f5fbfc',
          borderBottom: `1px solid ${semantic.borderSubtle}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12,
        }}
      >
        <Space size={6} align="center">
          <NotificationOutlined style={{ fontSize: 13, color: brandTokens.teal }} />
          <Text style={{ fontSize: 12, color: semantic.textSecondary }}>
            {pushPermission === 'denied'
              ? t('notifications.pushBlocked', 'Push blocked in browser')
              : pushEnabled
              ? t('notifications.pushEnabled', 'Push Active')
              : t('notifications.pushDisabled', 'Push Inactive')}
          </Text>
        </Space>

        {pushPermission !== 'denied' && (
          <Button
            type={pushEnabled ? 'default' : 'primary'}
            size="small"
            loading={actionLoading}
            onClick={handleTogglePush}
            style={{
              fontSize: 11,
              height: 24,
              padding: '0 8px',
              backgroundColor: pushEnabled ? undefined : brandTokens.navy,
              borderColor: pushEnabled ? semantic.borderDefault : brandTokens.navy,
            }}
          >
            {pushEnabled
              ? t('common.disable', 'Disable')
              : t('notifications.enablePush', 'Enable Push')}
          </Button>
        )}
      </div>

      {/* 3. Filter tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: `1px solid ${semantic.borderSubtle}`,
          padding: '4px 16px',
          gap: 12,
        }}
      >
        <Button
          type="text"
          size="small"
          role="tab"
          aria-selected={activeTab === 'ALL'}
          onClick={() => setActiveTab('ALL')}
          style={{
            fontWeight: activeTab === 'ALL' ? 600 : 400,
            color: activeTab === 'ALL' ? brandTokens.teal : semantic.textSecondary,
            borderBottom: activeTab === 'ALL' ? `2px solid ${brandTokens.teal}` : 'none',
            borderRadius: 0,
            padding: '4px 2px',
            height: 'auto',
          }}
        >
          {t('notifications.filterAll', 'All')} ({items.length})
        </Button>
        <Button
          type="text"
          size="small"
          role="tab"
          aria-selected={activeTab === 'UNREAD'}
          onClick={() => setActiveTab('UNREAD')}
          style={{
            fontWeight: activeTab === 'UNREAD' ? 600 : 400,
            color: activeTab === 'UNREAD' ? brandTokens.teal : semantic.textSecondary,
            borderBottom: activeTab === 'UNREAD' ? `2px solid ${brandTokens.teal}` : 'none',
            borderRadius: 0,
            padding: '4px 2px',
            height: 'auto',
          }}
        >
          {t('notifications.filterUnread', 'Unread')} ({unreadCount})
        </Button>
      </div>

      {/* 4. Notification List Content */}
      <div
        className="rt-notification-list-scroll"
        style={{
          maxHeight: 380,
          minHeight: 120,
          overflowY: 'auto',
          padding: '6px 8px',
        }}
      >
        {loading && items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 0' }}>
            <Spin size="small" />
          </div>
        ) : error ? (
          <div style={{ padding: 12 }}>
            <Alert
              type="error"
              showIcon
              message={t('notifications.loadError', 'Failed to load notifications')}
              description={error}
              action={
                <Button
                  size="small"
                  type="text"
                  onClick={() => dispatch(fetchNotifications({ page: 1, limit: 20 }))}
                >
                  {t('notifications.retry', 'Retry')}
                </Button>
              }
            />
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center' }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span style={{ color: semantic.textSecondary, fontSize: 12 }}>
                  {activeTab === 'UNREAD'
                    ? t('notifications.noUnread', 'No unread notifications')
                    : t('notifications.noNotifications', 'No notifications yet')}
                </span>
              }
            />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filteredItems.map((item) => {
              const tagColor = CATEGORY_COLORS[item.category] || 'default';
              const hasDeepLink = Boolean(validateDeepLink(item.deepLinkUrl));

              return (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 6,
                    background: item.isRead
                      ? 'transparent'
                      : isDarkMode
                      ? 'rgba(79, 168, 192, 0.08)'
                      : '#edf8fa',
                    borderLeft: item.isRead
                      ? `3px solid transparent`
                      : `3px solid ${brandTokens.teal}`,
                    cursor: hasDeepLink ? 'pointer' : 'default',
                    transition: 'background 0.15s ease',
                  }}
                  className="rt-notification-item"
                >
                  {/* Top line: Category Tag & Relative Time */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 4,
                    }}
                  >
                    <Space size={6} align="center">
                      <Tag
                        color={tagColor}
                        style={{
                          margin: 0,
                          fontSize: 10,
                          lineHeight: '18px',
                          padding: '0 6px',
                          textTransform: 'uppercase',
                        }}
                      >
                        {item.category || 'GENERAL'}
                      </Tag>
                      {!item.isRead && (
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: brandTokens.teal,
                            display: 'inline-block',
                          }}
                        />
                      )}
                    </Space>

                    <Space size={6} align="center">
                      <span style={{ fontSize: 11, color: semantic.textSecondary }}>
                        {formatRelativeTime(item.createdAt)}
                      </span>
                      {!item.isRead && (
                        <Tooltip title={t('notifications.markAsRead', 'Mark as read')}>
                          <Button
                            type="text"
                            size="small"
                            shape="circle"
                            style={{ width: 20, height: 20, padding: 0 }}
                            icon={<CheckOutlined style={{ fontSize: 11, color: semantic.textSecondary }} />}
                            onClick={(e) => handleMarkOneRead(item.id, e)}
                            aria-label="Mark read"
                          />
                        </Tooltip>
                      )}
                    </Space>
                  </div>

                  {/* Notification Title */}
                  <div
                    style={{
                      fontWeight: item.isRead ? 500 : 600,
                      fontSize: 13,
                      color: semantic.textPrimary,
                      lineHeight: '18px',
                      marginBottom: 3,
                    }}
                  >
                    {item.title}
                  </div>

                  {/* Notification Body */}
                  <div
                    style={{
                      fontSize: 12,
                      color: semantic.textSecondary,
                      lineHeight: '17px',
                      wordBreak: 'break-word',
                    }}
                  >
                    {item.body}
                  </div>

                  {/* Deep Link Prompt */}
                  {hasDeepLink && (
                    <div
                      style={{
                        marginTop: 6,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 11,
                        color: brandTokens.teal,
                        fontWeight: 500,
                      }}
                    >
                      <LinkOutlined style={{ fontSize: 11 }} />
                      <span>{t('notifications.viewDetails', 'View Details')}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Modal for Super Admin Test Push Dispatch */}
      {user?.role === 'SUPER_ADMIN' && (
        <Modal
          title={
            <Space>
              <SendOutlined style={{ color: brandTokens.amber }} />
              <span>{t('notifications.testSend', 'Send Test Notification')}</span>
            </Space>
          }
          open={testModalOpen}
          onCancel={() => {
            setTestModalOpen(false);
            form.resetFields();
          }}
          onOk={() => form.submit()}
          okText={t('common.send', 'Send')}
          cancelText={t('common.cancel', 'Cancel')}
          confirmLoading={actionLoading}
          destroyOnHidden
          width={440}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSendTestNotification}
            initialValues={{
              category: 'SYSTEM',
              title: 'System Test Notification',
              body: 'This is a test notification dispatched from the Admin Portal.',
              deepLinkUrl: '/admin',
            }}
          >
            <Form.Item
              name="title"
              label={t('notifications.title', 'Title')}
              rules={[{ required: true, message: t('notifications.titleRequired', 'Title is required') }]}
            >
              <Input placeholder="Notification headline" maxLength={150} />
            </Form.Item>

            <Form.Item
              name="body"
              label={t('notifications.body', 'Body')}
              rules={[{ required: true, message: t('notifications.bodyRequired', 'Body is required') }]}
            >
              <Input.TextArea rows={3} placeholder="Notification content description" maxLength={500} />
            </Form.Item>

            <Form.Item name="category" label={t('notifications.category', 'Category')}>
              <Select
                options={[
                  { value: 'SYSTEM', label: 'SYSTEM' },
                  { value: 'SECURITY', label: 'SECURITY' },
                  { value: 'BILLING', label: 'BILLING' },
                  { value: 'APPLICATION', label: 'APPLICATION' },
                  { value: 'GENERAL', label: 'GENERAL' },
                ]}
              />
            </Form.Item>

            <Form.Item
              name="deepLinkUrl"
              label={t('notifications.deepLinkUrl', 'Deep Link Path (optional)')}
              extra="Must be a trusted internal path (e.g. /admin/jobs, /admin/companies)"
            >
              <Input placeholder="/admin" />
            </Form.Item>
          </Form>
        </Modal>
      )}
    </div>
  );
}
