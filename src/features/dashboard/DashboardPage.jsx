import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Input,
  Modal,
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
  SearchOutlined,
  EyeOutlined,
  ShopOutlined,
  AppstoreOutlined,
  DollarOutlined,
  SettingOutlined,
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

/**
 * Aggregates database records into time-series buckets (day, month, or year) within a date range.
 */
function aggregateTimeSeries(items, dateField = 'createdAt', groupBy = 'day', fromDate = null, toDate = null) {
  if (!Array.isArray(items) || items.length === 0) return [];

  const buckets = {};

  items.forEach((item) => {
    const rawDate = item[dateField];
    if (!rawDate) return;
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return;

    if (fromDate && d < fromDate) return;
    if (toDate && d > toDate) return;

    let key;
    if (groupBy === 'month') {
      key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
    } else if (groupBy === 'year') {
      key = `${d.getUTCFullYear()}-01-01`;
    } else {
      key = d.toISOString().slice(0, 10);
    }

    buckets[key] = (buckets[key] || 0) + 1;
  });

  return Object.keys(buckets)
    .sort()
    .map((bucket) => ({ bucket, count: buckets[bucket] }));
}

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

  // Module Live KPI & Analytics states
  const [jobStats, setJobStats] = useState({
    loading: true,
    error: null,
    total: 0,
    active: 0,
    inactive: 0,
    counts: {},
    series: [],
    connected: false,
  });

  const [companyStats, setCompanyStats] = useState({
    loading: true,
    error: null,
    total: 0,
    counts: {},
    series: [],
    connected: false,
  });

  const [candidateStats, setCandidateStats] = useState({
    loading: true,
    error: null,
    total: 0,
    active: 0,
    pending: 0,
    inactive: 0,
    series: [],
    connected: false,
  });

  // Recent Activity Feed State
  const [activityCategory, setActivityCategory] = useState('ALL');
  const [activitySearch, setActivitySearch] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

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

    const fromDateObj = customRange && customRange[0] ? customRange[0].toDate() : null;
    const toDateObj = customRange && customRange[1] ? customRange[1].toDate() : null;

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
      const [dashRes, jobsRes, compSummaryRes, compListRes, candRes] = await Promise.allSettled([
        api.get('/admin/dashboard', { params }),
        jobsApi.getJobs({ limit: 100 }),
        companiesApi.getStatusSummary(),
        companiesApi.getCompanies({ limit: 100 }),
        candidateApi.getCandidates({ limit: 100 }),
      ]);

      if (dashRes.status === 'fulfilled') {
        setDashboardData(dashRes.value.data);
      } else {
        setFetchError(dashRes.reason?.response?.data?.error || 'Failed to load dashboard data.');
      }

      // 1. Process Jobs Analytics & Stats
      if (dashRes.status === 'fulfilled' && dashRes.value.data?.charts?.jobPostings?.connected) {
        const chartJob = dashRes.value.data.charts.jobPostings;
        const counts = chartJob.counts || {};
        const active = typeof chartJob.active === 'number' ? chartJob.active : (counts.PUBLISHED || 0);
        const inactive = typeof chartJob.inactive === 'number'
          ? chartJob.inactive
          : (counts.DRAFT || 0) + (counts.PENDING_APPROVAL || 0) + (counts.CLOSED || 0) + (counts.ARCHIVED || 0);
        const total = typeof chartJob.total === 'number' ? chartJob.total : (active + inactive);

        setJobStats({
          loading: false,
          error: null,
          total,
          active,
          inactive,
          counts,
          series: Array.isArray(chartJob.series) ? chartJob.series : [],
          connected: true,
        });
      } else if (jobsRes.status === 'fulfilled') {
        const jobsPayload = jobsRes.value;
        const counts = jobsPayload?.counts || {};
        const active = typeof counts.PUBLISHED === 'number' ? counts.PUBLISHED : 0;
        const inactive = (counts.DRAFT || 0) + (counts.PENDING_APPROVAL || 0) + (counts.CLOSED || 0) + (counts.ARCHIVED || 0);
        const total = typeof jobsPayload?.pagination?.total === 'number'
          ? jobsPayload.pagination.total
          : (active + inactive);

        const jobsList = Array.isArray(jobsPayload?.items)
          ? jobsPayload.items
          : (Array.isArray(jobsPayload?.data) ? jobsPayload.data : []);
        const series = aggregateTimeSeries(jobsList, 'createdAt', customGroup, fromDateObj, toDateObj);

        setJobStats({
          loading: false,
          error: null,
          total,
          active,
          inactive,
          counts,
          series,
          connected: true,
        });
      } else {
        const err = jobsRes.reason?.response?.data?.error || jobsRes.reason?.message;
        setJobStats((prev) => ({ ...prev, loading: false, error: err, connected: false }));
      }

      // 2. Process Companies / Employers Analytics & Stats
      if (compSummaryRes.status === 'fulfilled' && compSummaryRes.value?.success) {
        const summary = compSummaryRes.value?.data || {};
        const total = typeof summary.ALL === 'number' ? summary.ALL : 0;
        const compList = compListRes.status === 'fulfilled' && Array.isArray(compListRes.value?.data)
          ? compListRes.value.data
          : (Array.isArray(compListRes.value?.items) ? compListRes.value.items : []);
        const series = aggregateTimeSeries(compList, 'createdAt', customGroup, fromDateObj, toDateObj);

        setCompanyStats({
          loading: false,
          error: null,
          total,
          counts: summary,
          series,
          connected: true,
        });
      } else {
        const err = compSummaryRes.reason?.response?.data?.error || compSummaryRes.reason?.message;
        setCompanyStats((prev) => ({ ...prev, loading: false, error: err, connected: false }));
      }

      // 3. Process Candidates Analytics & Stats
      if (dashRes.status === 'fulfilled' && dashRes.value.data?.charts?.candidateRegistrations?.connected) {
        const chartCand = dashRes.value.data.charts.candidateRegistrations;
        const total = typeof chartCand.total === 'number'
          ? chartCand.total
          : (dashRes.value.data.kpis?.totalCandidates?.count || 0);
        const active = typeof chartCand.active === 'number' ? chartCand.active : 0;
        const pending = typeof chartCand.pending === 'number' ? chartCand.pending : 0;
        const inactive = typeof chartCand.inactive === 'number' ? chartCand.inactive : 0;

        setCandidateStats({
          loading: false,
          error: null,
          total,
          active,
          pending,
          inactive,
          series: Array.isArray(chartCand.series) ? chartCand.series : [],
          connected: true,
        });
      } else if (candRes.status === 'fulfilled' && (candRes.value?.pagination || candRes.value?.items || candRes.value?.data)) {
        const candPayload = candRes.value;
        const candList = Array.isArray(candPayload.items)
          ? candPayload.items
          : (Array.isArray(candPayload.data) ? candPayload.data : []);
        const total = typeof candPayload.pagination?.total === 'number' ? candPayload.pagination.total : candList.length;
        const series = aggregateTimeSeries(candList, 'createdAt', customGroup, fromDateObj, toDateObj);

        const active = candList.filter((c) => (c.status || '').toUpperCase() === 'ACTIVE').length;
        const pending = candList.filter((c) => ['PENDING', 'PENDING_APPROVAL', 'UNVERIFIED', 'IN_REVIEW'].includes((c.status || '').toUpperCase())).length;
        const inactive = candList.filter((c) => ['INACTIVE', 'SUSPENDED'].includes((c.status || '').toUpperCase())).length;

        setCandidateStats({
          loading: false,
          error: null,
          total,
          active,
          pending,
          inactive,
          series,
          connected: true,
        });
      } else {
        const err = candRes.reason?.response?.data?.error || candRes.reason?.message;
        setCandidateStats((prev) => ({ ...prev, loading: false, error: err, connected: false }));
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

  const getCategoryBadge = (category = 'SECURITY') => {
    switch (category.toUpperCase()) {
      case 'SECURITY':
        return <Tag color="gold" style={{ borderRadius: 6, fontWeight: 500, margin: 0 }}>Security</Tag>;
      case 'COMPANY':
        return <Tag color="purple" style={{ borderRadius: 6, fontWeight: 500, margin: 0 }}>Company</Tag>;
      case 'BILLING':
        return <Tag color="green" style={{ borderRadius: 6, fontWeight: 500, margin: 0 }}>Billing</Tag>;
      case 'CONFIGURATION':
        return <Tag color="blue" style={{ borderRadius: 6, fontWeight: 500, margin: 0 }}>Config</Tag>;
      default:
        return <Tag style={{ borderRadius: 6, margin: 0 }}>{category}</Tag>;
    }
  };

  const getOutcomeBadge = (outcome = 'SUCCESS') => {
    switch (outcome.toUpperCase()) {
      case 'SUCCESS':
        return <Tag color="success" style={{ borderRadius: 6, margin: 0 }}>Success</Tag>;
      case 'WARNING':
        return <Tag color="warning" style={{ borderRadius: 6, margin: 0 }}>Warning</Tag>;
      case 'FAILURE':
        return <Tag color="error" style={{ borderRadius: 6, margin: 0 }}>Failure</Tag>;
      default:
        return <Tag color="default" style={{ borderRadius: 6, margin: 0 }}>{outcome}</Tag>;
    }
  };

  const getEventTag = (type = '') => {
    const formatted = type.replace(/_/g, ' ');
    if (type.includes('SUCCESS') || type.includes('CREATED') || type.includes('APPROVED')) {
      return <Tag color="success" style={{ borderRadius: 6, fontSize: 11 }}>{formatted}</Tag>;
    }
    if (type.includes('FAILURE') || type.includes('ERROR') || type.includes('LOCKED')) {
      return <Tag color="error" style={{ borderRadius: 6, fontSize: 11 }}>{formatted}</Tag>;
    }
    if (type.includes('WARNING') || type.includes('SUSPEND') || type.includes('REJECT') || type.includes('BACKUP')) {
      return <Tag color="warning" style={{ borderRadius: 6, fontSize: 11 }}>{formatted}</Tag>;
    }
    if (type.includes('2FA') || type.includes('PASSWORD')) {
      return <Tag color="cyan" style={{ borderRadius: 6, fontSize: 11 }}>{formatted}</Tag>;
    }
    return <Tag color="blue" style={{ borderRadius: 6, fontSize: 11 }}>{formatted}</Tag>;
  };

  // Filtered recent activities
  const recentActivities = dashboardData?.recentActivity || [];
  const filteredActivities = useMemo(() => {
    return recentActivities.filter((act) => {
      // Category filter
      if (activityCategory !== 'ALL') {
        const cat = (act.category || 'SECURITY').toUpperCase();
        if (cat !== activityCategory) return false;
      }
      // Search filter
      if (activitySearch.trim()) {
        const q = activitySearch.toLowerCase();
        const actor = String(act.actor || act.admin?.name || act.admin?.email || '').toLowerCase();
        const action = String(act.eventType || act.action || '').toLowerCase();
        const resource = String(act.resourceName || '').toLowerCase();
        const ip = String(act.ipAddress || '').toLowerCase();
        if (!actor.includes(q) && !action.includes(q) && !resource.includes(q) && !ip.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [recentActivities, activityCategory, activitySearch]);

  const activityColumns = [
    {
      title: t('shell.eventTime'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (val) => {
        const d = new Date(val);
        return (
          <Tooltip title={d.toISOString()}>
            <span style={{ fontSize: 12, color: semantic.textPrimary }}>
              {d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}{' '}
              <span style={{ color: semantic.textSecondary }}>{d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 110,
      render: (cat) => getCategoryBadge(cat),
    },
    {
      title: t('shell.eventType'),
      dataIndex: 'eventType',
      key: 'eventType',
      render: (type, record) => getEventTag(type || record.action),
    },
    {
      title: t('shell.adminUser'),
      key: 'actor',
      render: (_, record) => {
        const name = record.admin ? `${record.admin.name} (${record.admin.email})` : (record.actor || 'System');
        return <span style={{ fontSize: 13, color: semantic.textPrimary }}>{name}</span>;
      },
    },
    {
      title: 'Affected Resource',
      key: 'resourceName',
      render: (_, record) => {
        const resName = record.resourceName || record.company?.name || record.details?.entityType || '—';
        return (
          <Space size={6}>
            <span style={{ fontWeight: 500, fontSize: 13, color: semantic.textPrimary }}>{resName}</span>
            {record.resourceType && record.resourceType !== 'AUTHENTICATION' && (
              <Tag style={{ fontSize: 10, borderRadius: 4, margin: 0, padding: '0 4px' }}>
                {record.resourceType}
              </Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Outcome',
      dataIndex: 'outcome',
      key: 'outcome',
      width: 95,
      render: (outcome) => getOutcomeBadge(outcome),
    },
    {
      title: t('shell.ipAddress'),
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 130,
      render: (ip) => <span style={{ fontSize: 12, fontFamily: 'monospace', color: semantic.textSecondary }}>{ip || '—'}</span>,
    },
    {
      title: 'Details',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Button
          type="text"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => {
            setSelectedEvent(record);
            setIsDetailsModalOpen(true);
          }}
          style={{ borderRadius: 6 }}
        >
          View
        </Button>
      ),
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
                icon: <ShopOutlined style={{ color: '#8b5cf6' }} />,
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
                icon: <UsergroupAddOutlined style={{ color: '#3b82f6' }} />,
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
                  label: (
                    <Space size={6}>
                      <AuditOutlined />
                      <span>{t('dashboard.chartAudit')}</span>
                    </Space>
                  ),
                  children: (
                    <AnalyticsChart
                      title={t('dashboard.chartAudit')}
                      data={charts?.auditActivity?.series || []}
                      connected={true}
                      groupBy={groupBy}
                      color={brandTokens.teal}
                      unitLabel="security event"
                    />
                  ),
                },
                {
                  key: 'jobs',
                  label: (
                    <Space size={6}>
                      <FileTextOutlined />
                      <span>{t('dashboard.chartJobs')}</span>
                    </Space>
                  ),
                  children: (
                    <AnalyticsChart
                      title="Job Postings Trend & Volume"
                      data={jobStats.series}
                      connected={jobStats.connected}
                      groupBy={groupBy}
                      color="#0284c7"
                      unitLabel="job"
                      metricsSummary={[
                        { label: 'Total Jobs', value: jobStats.total, color: 'blue' },
                        { label: 'Published', value: jobStats.counts?.PUBLISHED || 0, color: 'success' },
                        { label: 'Draft', value: jobStats.counts?.DRAFT || 0, color: 'default' },
                        { label: 'Pending Approval', value: jobStats.counts?.PENDING_APPROVAL || 0, color: 'warning' },
                        { label: 'Closed / Archived', value: (jobStats.counts?.CLOSED || 0) + (jobStats.counts?.ARCHIVED || 0), color: 'purple' },
                      ]}
                      pendingMessage="Job Postings analytics will display here when connected."
                    />
                  ),
                },
                {
                  key: 'candidates',
                  label: (
                    <Space size={6}>
                      <UsergroupAddOutlined />
                      <span>{t('dashboard.chartCandidates')}</span>
                    </Space>
                  ),
                  children: (
                    <AnalyticsChart
                      title="Candidate Registrations Trend"
                      data={candidateStats.series}
                      connected={candidateStats.connected}
                      groupBy={groupBy}
                      color="#3b82f6"
                      unitLabel="candidate"
                      metricsSummary={[
                        { label: 'Total Candidates', value: candidateStats.total, color: 'blue' },
                        { label: 'Active', value: candidateStats.active, color: 'success' },
                        { label: 'Pending Verification', value: candidateStats.pending, color: 'warning' },
                        { label: 'Inactive', value: candidateStats.inactive, color: 'default' },
                      ]}
                      pendingMessage="Candidate Registrations analytics will display here when connected."
                    />
                  ),
                },
                {
                  key: 'employers',
                  label: (
                    <Space size={6}>
                      <ShopOutlined />
                      <span>{t('dashboard.chartEmployers')}</span>
                    </Space>
                  ),
                  children: (
                    <AnalyticsChart
                      title="Employer Registrations Trend"
                      data={companyStats.series}
                      connected={companyStats.connected}
                      groupBy={groupBy}
                      color="#8b5cf6"
                      unitLabel="employer"
                      metricsSummary={[
                        { label: 'Total Employers', value: companyStats.total, color: 'blue' },
                        { label: 'Active', value: companyStats.counts?.ACTIVE || 0, color: 'success' },
                        { label: 'In Review', value: companyStats.counts?.IN_REVIEW || 0, color: 'processing' },
                        { label: 'Inactive', value: companyStats.counts?.INACTIVE || 0, color: 'default' },
                        { label: 'Suspended', value: companyStats.counts?.SUSPENDED || 0, color: 'error' },
                      ]}
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

      {/* Recent Activity Table Toolbar & Component */}
      <Card
        style={{
          borderRadius: 12,
          border: `1px solid ${semantic.borderDefault}`,
          background: semantic.bgCard,
          marginBottom: 24,
        }}
        styles={{ body: { padding: '16px 20px' } }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Space wrap size={10} align="center">
            <span style={{ fontSize: 13, fontWeight: 500, color: semantic.textSecondary }}>Filter Activity:</span>
            <Select
              value={activityCategory}
              onChange={(val) => setActivityCategory(val)}
              style={{ width: 150, height: 36 }}
              options={[
                { label: 'All Activities', value: 'ALL' },
                { label: 'Security', value: 'SECURITY' },
                { label: 'Company', value: 'COMPANY' },
                { label: 'Billing', value: 'BILLING' },
                { label: 'Configuration', value: 'CONFIGURATION' },
              ]}
            />
          </Space>

          <Input
            placeholder="Search activity by actor, action, resource, IP..."
            prefix={<SearchOutlined style={{ color: semantic.textSecondary }} />}
            value={activitySearch}
            onChange={(e) => setActivitySearch(e.target.value)}
            allowClear
            style={{ width: 300, borderRadius: 8, height: 36 }}
          />
        </div>
      </Card>

      {/* Recent Activity Table using Reusable DataTable Component */}
      <DataTable
        title={t('dashboard.recentActivity')}
        subtitle="Chronological platform administrative and security events recorded across all integrated modules."
        columns={activityColumns}
        dataSource={filteredActivities}
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

      {/* Event Details Inspector Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: isDarkMode ? 'rgba(59, 130, 246, 0.16)' : 'rgba(30, 58, 138, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                color: brandTokens.navy,
              }}
            >
              <AuditOutlined />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16, color: semantic.textPrimary, lineHeight: 1.3 }}>
                Activity Audit Event
              </div>
              <div style={{ fontSize: 12, color: semantic.textSecondary, fontWeight: 400 }}>
                {selectedEvent?.id || 'Event Record Details'}
              </div>
            </div>
          </div>
        }
        open={isDetailsModalOpen}
        onCancel={() => {
          setIsDetailsModalOpen(false);
          setSelectedEvent(null);
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setIsDetailsModalOpen(false);
              setSelectedEvent(null);
            }}
            style={{ borderRadius: 8, height: 36 }}
          >
            {t('common.close') || 'Close'}
          </Button>,
        ]}
        styles={{
          content: {
            borderRadius: 14,
            border: `1px solid ${semantic.borderDefault}`,
            background: semantic.bgCard,
            padding: 0,
            overflow: 'hidden',
          },
          header: {
            background: semantic.bgCard,
            borderBottom: `1px solid ${semantic.borderSubtle}`,
            padding: '18px 24px',
            margin: 0,
          },
          body: {
            padding: '20px 24px',
            maxHeight: 'calc(80vh - 120px)',
            overflowY: 'auto',
          },
          footer: {
            borderTop: `1px solid ${semantic.borderSubtle}`,
            padding: '14px 24px',
            margin: 0,
          },
        }}
      >
        {selectedEvent && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 12,
                padding: 16,
                borderRadius: 10,
                background: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                border: `1px solid ${semantic.borderSubtle}`,
              }}
            >
              <div>
                <div style={{ fontSize: 12, color: semantic.textSecondary, marginBottom: 4 }}>Timestamp</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: semantic.textPrimary }}>
                  {new Date(selectedEvent.createdAt).toLocaleString()}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: semantic.textSecondary, marginBottom: 4 }}>Category</div>
                <div>{getCategoryBadge(selectedEvent.category)}</div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: semantic.textSecondary, marginBottom: 4 }}>Event / Action</div>
                <div>{getEventTag(selectedEvent.eventType || selectedEvent.action)}</div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: semantic.textSecondary, marginBottom: 4 }}>Outcome</div>
                <div>{getOutcomeBadge(selectedEvent.outcome)}</div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: semantic.textSecondary, marginBottom: 4 }}>Administrator / Actor</div>
                <div style={{ fontSize: 13, color: semantic.textPrimary }}>
                  {selectedEvent.admin ? `${selectedEvent.admin.name} (${selectedEvent.admin.email})` : (selectedEvent.actor || 'System')}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: semantic.textSecondary, marginBottom: 4 }}>IP Address</div>
                <div style={{ fontSize: 13, fontFamily: 'monospace', color: semantic.textPrimary }}>
                  {selectedEvent.ipAddress || '—'}
                </div>
              </div>

              {selectedEvent.resourceName && (
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ fontSize: 12, color: semantic.textSecondary, marginBottom: 4 }}>Target Resource</div>
                  <Space size={6}>
                    <Text strong style={{ fontSize: 13, color: semantic.textPrimary }}>{selectedEvent.resourceName}</Text>
                    {selectedEvent.resourceType && (
                      <Tag style={{ fontSize: 11, borderRadius: 4, margin: 0 }}>{selectedEvent.resourceType}</Tag>
                    )}
                  </Space>
                </div>
              )}
            </div>

            {selectedEvent.details && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: semantic.textSecondary, marginBottom: 6 }}>
                  Event Payload & Metadata
                </div>
                <pre
                  style={{
                    background: isDarkMode ? 'rgba(0,0,0,0.3)' : '#f8fafc',
                    border: `1px solid ${semantic.borderSubtle}`,
                    padding: 12,
                    borderRadius: 8,
                    fontSize: 12,
                    fontFamily: 'Consolas, Monaco, monospace',
                    color: semantic.textPrimary,
                    maxHeight: 200,
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    margin: 0,
                  }}
                >
                  {JSON.stringify(selectedEvent.details, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

// Compact helper icon for database server
function ServerOutlinedIcon({ style }) {
  return <DatabaseOutlined style={style} />;
}

export default DashboardPage;
