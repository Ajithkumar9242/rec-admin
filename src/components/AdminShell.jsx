import React, { useState } from 'react';
import {
  Layout,
  Menu,
  Button,
  Space,
  Avatar,
  Dropdown,
  Popconfirm,
  Badge,
  Grid,
  Drawer,
  Tooltip,
  Popover,
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
  SettingOutlined,
  FileTextOutlined,
  TeamOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { logoutUser } from '../store/authSlice.js';
import { usePermissions } from '../hooks/usePermissions.js';
import { LanguageSwitcher } from './LanguageSwitcher.jsx';
import { ThemeSwitcher } from './ThemeSwitcher.jsx';
import { BrandLogo } from './BrandLogo.jsx';
import { brandTokens, lightSemanticTokens, darkSemanticTokens } from '../theme/tokens.js';

const { Header, Sider, Content } = Layout;

export function AdminShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
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

  const { can, isSuperAdmin } = usePermissions();

  const configChildren = [
    {
      key: '/admin/configuration/industries',
      label: t('shell.industries'),
      visible: isSuperAdmin || can('COMPANIES', 'READ'),
    },
    {
      key: '/admin/configuration/company-documents',
      label: t('shell.companyDocuments'),
      visible: isSuperAdmin || can('COMPANIES', 'READ'),
    },
    {
      key: '/admin/configuration/candidate-documents',
      label: t('shell.candidateDocuments'),
      visible: isSuperAdmin || can('CANDIDATES', 'READ'),
    },
    {
      key: '/admin/configuration/recruitment-stages',
      label: t('shell.recruitmentStages'),
      visible: isSuperAdmin || can('APPLICATIONS', 'READ'),
    },
    {
      key: '/admin/configuration/candidate-settings',
      label: t('shell.candidateSettings'),
      visible: isSuperAdmin,
    },
    {
      key: '/admin/configuration/employer-visibility',
      label: t('shell.employerVisibility'),
      visible: isSuperAdmin,
    },
    {
      key: '/admin/configuration/job-settings',
      label: t('shell.jobSettings'),
      visible: isSuperAdmin,
    },
  ].filter((c) => c.visible !== false);

  const allMenuItems = [
    {
      key: '/admin',
      icon: <DashboardOutlined style={{ fontSize: 16 }} />,
      label: t('shell.dashboard'),
      visible: can('DASHBOARD', 'READ'),
    },
    {
      key: '/admin/security',
      icon: <SafetyCertificateOutlined style={{ fontSize: 16 }} />,
      label: t('shell.securitySettings'),
      visible: true,
    },
    {
      key: 'configuration-group',
      icon: <SettingOutlined style={{ fontSize: 16 }} />,
      label: t('shell.platformConfiguration'),
      visible: configChildren.length > 0,
      children: configChildren,
    },
    {
      type: 'divider',
      visible: true,
    },
    {
      key: 'companies-group',
      icon: <SolutionOutlined style={{ fontSize: 16 }} />,
      label: t('shell.companies', 'Companies'),
      visible: can('COMPANIES', 'READ'),
      children: [
        {
          key: '/admin/companies',
          label: t('companies.companyList', 'Company Directory'),
          visible: can('COMPANIES', 'READ'),
        },
        {
          key: '/admin/companies/new',
          label: t('companies.onboardingWizard', 'Onboard Company'),
          visible: can('COMPANIES', 'CREATE'),
        },
      ].filter((c) => c.visible !== false),
    },
    {
      key: 'jobs-group',
      icon: <FileTextOutlined style={{ fontSize: 16 }} />,
      label: t('shell.jobs', 'Job Postings'),
      visible: can('JOBS', 'READ'),
      children: [
        {
          key: '/admin/jobs',
          label: t('jobs.directory', 'Job Postings'),
          visible: can('JOBS', 'READ'),
        },
        {
          key: '/admin/jobs/new',
          label: t('jobs.createJob', 'Create New Job Opening'),
          visible: can('JOBS', 'CREATE'),
        },
      ].filter((c) => c.visible !== false),
    },
    {
      key: '/admin/candidates',
      icon: <UsergroupAddOutlined style={{ fontSize: 16 }} />,
      label: t('shell.candidates', 'Candidates'),
      visible: can('CANDIDATES', 'READ'),
    },
    {
      key: '/admin/teams',
      icon: <TeamOutlined style={{ fontSize: 16 }} />,
      label: t('shell.teams', 'Teams & Permissions'),
      visible: can('TEAMS', 'READ'),
    },
    {
      key: 'pipeline-future',
      icon: <ProjectOutlined style={{ fontSize: 16 }} />,
      label: t('shell.pipeline'),
      disabled: true,
      visible: can('APPLICATIONS', 'READ'),
    },
    {
      key: 'billing-group',
      icon: <CreditCardOutlined style={{ fontSize: 16 }} />,
      label: t('shell.billing'),
      visible: can('BILLING', 'READ'),
      children: [
        {
          key: '/admin/billing/plans',
          label: t('shell.plans'),
        },
        {
          key: '/admin/billing/subscriptions',
          label: t('shell.subscriptions'),
        },
        {
          key: '/admin/billing/invoices',
          label: t('shell.invoices'),
        },
        {
          key: '/admin/billing/analytics',
          label: t('shell.billingAnalytics'),
        },
      ],
    },
  ];

  const menuItems = allMenuItems.filter((item) => item.visible !== false);

  const handleMenuClick = ({ key }) => {
    if (key.startsWith('/admin')) {
      navigate(key);
      if (isMobile) {
        setMobileDrawerOpen(false);
      }
    }
  };

  const userMenuItems = [
    {
      key: 'profile-info',
      label: (
        <div style={{ padding: '6px 4px' }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: semantic.textPrimary }}>{user?.name || 'Administrator'}</div>
          <div style={{ fontSize: 12, color: semantic.textSecondary }}>{user?.email}</div>
          <div style={{ fontSize: 11, color: brandTokens.teal, marginTop: 2, fontWeight: 500 }}>
            {user?.role === 'SUPER_ADMIN' ? 'Super Administrator' : 'Administrator'}
          </div>
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
  ];

  const notificationsPopoverContent = (
    <div style={{ padding: '8px 4px', width: 260, textAlign: 'center' }}>
      <BellOutlined style={{ fontSize: 24, color: brandTokens.teal, marginBottom: 8 }} />
      <div style={{ fontWeight: 600, fontSize: 13, color: semantic.textPrimary, marginBottom: 4 }}>
        {t('dashboard.recentNotifications')}
      </div>
      <div style={{ fontSize: 12, color: semantic.textSecondary }}>
        {t('dashboard.noNotifications')}
      </div>
    </div>
  );

  // Render navigation menu content (shared between desktop Sider and mobile Drawer)
  const renderSidebarContent = (isCollapsedMode = false) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        background: isDarkMode ? '#0d1820' : '#ffffff',
      }}
    >
      {/* 1. Fixed Brand / Logo Header */}
      <div
        style={{
          height: 64,
          minHeight: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsedMode ? 'center' : 'flex-start',
          padding: isCollapsedMode ? '0' : '0 18px',
          borderBottom: `1px solid ${isDarkMode ? '#1a2e3b' : semantic.borderSubtle}`,
          flexShrink: 0,
        }}
      >
        <BrandLogo
          collapsed={isCollapsedMode}
          isDarkMode={isDarkMode}
          showSubtitle={false}
          tagText={user?.role === 'SUPER_ADMIN' ? 'SUPER' : 'ADMIN'}
        />
      </div>

      {/* 2. Middle Scrollable Navigation List */}
      <div
        className="admin-sidebar-scroll"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '10px 8px',
        }}
      >
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          inlineCollapsed={isCollapsedMode}
          style={{
            background: 'transparent',
            borderRight: 'none',
            fontSize: 13,
            fontWeight: 500,
          }}
        />
      </div>

      {/* 3. Fixed User Profile & Logout Footer */}
      <div
        style={{
          flexShrink: 0,
          borderTop: `1px solid ${isDarkMode ? '#1a2e3b' : semantic.borderSubtle}`,
          padding: isCollapsedMode ? '14px 8px' : '12px 14px',
          background: isDarkMode ? '#0a141b' : '#fbfcfd',
          display: 'flex',
          flexDirection: isCollapsedMode ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: isCollapsedMode ? 'center' : 'space-between',
          gap: isCollapsedMode ? 12 : 8,
        }}
      >
        {isCollapsedMode ? (
          <>
            <Tooltip title={`${user?.name || 'Admin'} (${user?.email || ''})`} placement="right">
              <Avatar
                size={34}
                style={{
                  backgroundColor: isDarkMode ? 'rgba(79, 168, 192, 0.2)' : brandTokens.navy,
                  color: brandTokens.teal,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
                icon={<UserOutlined />}
              >
                {user?.name?.[0]?.toUpperCase()}
              </Avatar>
            </Tooltip>

            <Popconfirm
              title={t('auth.logoutConfirm')}
              onConfirm={handleLogout}
              okText={t('common.submit')}
              cancelText={t('common.cancel')}
              placement="rightBottom"
            >
              <Tooltip title={t('auth.logout')} placement="right">
                <Button
                  type="text"
                  danger
                  size="small"
                  shape="circle"
                  icon={<LogoutOutlined style={{ fontSize: 15 }} />}
                  aria-label={t('auth.logout')}
                />
              </Tooltip>
            </Popconfirm>
          </>
        ) : (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                minWidth: 0,
                flex: 1,
              }}
            >
              <Avatar
                size={34}
                style={{
                  backgroundColor: isDarkMode ? 'rgba(79, 168, 192, 0.2)' : brandTokens.navy,
                  color: brandTokens.teal,
                  fontWeight: 600,
                  fontSize: 14,
                  flexShrink: 0,
                }}
                icon={<UserOutlined />}
              >
                {user?.name?.[0]?.toUpperCase()}
              </Avatar>
              <div style={{ minWidth: 0, flex: 1, lineHeight: 1.3 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: semantic.textPrimary,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={user?.name}
                >
                  {user?.name || 'Administrator'}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: semantic.textSecondary,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={user?.email}
                >
                  {user?.email}
                </div>
              </div>
            </div>

            <Popconfirm
              title={t('auth.logoutConfirm')}
              onConfirm={handleLogout}
              okText={t('common.submit')}
              cancelText={t('common.cancel')}
              placement="topRight"
            >
              <Button
                type="text"
                danger
                size="middle"
                icon={<LogoutOutlined style={{ fontSize: 15 }} />}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px 8px',
                  borderRadius: 6,
                }}
                title={t('auth.logout')}
                aria-label={t('auth.logout')}
              >
                <span style={{ fontSize: 12, fontWeight: 600 }}>{t('auth.logout')}</span>
              </Button>
            </Popconfirm>
          </>
        )}
      </div>
    </div>
  );

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
      <style>{`
        .ant-layout-sider-children {
          display: flex !important;
          flex-direction: column !important;
          height: 100% !important;
          min-height: 0 !important;
          overflow: hidden !important;
        }
        .admin-sidebar-scroll {
          scrollbar-width: thin;
          scrollbar-color: ${isDarkMode ? 'rgba(255, 255, 255, 0.15) transparent' : 'rgba(0, 0, 0, 0.15) transparent'};
        }
        .admin-sidebar-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .admin-sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .admin-sidebar-scroll::-webkit-scrollbar-thumb {
          background: ${isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)'};
          border-radius: 4px;
        }
        .admin-sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: ${isDarkMode ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.25)'};
        }
      `}</style>

      {/* Desktop Sidebar */}
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          className="rt-sidebar-smooth"
          breakpoint="lg"
          collapsedWidth={80}
          onBreakpoint={(broken) => {
            if (broken) setCollapsed(true);
          }}
          width={250}
          style={{
            height: '100%',
            maxHeight: '100dvh',
            background: isDarkMode ? '#0d1820' : '#ffffff',
            borderRight: `1px solid ${isDarkMode ? '#1a2e3b' : semantic.borderSubtle}`,
            boxShadow: isDarkMode ? 'none' : '1px 0 3px rgba(0,0,0,0.02)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {renderSidebarContent(collapsed)}
        </Sider>
      )}

      {/* Mobile Drawer Navigation */}
      {isMobile && (
        <Drawer
          placement="left"
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          closable={false}
          width={260}
          styles={{
            body: { padding: 0, height: '100%' },
          }}
        >
          {renderSidebarContent(false)}
        </Drawer>
      )}

      {/* Main App Layout */}
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
        {/* Compact, Clean Topbar */}
        <Header
          style={{
            padding: isMobile ? '0 12px' : '0 20px',
            background: semantic.bgSurface,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${isDarkMode ? '#1a2e3b' : semantic.borderSubtle}`,
            height: 64,
            minHeight: 64,
            lineHeight: '64px',
            flexShrink: 0,
            zIndex: 10,
          }}
        >
          {/* Left: Sidebar Collapse/Mobile Drawer Toggle */}
          <Space align="center" size={12}>
            <Button
              type="text"
              className="rt-topbar-action-btn"
              icon={
                isMobile ? (
                  <MenuUnfoldOutlined style={{ fontSize: 18 }} />
                ) : collapsed ? (
                  <MenuUnfoldOutlined style={{ fontSize: 17 }} />
                ) : (
                  <MenuFoldOutlined style={{ fontSize: 17 }} />
                )
              }
              onClick={() => {
                if (isMobile) {
                  setMobileDrawerOpen(!mobileDrawerOpen);
                } else {
                  setCollapsed(!collapsed);
                }
              }}
              style={{
                width: 38,
                height: 38,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: semantic.textSecondary,
              }}
              aria-label="Toggle navigation menu"
            />
          </Space>

          {/* Right: Functional Modern SaaS Controls (No Platform Status, No Logout) */}
          <Space size={isMobile ? 6 : 14} align="center">
            {/* Notifications Popover */}
            <Popover
              content={notificationsPopoverContent}
              trigger="click"
              placement="bottomRight"
            >
              <Tooltip title={t('dashboard.recentNotifications')}>
                <Button
                  type="text"
                  shape="circle"
                  className="rt-topbar-action-btn"
                  style={{
                    width: 38,
                    height: 38,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: semantic.textSecondary,
                  }}
                  icon={
                    <Badge dot={false} offset={[2, -2]}>
                      <BellOutlined style={{ fontSize: 17 }} />
                    </Badge>
                  }
                  aria-label="Notifications"
                />
              </Tooltip>
            </Popover>

            {/* Theme Switcher */}
            <ThemeSwitcher />

            {/* Language Switcher */}
            <LanguageSwitcher compact />

            {/* User Profile Dropdown */}
            <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="bottomRight">
              <Tooltip title={`${user?.name || 'Administrator'} (${user?.role === 'SUPER_ADMIN' ? 'Super Administrator' : 'Administrator'})`}>
                <Button
                  type="text"
                  shape="circle"
                  className="rt-topbar-action-btn"
                  aria-label="User profile menu"
                  style={{
                    width: 38,
                    height: 38,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                  }}
                >
                  <Avatar
                    size={30}
                    style={{
                      backgroundColor: isDarkMode ? 'rgba(79, 168, 192, 0.2)' : brandTokens.navy,
                      color: brandTokens.teal,
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                    icon={<UserOutlined />}
                  >
                    {user?.name?.[0]?.toUpperCase()}
                  </Avatar>
                </Button>
              </Tooltip>
            </Dropdown>
          </Space>
        </Header>

        {/* Scrollable Page Content */}
        <Content
          style={{
            flex: 1,
            minHeight: 0,
            minWidth: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: isMobile ? '16px' : '24px 28px',
            boxSizing: 'border-box',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

export default AdminShell;
