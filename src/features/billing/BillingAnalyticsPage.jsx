import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Select,
  Button,
  Space,
  Table,
  Tag,
  Alert,
  Typography,
  Spin,
} from 'antd';
import {
  ReloadOutlined,
  CreditCardOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  PieChartOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { billingApi, formatBillingError } from '../../services/billingApi.js';
import { brandTokens, lightSemanticTokens, darkSemanticTokens } from '../../theme/tokens.js';

const { Title, Text } = Typography;
const { Option } = Select;

export function BillingAnalyticsPage() {
  const { t } = useTranslation();
  const isDarkMode = useSelector((state) => state.theme?.isDarkMode);
  const semantic = isDarkMode ? darkSemanticTokens : lightSemanticTokens;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [groupBy, setGroupBy] = useState('month');

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { groupBy };
      if (from) params.from = from;
      if (to) params.to = to;

      const res = await billingApi.getBillingAnalytics(params);
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      setError(formatBillingError(err, t('common.networkError')));
    } finally {
      setLoading(false);
    }
  }, [from, to, groupBy, t]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const kpis = data?.kpis || {};
  const provider = data?.paymentProvider || {};

  // Standard KPI Card Component
  const renderKpiCard = ({ title, value, icon, color, suffix = null }) => (
    <Card
      className="rt-card-hover"
      variant="outlined"
      style={{
        borderRadius: 12,
        border: `1px solid ${semantic.borderDefault}`,
        background: semantic.bgCard,
        boxShadow: isDarkMode ? 'none' : '0 1px 3px rgba(0,0,0,0.02)',
        height: '100%',
      }}
      styles={{
        body: {
          padding: '16px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        },
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 8,
          background: isDarkMode ? 'rgba(79, 168, 192, 0.12)' : 'rgba(22, 49, 63, 0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          color: color || (isDarkMode ? brandTokens.teal : brandTokens.navy),
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: semantic.textSecondary, lineHeight: 1.3 }}>
          {title}
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: semantic.textPrimary, lineHeight: 1.2, marginTop: 2 }}>
          {value}{suffix && <span style={{ fontSize: 14, marginLeft: 2 }}>{suffix}</span>}
        </div>
      </div>
    </Card>
  );

  return (
    <div className="rt-page-container" style={{ maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0, fontSize: 20, color: semantic.textPrimary }}>
          {t('billing.analytics.title')}
        </Title>
        <Text style={{ fontSize: 13, color: semantic.textSecondary }}>{t('billing.analytics.subtitle')}</Text>
      </div>

      {/* Error Alert with Retry Action */}
      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          action={
            <Button size="small" danger onClick={fetchAnalytics} style={{ borderRadius: 6 }}>
              {t('common.retry') || 'Retry'}
            </Button>
          }
          style={{ marginBottom: 20, borderRadius: 8 }}
        />
      )}

      {/* Provider Status Alert */}
      {data && (
        !provider.configured ? (
          <Alert
            message={t('billing.analytics.providerStatus')}
            description={t('billing.analytics.providerUnconfigured')}
            type="info"
            showIcon
            style={{ marginBottom: 20, borderRadius: 8 }}
          />
        ) : provider.mode === 'test' ? (
          <Alert
            message={t('billing.analytics.providerStatus')}
            description={t('billing.analytics.providerTest')}
            type="warning"
            showIcon
            style={{ marginBottom: 20, borderRadius: 8 }}
          />
        ) : (
          <Alert
            message={t('billing.analytics.providerStatus')}
            description={t('billing.analytics.providerLive')}
            type="success"
            showIcon
            style={{ marginBottom: 20, borderRadius: 8 }}
          />
        )
      )}

      {/* Filter Bar */}
      <Card
        variant="outlined"
        size="small"
        style={{
          marginBottom: 20,
          borderRadius: 10,
          border: `1px solid ${semantic.borderDefault}`,
          background: semantic.bgCard,
        }}
        styles={{ body: { padding: '12px 16px' } }}
      >
        <Space wrap size={16} align="center">
          <div>
            <Text style={{ color: semantic.textSecondary, marginRight: 8 }}>{t('dashboard.from')}:</Text>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              style={{
                padding: '5px 10px',
                borderRadius: 6,
                border: `1px solid ${semantic.borderDefault}`,
                background: semantic.bgSurface,
                color: semantic.textPrimary,
                fontSize: 13,
              }}
            />
          </div>

          <div>
            <Text style={{ color: semantic.textSecondary, marginRight: 8 }}>{t('dashboard.to')}:</Text>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              style={{
                padding: '5px 10px',
                borderRadius: 6,
                border: `1px solid ${semantic.borderDefault}`,
                background: semantic.bgSurface,
                color: semantic.textPrimary,
                fontSize: 13,
              }}
            />
          </div>

          <div>
            <Text style={{ color: semantic.textSecondary, marginRight: 8 }}>{t('billing.analytics.groupBy')}:</Text>
            <Select value={groupBy} onChange={setGroupBy} style={{ width: 110 }}>
              <Option value="day">{t('dashboard.day')}</Option>
              <Option value="month">{t('dashboard.month')}</Option>
              <Option value="year">{t('dashboard.year')}</Option>
            </Select>
          </div>

          <Button
            icon={<ReloadOutlined />}
            onClick={fetchAnalytics}
            loading={loading}
            style={{ borderRadius: 6 }}
          >
            {t('billing.analytics.refresh')}
          </Button>
        </Space>
      </Card>

      {/* Loading Spin for initial fetch */}
      {loading && !data && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
        </div>
      )}

      {/* Data Visualization Sections (Rendered only with actual response data) */}
      {data && (
        <>
          {/* Primary KPI Metrics */}
          <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            <Col xs={24} sm={12} md={8} lg={4} style={{ flex: '1 1 200px' }}>
              {renderKpiCard({
                title: t('billing.analytics.activeSubscriptions'),
                value: kpis.activeSubscriptions ?? 0,
                icon: <CheckCircleOutlined />,
                color: brandTokens.success,
              })}
            </Col>

            <Col xs={24} sm={12} md={8} lg={4} style={{ flex: '1 1 200px' }}>
              {renderKpiCard({
                title: t('billing.analytics.newSubscriptions'),
                value: kpis.newSubscriptions ?? 0,
                icon: <CreditCardOutlined />,
                color: isDarkMode ? brandTokens.teal : brandTokens.navySoft,
              })}
            </Col>

            <Col xs={24} sm={12} md={8} lg={4} style={{ flex: '1 1 200px' }}>
              {renderKpiCard({
                title: t('billing.analytics.overdueInvoices'),
                value: kpis.overdueInvoices ?? 0,
                icon: <ClockCircleOutlined />,
                color: brandTokens.amber,
              })}
            </Col>

            <Col xs={24} sm={12} md={8} lg={4} style={{ flex: '1 1 200px' }}>
              {renderKpiCard({
                title: t('billing.analytics.failedPayments'),
                value: kpis.failedPayments ?? 0,
                icon: <WarningOutlined />,
                color: brandTokens.error,
              })}
            </Col>

            <Col xs={24} sm={12} md={8} lg={4} style={{ flex: '1 1 200px' }}>
              {renderKpiCard({
                title: t('billing.analytics.churnRate', 'Subscription Churn'),
                value: kpis.churnRate ?? 0,
                suffix: '%',
                icon: <PieChartOutlined />,
                color: '#8b5cf6',
              })}
            </Col>
          </Row>

          {/* Revenue Breakdown Grouped by Currency */}
          <Card
            variant="outlined"
            title={
              <span style={{ fontSize: 15, fontWeight: 600, color: semantic.textPrimary }}>
                {t('billing.analytics.revenueByCurrency')}
              </span>
            }
            style={{
              marginBottom: 20,
              borderRadius: 12,
              border: `1px solid ${semantic.borderDefault}`,
              background: semantic.bgCard,
            }}
            styles={{ body: { padding: '16px 20px' } }}
          >
            <div className="rt-table-wrapper">
              <Table
                pagination={false}
                rowKey="currency"
                dataSource={data?.revenueByCurrency || []}
                columns={[
                  {
                    title: t('billing.plans.currency'),
                    dataIndex: 'currency',
                    key: 'currency',
                    render: (cur) => <Tag color="blue" style={{ fontWeight: 600, borderRadius: 4 }}>{cur}</Tag>,
                  },
                  {
                    title: t('billing.analytics.invoicedRevenue'),
                    dataIndex: 'invoicedGross',
                    key: 'invoicedGross',
                    render: (val, r) => (
                      <span style={{ color: semantic.textPrimary, fontWeight: 500 }}>
                        {Number(val || 0).toFixed(2)} {r.currency}
                      </span>
                    ),
                  },
                  {
                    title: t('billing.analytics.collectedRevenue'),
                    dataIndex: 'collectedGross',
                    key: 'collectedGross',
                    render: (val, r) => (
                      <span style={{ fontWeight: 700, color: brandTokens.success }}>
                        {Number(val || 0).toFixed(2)} {r.currency}
                      </span>
                    ),
                  },
                  {
                    title: t('billing.analytics.outstandingBalance'),
                    dataIndex: 'outstandingGross',
                    key: 'outstandingGross',
                    render: (val, r) => (
                      <span style={{ color: Number(val) > 0 ? brandTokens.amber : semantic.textSecondary, fontWeight: 600 }}>
                        {Number(val || 0).toFixed(2)} {r.currency}
                      </span>
                    ),
                  },
                  {
                    title: 'Invoices Issued',
                    dataIndex: 'invoiceCount',
                    key: 'invoiceCount',
                    render: (count) => <span style={{ color: semantic.textPrimary }}>{count}</span>,
                  },
                ]}
              />
            </div>
          </Card>

          {/* Plan Distribution */}
          <Card
            variant="outlined"
            title={
              <span style={{ fontSize: 15, fontWeight: 600, color: semantic.textPrimary }}>
                {t('billing.analytics.planDistribution')}
              </span>
            }
            style={{
              borderRadius: 12,
              border: `1px solid ${semantic.borderDefault}`,
              background: semantic.bgCard,
            }}
            styles={{ body: { padding: '16px 20px' } }}
          >
            <div className="rt-table-wrapper">
              <Table
                pagination={false}
                rowKey="planId"
                dataSource={data?.planDistribution || []}
                columns={[
                  {
                    title: t('billing.plans.name'),
                    dataIndex: 'planName',
                    key: 'planName',
                    render: (name) => <span style={{ fontWeight: 600, color: semantic.textPrimary }}>{name}</span>,
                  },
                  {
                    title: t('billing.plans.billingInterval'),
                    dataIndex: 'interval',
                    key: 'interval',
                    render: (interval) => (
                      <Tag
                        color="cyan"
                        style={{
                          borderRadius: 4,
                          fontWeight: 500,
                          border: 'none',
                          background: isDarkMode ? 'rgba(79, 168, 192, 0.15)' : '#e0f2fe',
                          color: isDarkMode ? '#7dd3fc' : '#0369a1',
                        }}
                      >
                        {t(`billing.intervals.${interval}`)}
                      </Tag>
                    ),
                  },
                  {
                    title: t('billing.plans.activeSubscriptions'),
                    dataIndex: 'count',
                    key: 'count',
                    render: (c) => <strong style={{ color: semantic.textPrimary }}>{c}</strong>,
                  },
                ]}
              />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

export default BillingAnalyticsPage;
