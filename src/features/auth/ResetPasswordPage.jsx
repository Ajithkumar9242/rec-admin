import React, { useState } from 'react';
import { Form, Input, Button, Typography, Alert, Result } from 'antd';
import { LockOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../services/api.js';
import { brandTokens } from '../../theme/tokens.js';

const { Title, Paragraph } = Typography;

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const { t } = useTranslation();

  const handleSubmit = async (values) => {
    if (!token) {
      setErrorMessage(t('resetPassword.invalidToken'));
      return;
    }

    if (values.password !== values.confirmPassword) {
      setErrorMessage(t('resetPassword.passwordMismatch'));
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      await api.post('/auth/reset-password', {
        token,
        password: values.password,
      });
      setSuccess(true);
    } catch (error) {
      setErrorMessage(error.response?.data?.error || t('resetPassword.invalidToken'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div style={{ textAlign: 'center' }}>
        <Alert
          message={t('resetPassword.invalidToken')}
          type="error"
          showIcon
          style={{ marginBottom: 24, borderRadius: 8 }}
        />
        <Link to="/login">
          <Button type="primary" size="large">
            {t('resetPassword.goToSignIn')}
          </Button>
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <Result
        status="success"
        title={t('resetPassword.successTitle')}
        subTitle={t('resetPassword.successMessage')}
        extra={[
          <Link to="/login" key="signin">
            <Button type="primary" size="large" block>
              {t('resetPassword.goToSignIn')}
            </Button>
          </Link>,
        ]}
      />
    );
  }

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
          {t('resetPassword.title')}
        </Title>
        <Paragraph type="secondary" style={{ marginTop: 8, fontSize: 13 }}>
          {t('resetPassword.subtitle')}
        </Paragraph>
      </div>

      {errorMessage && (
        <Alert
          message={errorMessage}
          type="error"
          showIcon
          closable
          onClose={() => setErrorMessage(null)}
          style={{ marginBottom: 20, borderRadius: 8 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        requiredMark={false}
      >
        <Form.Item
          name="password"
          label={t('resetPassword.newPasswordLabel')}
          rules={[
            { required: true, message: t('validation.passwordRequired') },
            { min: 8, message: t('validation.passwordMinLength') },
            {
              pattern: /[0-9]/,
              message: 'Must contain at least one numeric character',
            },
            {
              pattern: /[^A-Za-z0-9]/,
              message: 'Must contain at least one special character',
            },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: brandTokens.muted }} />}
            placeholder={t('resetPassword.newPasswordPlaceholder')}
            size="large"
            autoFocus
          />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label={t('resetPassword.confirmPasswordLabel')}
          dependencies={['password']}
          rules={[
            { required: true, message: t('validation.passwordRequired') },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error(t('resetPassword.passwordMismatch')));
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: brandTokens.muted }} />}
            placeholder={t('resetPassword.confirmPasswordPlaceholder')}
            size="large"
          />
        </Form.Item>

        <Form.Item style={{ marginTop: 24 }}>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={submitting}
            disabled={submitting}
          >
            {submitting ? t('resetPassword.updating') : t('resetPassword.submitButton')}
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
