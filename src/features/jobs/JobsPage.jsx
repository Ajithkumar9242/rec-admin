import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Input,
  Select,
  Button,
  Space,
  Tag,
  Modal,
  App,
  Typography,
  Tooltip,
  Dropdown,
  Popconfirm,
  Badge,
  Tabs,
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  FileTextOutlined,
  MoreOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StopOutlined,
  InboxOutlined,
  TeamOutlined,
  UndoOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DataTable } from '../../components/common/DataTable.jsx';
import { DeleteConfirmationModal } from '../../components/common/DeleteConfirmationModal.jsx';
import { jobsApi } from '../../services/jobsApi.js';
import { companiesApi } from '../../services/companiesApi.js';
import { brandTokens } from '../../theme/tokens.js';

const { Text } = Typography;
const { Option } = Select;

export function JobsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { message } = App.useApp();

  // Active view tab ('active' | 'trash')
  const [activeTab, setActiveTab] = useState('active');

  // State
  const [jobs, setJobs] = useState([]);
  const [counts, setCounts] = useState({
    ALL: 0,
    DRAFT: 0,
    PENDING_APPROVAL: 0,
    PUBLISHED: 0,
    CLOSED: 0,
    ARCHIVED: 0,
    TRASH: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [hiringScopeFilter, setHiringScopeFilter] = useState('');
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [companiesList, setCompaniesList] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  // Moderation state
  const [moderationModalOpen, setModerationModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [targetStatus, setTargetStatus] = useState(null);
  const [moderationReason, setModerationReason] = useState('');
  const [submittingModeration, setSubmittingModeration] = useState(false);

  // Delete / Trash state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedJobForDelete, setSelectedJobForDelete] = useState(null);
  const [isPermanentOnly, setIsPermanentOnly] = useState(false);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  // Load companies for filter dropdown
  useEffect(() => {
    companiesApi
      .getCompanies({ limit: 100 })
      .then((res) => {
        if (res.items) setCompaniesList(res.items);
        else if (res.data) setCompaniesList(res.data);
      })
      .catch(() => {});
  }, []);

  // Fetch jobs from server
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const isTrashView = activeTab === 'trash';
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        sortBy: isTrashView ? 'deletedAt' : 'createdAt',
        sortOrder: 'desc',
        trashed: isTrashView,
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(hiringScopeFilter ? { hiringScope: hiringScopeFilter } : {}),
        ...(employmentTypeFilter ? { employmentType: employmentTypeFilter } : {}),
        ...(companyFilter ? { companyId: companyFilter } : {}),
      };

      const res = await jobsApi.getJobs(params);
      const items = res.items || res.data || [];
      setJobs(items);
      if (res.counts) {
        setCounts(res.counts);
      }
      if (res.pagination) {
        setPagination((prev) => ({
          ...prev,
          total: res.pagination.total || 0,
        }));
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to load jobs';
      setError(errMsg);
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, search, statusFilter, hiringScopeFilter, employmentTypeFilter, companyFilter, activeTab, message]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Handle moderation action
  const handleOpenModeration = (job, status) => {
    setSelectedJob(job);
    setTargetStatus(status);
    setModerationReason('');
    setModerationModalOpen(true);
  };

  const handleConfirmModeration = async () => {
    if (!selectedJob || !targetStatus) return;
    setSubmittingModeration(true);
    try {
      await jobsApi.updateJobStatus(selectedJob.id, {
        status: targetStatus,
        reason: moderationReason.trim() || undefined,
      });
      message.success(t('jobs.messages.statusUpdateSuccess'));
      setModerationModalOpen(false);
      setSelectedJob(null);
      fetchJobs();
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Status update failed';
      message.error(errMsg);
    } finally {
      setSubmittingModeration(false);
    }
  };

  // Handle delete (archive or permanent)
  const handleOpenDelete = (job, permanent = false) => {
    setSelectedJobForDelete(job);
    setIsPermanentOnly(permanent);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (mode) => {
    if (!selectedJobForDelete) return;
    setSubmittingDelete(true);
    try {
      const res = await jobsApi.deleteJob(selectedJobForDelete.id, mode);
      message.success(
        mode === 'DELETE_PERMANENTLY'
          ? (res.message || 'Job posting permanently deleted.')
          : t('jobs.messages.deleteSuccess', 'Job posting moved to Trash.')
      );
      setDeleteModalOpen(false);
      setSelectedJobForDelete(null);
      fetchJobs();
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Operation failed';
      message.error(errMsg);
    } finally {
      setSubmittingDelete(false);
    }
  };

  // Handle restore from Trash
  const handleRestoreJob = async (job) => {
    try {
      setLoading(true);
      const res = await jobsApi.restoreJob(job.id);
      message.success(res.message || `Job "${job.title}" restored successfully from Trash.`);
      fetchJobs();
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to restore job';
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Status tag renderer
  const renderStatusTag = (status) => {
    switch (status) {
      case 'PUBLISHED':
        return <Tag color="success">{t('jobs.status.PUBLISHED')}</Tag>;
      case 'DRAFT':
        return <Tag color="default">{t('jobs.status.DRAFT')}</Tag>;
      case 'PENDING_APPROVAL':
        return <Tag color="warning">{t('jobs.status.PENDING_APPROVAL')}</Tag>;
      case 'CLOSED':
        return <Tag color="error">{t('jobs.status.CLOSED')}</Tag>;
      case 'ARCHIVED':
        return <Tag color="magenta">{t('jobs.status.ARCHIVED')}</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  // Scope tag renderer
  const renderScopeTag = (scope) => {
    switch (scope) {
      case 'DOMESTIC':
        return <Tag color="green">{t('jobs.hiringScope.DOMESTIC')}</Tag>;
      case 'EU':
        return <Tag color="blue">{t('jobs.hiringScope.EU')}</Tag>;
      case 'INTERNATIONAL':
        return <Tag color="orange">{t('jobs.hiringScope.INTERNATIONAL')}</Tag>;
      default:
        return <Tag>{scope}</Tag>;
    }
  };

  // Workplace tag renderer
  const renderWorkplaceTag = (type) => {
    switch (type) {
      case 'REMOTE':
        return <Tag color="purple">{t('jobs.workplace.REMOTE')}</Tag>;
      case 'HYBRID':
        return <Tag color="cyan">{t('jobs.workplace.HYBRID')}</Tag>;
      case 'ON_SITE':
      default:
        return <Tag color="geekblue">{t('jobs.workplace.ON_SITE')}</Tag>;
    }
  };

  // Table Columns
  const columns = [
    {
      title: t('jobs.fields.jobTitle'),
      key: 'title',
      render: (_, record) => (
        <div>
          <a
            onClick={() => navigate(`/admin/jobs/${record.id}`)}
            style={{ fontWeight: 600, color: brandTokens.navy, cursor: 'pointer' }}
          >
            {record.title}
          </a>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            {record.jobCode ? (
              <Tag style={{ margin: 0, padding: '0 4px', fontSize: 11 }}>{record.jobCode}</Tag>
            ) : null}
            {record.department && <span style={{ marginLeft: 6 }}>{record.department}</span>}
          </div>
        </div>
      ),
    },
    {
      title: t('jobs.fields.company'),
      key: 'company',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.company?.name || '—'}</div>
          {record.company?.status && (
            <Tag
              color={record.company.status === 'ACTIVE' ? 'green' : 'default'}
              style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px', margin: '2px 0 0 0' }}
            >
              {record.company.status}
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: t('jobs.fields.workplaceType'),
      key: 'location',
      render: (_, record) => (
        <div>
          <div>{renderWorkplaceTag(record.workplaceType)}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            {[record.city, record.country].filter(Boolean).join(', ') || '—'}
          </div>
        </div>
      ),
    },
    {
      title: t('jobs.employmentType.title'),
      dataIndex: 'employmentType',
      key: 'employmentType',
      render: (val) => (
        <span style={{ fontSize: 13 }}>
          {t(`jobs.employmentType.${val}`, val?.replace('_', ' '))}
        </span>
      ),
    },
    {
      title: t('jobs.hiringScope.title'),
      dataIndex: 'hiringScope',
      key: 'hiringScope',
      render: (val) => renderScopeTag(val),
    },
    {
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status) => renderStatusTag(status),
    },
    {
      title: t('jobs.applicants'),
      key: 'applicants',
      align: 'center',
      render: (_, record) => {
        const count = record._count?.applications ?? record.applicantsCount ?? 0;
        return (
          <Tooltip title={`${count} applicant(s)`}>
            <Badge
              count={count}
              showZero
              style={{
                backgroundColor: count > 0 ? brandTokens.teal : '#cbd5e1',
                color: '#fff',
              }}
            />
          </Tooltip>
        );
      },
    },
    {
      title: t('companies.createdAt', 'Created'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => (date ? new Date(date).toLocaleDateString() : '—'),
    },
    {
      title: t('common.edit', 'Actions'),
      key: 'actions',
      align: 'right',
      render: (_, record) => {
        const items = [
          {
            key: 'view',
            icon: <EyeOutlined />,
            label: t('jobs.actions.view'),
            onClick: () => navigate(`/admin/jobs/${record.id}`),
          },
          {
            key: 'edit',
            icon: <EditOutlined />,
            label: t('jobs.actions.edit'),
            onClick: () => navigate(`/admin/jobs/${record.id}/edit`),
          },
        ];

        // Moderation items based on status
        if (record.status === 'DRAFT' || record.status === 'CLOSED') {
          items.push({
            key: 'publish',
            icon: <CheckCircleOutlined style={{ color: '#16a34a' }} />,
            label: t('jobs.actions.publish'),
            onClick: () => handleOpenModeration(record, 'PUBLISHED'),
          });
        }
        if (record.status === 'PUBLISHED') {
          items.push({
            key: 'close',
            icon: <StopOutlined style={{ color: '#dc2626' }} />,
            label: t('jobs.actions.close'),
            onClick: () => handleOpenModeration(record, 'CLOSED'),
          });
          items.push({
            key: 'draft',
            icon: <ClockCircleOutlined style={{ color: '#d97706' }} />,
            label: t('jobs.actions.suspend'),
            onClick: () => handleOpenModeration(record, 'DRAFT'),
          });
        }

        items.push({
          type: 'divider',
        });
        items.push({
          key: 'archive',
          danger: true,
          icon: <DeleteOutlined />,
          label: t('jobs.actions.archive', 'Move to Trash'),
          onClick: () => handleOpenDelete(record, false),
        });

        return (
          <Space>
            <Tooltip title={t('jobs.actions.view')}>
              <Button
                type="text"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => navigate(`/admin/jobs/${record.id}`)}
              />
            </Tooltip>
            <Tooltip title={t('jobs.actions.edit')}>
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => navigate(`/admin/jobs/${record.id}/edit`)}
              />
            </Tooltip>
            <Dropdown menu={{ items }} trigger={['click']}>
              <Button type="text" size="small" icon={<MoreOutlined />} />
            </Dropdown>
          </Space>
        );
      },
    },
  ];

  // Trash Table Columns
  const trashColumns = [
    {
      title: t('jobs.fields.jobTitle'),
      key: 'title',
      render: (_, record) => (
        <div>
          <a
            onClick={() => navigate(`/admin/jobs/${record.id}`)}
            style={{ fontWeight: 600, color: brandTokens.navy, cursor: 'pointer' }}
          >
            {record.title}
          </a>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            {record.jobCode ? (
              <Tag style={{ margin: 0, padding: '0 4px', fontSize: 11 }}>{record.jobCode}</Tag>
            ) : null}
            {record.department && <span style={{ marginLeft: 6 }}>{record.department}</span>}
          </div>
        </div>
      ),
    },
    {
      title: t('jobs.fields.company'),
      key: 'company',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.company?.name || '—'}</div>
          {record.company?.status && (
            <Tag
              color={record.company.status === 'ACTIVE' ? 'green' : 'default'}
              style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px', margin: '2px 0 0 0' }}
            >
              {record.company.status}
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: t('jobs.fields.workplaceType'),
      key: 'location',
      render: (_, record) => (
        <div>
          <div>{renderWorkplaceTag(record.workplaceType || record.workArrangement)}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            {[record.city, record.country].filter(Boolean).join(', ') || '—'}
          </div>
        </div>
      ),
    },
    {
      title: t('companies.previousStatus', 'Previous Status'),
      dataIndex: 'status',
      key: 'status',
      render: (status) => renderStatusTag(status),
    },
    {
      title: t('companies.movedToTrashAt', 'Moved to Trash'),
      dataIndex: 'deletedAt',
      key: 'deletedAt',
      render: (val) => {
        if (!val) return '—';
        const d = new Date(val);
        return (
          <Space direction="vertical" size={0}>
            <Text style={{ fontSize: 13 }}>{d.toLocaleDateString()}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </Space>
        );
      },
    },
    {
      title: t('companies.retentionStatus', 'Retention Window'),
      key: 'retention',
      render: (_, record) => {
        if (!record.deletedAt) return '—';
        const daysInTrash = Math.floor((Date.now() - new Date(record.deletedAt).getTime()) / (1000 * 3600 * 24));
        const daysRemaining = Math.max(0, 30 - daysInTrash);
        if (daysInTrash > 30) {
          return (
            <Tag color="error" icon={<ExclamationCircleOutlined />}>
              Expired (&gt;30d) - Super Admin Only
            </Tag>
          );
        }
        return (
          <Tag color="orange" icon={<ClockCircleOutlined />}>
            {daysRemaining} day{daysRemaining === 1 ? '' : 's'} remaining
          </Tag>
        );
      },
    },
    {
      title: t('common.edit', 'Actions'),
      key: 'actions',
      align: 'right',
      render: (_, record) => (
        <Space>
          <Popconfirm
            title={t('jobs.restoreTitle', 'Restore Job?')}
            description={`Restore "${record.title}" back to Active Jobs (Draft status)?`}
            onConfirm={() => handleRestoreJob(record)}
            okText={t('common.restore', 'Restore')}
            cancelText={t('common.cancel', 'Cancel')}
          >
            <Button
              type="primary"
              size="small"
              icon={<UndoOutlined />}
              style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
            >
              {t('common.restore', 'Restore')}
            </Button>
          </Popconfirm>
          <Tooltip title={t('jobs.actions.view')}>
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/admin/jobs/${record.id}`)}
            />
          </Tooltip>
          <Tooltip title={t('trash.permanentDelete', 'Delete Permanently')}>
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleOpenDelete(record, true)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '0 4px' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 6px 0', color: brandTokens.navy }}>
          {t('jobs.title')}
        </h1>
        <Text type="secondary">{t('jobs.subtitle')}</Text>
      </div>

      {/* Metric Cards */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={8} md={4}>
          <Card
            variant="outlined"
            size="small"
            hoverable
            onClick={() => {
              setActiveTab('active');
              setStatusFilter('');
              setPagination((p) => ({ ...p, current: 1 }));
            }}
            style={{
              cursor: 'pointer',
              borderColor: activeTab === 'active' && statusFilter === '' ? brandTokens.navy : undefined,
              backgroundColor: activeTab === 'active' && statusFilter === '' ? '#f8fafc' : undefined,
            }}
          >
            <Statistic
              title={t('jobs.status.ALL')}
              value={counts.ALL || 0}
              prefix={<FileTextOutlined style={{ color: brandTokens.navy }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card
            variant="outlined"
            size="small"
            hoverable
            onClick={() => {
              setActiveTab('active');
              setStatusFilter('PUBLISHED');
              setPagination((p) => ({ ...p, current: 1 }));
            }}
            style={{
              cursor: 'pointer',
              borderColor: activeTab === 'active' && statusFilter === 'PUBLISHED' ? '#16a34a' : undefined,
              backgroundColor: activeTab === 'active' && statusFilter === 'PUBLISHED' ? '#f0fdf4' : undefined,
            }}
          >
            <Statistic
              title={t('jobs.status.PUBLISHED')}
              value={counts.PUBLISHED || 0}
              valueStyle={{ color: '#16a34a' }}
              prefix={<CheckCircleOutlined style={{ color: '#16a34a' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card
            variant="outlined"
            size="small"
            hoverable
            onClick={() => {
              setActiveTab('active');
              setStatusFilter('DRAFT');
              setPagination((p) => ({ ...p, current: 1 }));
            }}
            style={{
              cursor: 'pointer',
              borderColor: activeTab === 'active' && statusFilter === 'DRAFT' ? '#64748b' : undefined,
              backgroundColor: activeTab === 'active' && statusFilter === 'DRAFT' ? '#f1f5f9' : undefined,
            }}
          >
            <Statistic
              title={t('jobs.status.DRAFT')}
              value={counts.DRAFT || 0}
              valueStyle={{ color: '#64748b' }}
              prefix={<ClockCircleOutlined style={{ color: '#64748b' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card
            variant="outlined"
            size="small"
            hoverable
            onClick={() => {
              setActiveTab('active');
              setStatusFilter('PENDING_APPROVAL');
              setPagination((p) => ({ ...p, current: 1 }));
            }}
            style={{
              cursor: 'pointer',
              borderColor: activeTab === 'active' && statusFilter === 'PENDING_APPROVAL' ? '#d97706' : undefined,
              backgroundColor: activeTab === 'active' && statusFilter === 'PENDING_APPROVAL' ? '#fffbeb' : undefined,
            }}
          >
            <Statistic
              title={t('jobs.status.PENDING_APPROVAL')}
              value={counts.PENDING_APPROVAL || 0}
              valueStyle={{ color: '#d97706' }}
              prefix={<Badge status="warning" />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card
            variant="outlined"
            size="small"
            hoverable
            onClick={() => {
              setActiveTab('active');
              setStatusFilter('CLOSED');
              setPagination((p) => ({ ...p, current: 1 }));
            }}
            style={{
              cursor: 'pointer',
              borderColor: activeTab === 'active' && statusFilter === 'CLOSED' ? '#dc2626' : undefined,
              backgroundColor: activeTab === 'active' && statusFilter === 'CLOSED' ? '#fef2f2' : undefined,
            }}
          >
            <Statistic
              title={t('jobs.status.CLOSED')}
              value={counts.CLOSED || 0}
              valueStyle={{ color: '#dc2626' }}
              prefix={<StopOutlined style={{ color: '#dc2626' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card
            variant="outlined"
            size="small"
            hoverable
            onClick={() => {
              setActiveTab('trash');
              setStatusFilter('');
              setPagination((p) => ({ ...p, current: 1 }));
            }}
            style={{
              cursor: 'pointer',
              borderColor: activeTab === 'trash' ? '#ef4444' : undefined,
              backgroundColor: activeTab === 'trash' ? '#fff1f0' : undefined,
            }}
          >
            <Statistic
              title={t('companies.inTrash', 'In Trash (30d)')}
              value={counts.TRASH || 0}
              valueStyle={{ color: counts.TRASH > 0 ? '#ef4444' : undefined }}
              prefix={<DeleteOutlined style={{ color: '#ef4444' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Directory View Tabs: Active Jobs vs Trash & Retention */}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key);
          setStatusFilter('');
          setPagination((p) => ({ ...p, current: 1 }));
        }}
        size="large"
        style={{ marginBottom: 16 }}
        items={[
          {
            key: 'active',
            label: (
              <span style={{ fontWeight: 600 }}>
                <CheckCircleOutlined style={{ color: '#16a34a', marginRight: 6 }} />
                {t('jobs.activeJobs', 'Active Jobs')} ({counts.ALL || 0})
              </span>
            ),
          },
          {
            key: 'trash',
            label: (
              <span style={{ fontWeight: 600 }}>
                <DeleteOutlined style={{ color: '#ef4444', marginRight: 6 }} />
                {t('companies.inTrash', 'Trash & Retention')} ({counts.TRASH || 0})
              </span>
            ),
          },
        ]}
      />

      {/* Filter & Action Toolbar */}
      <Card variant="outlined" style={{ marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
        <Row gutter={[12, 12]} justify="space-between" align="middle">
          <Col xs={24} lg={18}>
            <Space wrap size={10} style={{ width: '100%' }}>
              <Input
                placeholder="Search title, code, keywords..."
                prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onPressEnter={() => {
                  setPagination((p) => ({ ...p, current: 1 }));
                  fetchJobs();
                }}
                style={{ width: 220 }}
                allowClear
              />
              <Select
                placeholder={t('jobs.fields.company')}
                value={companyFilter || undefined}
                onChange={(val) => {
                  setCompanyFilter(val || '');
                  setPagination((p) => ({ ...p, current: 1 }));
                }}
                style={{ width: 180 }}
                allowClear
                showSearch
                optionFilterProp="children"
              >
                {companiesList.map((comp) => (
                  <Option key={comp.id} value={comp.id}>
                    {comp.name}
                  </Option>
                ))}
              </Select>
              {activeTab === 'active' && (
                <Select
                  placeholder={t('common.status')}
                  value={statusFilter || undefined}
                  onChange={(val) => {
                    setStatusFilter(val || '');
                    setPagination((p) => ({ ...p, current: 1 }));
                  }}
                  style={{ width: 140 }}
                  allowClear
                >
                  <Option value="PUBLISHED">{t('jobs.status.PUBLISHED')}</Option>
                  <Option value="DRAFT">{t('jobs.status.DRAFT')}</Option>
                  <Option value="PENDING_APPROVAL">{t('jobs.status.PENDING_APPROVAL')}</Option>
                  <Option value="CLOSED">{t('jobs.status.CLOSED')}</Option>
                  <Option value="ARCHIVED">{t('jobs.status.ARCHIVED')}</Option>
                </Select>
              )}
              <Select
                placeholder={t('jobs.hiringScope.title')}
                value={hiringScopeFilter || undefined}
                onChange={(val) => {
                  setHiringScopeFilter(val || '');
                  setPagination((p) => ({ ...p, current: 1 }));
                }}
                style={{ width: 140 }}
                allowClear
              >
                <Option value="DOMESTIC">{t('jobs.hiringScope.DOMESTIC')}</Option>
                <Option value="EU">{t('jobs.hiringScope.EU')}</Option>
                <Option value="INTERNATIONAL">{t('jobs.hiringScope.INTERNATIONAL')}</Option>
              </Select>
              <Select
                placeholder={t('jobs.employmentType.title')}
                value={employmentTypeFilter || undefined}
                onChange={(val) => {
                  setEmploymentTypeFilter(val || '');
                  setPagination((p) => ({ ...p, current: 1 }));
                }}
                style={{ width: 150 }}
                allowClear
              >
                <Option value="FULL_TIME">{t('jobs.employmentType.FULL_TIME')}</Option>
                <Option value="PART_TIME">{t('jobs.employmentType.PART_TIME')}</Option>
                <Option value="CONTRACT">{t('jobs.employmentType.CONTRACT')}</Option>
                <Option value="FREELANCE">{t('jobs.employmentType.FREELANCE')}</Option>
                <Option value="INTERNSHIP">{t('jobs.employmentType.INTERNSHIP')}</Option>
                <Option value="WORKING_STUDENT">{t('jobs.employmentType.WORKING_STUDENT')}</Option>
              </Select>
              <Button icon={<ReloadOutlined />} onClick={fetchJobs}>
                {t('common.retry', 'Refresh')}
              </Button>
            </Space>
          </Col>
          <Col xs={24} lg={6} style={{ textAlign: 'right' }}>
            {activeTab === 'active' && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate('/admin/jobs/new')}
                style={{ backgroundColor: brandTokens.navy, borderColor: brandTokens.navy }}
              >
                {t('jobs.createJob')}
              </Button>
            )}
          </Col>
        </Row>
      </Card>

      {/* Main Table */}
      <DataTable
        columns={activeTab === 'trash' ? trashColumns : columns}
        dataSource={jobs}
        loading={loading}
        error={error}
        searchable={false}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onChange: (page, pageSize) => {
            setPagination({ current: page, pageSize, total: pagination.total });
          },
        }}
      />

      {/* Delete / Move to Trash Confirmation Modal */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        recordTitle={selectedJobForDelete?.title}
        permanentOnly={isPermanentOnly}
        loading={submittingDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setSelectedJobForDelete(null);
        }}
        onConfirm={handleConfirmDelete}
      />

      {/* Moderation Reason Modal */}
      <Modal
        title={`Change Job Status to ${targetStatus}`}
        open={moderationModalOpen}
        onOk={handleConfirmModeration}
        onCancel={() => setModerationModalOpen(false)}
        confirmLoading={submittingModeration}
        okText={t('common.submit')}
        cancelText={t('common.cancel')}
      >
        <div style={{ marginTop: 12 }}>
          <Text type="secondary">
            Provide an optional reason or note for updating the status of job "{selectedJob?.title}":
          </Text>
          <Input.TextArea
            rows={3}
            value={moderationReason}
            onChange={(e) => setModerationReason(e.target.value)}
            placeholder="Reason for status change..."
            style={{ marginTop: 8 }}
          />
        </div>
      </Modal>
    </div>
  );
}
export default JobsPage;
