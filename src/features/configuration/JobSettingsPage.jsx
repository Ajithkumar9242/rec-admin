import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Form,
  Switch,
  Button,
  message,
  Typography,
  Alert,
  Divider,
  Spin,
} from 'antd';
import {
  SolutionOutlined,
  SaveOutlined,
  LockOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { configurationApi, formatConfigurationError } from '../../services/configurationApi.js';
import { brandTokens } from '../../theme/tokens.js';

const { Title, Text, Paragraph } = Typography;

export function JobSettingsPage() {
  const { t } = useTranslation();
  const { user } = useSelector((state) => state.auth);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await configurationApi.getPlatformSettings();
      if (res.success && res.data) {
        form.setFieldsValue({
          autoApproveJobs: res.data.autoApproveJobs ?? false,
        });
      }
    } catch (err) {
      setError(formatConfigurationError(err, 'Failed to fetch job settings.'));
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async (values) => {
    try {
      setSaving(true);
      await configurationApi.updateJobSettings(values);
      message.success(t('configuration.common.saveSuccess'));
      await fetchSettings();
    } catch (err) {
      message.error(formatConfigurationError(err, 'Failed to save job settings.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 840, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ color: brandTokens.navy, marginBottom: 4 }}>
          {t('configuration.jobSettings.title')}
        </Title>
        <Paragraph type="secondary" style={{ marginBottom: 0 }}>
          {t('configuration.jobSettings.subtitle')}
        </Paragraph>
      </div>

      <Alert
        type="info"
        showIcon
        icon={<InfoCircleOutlined style={{ color: brandTokens.teal }} />}
        message={t('configuration.jobSettings.reviewNotice')}
        style={{ marginBottom: 20, borderRadius: 8, border: `1px solid ${brandTokens.teal}` }}
      />

      {!isSuperAdmin && (
        <Alert
          type="warning"
          showIcon
          icon={<LockOutlined />}
          message={t('configuration.common.superAdminOnlyNotice')}
          style={{ marginBottom: 20, borderRadius: 8 }}
        />
      )}

      {error && (
        <Alert
          type="error"
          showIcon
          message={error}
          style={{ marginBottom: 20, borderRadius: 8 }}
        />
      )}

      <Card
        style={{ borderRadius: 12, border: '1px solid #dce9ed' }}
        styles={{ body: { padding: 24 } }}
      >
        <Spin spinning={loading}>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSave}
            disabled={!isSuperAdmin}
          >
            {/* Automatic Job Approval */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 16,
                padding: '12px 0',
              }}
            >
              <div>
                <Text strong style={{ fontSize: 14 }}>
                  {t('configuration.jobSettings.autoApproveLabel')}
                </Text>
                <div style={{ fontSize: 13, color: '#5c7480', marginTop: 4 }}>
                  {t('configuration.jobSettings.autoApproveHelp')}
                </div>
              </div>
              <Form.Item name="autoApproveJobs" valuePropName="checked" noStyle>
                <Switch />
              </Form.Item>
            </div>

            <Divider style={{ margin: '24px 0 20px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={saving}
                disabled={!isSuperAdmin}
                style={{
                  backgroundColor: brandTokens.navy,
                  borderColor: brandTokens.navy,
                  padding: '0 24px',
                  height: 40,
                }}
              >
                {t('configuration.jobSettings.saveButton')}
              </Button>
            </div>
          </Form>
        </Spin>
      </Card>
    </div>
  );
}
