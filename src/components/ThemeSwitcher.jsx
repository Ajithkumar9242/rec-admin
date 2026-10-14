import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Tooltip } from 'antd';
import { BulbOutlined, BulbFilled } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { toggleTheme } from '../store/themeSlice.js';

export function ThemeSwitcher({ size = 'middle' }) {
  const dispatch = useDispatch();
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);
  const { t } = useTranslation();

  return (
    <Tooltip title={isDarkMode ? t('common.lightMode') : t('common.darkMode')}>
      <Button
        size={size}
        type="text"
        shape="circle"
        icon={isDarkMode ? <BulbFilled style={{ color: '#f0a352' }} /> : <BulbOutlined />}
        onClick={() => dispatch(toggleTheme())}
        aria-label="Toggle theme mode"
      />
    </Tooltip>
  );
}
