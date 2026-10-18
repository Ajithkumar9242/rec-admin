import React from 'react';
import { useTranslation } from 'react-i18next';
import { Select, Dropdown, Button, Tooltip } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { changeAppLanguage } from '../i18n/index.js';

export function LanguageSwitcher({ size = 'middle', compact = false }) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith('de') ? 'de' : 'en';

  const menuItems = [
    {
      key: 'en',
      label: 'English (EN)',
      onClick: () => changeAppLanguage('en'),
    },
    {
      key: 'de',
      label: 'Deutsch (DE)',
      onClick: () => changeAppLanguage('de'),
    },
  ];

  if (compact) {
    return (
      <Tooltip title={currentLang === 'de' ? 'Sprache wählen (DE)' : 'Change language (EN)'}>
        <Dropdown
          menu={{
            items: menuItems,
            selectable: true,
            selectedKeys: [currentLang],
          }}
          trigger={['click']}
          placement="bottomRight"
        >
          <Button
            size={size}
            type="text"
            shape="circle"
            icon={<GlobalOutlined style={{ fontSize: 16 }} />}
            aria-label={currentLang === 'de' ? 'Sprache wählen' : 'Change language'}
            style={{
              width: 38,
              height: 38,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          />
        </Dropdown>
      </Tooltip>
    );
  }

  return (
    <Select
      size={size}
      value={currentLang}
      onChange={(value) => changeAppLanguage(value)}
      suffixIcon={<GlobalOutlined />}
      style={{ width: 115 }}
      options={[
        { value: 'en', label: 'EN (English)' },
        { value: 'de', label: 'DE (Deutsch)' },
      ]}
    />
  );
}

