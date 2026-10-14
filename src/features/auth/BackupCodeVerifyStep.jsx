import React from 'react';
import { Form, Input, Button, Typography, Alert } from 'antd';
import { KeyOutlined, ArrowLeftOutlined, SafetyOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { verifyBackupCode, resetAuthState } from '../../store/authSlice.js';
import { brandTokens } from '../../theme/tokens.js';

const { Title, Paragraph } = Typography;

export function BackupCodeVerifyStep({ adminId, onSwitchToTotp }) {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { pendingAdminId, loading, error } = useSelector((state) => state.auth);

  const effectiveAdminId = adminId || pendingAdminId;

  const handleSubmit = async (values) => {
    await dispatch(
      verifyBackupCode({
        adminId: effectiveAdminId,
        code: values.code,
      })
    );
  };

  const handleBackToLogin = () => {
    dispatch(resetAuthState());
  };

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            backgroundColor: '#fcefe0',
            color: brandTokens.amber,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            marginBottom: 12,
          }}
        >
          <KeyOutlined />
        </div>
        <Title level={3} style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
          {t('backupCode.title')}
        </Title>
        <Paragraph type="secondary" style={{ marginTop: 6, fontSize: 13 }}>
          {t('backupCode.subtitle')}
        </Paragraph>
      </div>

      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          closable
          style={{ marginBottom: 20, borderRadius: 8 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        requiredMark={false}
        autoComplete="off"
      >
        <Form.Item
          name="code"
          label={t('backupCode.codeLabel')}
          rules={[{ required: true, message: t('validation.backupCodeRequired') }]}
        >
          <Input
            size="large"
            placeholder={t('backupCode.codePlaceholder')}
            style={{
              textAlign: 'center',
              letterSpacing: '0.2em',
              fontWeight: 600,
              fontSize: 18,
              height: 46,
            }}
            autoFocus
          />
        </Form.Item>

        <Form.Item style={{ marginTop: 24, marginBottom: 16 }}>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={loading}
            disabled={loading}
            style={{ height: 44, fontWeight: 600 }}
          >
            {loading ? t('backupCode.verifying') : t('backupCode.submitButton')}
          </Button>
        </Form.Item>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'center' }}>
          <Button
            type="link"
            icon={<SafetyOutlined />}
            onClick={onSwitchToTotp}
            style={{ padding: 0, fontSize: 13, color: brandTokens.teal }}
          >
            {t('twoFactor.useAuthenticator')}
          </Button>

          <Button
            type="link"
            icon={<ArrowLeftOutlined />}
            onClick={handleBackToLogin}
            style={{ padding: 0, fontSize: 13 }}
          >
            {t('common.back')}
          </Button>
        </div>
      </Form>
    </div>
  );
}
