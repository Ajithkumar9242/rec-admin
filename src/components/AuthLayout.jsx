import React from 'react';
import { Typography, Space, Tag } from 'antd';
import { useSelector } from 'react-redux';
import {
  SafetyCertificateOutlined,
  LockOutlined,
  CheckCircleOutlined,
  KeyOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { BrandLogo } from './BrandLogo.jsx';
import { LanguageSwitcher } from './LanguageSwitcher.jsx';
import { brandTokens, lightSemanticTokens } from '../theme/tokens.js';

const { Title, Paragraph, Text } = Typography;

export function AuthLayout({ children }) {
  // Authentication screens are locked to the approved professional light appearance
  const semantic = lightSemanticTokens;
  const { t } = useTranslation();
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'row',
        backgroundColor: semantic.bgApp,
        overflowX: 'hidden',
      }}
    >
      {/* LEFT BRAND PANEL (Desktop-First, hidden or compact on small mobile screens) */}
      <div
        className="auth-brand-panel"
        style={{
          flex: '0 0 42%',
          maxWidth: '520px',
          minHeight: '100vh',
          backgroundColor: '#122530',
          backgroundImage: 'linear-gradient(165deg, #16313f 0%, #0e1e28 100%)',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px 44px',
          boxSizing: 'border-box',
          position: 'relative',
          borderRight: `1px solid ${isDarkMode ? '#1d3848' : '#1e3d4e'}`,
        }}
      >
        {/* Subtle geometric background accent */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '280px',
            height: '280px',
            background: 'radial-gradient(circle, rgba(79, 168, 192, 0.12) 0%, rgba(22, 49, 63, 0) 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Brand Header */}
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: brandTokens.navySoft,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: brandTokens.teal,
                fontSize: 20,
                border: '1px solid rgba(79, 168, 192, 0.3)',
              }}
            >
              <SafetyCertificateOutlined />
            </div>
            <span
              style={{
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: '#ffffff',
              }}
            >
              Recrui<span style={{ color: brandTokens.teal }}>Train</span>
            </span>
            <Tag
              color="cyan"
              style={{
                fontSize: 10,
                lineHeight: '18px',
                padding: '0 6px',
                marginLeft: 4,
                backgroundColor: 'rgba(79, 168, 192, 0.15)',
                borderColor: 'rgba(79, 168, 192, 0.3)',
                color: '#eaf5f8',
              }}
            >
              ADMIN
            </Tag>
          </div>
          <Text style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8fa9b5' }}>
            Enterprise Control Center
          </Text>
        </div>

        {/* Middle Value Proposition & Architecture */}
        <div style={{ margin: '40px 0' }}>
          <Title
            level={2}
            style={{
              color: '#ffffff',
              fontSize: '26px',
              fontWeight: 700,
              lineHeight: 1.3,
              marginBottom: 16,
              letterSpacing: '-0.02em',
            }}
          >
            Intelligent Recruitment & Talent Operations
          </Title>
          <Paragraph
            style={{
              color: '#a7c1cd',
              fontSize: '14px',
              lineHeight: 1.6,
              marginBottom: 32,
            }}
          >
            High-security administrative platform governing global recruitment pipelines, enterprise talent evaluations, and operational compliance.
          </Paragraph>

          <Space orientation="vertical" size={16} style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ color: brandTokens.teal, fontSize: 16 }}>
                <CheckCircleOutlined />
              </div>
              <span style={{ fontSize: 13, color: '#d2e4ec' }}>
                RFC 6238 TOTP Multi-Factor Authentication
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ color: brandTokens.teal, fontSize: 16 }}>
                <LockOutlined />
              </div>
              <span style={{ fontSize: 13, color: '#d2e4ec' }}>
                Argon2id & AES-256-GCM Authenticated Encryption
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ color: brandTokens.teal, fontSize: 16 }}>
                <KeyOutlined />
              </div>
              <span style={{ fontSize: 13, color: '#d2e4ec' }}>
                Atomic Single-Use Emergency Recovery Codes
              </span>
            </div>
          </Space>
        </div>

        {/* Brand Panel Footer */}
        <div>
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              borderRadius: 8,
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <ThunderboltOutlined style={{ color: brandTokens.teal }} />
            <span style={{ fontSize: 11, color: '#95acb8', lineHeight: 1.4 }}>
              Zero-Trust administrative session isolation backed by Redis & PostgreSQL 18.
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT AUTHENTICATION PANEL */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '24px 32px',
          boxSizing: 'border-box',
          minHeight: '100vh',
          backgroundColor: semantic.bgApp,
          transition: 'background-color 0.3s ease',
        }}
      >
        {/* Top Control Bar: Theme & Language Switchers */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
          }}
        >
          {/* Mobile-only brand tag */}
          <div className="mobile-brand-tag" style={{ display: 'none' }}>
            <BrandLogo size="small" showSubtitle={false} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
            <LanguageSwitcher />
          </div>
        </div>

        {/* Form label style to ensure right-aligned links (e.g. Forgot Password) span full width */}
        <style>{`
          .ant-form-item-label > label {
            width: 100% !important;
            display: flex !important;
            justify-content: space-between !important;
          }
          .ant-form-item-label > label::after {
            display: none !important;
          }
        `}</style>

        {/* Centered Form Wrapper */}
        <div
          style={{
            width: '100%',
            maxWidth: 440,
            margin: '24px auto',
            padding: '36px 32px',
            backgroundColor: semantic.bgCard,
            border: `1px solid ${semantic.borderDefault}`,
            borderRadius: 12,
            boxShadow: semantic.boxShadow,
            boxSizing: 'border-box',
          }}
        >
          {children}
        </div>

        {/* Footer Security Disclaimer */}
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <Text type="secondary" style={{ fontSize: 12, color: semantic.textSecondary }}>
            &copy; {new Date().getFullYear()} RecruiTrain. High-security administrative access. All actions are cryptographically audited.
          </Text>
        </div>
      </div>

      <style>{`
        @media (max-width: 991px) {
          .auth-brand-panel {
            display: none !important;
          }
          .mobile-brand-tag {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
