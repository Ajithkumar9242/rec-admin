import React, { useEffect, useState } from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Typography,
  Table,
  Tag,
  Space,
  Spin,
  Alert,
} from 'antd';
import {
  TeamOutlined,
  CheckCircleOutlined,
  SafetyCertificateOutlined,
  AuditOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import api from '../../services/api.js';
import { brandTokens } from '../../theme/tokens.js';

const { Title, Paragraph, Text } = Typography;

export function OverviewPage() {
  const { user } = useSelector((state) => state.auth);
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchOverview() {
      try {
        const res = await api.get('/admin/overview');
        if (isMounted) {
          setStats(res.data.stats);
          setRecentLogs(res.data.recentLogs || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.error || 'Failed to load overview data');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchOverview();
    return () => {
      isMounted = false;
    };
  }, []);

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
      default:
        return <Tag>{type}</Tag>;
    }
  };

  const columns = [
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

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, fontSize: 24 }}>
          {t('shell.overview')}
        </Title>
        <Paragraph type="secondary">
          Welcome back, {user?.name}. RecruiTrain Administrative Console is operational.
        </Paragraph>
      </div>

      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          style={{ marginBottom: 24, borderRadius: 8 }}
        />
      )}

      {/* Metrics Row */}
      <Row gutter={[20, 20]} style={{ marginBottom: 28 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered style={{ borderRadius: 12 }}>
            <Statistic
              title={t('shell.totalAdmins')}
              value={stats?.totalAdmins ?? 1}
              prefix={<TeamOutlined style={{ color: brandTokens.navy, marginRight: 8 }} />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered style={{ borderRadius: 12 }}>
            <Statistic
              title={t('shell.activeAdmins')}
              value={stats?.activeAdmins ?? 1}
              prefix={<CheckCircleOutlined style={{ color: brandTokens.teal, marginRight: 8 }} />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered style={{ borderRadius: 12 }}>
            <Statistic
              title="2FA Status"
              value={user?.totpEnabled ? 'Enabled' : 'Disabled'}
              valueStyle={{ color: user?.totpEnabled ? brandTokens.success : brandTokens.amber, fontSize: 20 }}
              prefix={<SafetyCertificateOutlined style={{ marginRight: 8 }} />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered style={{ borderRadius: 12 }}>
            <Statistic
              title={t('shell.platformStatus')}
              value="Secure"
              valueStyle={{ color: brandTokens.success, fontSize: 20 }}
              prefix={<AuditOutlined style={{ marginRight: 8 }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Recent Security Logs Table */}
      <Card
        title={
          <Space>
            <AuditOutlined style={{ color: brandTokens.navy }} />
            <span>{t('shell.recentAuthEvents')}</span>
          </Space>
        }
        style={{ borderRadius: 12 }}
      >
        <Table
          dataSource={recentLogs}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 5 }}
          size="middle"
        />
      </Card>
    </div>
  );
}
