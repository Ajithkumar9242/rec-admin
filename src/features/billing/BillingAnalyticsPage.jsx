import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Select,
  DatePicker,
  Button,
  Space,
  Table,
  Tag,
  Alert,
  Typography,
  Divider,
  Spin,
} from 'antd';
import {
  ReloadOutlined,
  CreditCardOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  DollarOutlined,
  PieChartOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { billingApi, formatBillingError } from '../../services/billingApi.js';
import { brandTokens } from '../../theme/tokens.js';

const { Title, Text } = Typography;
const { Option } = Select;

export function BillingAnalyticsPage() {
  const { t } = useTranslation();
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

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0, color: brandTokens.navy }}>
          {t('billing.analytics.title')}
        </Title>
        <Text type="secondary">{t('billing.analytics.subtitle')}</Text>
      </div>

      {/* Error Alert with Retry Action */}
      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          action={
            <Button size="small" danger onClick={fetchAnalytics}>
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
      <Card size="small" style={{ marginBottom: 20, borderRadius: 8 }}>
        <Space wrap size={16} align="center">
          <div>
            <Text type="secondary" style={{ marginRight: 8 }}>{t('dashboard.from')}:</Text>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #d9d9d9' }}
            />
          </div>

          <div>
            <Text type="secondary" style={{ marginRight: 8 }}>{t('dashboard.to')}:</Text>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #d9d9d9' }}
            />
          </div>

          <div>
            <Text type="secondary" style={{ marginRight: 8 }}>{t('billing.analytics.groupBy')}:</Text>
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
            <Col xs={24} sm={12} lg={6}>
              <Card variant="borderless" style={{ borderRadius: 10, background: '#f8fbfa' }}>
                <Statistic
                  title={t('billing.analytics.activeSubscriptions')}
                  value={kpis.activeSubscriptions ?? 0}
                  prefix={<CheckCircleOutlined style={{ color: brandTokens.success }} />}
                />
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card variant="borderless" style={{ borderRadius: 10, background: '#f6f9fc' }}>
                <Statistic
                  title={t('billing.analytics.newSubscriptions')}
                  value={kpis.newSubscriptions ?? 0}
                  prefix={<CreditCardOutlined style={{ color: brandTokens.teal }} />}
                />
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card variant="borderless" style={{ borderRadius: 10, background: '#fcfaf6' }}>
                <Statistic
                  title={t('billing.analytics.overdueInvoices')}
                  value={kpis.overdueInvoices ?? 0}
                  prefix={<ClockCircleOutlined style={{ color: brandTokens.amber }} />}
                />
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card variant="borderless" style={{ borderRadius: 10, background: '#fcf6f6' }}>
                <Statistic
                  title={t('billing.analytics.failedPayments')}
                  value={kpis.failedPayments ?? 0}
                  prefix={<WarningOutlined style={{ color: brandTokens.error }} />}
                />
              </Card>
            </Col>
          </Row>

          {/* Revenue Breakdown Grouped by Currency */}
          <Card
            title={t('billing.analytics.revenueByCurrency')}
            style={{ marginBottom: 20, borderRadius: 10 }}
          >
            <Table
              pagination={false}
              rowKey="currency"
              dataSource={data?.revenueByCurrency || []}
              columns={[
                {
                  title: t('billing.plans.currency'),
                  dataIndex: 'currency',
                  key: 'currency',
                  render: (cur) => <Tag color="blue" style={{ fontWeight: 600 }}>{cur}</Tag>,
                },
                {
                  title: t('billing.analytics.invoicedRevenue'),
                  dataIndex: 'invoicedGross',
                  key: 'invoicedGross',
                  render: (val, r) => `${Number(val || 0).toFixed(2)} ${r.currency}`,
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
                    <span style={{ color: Number(val) > 0 ? brandTokens.amber : brandTokens.muted }}>
                      {Number(val || 0).toFixed(2)} {r.currency}
                    </span>
                  ),
                },
                {
                  title: 'Invoices Issued',
                  dataIndex: 'invoiceCount',
                  key: 'invoiceCount',
                },
              ]}
            />
          </Card>

          {/* Plan Distribution */}
          <Card
            title={t('billing.analytics.planDistribution')}
            style={{ borderRadius: 10 }}
          >
            <Table
              pagination={false}
              rowKey="planId"
              dataSource={data?.planDistribution || []}
              columns={[
                {
                  title: t('billing.plans.name'),
                  dataIndex: 'planName',
                  key: 'planName',
                  render: (name) => <span style={{ fontWeight: 600 }}>{name}</span>,
                },
                {
                  title: t('billing.plans.billingInterval'),
                  dataIndex: 'interval',
                  key: 'interval',
                  render: (interval) => <Tag color="cyan">{t(`billing.intervals.${interval}`)}</Tag>,
                },
                {
                  title: t('billing.plans.activeSubscriptions'),
                  dataIndex: 'count',
                  key: 'count',
                  render: (c) => <strong>{c}</strong>,
                },
              ]}
            />
          </Card>
        </>
      )}
    </div>
  );
}
