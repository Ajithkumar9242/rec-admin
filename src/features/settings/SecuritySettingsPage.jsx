import React, { useState } from 'react';
import {
  Card,
  Typography,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Alert,
  Divider,
  message,
  Row,
  Col,
} from 'antd';
import {
  SafetyCertificateOutlined,
  QrcodeOutlined,
  KeyOutlined,
  CopyOutlined,
  DownloadOutlined,
  ReloadOutlined,
  LockOutlined,
  UserOutlined,
  MailOutlined,
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import api from '../../services/api.js';
import { updateUserSecurityState } from '../../store/authSlice.js';
import { brandTokens } from '../../theme/tokens.js';

const { Title, Paragraph, Text } = Typography;

export function SecuritySettingsPage() {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const { t } = useTranslation();

  // 2FA Enrollment State
  const [enrollModalVisible, setEnrollModalVisible] = useState(false);
  const [enrollData, setEnrollData] = useState(null); // { secret, qrCodeUrl }
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [enrollError, setEnrollError] = useState(null);
  const [enrollForm] = Form.useForm();

  // Backup Codes Modal State (displayed after setup or regenerate)
  const [backupCodesModalVisible, setBackupCodesModalVisible] = useState(false);
  const [backupCodes, setBackupCodes] = useState([]);

  // Regenerate Backup Codes State
  const [regenModalVisible, setRegenModalVisible] = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);
  const [regenError, setRegenError] = useState(null);
  const [regenForm] = Form.useForm();

  // Profile Update State
  const [profileForm] = Form.useForm();
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);

  // Change Password State
  const [pwdForm] = Form.useForm();
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState(null);

  // Update Profile (Name & Email Identifier)
  const handleUpdateProfile = async (values) => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const res = await api.patch('/admin/profile', {
        name: values.name,
        email: values.email,
        currentPassword: values.currentPassword,
      });
      dispatch(updateUserSecurityState(res.data.user));
      profileForm.setFieldsValue({ currentPassword: '' });
      message.success(t('profile.updateSuccess'));
    } catch (err) {
      setProfileError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  // Change Password
  const handleChangePassword = async (values) => {
    setPwdLoading(true);
    setPwdError(null);
    try {
      await api.post('/admin/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      pwdForm.resetFields();
      message.success(t('profile.changePasswordSuccess'));
    } catch (err) {
      setPwdError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setPwdLoading(false);
    }
  };

  // Start 2FA Setup
  const handleStartEnrollment = async () => {
    setEnrollLoading(true);
    setEnrollError(null);
    try {
      const res = await api.post('/auth/2fa/setup');
      setEnrollData(res.data);
      setEnrollModalVisible(true);
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to start 2FA setup');
    } finally {
      setEnrollLoading(false);
    }
  };

  // Confirm 2FA Setup
  const handleConfirmEnrollment = async (values) => {
    setEnrollLoading(true);
    setEnrollError(null);
    try {
      const res = await api.post('/auth/2fa/confirm', { code: values.code });
      dispatch(
        updateUserSecurityState({
          totpEnabled: true,
          remainingBackupCodes: res.data.backupCodes?.length || 10,
        })
      );
      setEnrollModalVisible(false);
      enrollForm.resetFields();
      setBackupCodes(res.data.backupCodes || []);
      setBackupCodesModalVisible(true);
      message.success(t('twoFactor.enableSuccess'));
    } catch (err) {
      setEnrollError(err.response?.data?.error || t('twoFactor.invalidCode'));
    } finally {
      setEnrollLoading(false);
    }
  };

  // Regenerate Backup Codes
  const handleRegenerateCodes = async (values) => {
    setRegenLoading(true);
    setRegenError(null);
    try {
      const res = await api.post('/auth/backup-codes/regenerate', {
        password: values.password,
      });
      dispatch(
        updateUserSecurityState({
          remainingBackupCodes: res.data.backupCodes?.length || 10,
        })
      );
      setRegenModalVisible(false);
      regenForm.resetFields();
      setBackupCodes(res.data.backupCodes || []);
      setBackupCodesModalVisible(true);
      message.success(t('twoFactor.regenerateSuccess'));
    } catch (err) {
      setRegenError(err.response?.data?.error || 'Failed to regenerate backup codes');
    } finally {
      setRegenLoading(false);
    }
  };

  // Copy Backup Codes
  const handleCopyCodes = () => {
    const text = backupCodes.join('\n');
    navigator.clipboard.writeText(text);
    message.success(t('common.copied'));
  };

  // Download Backup Codes as Text File
  const handleDownloadCodes = () => {
    const text = `RecruiTrain Admin Backup Codes\nGenerated: ${new Date().toISOString()}\nAccount: ${user?.email}\n\n` + backupCodes.join('\n') + '\n\nNote: Each code is single-use.';
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `recruitrain-backup-codes-${user?.email}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, fontSize: 24 }}>
          {t('shell.securitySettings')}
        </Title>
        <Paragraph type="secondary">
          Manage administrator multi-factor authentication and access credentials.
        </Paragraph>
      </div>

      <Card
        title={
          <Space>
            <SafetyCertificateOutlined style={{ color: brandTokens.navy }} />
            <span>{t('twoFactor.title')}</span>
          </Space>
        }
        extra={
          user?.totpEnabled ? (
            <Tag color="success" style={{ padding: '2px 8px', fontWeight: 600 }}>
              ACTIVE
            </Tag>
          ) : (
            <Tag color="warning" style={{ padding: '2px 8px', fontWeight: 600 }}>
              NOT CONFIGURED
            </Tag>
          )
        }
        style={{ borderRadius: 12, marginBottom: 24 }}
      >
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} md={16}>
            <Paragraph style={{ margin: 0 }}>
              {user?.totpEnabled
                ? 'Two-Factor Authentication is currently securing your account with TOTP (Google Authenticator / 1Password).'
                : 'Protect your account from unauthorized access by requiring a 6-digit TOTP code in addition to your password.'}
            </Paragraph>

            {user?.totpEnabled && (
              <div style={{ marginTop: 12 }}>
                <Text type="secondary">
                  {t('twoFactor.backupCodesRemaining', {
                    count: user?.remainingBackupCodes ?? 0,
                  })}
                </Text>
              </div>
            )}
          </Col>

          <Col xs={24} md={8} style={{ textAlign: 'right' }}>
            {user?.totpEnabled ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => setRegenModalVisible(true)}
                  block
                >
                  {t('twoFactor.regenerateBackupCodes')}
                </Button>
                <Button
                  type="default"
                  icon={<QrcodeOutlined />}
                  onClick={handleStartEnrollment}
                  block
                >
                  Reconfigure Authenticator
                </Button>
              </Space>
            ) : (
              <Button
                type="primary"
                size="large"
                icon={<QrcodeOutlined />}
                onClick={handleStartEnrollment}
                loading={enrollLoading}
                block
              >
                {t('twoFactor.enrollTitle')}
              </Button>
            )}
          </Col>
        </Row>
      </Card>

      {/* Administrator Profile & Login Identifier Card */}
      <Card
        title={
          <Space>
            <UserOutlined style={{ color: brandTokens.navy }} />
            <span>{t('profile.title')}</span>
          </Space>
        }
        style={{ borderRadius: 12, marginBottom: 24 }}
      >
        <Paragraph type="secondary" style={{ marginBottom: 20 }}>
          {t('profile.subtitle')}
        </Paragraph>

        {profileError && (
          <Alert
            message={profileError}
            type="error"
            showIcon
            closable
            onClose={() => setProfileError(null)}
            style={{ marginBottom: 16, borderRadius: 8 }}
          />
        )}

        <Form
          form={profileForm}
          layout="vertical"
          onFinish={handleUpdateProfile}
          initialValues={{
            name: user?.name,
            email: user?.email,
          }}
        >
          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="name"
                label={t('profile.nameLabel')}
                rules={[{ required: true, message: t('profile.namePlaceholder') }]}
              >
                <Input
                  prefix={<UserOutlined style={{ color: brandTokens.muted }} />}
                  placeholder={t('profile.namePlaceholder')}
                  size="large"
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="email"
                label={t('profile.emailLabel')}
                rules={[
                  { required: true, message: t('validation.emailRequired') },
                  { type: 'email', message: t('validation.emailInvalid') },
                ]}
              >
                <Input
                  prefix={<MailOutlined style={{ color: brandTokens.muted }} />}
                  placeholder="admin@company.com"
                  size="large"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="currentPassword"
            label={t('profile.currentPasswordPrompt')}
            rules={[{ required: true, message: t('validation.passwordRequired') }]}
            style={{ maxWidth: 400 }}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: brandTokens.muted }} />}
              placeholder={t('profile.currentPasswordPlaceholder')}
              size="large"
            />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            size="large"
            loading={profileLoading}
            style={{ fontWeight: 600 }}
          >
            {t('profile.updateButton')}
          </Button>
        </Form>
      </Card>

      {/* Change Password Card */}
      <Card
        title={
          <Space>
            <LockOutlined style={{ color: brandTokens.navy }} />
            <span>{t('profile.changePasswordTitle')}</span>
          </Space>
        }
        style={{ borderRadius: 12, marginBottom: 24 }}
      >
        {pwdError && (
          <Alert
            message={pwdError}
            type="error"
            showIcon
            closable
            onClose={() => setPwdError(null)}
            style={{ marginBottom: 16, borderRadius: 8 }}
          />
        )}

        <Form
          form={pwdForm}
          layout="vertical"
          onFinish={handleChangePassword}
          style={{ maxWidth: 480 }}
        >
          <Form.Item
            name="currentPassword"
            label={t('profile.currentPasswordLabel')}
            rules={[{ required: true, message: t('validation.passwordRequired') }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: brandTokens.muted }} />}
              placeholder={t('profile.currentPasswordPlaceholder')}
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="newPassword"
            label={t('profile.newPasswordLabel')}
            rules={[
              { required: true, message: t('validation.passwordRequired') },
              { min: 8, message: t('validation.passwordMinLength') },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: brandTokens.muted }} />}
              placeholder={t('profile.newPasswordPlaceholder')}
              size="large"
            />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            size="large"
            loading={pwdLoading}
            style={{ fontWeight: 600 }}
          >
            {t('profile.changePasswordButton')}
          </Button>
        </Form>
      </Card>

      {/* 2FA Enrollment Modal */}
      <Modal
        title={t('twoFactor.enrollTitle')}
        open={enrollModalVisible}
        onCancel={() => {
          setEnrollModalVisible(false);
          enrollForm.resetFields();
        }}
        footer={null}
        destroyOnClose
        centered
        width={480}
      >
        <Paragraph type="secondary" style={{ marginTop: 8 }}>
          {t('twoFactor.enrollSubtitle')}
        </Paragraph>

        {enrollError && (
          <Alert
            message={enrollError}
            type="error"
            showIcon
            style={{ marginBottom: 16, borderRadius: 8 }}
          />
        )}

        {enrollData && (
          <div style={{ textAlign: 'center', margin: '20px 0' }}>
            <Paragraph strong>{t('twoFactor.scanQr')}</Paragraph>
            <div
              style={{
                display: 'inline-block',
                padding: 12,
                backgroundColor: '#ffffff',
                border: `1px solid ${brandTokens.border}`,
                borderRadius: 8,
              }}
            >
              <img
                src={enrollData.qrCodeUrl}
                alt="2FA QR Code"
                style={{ width: 190, height: 190, display: 'block' }}
              />
            </div>

            <div style={{ marginTop: 16 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t('twoFactor.manualSecret')}
              </Text>
              <div
                style={{
                  fontFamily: 'monospace',
                  letterSpacing: '0.15em',
                  fontWeight: 600,
                  fontSize: 14,
                  backgroundColor: '#f3fafb',
                  padding: '6px 12px',
                  borderRadius: 6,
                  margin: '6px auto',
                  display: 'inline-block',
                }}
              >
                {enrollData.secret}
              </div>
            </div>
          </div>
        )}

        <Divider />

        <Form form={enrollForm} layout="vertical" onFinish={handleConfirmEnrollment}>
          <Form.Item
            name="code"
            label={t('twoFactor.enterCodeToConfirm')}
            rules={[
              { required: true, message: t('validation.codeRequired') },
              { pattern: /^\d{6}$/, message: t('validation.codeDigits') },
            ]}
          >
            <Input
              size="large"
              maxLength={6}
              placeholder="000000"
              style={{
                textAlign: 'center',
                letterSpacing: '0.4em',
                fontSize: 20,
                fontWeight: 600,
              }}
              autoFocus
            />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={enrollLoading}
          >
            {t('common.continue')}
          </Button>
        </Form>
      </Modal>

      {/* Backup Codes Display Modal (after 2FA setup or regeneration) */}
      <Modal
        title={
          <Space>
            <KeyOutlined style={{ color: brandTokens.amber }} />
            <span>{t('twoFactor.backupCodesTitle')}</span>
          </Space>
        }
        open={backupCodesModalVisible}
        onCancel={() => setBackupCodesModalVisible(false)}
        footer={[
          <Button key="copy" icon={<CopyOutlined />} onClick={handleCopyCodes}>
            {t('common.copy')}
          </Button>,
          <Button key="download" icon={<DownloadOutlined />} onClick={handleDownloadCodes}>
            {t('common.download')}
          </Button>,
          <Button
            key="done"
            type="primary"
            onClick={() => setBackupCodesModalVisible(false)}
          >
            Done
          </Button>,
        ]}
        centered
        width={500}
      >
        <Alert
          message={t('twoFactor.backupCodesWarning')}
          type="warning"
          showIcon
          style={{ marginBottom: 20, borderRadius: 8 }}
        />

        <div
          style={{
            backgroundColor: '#f3fafb',
            border: `1px solid ${brandTokens.border}`,
            borderRadius: 8,
            padding: '16px 20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px 24px',
          }}
        >
          {backupCodes.map((code, idx) => (
            <div
              key={idx}
              style={{
                fontFamily: 'monospace',
                fontWeight: 600,
                fontSize: 15,
                color: brandTokens.navy,
                letterSpacing: '0.1em',
              }}
            >
              {idx + 1}. {code}
            </div>
          ))}
        </div>
      </Modal>

      {/* Regenerate Backup Codes Password Confirmation Modal */}
      <Modal
        title={t('twoFactor.regenerateBackupCodes')}
        open={regenModalVisible}
        onCancel={() => {
          setRegenModalVisible(false);
          regenForm.resetFields();
        }}
        footer={null}
        destroyOnClose
        centered
      >
        <Paragraph type="secondary" style={{ marginTop: 8 }}>
          {t('twoFactor.regenerateConfirmPrompt')}
        </Paragraph>

        {regenError && (
          <Alert
            message={regenError}
            type="error"
            showIcon
            style={{ marginBottom: 16, borderRadius: 8 }}
          />
        )}

        <Form form={regenForm} layout="vertical" onFinish={handleRegenerateCodes}>
          <Form.Item
            name="password"
            label={t('auth.passwordLabel')}
            rules={[{ required: true, message: t('validation.passwordRequired') }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={t('auth.passwordPlaceholder')}
              size="large"
              autoFocus
            />
          </Form.Item>

          <Button
            type="primary"
            danger
            htmlType="submit"
            size="large"
            block
            loading={regenLoading}
          >
            {t('twoFactor.regenerateBackupCodes')}
          </Button>
        </Form>
      </Modal>
    </div>
  );
}
