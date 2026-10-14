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
  Spin,
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
  CalendarOutlined,
  InfoCircleOutlined,
  DownloadOutlined,
  BellOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import api from '../../services/api.js';
import { brandTokens } from '../../theme/tokens.js';
import { AnalyticsChart } from './components/AnalyticsChart.jsx';
import { DataTable } from '../../components/common/DataTable.jsx';

const { Title, Paragraph, Text } = Typography;
const { RangePicker } = DatePicker;

export function DashboardPage() {
  const { user } = useSelector((state) => state.auth);
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);
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

      const res = await api.get('/admin/dashboard', { params });
      setDashboardData(res.data);
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
      // Clear filter
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

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', paddingBottom: 32 }}>
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <span style={{ color: '#5c7480' }}>Home</span> },
          { title: <strong>{t('dashboard.breadcrumb')}</strong> },
        ]}
      />

      {/* Header and Filter Toolbar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <Title level={2} style={{ margin: 0, fontSize: 24, color: brandTokens.navy }}>
            {t('dashboard.title')}
          </Title>
          <Paragraph type="secondary" style={{ margin: '4px 0 0 0' }}>
            {t('dashboard.subtitle')}
          </Paragraph>
        </div>

        {/* Global Toolbar */}
        <Space wrap size={12} align="center">
          <RangePicker
            value={dateRange}
            onChange={handleDateChange}
            allowClear={false}
            placeholder={[t('dashboard.from'), t('dashboard.to')]}
            style={{ borderRadius: 6 }}
          />

          <Space size={6} align="center">
            <label
              htmlFor="dashboard-group-by-select"
              style={{ fontSize: 13, fontWeight: 500, color: '#5c7480', cursor: 'pointer' }}
            >
              {t('dashboard.groupBy')}:
            </label>
            <Select
              id="dashboard-group-by-select"
              aria-label={t('dashboard.groupBy')}
              value={groupBy}
              onChange={(val) => setGroupBy(val)}
              style={{ width: 110 }}
              options={[
                { value: 'day', label: t('dashboard.day') },
                { value: 'month', label: t('dashboard.month') },
                { value: 'year', label: t('dashboard.year') },
              ]}
            />
          </Space>

          <Button onClick={handleResetFilters}>
            {t('dashboard.resetFilter')}
          </Button>

          <Button
            icon={<ReloadOutlined />}
            onClick={() => fetchDashboard(dateRange, groupBy)}
            loading={loading}
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

      {/* Summary Metrics (Compact KPI Summaries) */}
      <div style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          {/* Active Jobs */}
          <Col xs={24} sm={12} lg={6}>
            <Card
              variant="outlined"
              style={{ borderRadius: 12, border: '1px solid #dce9ed' }}
              styles={{ body: { padding: 18 } }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Statistic
                  title={t('dashboard.activeJobs')}
                  value={kpis?.activeJobs?.count ?? '—'}
                  valueStyle={{ fontSize: 24, fontWeight: 700, color: brandTokens.navy }}
                />
                <Tooltip title={t('dashboard.pendingDescription')}>
                  <Tag color="orange" style={{ margin: 0, fontSize: 11 }}>
                    {t('dashboard.modulePending')}
                  </Tag>
                </Tooltip>
              </div>
            </Card>
          </Col>

          {/* Inactive Jobs */}
          <Col xs={24} sm={12} lg={6}>
            <Card
              variant="outlined"
              style={{ borderRadius: 12, border: '1px solid #dce9ed' }}
              styles={{ body: { padding: 18 } }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Statistic
                  title={t('dashboard.inactiveJobs')}
                  value={kpis?.inactiveJobs?.count ?? '—'}
                  valueStyle={{ fontSize: 24, fontWeight: 700, color: '#5c7480' }}
                />
                <Tooltip title={t('dashboard.pendingDescription')}>
                  <Tag color="orange" style={{ margin: 0, fontSize: 11 }}>
                    {t('dashboard.modulePending')}
                  </Tag>
                </Tooltip>
              </div>
            </Card>
          </Col>

          {/* Total Companies / Employers */}
          <Col xs={24} sm={12} lg={6}>
            <Card
              variant="outlined"
              style={{ borderRadius: 12, border: '1px solid #dce9ed' }}
              styles={{ body: { padding: 18 } }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Statistic
                  title={t('dashboard.totalCompanies')}
                  value={kpis?.totalCompanies?.count ?? '—'}
                  valueStyle={{ fontSize: 24, fontWeight: 700, color: brandTokens.navy }}
                  prefix={<SolutionOutlined style={{ color: brandTokens.teal, marginRight: 8, fontSize: 18 }} />}
                />
                <Tooltip title={t('dashboard.pendingDescription')}>
                  <Tag color="orange" style={{ margin: 0, fontSize: 11 }}>
                    {t('dashboard.modulePending')}
                  </Tag>
                </Tooltip>
              </div>
            </Card>
          </Col>

          {/* Total Candidates */}
          <Col xs={24} sm={12} lg={6}>
            <Card
              variant="outlined"
              style={{ borderRadius: 12, border: '1px solid #dce9ed' }}
              styles={{ body: { padding: 18 } }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Statistic
                  title={t('dashboard.totalCandidates')}
                  value={kpis?.totalCandidates?.count ?? '—'}
                  valueStyle={{ fontSize: 24, fontWeight: 700, color: brandTokens.navy }}
                  prefix={<UsergroupAddOutlined style={{ color: brandTokens.amber, marginRight: 8, fontSize: 18 }} />}
                />
                <Tooltip title={t('dashboard.pendingDescription')}>
                  <Tag color="orange" style={{ margin: 0, fontSize: 11 }}>
                    {t('dashboard.modulePending')}
                  </Tag>
                </Tooltip>
              </div>
            </Card>
          </Col>

          {/* Connected Real Metrics: Active Administrators */}
          <Col xs={24} sm={12} lg={6}>
            <Card
              variant="outlined"
              style={{ borderRadius: 12, border: '1px solid #dce9ed' }}
              styles={{ body: { padding: 18 } }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Statistic
                  title={t('dashboard.activeAdmins')}
                  value={kpis?.activeAdmins?.count ?? (loading ? '...' : (fetchError ? '—' : 1))}
                  valueStyle={{ fontSize: 24, fontWeight: 700, color: brandTokens.teal }}
                  prefix={<CheckCircleOutlined style={{ color: brandTokens.teal, marginRight: 8, fontSize: 18 }} />}
                />
                <Tag color="green" style={{ margin: 0, fontSize: 11 }}>
                  Live Data
                </Tag>
              </div>
            </Card>
          </Col>

          {/* Connected Real Metrics: Total Administrators */}
          <Col xs={24} sm={12} lg={6}>
            <Card
              variant="outlined"
              style={{ borderRadius: 12, border: '1px solid #dce9ed' }}
              styles={{ body: { padding: 18 } }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Statistic
                  title={t('dashboard.totalAdmins')}
                  value={kpis?.totalAdmins?.count ?? (loading ? '...' : (fetchError ? '—' : 1))}
                  valueStyle={{ fontSize: 24, fontWeight: 700, color: brandTokens.navy }}
                  prefix={<TeamOutlined style={{ color: brandTokens.navy, marginRight: 8, fontSize: 18 }} />}
                />
                <Tag color="green" style={{ margin: 0, fontSize: 11 }}>
                  Live Data
                </Tag>
              </div>
            </Card>
          </Col>

          {/* Connected Real Metrics: Security Events */}
          <Col xs={24} sm={12} lg={6}>
            <Card
              variant="outlined"
              style={{ borderRadius: 12, border: '1px solid #dce9ed' }}
              styles={{ body: { padding: 18 } }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Statistic
                  title={t('dashboard.securityEvents')}
                  value={kpis?.totalAuditEvents?.count ?? (loading ? '...' : (fetchError ? '—' : 0))}
                  valueStyle={{ fontSize: 24, fontWeight: 700, color: brandTokens.amber }}
                  prefix={<AuditOutlined style={{ color: brandTokens.amber, marginRight: 8, fontSize: 18 }} />}
                />
                <Tag color="green" style={{ margin: 0, fontSize: 11 }}>
                  In Range
                </Tag>
              </div>
            </Card>
          </Col>

          {/* Connected Real Metrics: MFA Adoption */}
          <Col xs={24} sm={12} lg={6}>
            <Card
              variant="outlined"
              style={{ borderRadius: 12, border: '1px solid #dce9ed' }}
              styles={{ body: { padding: 18 } }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Statistic
                  title={t('dashboard.mfaAdoption')}
                  value={kpis?.mfaAdoption?.percentage ?? (loading ? '...' : (fetchError ? '—' : 100))}
                  suffix="%"
                  valueStyle={{ fontSize: 24, fontWeight: 700, color: brandTokens.success }}
                  prefix={<SafetyCertificateOutlined style={{ color: brandTokens.success, marginRight: 8, fontSize: 18 }} />}
                />
                <Tag color="green" style={{ margin: 0, fontSize: 11 }}>
                  Enforced
                </Tag>
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      {/* Analytics Charts & Notifications Row */}
      <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={16}>
          <Tabs
            defaultActiveKey="audit"
            type="card"
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
                    pendingMessage={t('dashboard.pendingDescription')}
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
                    pendingMessage={t('dashboard.pendingDescription')}
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
                    pendingMessage={t('dashboard.pendingDescription')}
                  />
                ),
              },
            ]}
          />
        </Col>

        {/* Notifications & System Health */}
        <Col xs={24} lg={8}>
          <Card
            title={
              <Space>
                <BellOutlined style={{ color: brandTokens.teal }} />
                <span>{t('dashboard.recentNotifications')}</span>
                <Badge count={0} style={{ backgroundColor: '#8fa9b5' }} />
              </Space>
            }
            style={{ borderRadius: 12, border: '1px solid #dce9ed', minHeight: 330 }}
            styles={{ body: { padding: 20 } }}
          >
            <div
              style={{
                textAlign: 'center',
                padding: '30px 10px',
                color: '#5c7480',
              }}
            >
              <InfoCircleOutlined style={{ fontSize: 32, color: brandTokens.teal, marginBottom: 12 }} />
              <div style={{ fontWeight: 600, color: brandTokens.navy, marginBottom: 6 }}>
                0 Unread Notifications
              </div>
              <div style={{ fontSize: 13 }}>
                {t('dashboard.noNotifications')}
              </div>
            </div>

            <div
              style={{
                borderTop: '1px solid #e4edf0',
                paddingTop: 16,
                marginTop: 16,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: '#5c7480', marginBottom: 8, textTransform: 'uppercase' }}>
                System Telemetry
              </div>
              <Space direction="vertical" style={{ width: '100%', fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">Security Posture</Text>
                  <Tag color="success">AES-256-GCM / Argon2id</Tag>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">Session Authority</Text>
                  <Tag color="cyan">Redis Session Store</Tag>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">Database Target</Text>
                  <Tag color="blue">PostgreSQL (Isolated)</Tag>
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
            style={{ borderColor: brandTokens.teal, color: brandTokens.navy }}
          >
            {t('dashboard.exportCsv')}
          </Button>
        }
      />
    </div>
  );
}
