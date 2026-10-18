import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Typography, Alert, Result, Spin, Card, Space, Tag } from 'antd';
import { LockOutlined, CheckCircleOutlined, UserOutlined, BankOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { candidateApi } from '../../services/candidateApi.js';
import { brandTokens } from '../../theme/tokens.js';

const { Title, Paragraph, Text } = Typography;

export function CandidateActivationPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [form] = Form.useForm();
  const [verifying, setVerifying] = useState(true);
  const [invitationData, setInvitationData] = useState(null);
  const [verificationError, setVerificationError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [activated, setActivated] = useState(false);
  const [activationError, setActivationError] = useState(null);

  useEffect(() => {
    if (!token) {
      setVerifying(false);
      setVerificationError(t('activation.missingToken', 'No activation token was provided. Please use the link sent to your email.'));
      return;
    }

    let isMounted = true;
    const verifyToken = async () => {
      setVerifying(true);
      setVerificationError(null);
      try {
        const res = await candidateApi.verifyInvitation(token);
        if (isMounted) {
          if (res.valid && res.data) {
            setInvitationData(res.data);
            form.setFieldsValue({
              firstName: res.data.firstName || '',
              lastName: res.data.lastName || '',
            });
          } else {
            setVerificationError(res.error || t('activation.invalidToken', 'Invalid or expired invitation token.'));
          }
        }
      } catch (err) {
        if (isMounted) {
          const errMsg = err.response?.data?.error || t('activation.verificationFailed', 'This invitation link is invalid or has expired.');
          setVerificationError(errMsg);
        }
      } finally {
        if (isMounted) {
          setVerifying(false);
        }
      }
    };

    verifyToken();
    return () => {
      isMounted = false;
    };
  }, [token, t, form]);

  const handleSubmit = async (values) => {
    if (values.password !== values.confirmPassword) {
      setActivationError(t('resetPassword.passwordMismatch', 'Passwords do not match.'));
      return;
    }

    setSubmitting(true);
    setActivationError(null);

    try {
      const res = await candidateApi.activateInvitation({
        token,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
      });

      if (res.success) {
        setActivated(true);
      } else {
        setActivationError(res.message || t('activation.activationFailed', 'Failed to activate candidate account.'));
      }
    } catch (err) {
      setActivationError(err.response?.data?.error || t('activation.activationFailed', 'Failed to activate candidate account.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (verifying) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <Spin size="large" />
        <Paragraph style={{ marginTop: 16, color: '#666' }}>
          {t('activation.verifyingLink', 'Verifying your invitation link...')}
        </Paragraph>
      </div>
    );
  }

  if (verificationError) {
    return (
      <Result
        status="error"
        title={t('activation.linkInvalidTitle', 'Invitation Link Invalid or Expired')}
        subTitle={verificationError}
        extra={[
          <Link to="/login" key="signin">
            <Button type="primary" size="large" style={{ backgroundColor: brandTokens.primary }}>
              {t('common.returnToLogin', 'Return to Sign In')}
            </Button>
          </Link>,
        ]}
      />
    );
  }

  if (activated) {
    return (
      <Result
        status="success"
        title={t('activation.accountActivatedTitle', 'Account Activated Successfully!')}
        subTitle={t(
          'activation.accountActivatedDesc',
          'Your candidate account is now active and your password has been securely configured. You can now access your profile.'
        )}
        extra={[
          <Button
            type="primary"
            size="large"
            key="login"
            onClick={() => navigate('/login')}
            style={{ backgroundColor: brandTokens.primary, fontWeight: 600 }}
          >
            {t('common.proceedToSignIn', 'Proceed to Sign In')}
          </Button>,
        ]}
      />
    );
  }

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            backgroundColor: '#eaf5f8',
            color: brandTokens.primary,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            marginBottom: 12,
          }}
        >
          <SafetyCertificateOutlined />
        </div>
        <Title level={3} style={{ marginBottom: 4 }}>
          {t('activation.welcomeTitle', 'Activate Your Candidate Account')}
        </Title>
        <Paragraph type="secondary" style={{ margin: 0 }}>
          {t(
            'activation.welcomeSubtitle',
            'Welcome to RecruiTrain! Set up your secure password to complete your account activation.'
          )}
        </Paragraph>
      </div>

      {invitationData && (
        <Card
          size="small"
          style={{
            marginBottom: 20,
            backgroundColor: '#fafafa',
            borderRadius: 8,
            borderColor: '#e8e8e8',
          }}
        >
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t('candidates.email', 'Email Address')}:
              </Text>{' '}
              <Text strong>{invitationData.email}</Text>
            </div>
            {invitationData.company && (
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {t('jobs.company', 'Associated Company')}:
                </Text>{' '}
                <Tag icon={<BankOutlined />} color="blue">
                  {invitationData.company.name}
                </Tag>
              </div>
            )}
          </Space>
        </Card>
      )}

      {activationError && (
        <Alert
          message={activationError}
          type="error"
          showIcon
          style={{ marginBottom: 20, borderRadius: 6 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        requiredMark={false}
      >
        <Form.Item
          label={t('candidates.firstName', 'First Name')}
          name="firstName"
          rules={[{ required: true, message: t('candidates.firstNameRequired', 'First name is required.') }]}
        >
          <Input prefix={<UserOutlined style={{ color: '#bfbfbf' }} />} size="large" />
        </Form.Item>

        <Form.Item
          label={t('candidates.lastName', 'Last Name')}
          name="lastName"
          rules={[{ required: true, message: t('candidates.lastNameRequired', 'Last name is required.') }]}
        >
          <Input prefix={<UserOutlined style={{ color: '#bfbfbf' }} />} size="large" />
        </Form.Item>

        <Form.Item
          label={t('activation.newPassword', 'Create Password')}
          name="password"
          rules={[
            { required: true, message: t('activation.passwordRequired', 'Please enter a password.') },
            { min: 8, message: t('activation.passwordLength', 'Password must be at least 8 characters long.') },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
            placeholder="Min. 8 characters"
            size="large"
          />
        </Form.Item>

        <Form.Item
          label={t('activation.confirmPassword', 'Confirm Password')}
          name="confirmPassword"
          dependencies={['password']}
          rules={[
            { required: true, message: t('activation.confirmPasswordRequired', 'Please confirm your password.') },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error(t('resetPassword.passwordMismatch', 'Passwords do not match.')));
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
            placeholder="Re-enter password"
            size="large"
          />
        </Form.Item>

        <Form.Item style={{ marginTop: 24, marginBottom: 12 }}>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={submitting}
            style={{
              height: 44,
              fontWeight: 600,
              backgroundColor: brandTokens.primary,
            }}
          >
            {t('activation.activateButton', 'Activate Account')}
          </Button>
        </Form.Item>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Link to="/login" style={{ color: brandTokens.primary, fontSize: 13 }}>
            {t('common.alreadyHaveAccount', 'Already activated? Sign In')}
          </Link>
        </div>
      </Form>
    </div>
  );
}

export default CandidateActivationPage;
