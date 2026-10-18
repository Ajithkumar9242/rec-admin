import React, { useState, useEffect, useCallback } from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Typography,
  Space,
  Button,
  DatePicker,
  Select,
  Tag,
  Alert,
  Tabs,
  Badge,
  Tooltip,
  Breadcrumb,
} from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  SafetyCertificateOutlined,
  AuditOutlined,
  SolutionOutlined,
  UsergroupAddOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  DownloadOutlined,
  BellOutlined,
  FileTextOutlined,
  FileDoneOutlined,
  LockOutlined,
  DatabaseOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import api from '../../services/api.js';
import { jobsApi } from '../../services/jobsApi.js';
import { companiesApi } from '../../services/companiesApi.js';
import { candidateApi } from '../../services/candidateApi.js';
import { brandTokens, lightSemanticTokens, darkSemanticTokens } from '../../theme/tokens.js';
import { AnalyticsChart } from './components/AnalyticsChart.jsx';
import { DataTable } from '../../components/common/DataTable.jsx';

const { Title, Paragraph, Text } = Typography;
const { RangePicker } = DatePicker;

export function DashboardPage() {
  const { user } = useSelector((state) => state.auth);
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);
  const semantic = isDarkMode ? darkSemanticTokens : lightSemanticTokens;
  const { t } = useTranslation();

  // Filter States
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(30, 'day'),
    dayjs(),
  ]);
  const [groupBy, setGroupBy] = useState('day');
  const [dateError, setDateError] = useState(null);

  // Data States
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Module Live KPI states
  const [jobStats, setJobStats] = useState({ loading: true, error: null, active: null, inactive: null, connected: false });
  const [companyStats, setCompanyStats] = useState({ loading: true, error: null, total: null, connected: false });
  const [candidateStats, setCandidateStats] = useState({ loading: true, error: null, total: null, connected: false });

  const fetchDashboard = useCallback(async (customRange = dateRange, customGroup = groupBy) => {
    // Validate range
    if (customRange && customRange[0] && customRange[1]) {
      if (customRange[0].isAfter(customRange[1])) {
        setDateError(t('dashboard.filterError'));
        return;
      }
    }
    setDateError(null);
    setLoading(true);
    setFetchError(null);

    try {
      const params = {};
      if (customRange && customRange[0] && customRange[1]) {
        params.from = customRange[0].format('YYYY-MM-DD');
        params.to = customRange[1].format('YYYY-MM-DD');
      }
      if (customGroup) {
        params.groupBy = customGroup;
      }

      // Concurrently query dashboard endpoint and module data sources
      const [dashRes, jobsRes, compRes, candRes] = await Promise.allSettled([
        api.get('/admin/dashboard', { params }),
        jobsApi.getJobs({ limit: 1 }),
        companiesApi.getStatusSummary(),
        candidateApi.getCandidates({ limit: 1 }),
      ]);

      if (dashRes.status === 'fulfilled') {
        setDashboardData(dashRes.value.data);
      } else {
        setFetchError(dashRes.reason?.response?.data?.error || 'Failed to load dashboard data.');
      }

      // 1 & 2: Process Jobs stats (PUBLISHED = active, non-published non-trashed = inactive)
      if (jobsRes.status === 'fulfilled' && jobsRes.value?.counts) {
        const counts = jobsRes.value.counts;
        const active = typeof counts.PUBLISHED === 'number' ? counts.PUBLISHED : 0;
        const inactive = (counts.DRAFT || 0) + (counts.PENDING_APPROVAL || 0) + (counts.CLOSED || 0) + (counts.ARCHIVED || 0);
        setJobStats({ loading: false, error: null, active, inactive, connected: true });
      } else {
        const err = jobsRes.status === 'rejected' ? (jobsRes.reason?.response?.data?.error || jobsRes.reason?.message) : null;
        setJobStats({ loading: false, error: err, active: null, inactive: null, connected: false });
      }

      // 3: Process Employers stats (ALL non-trashed companies)
      if (compRes.status === 'fulfilled' && compRes.value?.success && compRes.value?.data) {
        const total = typeof compRes.value.data.ALL === 'number' ? compRes.value.data.ALL : 0;
        setCompanyStats({ loading: false, error: null, total, connected: true });
      } else {
        const err = compRes.status === 'rejected' ? (compRes.reason?.response?.data?.error || compRes.reason?.message) : null;
        setCompanyStats({ loading: false, error: err, total: null, connected: false });
      }

      // 4: Process Candidates stats (canonical non-trashed candidate records)
      if (candRes.status === 'fulfilled' && candRes.value?.pagination && typeof candRes.value.pagination.total === 'number') {
        const total = candRes.value.pagination.total;
        setCandidateStats({ loading: false, error: null, total, connected: true });
      } else {
        const err = candRes.status === 'rejected' ? (candRes.reason?.response?.data?.error || candRes.reason?.message) : null;
        setCandidateStats({ loading: false, error: err, total: null, connected: false });
      }
    } catch (err) {
      setFetchError(err.response?.data?.error || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [dateRange, groupBy, t]);

  useEffect(() => {
    fetchDashboard(dateRange, groupBy);
  }, [dateRange, groupBy, fetchDashboard]);

  const handleDateChange = (dates) => {
    if (!dates || !dates[0] || !dates[1]) {
      const defaultRange = [dayjs().subtract(30, 'day'), dayjs()];
      setDateRange(defaultRange);
      return;
    }
    if (dates[0].isAfter(dates[1])) {
      setDateError(t('dashboard.filterError'));
      return;
    }
    setDateError(null);
    setDateRange(dates);
  };

  const handleResetFilters = () => {
    const defaultRange = [dayjs().subtract(30, 'day'), dayjs()];
    setDateRange(defaultRange);
    setGroupBy('day');
    setDateError(null);
  };

  const handleServerExport = async () => {
    setExporting(true);
    try {
      const params = {};
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.from = dateRange[0].format('YYYY-MM-DD');
        params.to = dateRange[1].format('YYYY-MM-DD');
      }
      const response = await api.get('/admin/audit-logs/export', {
        params,
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit_logs_${dateRange[0].format('YYYYMMDD')}_${dateRange[1].format('YYYYMMDD')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setFetchError('Failed to generate export file.');
    } finally {
      setExporting(false);
    }
  };

  const getEventTag = (type) => {
    switch (type) {
      case 'LOGIN_SUCCESS':
        return <Tag color="success">LOGIN SUCCESS</Tag>;
      case 'LOGIN_FAILURE':
        return <Tag color="error">LOGIN FAILURE</Tag>;
      case 'TWO_FACTOR_VERIFIED':
        return <Tag color="cyan">2FA VERIFIED</Tag>;
      case 'TWO_FACTOR_ENROLLED':
        return <Tag color="blue">2FA ENROLLED</Tag>;
      case 'BACKUP_CODE_USED':
        return <Tag color="warning">BACKUP CODE USED</Tag>;
      case 'PASSWORD_RESET_COMPLETED':
        return <Tag color="purple">PASSWORD RESET</Tag>;
      case 'ACCOUNT_LOCKED':
        return <Tag color="red">ACCOUNT LOCKED</Tag>;
      case 'LOGOUT':
        return <Tag color="default">LOGOUT</Tag>;
      default:
        return <Tag>{type}</Tag>;
    }
  };

  const activityColumns = [
    {
      title: t('shell.eventTime'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (val) => new Date(val).toLocaleString(),
    },
    {
      title: t('shell.eventType'),
      dataIndex: 'eventType',
      key: 'eventType',
      render: (type) => getEventTag(type),
    },
    {
      title: t('shell.adminUser'),
      key: 'admin',
      render: (_, record) => (
        <span>{record.admin ? `${record.admin.name} (${record.admin.email})` : 'System'}</span>
      ),
    },
    {
      title: t('shell.ipAddress'),
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      render: (ip) => ip || 'Unknown',
    },
  ];

  const kpis = dashboardData?.kpis;
  const charts = dashboardData?.charts;

  // Modern Minimalist KPI Card Renderer
  const renderKpiCard = ({ title, value, icon, badge, isConnected = true, tooltipText = null }) => (
    <Card
      style={{
        borderRadius: 12,
        border: `1px solid ${semantic.borderDefault}`,
        background: semantic.bgCard,
        boxShadow: isDarkMode ? 'none' : '0 1px 3px rgba(0,0,0,0.02)',
        height: '100%',
      }}
      styles={{
        body: {
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '100%',
        },
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: isDarkMode ? 'rgba(79, 168, 192, 0.12)' : 'rgba(22, 49, 63, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
            }}
          >
            {icon}
          </div>
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: semantic.textSecondary,
              lineHeight: 1.3,
            }}
          >
            {title}
          </span>
        </div>

        {badge}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div
          style={{
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: isConnected ? semantic.textPrimary : semantic.textDisabled,
            lineHeight: 1.1,
          }}
        >
          {value}
        </div>

        {!isConnected && tooltipText && (
          <Tooltip title={tooltipText}>
            <InfoCircleOutlined style={{ fontSize: 13, color: semantic.textDisabled, cursor: 'help' }} />
          </Tooltip>
        )}
      </div>
    </Card>
  );

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 32 }}>
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        style={{ marginBottom: 16, fontSize: 13 }}
        items={[
          { title: <span style={{ color: semantic.textSecondary }}>Home</span> },
          { title: <strong style={{ color: semantic.textPrimary }}>{t('dashboard.breadcrumb')}</strong> },
        ]}
      />

      {/* Modern Header and Filter Toolbar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <Title
            level={2}
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: semantic.textPrimary,
            }}
          >
            {t('dashboard.title')}
          </Title>
          <Paragraph
            style={{
              margin: '3px 0 0 0',
              fontSize: 13,
              color: semantic.textSecondary,
            }}
          >
            {t('dashboard.subtitle')}
          </Paragraph>
        </div>

        {/* Global Toolbar */}
        <Space wrap size={10} align="center">
          <RangePicker
            value={dateRange}
            onChange={handleDateChange}
            allowClear={false}
            placeholder={[t('dashboard.from'), t('dashboard.to')]}
            style={{ borderRadius: 8, height: 38 }}
          />

          <Space size={6} align="center">
            <label
              htmlFor="dashboard-group-by-select"
              style={{ fontSize: 13, fontWeight: 500, color: semantic.textSecondary, cursor: 'pointer' }}
            >
              {t('dashboard.groupBy')}:
            </label>
            <Select
              id="dashboard-group-by-select"
              aria-label={t('dashboard.groupBy')}
              value={groupBy}
              onChange={(val) => setGroupBy(val)}
              style={{ width: 110, height: 38 }}
              options={[
                { value: 'day', label: t('dashboard.day') },
                { value: 'month', label: t('dashboard.month') },
                { value: 'year', label: t('dashboard.year') },
              ]}
            />
          </Space>

          <Button onClick={handleResetFilters} style={{ height: 38, borderRadius: 8 }}>
            {t('dashboard.resetFilter')}
          </Button>

          <Button
            icon={<ReloadOutlined />}
            onClick={() => fetchDashboard(dateRange, groupBy)}
            loading={loading}
            style={{ height: 38, borderRadius: 8 }}
          >
            {t('dashboard.refresh')}
          </Button>
        </Space>
      </div>

      {dateError && (
        <Alert
          message={dateError}
          type="warning"
          showIcon
          style={{ marginBottom: 20, borderRadius: 8 }}
        />
      )}

      {fetchError && (
        <Alert
          message={fetchError}
          type="error"
          showIcon
          action={
            <Button size="small" danger onClick={() => fetchDashboard(dateRange, groupBy)}>
              {t('common.retry') || 'Retry'}
            </Button>
          }
          style={{ marginBottom: 20, borderRadius: 8 }}
        />
      )}

      {/* 8 KPI Cards Grid */}
      <div style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          {/* 1. Active Jobs */}
          <Col xs={24} sm={12} lg={6}>
            {(() => {
              const isConnected = jobStats.connected || Boolean(kpis?.activeJobs?.connected);
              const val = isConnected
                ? (jobStats.connected ? jobStats.active : kpis?.activeJobs?.count)
                : (jobStats.loading || loading ? '...' : '—');
              return renderKpiCard({
                title: t('dashboard.activeJobs'),
                value: val,
                icon: <FileTextOutlined style={{ color: brandTokens.teal }} />,
                badge: isConnected ? (
                  <Tag color="success" style={{ margin: 0, fontSize: 11, borderRadius: 4 }}>
                    Live Data
                  </Tag>
                ) : (
                  <Tag
                    style={{
                      margin: 0,
                      fontSize: 11,
                      borderRadius: 4,
                      background: isDarkMode ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                      borderColor: semantic.borderDefault,
                      color: semantic.textSecondary,
                    }}
                  >
                    {jobStats.error ? 'Unavailable' : 'Not connected'}
                  </Tag>
                ),
                isConnected,
                tooltipText: isConnected ? null : (jobStats.error || 'Jobs database integration scheduled for Phase 3'),
              });
            })()}
          </Col>

          {/* 2. Inactive Jobs */}
          <Col xs={24} sm={12} lg={6}>
            {(() => {
              const isConnected = jobStats.connected || Boolean(kpis?.inactiveJobs?.connected);
              const val = isConnected
                ? (jobStats.connected ? jobStats.inactive : kpis?.inactiveJobs?.count)
                : (jobStats.loading || loading ? '...' : '—');
              return renderKpiCard({
                title: t('dashboard.inactiveJobs'),
                value: val,
                icon: <FileDoneOutlined style={{ color: '#8fa9b5' }} />,
                badge: isConnected ? (
                  <Tag color="default" style={{ margin: 0, fontSize: 11, borderRadius: 4 }}>
                    Live Data
                  </Tag>
                ) : (
                  <Tag
                    style={{
                      margin: 0,
                      fontSize: 11,
                      borderRadius: 4,
                      background: isDarkMode ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                      borderColor: semantic.borderDefault,
                      color: semantic.textSecondary,
                    }}
                  >
                    {jobStats.error ? 'Unavailable' : 'Not connected'}
                  </Tag>
                ),
                isConnected,
                tooltipText: isConnected ? null : (jobStats.error || 'Jobs database integration scheduled for Phase 3'),
              });
            })()}
          </Col>

          {/* 3. Total Employers */}
          <Col xs={24} sm={12} lg={6}>
            {(() => {
              const isConnected = companyStats.connected || Boolean(kpis?.totalCompanies?.connected);
              const val = isConnected
                ? (companyStats.connected ? companyStats.total : kpis?.totalCompanies?.count)
                : (companyStats.loading || loading ? '...' : '—');
              return renderKpiCard({
                title: t('dashboard.totalCompanies'),
                value: val,
                icon: <SolutionOutlined style={{ color: brandTokens.navySoft }} />,
                badge: isConnected ? (
                  <Tag color="blue" style={{ margin: 0, fontSize: 11, borderRadius: 4 }}>
                    Live Data
                  </Tag>
                ) : (
                  <Tag
                    style={{
                      margin: 0,
                      fontSize: 11,
                      borderRadius: 4,
                      background: isDarkMode ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                      borderColor: semantic.borderDefault,
                      color: semantic.textSecondary,
                    }}
                  >
                    {companyStats.error ? 'Unavailable' : 'Not connected'}
                  </Tag>
                ),
                isConnected,
                tooltipText: isConnected ? null : (companyStats.error || 'Employers database integration scheduled for Phase 3'),
              });
            })()}
          </Col>

          {/* 4. Total Candidates */}
          <Col xs={24} sm={12} lg={6}>
            {(() => {
              const isConnected = candidateStats.connected || Boolean(kpis?.totalCandidates?.connected);
              const val = isConnected
                ? (candidateStats.connected ? candidateStats.total : kpis?.totalCandidates?.count)
                : (candidateStats.loading || loading ? '...' : '—');
              return renderKpiCard({
                title: t('dashboard.totalCandidates'),
                value: val,
                icon: <UsergroupAddOutlined style={{ color: brandTokens.amber }} />,
                badge: isConnected ? (
                  <Tag color="purple" style={{ margin: 0, fontSize: 11, borderRadius: 4 }}>
                    Live Data
                  </Tag>
                ) : (
                  <Tag
                    style={{
                      margin: 0,
                      fontSize: 11,
                      borderRadius: 4,
                      background: isDarkMode ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                      borderColor: semantic.borderDefault,
                      color: semantic.textSecondary,
                    }}
                  >
                    {candidateStats.error ? 'Unavailable' : 'Not connected'}
                  </Tag>
                ),
                isConnected,
                tooltipText: isConnected ? null : (candidateStats.error || 'Candidates database integration scheduled for Phase 3'),
              });
            })()}
          </Col>

          {/* 5. Active Accounts */}
          <Col xs={24} sm={12} lg={6}>
            {renderKpiCard({
              title: t('dashboard.activeAdmins'),
              value: kpis?.activeAdmins?.count ?? (loading ? '...' : (fetchError ? '—' : 1)),
              icon: <CheckCircleOutlined style={{ color: brandTokens.teal }} />,
              badge: (
                <Tag color="success" style={{ margin: 0, fontSize: 11, borderRadius: 4 }}>
                  Live Data
                </Tag>
              ),
              isConnected: true,
            })}
          </Col>

          {/* 6. Total Administrators */}
          <Col xs={24} sm={12} lg={6}>
            {renderKpiCard({
              title: t('dashboard.totalAdmins'),
              value: kpis?.totalAdmins?.count ?? (loading ? '...' : (fetchError ? '—' : 1)),
              icon: <TeamOutlined style={{ color: brandTokens.navy }} />,
              badge: (
                <Tag color="blue" style={{ margin: 0, fontSize: 11, borderRadius: 4 }}>
                  Live Data
                </Tag>
              ),
              isConnected: true,
            })}
          </Col>

          {/* 7. Security Audit Events */}
          <Col xs={24} sm={12} lg={6}>
            {renderKpiCard({
              title: t('dashboard.securityEvents'),
              value: kpis?.totalAuditEvents?.count ?? (loading ? '...' : (fetchError ? '—' : 0)),
              icon: <AuditOutlined style={{ color: brandTokens.amber }} />,
              badge: (
                <Tag color="warning" style={{ margin: 0, fontSize: 11, borderRadius: 4 }}>
                  In Range
                </Tag>
              ),
              isConnected: true,
            })}
          </Col>

          {/* 8. MFA Adoption Rate */}
          <Col xs={24} sm={12} lg={6}>
            {renderKpiCard({
              title: t('dashboard.mfaAdoption'),
              value: `${kpis?.mfaAdoption?.percentage ?? (loading ? '...' : (fetchError ? '—' : 100))}%`,
              icon: <SafetyCertificateOutlined style={{ color: brandTokens.success }} />,
              badge: (
                <Tag color="success" style={{ margin: 0, fontSize: 11, borderRadius: 4 }}>
                  Enforced
                </Tag>
              ),
              isConnected: true,
            })}
          </Col>
        </Row>
      </div>

      {/* Analytics Charts & Notifications Row */}
      <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={16}>
          <div
            style={{
              background: semantic.bgCard,
              border: `1px solid ${semantic.borderDefault}`,
              borderRadius: 12,
              padding: '16px 20px',
            }}
          >
            <Tabs
              defaultActiveKey="audit"
              items={[
                {
                  key: 'audit',
                  label: t('dashboard.chartAudit'),
                  children: (
                    <AnalyticsChart
                      title={t('dashboard.chartAudit')}
                      data={charts?.auditActivity?.series || []}
                      connected={true}
                      groupBy={groupBy}
                      color={brandTokens.teal}
                    />
                  ),
                },
                {
                  key: 'jobs',
                  label: t('dashboard.chartJobs'),
                  children: (
                    <AnalyticsChart
                      title={t('dashboard.chartJobs')}
                      connected={false}
                      pendingMessage="Job Postings analytics will display here when connected."
                    />
                  ),
                },
                {
                  key: 'candidates',
                  label: t('dashboard.chartCandidates'),
                  children: (
                    <AnalyticsChart
                      title={t('dashboard.chartCandidates')}
                      connected={false}
                      pendingMessage="Candidate Registrations analytics will display here when connected."
                    />
                  ),
                },
                {
                  key: 'employers',
                  label: t('dashboard.chartEmployers'),
                  children: (
                    <AnalyticsChart
                      title={t('dashboard.chartEmployers')}
                      connected={false}
                      pendingMessage="Employer Registrations analytics will display here when connected."
                    />
                  ),
                },
              ]}
            />
          </div>
        </Col>

        {/* Notifications & System Health */}
        <Col xs={24} lg={8}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Space size={8}>
                  <BellOutlined style={{ color: brandTokens.teal }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: semantic.textPrimary }}>
                    {t('dashboard.recentNotifications')}
                  </span>
                </Space>
                <Badge count={0} style={{ backgroundColor: '#8fa9b5' }} />
              </div>
            }
            style={{
              borderRadius: 12,
              border: `1px solid ${semantic.borderDefault}`,
              background: semantic.bgCard,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
            styles={{ body: { padding: 20, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' } }}
          >
            <div
              style={{
                textAlign: 'center',
                padding: '24px 10px',
                color: semantic.textSecondary,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: isDarkMode ? 'rgba(79, 168, 192, 0.1)' : '#f0f9fb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px auto',
                }}
              >
                <BellOutlined style={{ fontSize: 20, color: brandTokens.teal }} />
              </div>
              <div style={{ fontWeight: 600, fontSize: 13, color: semantic.textPrimary, marginBottom: 4 }}>
                0 Unread Notifications
              </div>
              <div style={{ fontSize: 12, color: semantic.textSecondary, maxWidth: 260, margin: '0 auto' }}>
                Notifications are not connected yet.
              </div>
            </div>

            <div
              style={{
                borderTop: `1px solid ${semantic.borderSubtle}`,
                paddingTop: 16,
                marginTop: 16,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: semantic.textSecondary,
                  marginBottom: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <ApiOutlined style={{ color: brandTokens.teal }} />
                <span>System Telemetry</span>
              </div>
              <Space direction="vertical" style={{ width: '100%', fontSize: 12 }} size={8}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Space size={6}>
                    <LockOutlined style={{ fontSize: 12, color: semantic.textSecondary }} />
                    <Text type="secondary" style={{ fontSize: 12 }}>Security Posture</Text>
                  </Space>
                  <Tag color="success" style={{ margin: 0, fontSize: 11, borderRadius: 4 }}>
                    AES-256-GCM / Argon2id
                  </Tag>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Space size={6}>
                    <DatabaseOutlined style={{ fontSize: 12, color: semantic.textSecondary }} />
                    <Text type="secondary" style={{ fontSize: 12 }}>Session Authority</Text>
                  </Space>
                  <Tag color="cyan" style={{ margin: 0, fontSize: 11, borderRadius: 4 }}>
                    Redis Session Store
                  </Tag>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Space size={6}>
                    <ServerOutlinedIcon style={{ fontSize: 12, color: semantic.textSecondary }} />
                    <Text type="secondary" style={{ fontSize: 12 }}>Database Target</Text>
                  </Space>
                  <Tag color="blue" style={{ margin: 0, fontSize: 11, borderRadius: 4 }}>
                    PostgreSQL (Isolated)
                  </Tag>
                </div>
              </Space>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Recent Activity Table using Reusable DataTable Component */}
      <DataTable
        title={t('dashboard.recentActivity')}
        subtitle="Chronological security audit events recorded by the platform."
        columns={activityColumns}
        dataSource={dashboardData?.recentActivity || []}
        loading={loading}
        exportable={true}
        exportFilename="audit_activity_export"
        extraActions={
          <Button
            icon={<DownloadOutlined />}
            onClick={handleServerExport}
            loading={exporting}
            style={{ borderRadius: 6, fontWeight: 500 }}
          >
            {t('dashboard.exportCsv')}
          </Button>
        }
      />
    </div>
  );
}

// Compact helper icon for database server
function ServerOutlinedIcon({ style }) {
  return <DatabaseOutlined style={style} />;
}

export default DashboardPage;
