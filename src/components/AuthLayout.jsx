import React from 'react';
import { Card, Typography, Space } from 'antd';
import { useSelector } from 'react-redux';
import { BrandLogo } from './BrandLogo.jsx';
import { LanguageSwitcher } from './LanguageSwitcher.jsx';
import { ThemeSwitcher } from './ThemeSwitcher.jsx';
import { brandTokens, lightSemanticTokens, darkSemanticTokens } from '../theme/tokens.js';

const { Text } = Typography;

export function AuthLayout({ children }) {
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);
  const semantic = isDarkMode ? darkSemanticTokens : lightSemanticTokens;

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: semantic.bgApp,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px 16px',
        boxSizing: 'border-box',
        transition: 'background-color 0.3s ease',
      }}
    >
      {/* Top Bar with Language and Theme Controls */}
      <div
        style={{
          width: '100%',
          maxWidth: 1200,
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <ThemeSwitcher />
        <LanguageSwitcher />
      </div>

      {/* Main Authentication Card */}
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          margin: '20px auto',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <BrandLogo size="large" />
        </div>

        <Card
          bordered
          style={{
            borderRadius: 12,
            boxShadow: semantic.boxShadow,
            borderColor: semantic.borderDefault,
            backgroundColor: semantic.bgCard,
          }}
          bodyStyle={{ padding: '32px 28px' }}
        >
          {children}
        </Card>
      </div>

      {/* Security Footer Note */}
      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <Text
          type="secondary"
          style={{
            fontSize: 12,
            color: semantic.textSecondary,
            letterSpacing: '0.02em',
          }}
        >
          &copy; {new Date().getFullYear()} RecruiTrain Platform. High-security administrative interface.
        </Text>
      </div>
    </div>
  );
}
