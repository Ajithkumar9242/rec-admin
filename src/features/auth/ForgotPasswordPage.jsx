import React, { useState } from 'react';
import { Form, Input, Button, Typography, Alert, Space } from 'antd';
import { MailOutlined, ArrowLeftOutlined, CheckCircleOutlined, LockOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../services/api.js';
import { brandTokens } from '../../theme/tokens.js';

const { Title, Paragraph } = Typography;

export function ForgotPasswordPage() {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const { t } = useTranslation();

  const handleSubmit = async (values) => {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await api.post('/auth/forgot-password', { email: values.email });
      setSubmitted(true);
    } catch (error) {
      setErrorMessage(error.response?.data?.error || t('auth.networkError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            backgroundColor: '#eaf5f8',
            color: brandTokens.navy,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            marginBottom: 12,
          }}
        >
          <LockOutlined />
        </div>
        <Title level={3} style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>
          {t('forgotPassword.title')}
        </Title>
        <Paragraph type="secondary" style={{ marginTop: 6, fontSize: 13 }}>
          {t('forgotPassword.subtitle')}
        </Paragraph>
      </div>

      {submitted ? (
        <div>
          <Alert
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            message={t('forgotPassword.successAlert')}
            style={{ marginBottom: 24, borderRadius: 8, fontSize: 13 }}
          />

          <Link to="/login" style={{ textDecoration: 'none' }}>
            <Button type="primary" size="large" block style={{ height: 44, fontWeight: 600 }}>
              {t('forgotPassword.backToSignIn')}
            </Button>
          </Link>
        </div>
      ) : (
        <div>
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
                style={{ height: 44 }}
                autoFocus
              />
            </Form.Item>

            <Form.Item style={{ marginTop: 24, marginBottom: 16 }}>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={submitting}
                disabled={submitting}
                style={{ height: 44, fontWeight: 600 }}
              >
                {submitting ? t('forgotPassword.submitting') : t('forgotPassword.submitButton')}
              </Button>
            </Form.Item>

            <div style={{ textAlign: 'center' }}>
              <Link to="/login" style={{ fontSize: 13, color: brandTokens.teal }}>
                <Space>
                  <ArrowLeftOutlined />
                  <span>{t('forgotPassword.backToSignIn')}</span>
                </Space>
              </Link>
            </div>
          </Form>
        </div>
      )}
    </div>
  );
}
