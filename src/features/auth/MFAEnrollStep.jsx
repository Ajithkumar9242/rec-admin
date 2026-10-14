import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Button,
  Typography,
  Alert,
  Checkbox,
  Space,
  Spin,
  message,
} from 'antd';
import {
  QrcodeOutlined,
  CopyOutlined,
  DownloadOutlined,
  SafetyCertificateOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import api from '../../services/api.js';
import { confirmMandatoryMFA, resetAuthState } from '../../store/authSlice.js';
import { brandTokens } from '../../theme/tokens.js';

const { Title, Paragraph, Text } = Typography;

export function MFAEnrollStep({ onComplete }) {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { loading, error } = useSelector((state) => state.auth);

  const [setupLoading, setSetupLoading] = useState(true);
  const [setupData, setSetupData] = useState(null);
  const [setupError, setSetupError] = useState(null);

  const [generatedCodes, setGeneratedCodes] = useState(null);
  const [acknowledged, setAcknowledged] = useState(false);

  // Fetch initial enrollment QR code & secret on mount
  useEffect(() => {
    let isMounted = true;
    async function initEnrollment() {
      try {
        const res = await api.post('/auth/2fa/setup');
        if (isMounted) {
          setSetupData(res.data);
          setSetupLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setSetupError(err.response?.data?.error || 'Failed to initiate MFA setup.');
          setSetupLoading(false);
        }
      }
    }
    initEnrollment();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleConfirm = async (values) => {
    const resultAction = await dispatch(confirmMandatoryMFA({ code: values.code }));
    if (confirmMandatoryMFA.fulfilled.match(resultAction)) {
      setGeneratedCodes(resultAction.payload.backupCodes || []);
      message.success(t('twoFactor.enableSuccess'));
    }
  };

  const handleCopyCodes = () => {
    if (generatedCodes) {
      navigator.clipboard.writeText(generatedCodes.join('\n'));
      message.success(t('common.copied'));
    }
  };

  const handleDownloadCodes = () => {
    if (generatedCodes) {
      const text = `RecruiTrain Admin Backup Codes\nGenerated: ${new Date().toISOString()}\n\n` + generatedCodes.join('\n') + '\n\nNote: Each code is single-use.';
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `recruitrain-backup-codes.txt`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleBackToLogin = () => {
    dispatch(resetAuthState());
  };

  // If backup codes are generated after confirmation, require acknowledgment before proceeding to console
  if (generatedCodes) {
    return (
      <div>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              backgroundColor: '#eaf5f8',
              color: brandTokens.teal,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              marginBottom: 12,
            }}
          >
            <SafetyCertificateOutlined />
          </div>
          <Title level={3} style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
            {t('twoFactor.backupCodesTitle')}
          </Title>
          <Paragraph type="secondary" style={{ marginTop: 6, fontSize: 13 }}>
            Save these single-use recovery codes before entering the console.
          </Paragraph>
        </div>

        <Alert
          type="warning"
          showIcon
          message={t('twoFactor.backupCodesWarning')}
          style={{ marginBottom: 16, borderRadius: 8, fontSize: 13 }}
        />

        <div
          style={{
            backgroundColor: '#f3fafb',
            border: `1px solid ${brandTokens.border}`,
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 20,
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px 16px',
          }}
        >
          {generatedCodes.map((code, idx) => (
            <div
              key={idx}
              style={{
                fontFamily: 'monospace',
                fontWeight: 600,
                fontSize: 14,
                color: brandTokens.navy,
                letterSpacing: '0.05em',
              }}
            >
              {idx + 1}. {code}
            </div>
          ))}
        </div>

        <Space style={{ width: '100%', marginBottom: 20 }} justify="center">
          <Button icon={<CopyOutlined />} onClick={handleCopyCodes}>
            {t('common.copy')}
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleDownloadCodes}>
            {t('common.download')}
          </Button>
        </Space>

        <div style={{ marginBottom: 20 }}>
          <Checkbox
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
          >
            <span style={{ fontSize: 13 }}>
              I have saved these emergency recovery codes securely.
            </span>
          </Checkbox>
        </div>

        <Button
          type="primary"
          size="large"
          block
          disabled={!acknowledged}
          icon={<ArrowRightOutlined />}
          onClick={onComplete}
        >
          Continue to Admin Console
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
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
            marginBottom: 10,
          }}
        >
          <QrcodeOutlined />
        </div>
        <Title level={3} style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
          {t('twoFactor.enrollTitle')}
        </Title>
        <Paragraph type="secondary" style={{ marginTop: 4, fontSize: 12 }}>
          Multi-factor authentication is mandatory for all RecruiTrain administrators.
        </Paragraph>
      </div>

      {(error || setupError) && (
        <Alert
          message={error || setupError}
          type="error"
          showIcon
          style={{ marginBottom: 16, borderRadius: 8 }}
        />
      )}

      {setupLoading ? (
        <div style={{ textAlign: 'center', padding: '30px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 12, color: brandTokens.muted, fontSize: 13 }}>
            Generating secure setup credentials...
          </div>
        </div>
      ) : setupData ? (
        <div>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div
              style={{
                display: 'inline-block',
                padding: 10,
                backgroundColor: '#ffffff',
                border: `1px solid ${brandTokens.border}`,
                borderRadius: 8,
              }}
            >
              <img
                src={setupData.qrCodeUrl}
                alt="2FA QR Code"
                style={{ width: 170, height: 170, display: 'block' }}
              />
            </div>
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {t('twoFactor.manualSecret')}
              </Text>
              <div
                style={{
                  fontFamily: 'monospace',
                  letterSpacing: '0.1em',
                  fontWeight: 600,
                  fontSize: 13,
                  backgroundColor: '#f3fafb',
                  padding: '4px 8px',
                  borderRadius: 4,
                  margin: '4px auto 0',
                  display: 'inline-block',
                  color: brandTokens.navy,
                }}
              >
                {setupData.secret}
              </div>
            </div>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleConfirm}
            requiredMark={false}
          >
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
                  letterSpacing: '0.3em',
                  fontSize: 18,
                  fontWeight: 600,
                }}
                autoFocus
              />
            </Form.Item>

            <Form.Item style={{ marginTop: 20, marginBottom: 12 }}>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={loading}
              >
                {loading ? t('twoFactor.verifying') : 'Activate MFA & Continue'}
              </Button>
            </Form.Item>

            <div style={{ textAlign: 'center' }}>
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
      ) : null}
    </div>
  );
}
