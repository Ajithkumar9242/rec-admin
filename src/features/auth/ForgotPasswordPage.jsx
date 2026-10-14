import React, { useState } from 'react';
import { Form, Input, Button, Typography, Alert, Space } from 'antd';
import { MailOutlined, ArrowLeftOutlined, CheckCircleOutlined } from '@ant-design/icons';
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
      // In case of network error or rate limit
      setErrorMessage(error.response?.data?.error || t('auth.networkError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
          {t('forgotPassword.title')}
        </Title>
        <Paragraph type="secondary" style={{ marginTop: 8, fontSize: 13 }}>
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
            style={{ marginBottom: 24, borderRadius: 8 }}
          />

          <Link to="/login" style={{ textDecoration: 'none' }}>
            <Button type="primary" size="large" block>
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
