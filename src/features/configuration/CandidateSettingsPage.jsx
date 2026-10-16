import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Form,
  Select,
  Switch,
  Button,
  message,
  Typography,
  Space,
  Alert,
  Divider,
  Tag,
  Spin,
} from 'antd';
import {
  UserOutlined,
  SaveOutlined,
  LockOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { configurationApi, formatConfigurationError } from '../../services/configurationApi.js';
import { brandTokens } from '../../theme/tokens.js';

const { Title, Text, Paragraph } = Typography;

const RESUME_PRESETS = [
  '.pdf',
  'application/pdf',
  '.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc',
  'application/msword',
  '.rtf',
  '.txt',
];

export function CandidateSettingsPage() {
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
          acceptedResumeFileTypes: res.data.acceptedResumeFileTypes || ['.pdf'],
          autoApproveCandidateProfiles: res.data.autoApproveCandidateProfiles || false,
          showEmployerContactDetails: res.data.showEmployerContactDetails || false,
        });
      }
    } catch (err) {
      setError(formatConfigurationError(err, 'Failed to fetch candidate settings.'));
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
      await configurationApi.updateCandidateSettings(values);
      message.success(t('configuration.common.saveSuccess'));
      await fetchSettings();
    } catch (err) {
      message.error(formatConfigurationError(err, 'Failed to save candidate settings.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 840, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ color: brandTokens.navy, marginBottom: 4 }}>
          {t('configuration.candidateSettings.title')}
        </Title>
        <Paragraph type="secondary" style={{ marginBottom: 0 }}>
          {t('configuration.candidateSettings.subtitle')}
        </Paragraph>
      </div>

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
            {/* Accepted Resume File Types */}
            <Form.Item
              name="acceptedResumeFileTypes"
              label={
                <Text strong style={{ fontSize: 14 }}>
                  {t('configuration.candidateSettings.resumeTypesLabel')}
                </Text>
              }
              extra={t('configuration.candidateSettings.resumeTypesHelp')}
              rules={[
                { required: true, message: 'At least one accepted resume file type is required' },
              ]}
            >
              <Select
                mode="tags"
                placeholder="Select or enter allowed extensions/MIME types"
                style={{ width: '100%' }}
              >
                {RESUME_PRESETS.map((type) => (
                  <Select.Option key={type} value={type}>
                    {type}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Divider style={{ margin: '20px 0' }} />

            {/* Auto-Approve Candidate Profiles */}
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
                  {t('configuration.candidateSettings.autoApproveLabel')}
                </Text>
                <div style={{ fontSize: 13, color: '#5c7480', marginTop: 4 }}>
                  {t('configuration.candidateSettings.autoApproveHelp')}
                </div>
              </div>
              <Form.Item
                name="autoApproveCandidateProfiles"
                valuePropName="checked"
                noStyle
              >
                <Switch />
              </Form.Item>
            </div>

            <Divider style={{ margin: '20px 0' }} />

            {/* Show Employer Contact Details */}
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
                  {t('configuration.candidateSettings.showEmployerContactLabel')}
                </Text>
                <div style={{ fontSize: 13, color: '#5c7480', marginTop: 4 }}>
                  {t('configuration.candidateSettings.showEmployerContactHelp')}
                </div>
              </div>
              <Form.Item
                name="showEmployerContactDetails"
                valuePropName="checked"
                noStyle
              >
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
                {t('configuration.candidateSettings.saveButton')}
              </Button>
            </div>
          </Form>
        </Spin>
      </Card>
    </div>
  );
}
