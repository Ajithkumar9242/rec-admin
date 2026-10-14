import React from 'react';
import { useTranslation } from 'react-i18next';
import { Select } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { changeAppLanguage } from '../i18n/index.js';

export function LanguageSwitcher({ size = 'middle' }) {
  const { i18n } = useTranslation();

  const handleChange = (value) => {
    changeAppLanguage(value);
  };

  return (
    <Select
      size={size}
      value={i18n.language.startsWith('de') ? 'de' : 'en'}
      onChange={handleChange}
      suffixIcon={<GlobalOutlined />}
      style={{ width: 115 }}
      options={[
        { value: 'en', label: 'EN (English)' },
        { value: 'de', label: 'DE (Deutsch)' },
      ]}
    />
  );
}
