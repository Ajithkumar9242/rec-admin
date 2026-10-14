import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Typography, Alert, Space } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { loginUser, clearAuthError } from '../../store/authSlice.js';
import { TwoFactorVerifyStep } from './TwoFactorVerifyStep.jsx';
import { BackupCodeVerifyStep } from './BackupCodeVerifyStep.jsx';
import { brandTokens } from '../../theme/tokens.js';

const { Title, Paragraph, Text } = Typography;

export function LoginPage() {
  const [form] = Form.useForm();
  const [authStep, setAuthStep] = useState('credentials'); // 'credentials' | 'totp' | 'backup_code'
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const { isAuthenticated, pending2FA, loading, error } = useSelector((state) => state.auth);

  // If already authenticated, redirect to destination or /admin
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/admin';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // When 2FA is required after password check, shift step
  useEffect(() => {
    if (pending2FA.requires2FA) {
      setAuthStep('totp');
    } else {
      setAuthStep('credentials');
    }
  }, [pending2FA.requires2FA]);

  // Clear auth error when switching step or unmounting
  useEffect(() => {
    return () => {
      dispatch(clearAuthError());
    };
  }, [dispatch]);

  const handleSubmit = async (values) => {
    dispatch(clearAuthError());
    await dispatch(
      loginUser({
        email: values.email,
        password: values.password,
      })
    );
  };

  if (authStep === 'totp') {
    return <TwoFactorVerifyStep onSwitchToBackupCode={() => setAuthStep('backup_code')} />;
  }

  if (authStep === 'backup_code') {
    return <BackupCodeVerifyStep onSwitchToTotp={() => setAuthStep('totp')} />;
  }

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <Title level={3} style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
          {t('auth.signInTitle')}
        </Title>
        <Paragraph type="secondary" style={{ marginTop: 8, fontSize: 13 }}>
          {t('auth.signInSubtitle')}
        </Paragraph>
      </div>

      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          closable
          onClose={() => dispatch(clearAuthError())}
          style={{ marginBottom: 20, borderRadius: 8 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        requiredMark={false}
        autoComplete="on"
      >
        <Form.Item
          name="email"
          label={t('auth.emailLabel')}
          rules={[
            { required: true, message: t('validation.emailRequired') },
            { type: 'email', message: t('validation.emailInvalid') },
          ]}
        >
          <Input
            prefix={<MailOutlined style={{ color: brandTokens.muted }} />}
            placeholder={t('auth.emailPlaceholder')}
            size="large"
            autoComplete="username"
            autoFocus
          />
        </Form.Item>

        <Form.Item
          name="password"
          label={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <span>{t('auth.passwordLabel')}</span>
              <Link
                to="/forgot-password"
                style={{
                  fontSize: 12,
                  color: brandTokens.teal,
                  fontWeight: 500,
                  marginLeft: 'auto',
                }}
              >
                {t('auth.forgotPassword')}
              </Link>
            </div>
          }
          rules={[
            { required: true, message: t('validation.passwordRequired') },
            { min: 8, message: t('validation.passwordMinLength') },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: brandTokens.muted }} />}
            placeholder={t('auth.passwordPlaceholder')}
            size="large"
            autoComplete="current-password"
          />
        </Form.Item>

        <Form.Item style={{ marginTop: 28, marginBottom: 0 }}>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={loading}
            disabled={loading}
            style={{
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            {loading ? t('auth.signingIn') : t('auth.signInButton')}
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
