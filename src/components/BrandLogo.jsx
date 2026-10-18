import React, { useState } from 'react';
import { Space, Typography, Tag } from 'antd';
import { SafetyCertificateOutlined } from '@ant-design/icons';
import { brandTokens } from '../theme/tokens.js';

const { Text } = Typography;

export function BrandLogo({
  size = 'default',
  showSubtitle = true,
  collapsed = false,
  isDarkMode = false,
  logoSrc = '/logo.png',
  tagText = null,
}) {
  const isLarge = size === 'large';
  const candidateSources = Array.from(new Set([logoSrc, '/logo.png', '/logo.svg'].filter(Boolean)));
  const [sourceIndex, setSourceIndex] = useState(0);

  const currentSrc = candidateSources[sourceIndex];

  const handleImageError = () => {
    if (sourceIndex < candidateSources.length - 1) {
      setSourceIndex((prev) => prev + 1);
    } else {
      setSourceIndex(candidateSources.length); // All images failed, trigger fallback
    }
  };

  // When image logo is available in public/
  if (currentSrc && sourceIndex < candidateSources.length) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: 10,
          width: '100%',
        }}
      >
        <img
          src={currentSrc}
          alt="RecruiTrain"
          onError={handleImageError}
          style={{
            maxHeight: collapsed ? 28 : (isLarge ? 40 : 32),
            maxWidth: collapsed ? 36 : 140,
            objectFit: 'contain',
            display: 'block',
          }}
        />
        {!collapsed && tagText && (
          <Tag
            color={tagText === 'SUPER' ? 'gold' : 'blue'}
            style={{ fontSize: 10, lineHeight: '18px', padding: '0 6px', margin: 0, fontWeight: 600 }}
          >
            {tagText}
          </Tag>
        )}
      </div>
    );
  }

  // Graceful fallback mark when image file is not yet placed in public/
  if (collapsed) {
    return (
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: isDarkMode ? 'rgba(79, 168, 192, 0.15)' : brandTokens.navy,
          color: brandTokens.teal,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: 16,
          letterSpacing: '-0.02em',
          border: `1px solid ${isDarkMode ? 'rgba(79, 168, 192, 0.3)' : 'transparent'}`,
        }}
        title="RecruiTrain Admin"
      >
        RT
      </div>
    );
  }

  const textColor = isDarkMode ? '#eaf5f8' : brandTokens.navy;

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <Space orientation="horizontal" align="center" style={{ gap: 9 }}>
        <div
          style={{
            width: isLarge ? 38 : 32,
            height: isLarge ? 38 : 32,
            borderRadius: 8,
            backgroundColor: isDarkMode ? 'rgba(79, 168, 192, 0.18)' : brandTokens.navy,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: brandTokens.teal,
            fontSize: isLarge ? 20 : 16,
            border: `1px solid ${isDarkMode ? 'rgba(79, 168, 192, 0.3)' : 'transparent'}`,
            boxShadow: isDarkMode ? 'none' : '0 2px 6px rgba(22, 49, 63, 0.15)',
          }}
        >
          <SafetyCertificateOutlined />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              fontWeight: 700,
              fontSize: isLarge ? 22 : 17,
              letterSpacing: '-0.02em',
              color: textColor,
              lineHeight: 1.2,
            }}
          >
            Recrui<span style={{ color: brandTokens.teal }}>Train</span>
          </span>
          {tagText && (
            <Tag
              color={tagText === 'SUPER' ? 'gold' : 'blue'}
              style={{ fontSize: 10, lineHeight: '18px', padding: '0 5px', margin: 0, fontWeight: 600 }}
            >
              {tagText}
            </Tag>
          )}
        </div>
      </Space>
      {showSubtitle && (
        <Text
          type="secondary"
          style={{
            fontSize: isLarge ? 11 : 10,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontWeight: 600,
            marginTop: 3,
            color: isDarkMode ? '#8fa9b5' : brandTokens.muted,
          }}
        >
          Admin Portal
        </Text>
      )}
    </div>
  );
}
export default BrandLogo;
