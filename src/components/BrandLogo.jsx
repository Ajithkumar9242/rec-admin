import React from 'react';
import { Space, Typography } from 'antd';
import { SafetyCertificateOutlined } from '@ant-design/icons';
import { brandTokens } from '../theme/tokens.js';

const { Text } = Typography;

export function BrandLogo({ size = 'default', showSubtitle = true }) {
  const isLarge = size === 'large';

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
      <Space orientation="horizontal" orientationMargin="8" orientationPadding="0" align="center" style={{ gap: 8 }}>
        <div
          style={{
            width: isLarge ? 42 : 32,
            height: isLarge ? 42 : 32,
            borderRadius: 8,
            backgroundColor: brandTokens.navy,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: brandTokens.teal,
            fontSize: isLarge ? 22 : 18,
            boxShadow: '0 2px 8px rgba(22, 49, 63, 0.25)',
          }}
        >
          <SafetyCertificateOutlined />
        </div>
        <span
          style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            fontWeight: 700,
            fontSize: isLarge ? 24 : 18,
            letterSpacing: '-0.02em',
            color: brandTokens.navy,
            lineHeight: 1.2,
          }}
        >
          Recrui<span style={{ color: brandTokens.teal }}>Train</span>
        </span>
      </Space>
      {showSubtitle && (
        <Text
          type="secondary"
          style={{
            fontSize: isLarge ? 12 : 10,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontWeight: 600,
            marginTop: 4,
            color: brandTokens.muted,
          }}
        >
          Admin Portal
        </Text>
      )}
    </div>
  );
}
