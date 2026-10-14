import React, { useState } from 'react';
import {
  Layout,
  Menu,
  Button,
  Space,
  Tag,
  Avatar,
  Dropdown,
  Popconfirm,
  Badge,
  Grid,
  theme,
} from 'antd';
import {
  DashboardOutlined,
  SafetyCertificateOutlined,
  UsergroupAddOutlined,
  SolutionOutlined,
  ProjectOutlined,
  CreditCardOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { logoutUser } from '../store/authSlice.js';
import { LanguageSwitcher } from './LanguageSwitcher.jsx';
import { ThemeSwitcher } from './ThemeSwitcher.jsx';
import { BrandLogo } from './BrandLogo.jsx';
import { brandTokens, lightSemanticTokens, darkSemanticTokens } from '../theme/tokens.js';

const { Header, Sider, Content } = Layout;

export function AdminShell() {
  const [collapsed, setCollapsed] = useState(false);
  const screens = Grid.useBreakpoint() || {};
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { user } = useSelector((state) => state.auth);
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);

  const semantic = isDarkMode ? darkSemanticTokens : lightSemanticTokens;
  const isMobile = Boolean(screens.xs);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/login');
  };

  const menuItems = [
    {
      key: '/admin',
      icon: <DashboardOutlined />,
      label: t('shell.dashboard'),
    },
    {
      key: '/admin/security',
      icon: <SafetyCertificateOutlined />,
      label: t('shell.securitySettings'),
    },
    {
      type: 'divider',
    },
    {
      key: 'employers-future',
      icon: <SolutionOutlined />,
      label: t('shell.employers'),
      disabled: true,
    },
    {
      key: 'candidates-future',
      icon: <UsergroupAddOutlined />,
      label: t('shell.candidates'),
      disabled: true,
    },
    {
      key: 'pipeline-future',
      icon: <ProjectOutlined />,
      label: t('shell.pipeline'),
      disabled: true,
    },
    {
      key: 'billing-future',
      icon: <CreditCardOutlined />,
      label: t('shell.billing'),
      disabled: true,
    },
  ];

  const handleMenuClick = ({ key }) => {
    if (!key.includes('future')) {
      navigate(key);
    }
  };

  const userMenuItems = [
    {
      key: 'profile-info',
      label: (
        <div style={{ padding: '4px 0' }}>
          <div style={{ fontWeight: 600 }}>{user?.name}</div>
          <div style={{ fontSize: 12, color: semantic.textSecondary }}>{user?.email}</div>
        </div>
      ),
      disabled: true,
    },
    {
      type: 'divider',
    },
    {
      key: 'security',
      icon: <SafetyCertificateOutlined />,
      label: t('shell.securitySettings'),
      onClick: () => navigate('/admin/security'),
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      danger: true,
      label: t('auth.logout'),
      onClick: handleLogout,
    },
  ];

  return (
    <Layout
      style={{
        height: '100dvh',
        minHeight: '100vh',
        overflow: 'hidden',
        background: semantic.bgApp,
        display: 'flex',
        flexDirection: 'row',
      }}
    >
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        breakpoint="lg"
        collapsedWidth={isMobile ? 0 : 80}
        onBreakpoint={(broken) => {
          if (broken) setCollapsed(true);
        }}
        width={240}
        style={{
          height: '100%',
          maxHeight: '100dvh',
          background: isDarkMode ? '#12242f' : '#16313f',
          boxShadow: '2px 0 8px rgba(0,0,0,0.15)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            height: 64,
            minHeight: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '0' : '0 20px',
            borderBottom: `1px solid ${isDarkMode ? '#1d3848' : '#1e3d4e'}`,
            flexShrink: 0,
          }}
        >
          {collapsed ? (
            <div style={{ color: brandTokens.teal, fontSize: 24, fontWeight: 'bold' }}>R</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 18,
                  letterSpacing: '-0.02em',
                  color: '#ffffff',
                }}
              >
                Recrui<span style={{ color: brandTokens.teal }}>Train</span>
              </span>
              <Tag
                color={user?.role === 'SUPER_ADMIN' ? 'gold' : 'blue'}
                style={{ fontSize: 10, lineHeight: '18px', padding: '0 6px', margin: 0 }}
              >
                {user?.role === 'SUPER_ADMIN' ? 'SUPER' : 'ADMIN'}
              </Tag>
            </div>
          )}
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={handleMenuClick}
            style={{
              background: 'transparent',
              padding: '12px 8px',
              borderRight: 'none',
            }}
          />
        </div>
      </Sider>

      <Layout
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          height: '100%',
          minHeight: 0,
          minWidth: 0,
          background: semantic.bgApp,
          overflow: 'hidden',
        }}
      >
        <Header
          style={{
            padding: isMobile ? '0 12px' : '0 24px',
            background: semantic.bgSurface,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${semantic.borderDefault}`,
            height: 64,
            minHeight: 64,
            lineHeight: '64px',
            flexShrink: 0,
            zIndex: 10,
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 16, width: 40, height: 40 }}
          />

          <Space size={isMobile ? 8 : 16} align="center">
            {!isMobile && (
              <Badge status="success" text={t('shell.platformStatus')} style={{ marginRight: 8 }} />
            )}
            <ThemeSwitcher />
            <LanguageSwitcher />

            <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
              <Button type="text" style={{ padding: '4px 8px', height: 'auto' }}>
                <Space align="center" size={6}>
                  <Avatar
                    style={{
                      backgroundColor: brandTokens.navy,
                      color: brandTokens.teal,
                      fontWeight: 600,
                    }}
                    icon={<UserOutlined />}
                  >
                    {user?.name?.[0]?.toUpperCase()}
                  </Avatar>
                  {!isMobile && (
                    <span style={{ fontWeight: 500, color: semantic.textPrimary }}>
                      {user?.name}
                    </span>
                  )}
                </Space>
              </Button>
            </Dropdown>

            <Popconfirm
              title={t('auth.logoutConfirm')}
              onConfirm={handleLogout}
              okText={t('common.submit')}
              cancelText={t('common.cancel')}
            >
              <Button
                type="text"
                danger
                icon={<LogoutOutlined />}
                title={t('auth.logout')}
              />
            </Popconfirm>
          </Space>
        </Header>

        <Content
          style={{
            flex: 1,
            minHeight: 0,
            minWidth: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: isMobile ? '16px' : '24px',
            boxSizing: 'border-box',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
