import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Typography, Alert, Space } from 'antd';
import { MailOutlined, LockOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  loginUser,
  clearAuthError,
  AuthState,
  resetAuthState,
} from '../../store/authSlice.js';
import { TwoFactorVerifyStep } from './TwoFactorVerifyStep.jsx';
import { BackupCodeVerifyStep } from './BackupCodeVerifyStep.jsx';
import { MFAEnrollStep } from './MFAEnrollStep.jsx';
import { brandTokens } from '../../theme/tokens.js';

const { Title, Paragraph, Text } = Typography;

export function LoginPage() {
  const [form] = Form.useForm();
  const [activeStep, setActiveStep] = useState('credentials'); // 'credentials' | 'totp' | 'backup_code' | 'enroll'
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const { isAuthenticated, authState, loading, error, pendingAdminId } = useSelector(
    (state) => state.auth
  );

  // If already authenticated, redirect to destination or /admin
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/admin';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // Handle authState transitions from login response
  useEffect(() => {
    if (authState === AuthState.PASSWORD_ACCEPTED_MFA_PENDING) {
      setActiveStep('totp');
    } else if (authState === AuthState.MFA_ENROLLMENT_REQUIRED) {
      setActiveStep('enroll');
    } else if (authState === AuthState.UNAUTHENTICATED) {
      setActiveStep('credentials');
    }
  }, [authState]);

  // Clean errors when component unmounts
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

  const handleEnrollComplete = () => {
    navigate('/admin', { replace: true });
  };

  if (activeStep === 'totp') {
    return (
      <TwoFactorVerifyStep
        adminId={pendingAdminId}
        onSwitchToBackupCode={() => setActiveStep('backup_code')}
      />
    );
  }

  if (activeStep === 'backup_code') {
    return (
      <BackupCodeVerifyStep
        adminId={pendingAdminId}
        onSwitchToTotp={() => setActiveStep('totp')}
      />
    );
  }

  if (activeStep === 'enroll') {
    return <MFAEnrollStep onComplete={handleEnrollComplete} />;
  }

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            backgroundColor: brandTokens.navy,
            color: brandTokens.teal,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            marginBottom: 12,
            boxShadow: '0 4px 12px rgba(22, 49, 63, 0.18)',
          }}
        >
          <SafetyCertificateOutlined />
        </div>
        <Title level={3} style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>
          {t('auth.signInTitle')}
        </Title>
        <Paragraph type="secondary" style={{ marginTop: 6, fontSize: 13 }}>
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
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
              }}
            >
              <span>{t('auth.passwordLabel')}</span>
              <Link
                to="/forgot-password"
                style={{
                  fontSize: 12,
                  color: brandTokens.teal,
                  fontWeight: 500,
                  marginLeft: 'auto',
                  whiteSpace: 'nowrap',
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
              height: 44,
            }}
          >
            {loading ? t('auth.signingIn') : t('auth.signInButton')}
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
