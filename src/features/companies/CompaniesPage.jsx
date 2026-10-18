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
  Form,
  App,
  Typography,
  Tooltip,
  Dropdown,
  Alert,
  Badge,
  Checkbox,
  Divider,
  Tabs,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  StopOutlined,
  SearchOutlined,
  ReloadOutlined,
  CloudServerOutlined,
  MailOutlined,
  SolutionOutlined,
  MoreOutlined,
  UndoOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { DataTable } from '../../components/common/DataTable.jsx';
import { DeleteConfirmationModal } from '../../components/common/DeleteConfirmationModal.jsx';
import { companiesApi } from '../../services/companiesApi.js';
import { configurationApi } from '../../services/configurationApi.js';
import { brandTokens, lightSemanticTokens, darkSemanticTokens } from '../../theme/tokens.js';

const { Text, Paragraph, Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export function CompaniesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const isDarkMode = useSelector((state) => state.theme?.isDarkMode);
  const semantic = isDarkMode ? darkSemanticTokens : lightSemanticTokens;

  // State
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'trash'
  const [companies, setCompanies] = useState([]);
  const [summary, setSummary] = useState({ ALL: 0, IN_REVIEW: 0, ACTIVE: 0, SUSPENDED: 0, UNVERIFIED: 0, INACTIVE: 0, TRASH: 0 });
  const [integrations, setIntegrations] = useState(null);
  const [industries, setIndustries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  // Review, Status, Edit & Delete Modals
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isPermanentOnly, setIsPermanentOnly] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [reviewForm] = Form.useForm();
  const [statusForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  // Load status summary & integration health
  const loadMeta = useCallback(async () => {
    try {
      const [sumRes, intRes, indRes] = await Promise.all([
        companiesApi.getStatusSummary().catch(() => ({ data: {} })),
        companiesApi.getIntegrationsStatus().catch(() => ({ data: {} })),
        configurationApi.getIndustries({ limit: 100 }).catch(() => ({ data: [] })),
      ]);
      if (sumRes.data) setSummary(sumRes.data);
      if (intRes.data) setIntegrations(intRes.data);
      if (indRes.data) setIndustries(indRes.data);
    } catch (err) {
      // Non-blocking meta fetch
    }
  }, []);

  // Fetch companies list
  const fetchCompanies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const isTrashView = activeTab === 'trash';
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        sortBy: isTrashView ? 'deletedAt' : 'createdAt',
        sortOrder: 'desc',
        trashed: isTrashView,
      };
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;
      if (industryFilter) params.industryId = industryFilter;

      const res = await companiesApi.getCompanies(params);
      setCompanies(res.data || []);
      if (res.pagination) {
        setPagination((prev) => ({
          ...prev,
          total: res.pagination.total,
        }));
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to load companies';
      setError(msg);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, search, statusFilter, industryFilter, activeTab]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Handle Review Submission
  const handleReviewSubmit = async (values) => {
    if (!selectedCompany) return;
    try {
      setSubmitting(true);
      await companiesApi.reviewCompany(selectedCompany.id, {
        decision: values.decision,
        notes: values.notes,
        rejectionReason: values.decision === 'REJECT' ? values.rejectionReason : undefined,
      });
      message.success(
        values.decision === 'APPROVE'
          ? t('companies.createSuccess', 'Company application approved!')
          : t('companies.reviewSuccess', 'Company application rejected.')
      );
      setReviewModalOpen(false);
      reviewForm.resetFields();
      setSelectedCompany(null);
      fetchCompanies();
      loadMeta();
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Status Change Submission
  const handleStatusSubmit = async (values) => {
    if (!selectedCompany) return;
    try {
      setSubmitting(true);
      await companiesApi.updateCompanyStatus(selectedCompany.id, {
        status: values.status,
        reason: values.reason,
      });
      message.success(`Status updated to ${values.status}`);
      setStatusModalOpen(false);
      statusForm.resetFields();
      setSelectedCompany(null);
      fetchCompanies();
      loadMeta();
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to update status');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Company Modal
  const handleOpenEditModal = (record) => {
    setSelectedCompany(record);
    editForm.setFieldsValue({
      name: record.name || '',
      legalName: record.legalName || '',
      companyCode: record.companyCode || '',
      taxId: record.taxId || '',
      registrationNumber: record.registrationNumber || '',
      industryId: record.industryId || record.industry?.id || null,
      companySize: record.companySize || null,
      foundedYear: record.foundedYear || null,
      email: record.email || '',
      hrEmail: record.hrEmail || '',
      supportEmail: record.supportEmail || '',
      phone: record.phone || '',
      alternatePhone: record.alternatePhone || '',
      website: record.website || '',
      addressLine1: record.addressLine1 || '',
      addressLine2: record.addressLine2 || '',
      city: record.city || '',
      state: record.state || '',
      postalCode: record.postalCode || '',
      country: record.country || 'DE',
      billingEmail: record.billingEmail || '',
      billingAddress: record.billingAddress || '',
      description: record.description || '',
      hiringDomestic: Boolean(record.hiringDomestic),
      hiringInternational: Boolean(record.hiringInternational),
      hiringEu: Boolean(record.hiringEu),
    });
    setEditModalOpen(true);
  };

  // Handle Edit Company Submission
  const handleEditSubmit = async (values) => {
    if (!selectedCompany) return;
    try {
      setSubmitting(true);
      const payload = {
        name: values.name?.trim(),
        legalName: values.legalName?.trim() || null,
        companyCode: values.companyCode?.trim() || null,
        taxId: values.taxId?.trim() || null,
        registrationNumber: values.registrationNumber?.trim() || null,
        industryId: values.industryId || null,
        companySize: values.companySize || null,
        foundedYear: values.foundedYear ? parseInt(values.foundedYear, 10) : null,
        email: values.email?.trim() || null,
        hrEmail: values.hrEmail?.trim() || null,
        supportEmail: values.supportEmail?.trim() || null,
        phone: values.phone?.trim() || null,
        alternatePhone: values.alternatePhone?.trim() || null,
        website: values.website?.trim() || null,
        addressLine1: values.addressLine1?.trim() || null,
        addressLine2: values.addressLine2?.trim() || null,
        city: values.city?.trim() || null,
        state: values.state?.trim() || null,
        postalCode: values.postalCode?.trim() || null,
        country: values.country || 'DE',
        billingEmail: values.billingEmail?.trim() || null,
        billingAddress: values.billingAddress?.trim() || null,
        description: values.description?.trim() || null,
        hiringDomestic: Boolean(values.hiringDomestic),
        hiringInternational: Boolean(values.hiringInternational),
        hiringEu: Boolean(values.hiringEu),
      };

      await companiesApi.updateCompany(selectedCompany.id, payload);
      message.success(t('companies.updateSuccess', 'Company details updated successfully.'));
      setEditModalOpen(false);
      editForm.resetFields();
      setSelectedCompany(null);
      await fetchCompanies();
      await loadMeta();
    } catch (err) {
      if (err.response?.data?.issues) {
        editForm.setFields(
          err.response.data.issues.map((i) => ({ name: i.field, errors: [i.message] }))
        );
      }
      message.error(err.response?.data?.error || 'Failed to update company details.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Delete Modal
  const handleOpenDeleteModal = (record, permanentOnly = false) => {
    setSelectedCompany(record);
    setIsPermanentOnly(permanentOnly || activeTab === 'trash' || Boolean(record?.deletedAt));
    setDeleteModalOpen(true);
  };

  // Handle Delete Confirmation (Soft delete to trash or permanent delete)
  const handleDeleteConfirm = async (mode) => {
    if (!selectedCompany) return;
    try {
      setSubmitting(true);
      const res = await companiesApi.deleteCompany(selectedCompany.id, mode);
      message.success(
        res.message ||
          (mode === 'DELETE_PERMANENTLY'
            ? t('companies.deletedPermanently', 'Company permanently deleted.')
            : t('companies.movedToTrash', 'Company moved to Trash with 30-day retention.'))
      );
      setDeleteModalOpen(false);
      setSelectedCompany(null);
      await fetchCompanies();
      await loadMeta();
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to delete company.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestoreCompany = async (record) => {
    try {
      setSubmitting(true);
      const res = await companiesApi.restoreCompany(record.id);
      message.success(res.message || t('companies.restoreSuccess', 'Company restored from trash.'));
      await fetchCompanies();
      await loadMeta();
    } catch (err) {
      message.error(err.response?.data?.error || t('companies.restoreError', 'Failed to restore company.'));
    } finally {
      setSubmitting(false);
    }
  };

  // Status tag rendering
  const renderStatusTag = (status) => {
    switch (status) {
      case 'IN_REVIEW':
        return <Tag color="processing">{t('companies.statusInReview', 'In Review')}</Tag>;
      case 'UNVERIFIED':
        return <Tag color="warning">{t('companies.statusUnverified', 'Unverified')}</Tag>;
      case 'ACTIVE':
        return <Tag color="success">{t('companies.statusActive', 'Active')}</Tag>;
      case 'INACTIVE':
        return <Tag color="default">{t('companies.statusInactive', 'Inactive')}</Tag>;
      case 'SUSPENDED':
        return <Tag color="error">{t('companies.statusSuspended', 'Suspended')}</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  // Table Columns
  const columns = [
    {
      title: t('companies.colName', 'Company / Code'),
      key: 'name',
      render: (_, record) => {
        const initial = (record.name || 'C').charAt(0).toUpperCase();
        return (
          <Space size={12} align="center">
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                background: isDarkMode ? 'rgba(79, 168, 192, 0.15)' : 'rgba(22, 49, 63, 0.06)',
                color: isDarkMode ? brandTokens.teal : brandTokens.navy,
                fontWeight: 700,
                fontSize: 15,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                border: `1px solid ${semantic.borderSubtle}`,
              }}
            >
              {initial}
            </div>
            <Space direction="vertical" size={2}>
              <Space size={6} wrap>
                <Text strong style={{ fontSize: 13.5, color: semantic.textPrimary }}>
                  {record.name}
                </Text>
                {record.companyCode && (
                  <Tag
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      borderRadius: 4,
                      background: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9',
                      border: `1px solid ${semantic.borderSubtle}`,
                      color: semantic.textSecondary,
                      padding: '0 5px',
                    }}
                  >
                    {record.companyCode}
                  </Tag>
                )}
              </Space>
              {record.legalName && (
                <Text style={{ fontSize: 12, color: semantic.textSecondary }}>
                  {record.legalName}
                </Text>
              )}
            </Space>
          </Space>
        );
      },
    },
    {
      title: t('companies.colIndustry', 'Industry & Size'),
      key: 'industry',
      render: (_, record) => (
        <Space direction="vertical" size={3}>
          <Text style={{ fontSize: 13, color: semantic.textPrimary }}>{record.industry?.name || '—'}</Text>
          {record.companySize && (
            <Tag
              color="cyan"
              style={{
                fontSize: 11,
                borderRadius: 4,
                padding: '0 6px',
                border: 'none',
                background: isDarkMode ? 'rgba(79, 168, 192, 0.15)' : '#e0f2fe',
                color: isDarkMode ? '#7dd3fc' : '#0369a1',
              }}
            >
              {record.companySize} employees
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: t('companies.colContact', 'Contact & Country'),
      key: 'contact',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text style={{ fontSize: 12, color: semantic.textSecondary }}>{record.email || '—'}</Text>
          <Space size={4}>
            <Tag style={{ fontSize: 11, borderRadius: 4, padding: '0 4px' }}>{record.country || 'DE'}</Tag>
            {record.city && <Text style={{ fontSize: 11, color: semantic.textDisabled }}>{record.city}</Text>}
          </Space>
        </Space>
      ),
    },
    {
      title: t('companies.colStatus', 'Status'),
      dataIndex: 'status',
      key: 'status',
      render: (status) => renderStatusTag(status),
    },
    {
      title: t('companies.colCreated', 'Registered'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (val) => (val ? <span style={{ fontSize: 12.5, color: semantic.textSecondary }}>{new Date(val).toLocaleDateString()}</span> : '—'),
    },
    {
      title: t('companies.actions', 'Actions'),
      key: 'actions',
      align: 'right',
      render: (_, record) => {
        const actionMenuItems = [
          {
            key: 'view',
            icon: <EyeOutlined />,
            label: t('companies.viewProfile', 'View Details'),
            onClick: () => navigate(`/admin/companies/${record.id}`),
          },
          {
            key: 'edit',
            icon: <EditOutlined />,
            label: t('companies.editCompany', 'Edit Company'),
            onClick: () => handleOpenEditModal(record),
          },
          ...(record.status === 'IN_REVIEW'
            ? [
                {
                  key: 'review',
                  icon: <CheckCircleOutlined style={{ color: '#0284c7' }} />,
                  label: t('companies.reviewApplication', 'Review Application'),
                  onClick: () => {
                    setSelectedCompany(record);
                    reviewForm.setFieldsValue({ decision: 'APPROVE', notes: '' });
                    setReviewModalOpen(true);
                  },
                },
              ]
            : []),
          {
            key: 'status',
            icon: <StopOutlined />,
            label: t('companies.changeStatus', 'Change Status'),
            onClick: () => {
              setSelectedCompany(record);
              statusForm.setFieldsValue({ status: record.status, reason: record.suspensionReason || '' });
              setStatusModalOpen(true);
            },
          },
          {
            type: 'divider',
          },
          ...(record.deletedAt
            ? [
                {
                  key: 'restore',
                  icon: <UndoOutlined style={{ color: '#10b981' }} />,
                  label: t('companies.restoreCompany', 'Restore from Trash'),
                  onClick: () => handleRestoreCompany(record),
                },
              ]
            : []),
          {
            key: 'delete',
            icon: <DeleteOutlined />,
            danger: true,
            label: t('companies.deleteCompany', 'Delete Company'),
            onClick: () => handleOpenDeleteModal(record),
          },
        ];

        return (
          <Space size={4}>
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/admin/companies/${record.id}`)}
              style={{ color: semantic.textSecondary, borderRadius: 6 }}
            >
              {t('companies.viewProfile', 'View')}
            </Button>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleOpenEditModal(record)}
              style={{ color: isDarkMode ? brandTokens.teal : brandTokens.navy, borderRadius: 6, fontWeight: 500 }}
            >
              {t('common.edit', 'Edit')}
            </Button>
            <Dropdown menu={{ items: actionMenuItems }} trigger={['click']} placement="bottomRight">
              <Button type="text" size="small" icon={<MoreOutlined style={{ color: semantic.textSecondary }} />} style={{ borderRadius: 6 }} />
            </Dropdown>
          </Space>
        );
      },
    },
  ];

  // Dedicated Columns for Trash & Retention View
  const trashColumns = [
    {
      title: t('companies.colName', 'Company / Code'),
      key: 'name',
      render: (_, record) => {
        const initial = (record.name || 'C').charAt(0).toUpperCase();
        return (
          <Space size={12} align="center">
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                background: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2',
                color: isDarkMode ? '#f87171' : '#dc2626',
                fontWeight: 700,
                fontSize: 15,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                border: `1px solid ${isDarkMode ? 'rgba(239, 68, 68, 0.3)' : '#fca5a5'}`,
              }}
            >
              {initial}
            </div>
            <Space direction="vertical" size={2}>
              <Space size={6} wrap>
                <Text strong style={{ fontSize: 13.5, color: semantic.textPrimary }}>{record.name}</Text>
                {record.companyCode && (
                  <Tag style={{ fontSize: 11, fontWeight: 600, borderRadius: 4, padding: '0 5px' }}>{record.companyCode}</Tag>
                )}
              </Space>
              {record.legalName && (
                <Text style={{ fontSize: 12, color: semantic.textSecondary }}>
                  {record.legalName}
                </Text>
              )}
            </Space>
          </Space>
        );
      },
    },
    {
      title: t('companies.colIndustry', 'Industry & Contact'),
      key: 'industry',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text style={{ fontSize: 13, color: semantic.textPrimary }}>{record.industry?.name || '—'}</Text>
          <Space size={4}>
            <Tag style={{ fontSize: 11, borderRadius: 4 }}>{record.country || 'DE'}</Tag>
            <Text style={{ fontSize: 12, color: semantic.textSecondary }}>{record.email || '—'}</Text>
          </Space>
        </Space>
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
            <Text style={{ fontSize: 13, color: semantic.textPrimary }}>{d.toLocaleDateString()}</Text>
            <Text style={{ fontSize: 11, color: semantic.textSecondary }}>
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
            <Tag color="error" icon={<ExclamationCircleOutlined />} style={{ borderRadius: 4 }}>
              Expired (&gt;30d) - Super Admin Only
            </Tag>
          );
        }
        return (
          <Tag color="orange" icon={<ClockCircleOutlined />} style={{ borderRadius: 4, fontWeight: 500 }}>
            {daysRemaining} day{daysRemaining === 1 ? '' : 's'} remaining
          </Tag>
        );
      },
    },
    {
      title: t('companies.actions', 'Actions'),
      key: 'actions',
      align: 'right',
      render: (_, record) => (
        <Space size={6}>
          <Popconfirm
            title={t('companies.restoreTitle', 'Restore Company?')}
            description={`Restore "${record.name}" back to the active directory?`}
            onConfirm={() => handleRestoreCompany(record)}
            okText={t('common.restore', 'Restore')}
            cancelText={t('common.cancel', 'Cancel')}
          >
            <Button
              type="primary"
              size="small"
              icon={<UndoOutlined />}
              style={{ backgroundColor: '#10b981', borderColor: '#10b981', borderRadius: 6, fontWeight: 500 }}
              loading={submitting}
            >
              {t('common.restore', 'Restore')}
            </Button>
          </Popconfirm>
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/admin/companies/${record.id}`)}
            style={{ borderRadius: 6, color: semantic.textSecondary }}
          >
            {t('companies.viewProfile', 'View')}
          </Button>
          <Tooltip title={t('companies.deletePermanentlyTooltip', 'Delete Permanently from Database')}>
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleOpenDeleteModal(record, true)}
              style={{ borderRadius: 6 }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // Modern Minimalist KPI Card Renderer
  const renderKpiCard = ({ title, value, icon, color, active = false, onClick = null, badge = null }) => (
    <Card
      className="rt-card-hover"
      variant="outlined"
      onClick={onClick}
      style={{
        borderRadius: 12,
        border: `1px solid ${active ? (isDarkMode ? brandTokens.teal : brandTokens.navy) : semantic.borderDefault}`,
        background: semantic.bgCard,
        boxShadow: active
          ? (isDarkMode ? '0 0 0 1px rgba(79,168,192,0.3)' : '0 2px 10px rgba(22,49,63,0.06)')
          : (isDarkMode ? 'none' : '0 1px 3px rgba(0,0,0,0.02)'),
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.18s ease',
      }}
      styles={{
        body: {
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '100%',
        },
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
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
              fontSize: 17,
              color: color || (isDarkMode ? brandTokens.teal : brandTokens.navy),
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

      <div
        style={{
          fontSize: 25,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: color && active ? color : semantic.textPrimary,
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
    </Card>
  );

  return (
    <div className="rt-page-container" style={{ padding: '0 4px' }}>
      {/* Page Header */}
      <div
        style={{
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              margin: '0 0 4px 0',
              color: semantic.textPrimary,
              letterSpacing: '-0.01em',
            }}
          >
            {t('companies.title', 'Company & Employer Management')}
          </h1>
          <Text style={{ fontSize: 13, color: semantic.textSecondary }}>
            {t(
              'companies.subtitle',
              'Manage registered enterprise companies, verify onboarding submissions, inspect compliance documents, and configure hiring policies.'
            )}
          </Text>
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/admin/companies/new')}
          style={{
            backgroundColor: isDarkMode ? brandTokens.teal : brandTokens.navy,
            borderColor: isDarkMode ? brandTokens.teal : brandTokens.navy,
            borderRadius: 8,
            fontWeight: 600,
            height: 38,
          }}
        >
          {t('companies.onboardingWizard', 'Onboard New Company')}
        </Button>
      </div>

      {/* Integrations Banner (if unconfigured) */}
      {integrations && (!integrations.cloudinary?.configured || !integrations.mail?.configured) && (
        <Alert
          style={{
            marginBottom: 20,
            borderRadius: 10,
            border: `1px solid ${semantic.borderDefault}`,
            background: isDarkMode ? 'rgba(79, 168, 192, 0.08)' : '#f0f9ff',
          }}
          type="info"
          showIcon
          message={
            <Space size={16} wrap>
              <Text strong style={{ color: semantic.textPrimary }}>Integration Readiness:</Text>
              <Space>
                <CloudServerOutlined style={{ color: isDarkMode ? brandTokens.teal : brandTokens.navy }} />
                <span>
                  Cloudinary:{' '}
                  {integrations.cloudinary?.configured ? (
                    <Tag color="success" style={{ borderRadius: 4 }}>Connected</Tag>
                  ) : (
                    <Tag color="warning" style={{ borderRadius: 4 }}>Simulated / Fallback Mode</Tag>
                  )}
                </span>
              </Space>
              <Space>
                <MailOutlined style={{ color: isDarkMode ? brandTokens.teal : brandTokens.navy }} />
                <span>
                  SMTP Service:{' '}
                  {integrations.mail?.configured ? (
                    <Tag color="success" style={{ borderRadius: 4 }}>Connected</Tag>
                  ) : (
                    <Tag color="warning" style={{ borderRadius: 4 }}>Logged / Fallback Links</Tag>
                  )}
                </span>
              </Space>
            </Space>
          }
        />
      )}

      {/* Statistics Cards */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={8} md={summary.TRASH > 0 ? undefined : 6} flex={summary.TRASH > 0 ? '1 1 180px' : undefined}>
          {renderKpiCard({
            title: t('companies.totalCompanies', 'Total Active'),
            value: summary.ALL || 0,
            icon: <SolutionOutlined />,
            color: isDarkMode ? brandTokens.teal : brandTokens.navy,
            active: activeTab === 'active' && !statusFilter,
            onClick: () => {
              setActiveTab('active');
              setStatusFilter('');
              setPagination((p) => ({ ...p, current: 1 }));
            },
          })}
        </Col>
        <Col xs={12} sm={8} md={summary.TRASH > 0 ? undefined : 6} flex={summary.TRASH > 0 ? '1 1 180px' : undefined}>
          {renderKpiCard({
            title: t('companies.statusInReview', 'In Review'),
            value: summary.IN_REVIEW || 0,
            icon: <CheckCircleOutlined />,
            color: '#0284c7',
            active: activeTab === 'active' && statusFilter === 'IN_REVIEW',
            onClick: () => {
              setActiveTab('active');
              setStatusFilter('IN_REVIEW');
              setPagination((p) => ({ ...p, current: 1 }));
            },
            badge: <Badge status={summary.IN_REVIEW > 0 ? 'processing' : 'default'} />,
          })}
        </Col>
        <Col xs={12} sm={8} md={summary.TRASH > 0 ? undefined : 6} flex={summary.TRASH > 0 ? '1 1 180px' : undefined}>
          {renderKpiCard({
            title: t('companies.statusActive', 'Active'),
            value: summary.ACTIVE || 0,
            icon: <CheckCircleOutlined />,
            color: '#16a34a',
            active: activeTab === 'active' && statusFilter === 'ACTIVE',
            onClick: () => {
              setActiveTab('active');
              setStatusFilter('ACTIVE');
              setPagination((p) => ({ ...p, current: 1 }));
            },
          })}
        </Col>
        <Col xs={12} sm={8} md={summary.TRASH > 0 ? undefined : 6} flex={summary.TRASH > 0 ? '1 1 180px' : undefined}>
          {renderKpiCard({
            title: t('companies.statusSuspended', 'Suspended'),
            value: summary.SUSPENDED || 0,
            icon: <StopOutlined />,
            color: summary.SUSPENDED > 0 ? '#dc2626' : undefined,
            active: activeTab === 'active' && statusFilter === 'SUSPENDED',
            onClick: () => {
              setActiveTab('active');
              setStatusFilter('SUSPENDED');
              setPagination((p) => ({ ...p, current: 1 }));
            },
          })}
        </Col>
        <Col xs={12} sm={8} md={summary.TRASH > 0 ? undefined : 6} flex={summary.TRASH > 0 ? '1 1 180px' : undefined}>
          {renderKpiCard({
            title: t('companies.inTrash', 'In Trash (30d)'),
            value: summary.TRASH || 0,
            icon: <DeleteOutlined />,
            color: summary.TRASH > 0 ? '#ef4444' : undefined,
            active: activeTab === 'trash',
            onClick: () => {
              setActiveTab('trash');
              setPagination((p) => ({ ...p, current: 1 }));
            },
          })}
        </Col>
      </Row>

      {/* Directory View Tabs: Active Companies vs Trash & Retention */}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key);
          setPagination((p) => ({ ...p, current: 1 }));
        }}
        size="large"
        style={{ marginBottom: 16 }}
        items={[
          {
            key: 'active',
            label: (
              <span style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>
                <CheckCircleOutlined style={{ color: '#16a34a', marginRight: 6 }} />
                {t('companies.activeCompanies', 'Active Companies')} ({summary.ALL || 0})
              </span>
            ),
          },
          {
            key: 'trash',
            label: (
              <span style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', color: summary.TRASH > 0 ? '#ef4444' : undefined }}>
                <DeleteOutlined style={{ color: summary.TRASH > 0 ? '#ef4444' : undefined, marginRight: 6 }} />
                {t('companies.trashRetention', 'Trash & Retention')} ({summary.TRASH || 0})
              </span>
            ),
          },
        ]}
      />

      {/* Trash Policy Alert Banner */}
      {activeTab === 'trash' && (
        <Alert
          style={{
            marginBottom: 16,
            borderRadius: 10,
            border: `1px solid ${isDarkMode ? 'rgba(234, 179, 8, 0.3)' : '#fef08a'}`,
            background: isDarkMode ? 'rgba(234, 179, 8, 0.08)' : '#fffbeb',
          }}
          type="warning"
          showIcon
          message={t('companies.trashBannerTitle', 'Company Trash & 30-Day Retention Policy')}
          description={t(
            'companies.trashBannerDesc',
            'Soft-deleted companies are retained in Trash for 30 days before permanent deletion. During this 30-day window, administrators can restore the company at any time with its documents and user associations preserved. Restorations beyond 30 days require Super Administrator authorization.'
          )}
        />
      )}

      {/* Filter & Action Toolbar */}
      <Card
        variant="outlined"
        style={{
          marginBottom: 16,
          borderRadius: 12,
          border: `1px solid ${semantic.borderDefault}`,
          background: semantic.bgCard,
        }}
        styles={{ body: { padding: '14px 18px' } }}
      >
        <Row gutter={[12, 12]} justify="space-between" align="middle">
          <Col xs={24} md={18}>
            <Space wrap size={10} style={{ width: '100%' }}>
              <Input
                placeholder={t('companies.searchPlaceholder', 'Search by name, legal name, code, email...')}
                prefix={<SearchOutlined style={{ color: semantic.textDisabled }} />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onPressEnter={() => {
                  setPagination((p) => ({ ...p, current: 1 }));
                  fetchCompanies();
                }}
                style={{ width: 280, borderRadius: 8 }}
                allowClear
              />
              <Select
                placeholder={t('companies.filterStatus', 'Status')}
                value={statusFilter}
                onChange={(val) => {
                  setStatusFilter(val);
                  setPagination((p) => ({ ...p, current: 1 }));
                }}
                style={{ width: 140, borderRadius: 8 }}
                allowClear
              >
                <Option value="">{t('companies.allStatuses', 'All Statuses')}</Option>
                <Option value="IN_REVIEW">{t('companies.statusInReview', 'In Review')}</Option>
                <Option value="ACTIVE">{t('companies.statusActive', 'Active')}</Option>
                <Option value="UNVERIFIED">{t('companies.statusUnverified', 'Unverified')}</Option>
                <Option value="INACTIVE">{t('companies.statusInactive', 'Inactive')}</Option>
                <Option value="SUSPENDED">{t('companies.statusSuspended', 'Suspended')}</Option>
              </Select>
              <Select
                placeholder={t('companies.filterIndustry', 'Industry')}
                value={industryFilter}
                onChange={(val) => {
                  setIndustryFilter(val);
                  setPagination((p) => ({ ...p, current: 1 }));
                }}
                style={{ width: 180, borderRadius: 8 }}
                allowClear
              >
                <Option value="">{t('companies.allIndustries', 'All Industries')}</Option>
                {industries.map((ind) => (
                  <Option key={ind.id} value={ind.id}>{ind.name}</Option>
                ))}
              </Select>
              <Button icon={<ReloadOutlined />} onClick={fetchCompanies} style={{ borderRadius: 8 }}>
                {t('common.retry', 'Refresh')}
              </Button>
            </Space>
          </Col>
          <Col xs={24} md={6} style={{ textAlign: 'right' }}>
            <Text style={{ fontSize: 13, color: semantic.textSecondary }}>
              {t('table.totalRecords', { total: pagination.total })}
            </Text>
          </Col>
        </Row>
      </Card>

      {/* Main Table */}
      <DataTable
        columns={activeTab === 'trash' ? trashColumns : columns}
        dataSource={companies}
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
        rowKey="id"
      />

      {/* Review Modal */}
      <Modal
        title={t('companies.reviewTitle', 'Company Compliance Review')}
        open={reviewModalOpen}
        onCancel={() => {
          setReviewModalOpen(false);
          reviewForm.resetFields();
          setSelectedCompany(null);
        }}
        footer={null}
        destroyOnHidden
      >
        {selectedCompany && (
          <div style={{ marginBottom: 16 }}>
            <Paragraph>
              <strong>{selectedCompany.name}</strong> ({selectedCompany.companyCode})
            </Paragraph>
            <Text type="secondary">
              {t(
                'companies.reviewPrompt',
                'Approve this company onboarding application or reject with explanatory notes sent to the applicant.'
              )}
            </Text>
          </div>
        )}
        <Form form={reviewForm} layout="vertical" onFinish={handleReviewSubmit}>
          <Form.Item name="decision" label="Decision" rules={[{ required: true }]}>
            <Select>
              <Option value="APPROVE">{t('companies.decisionApprove', 'Approve & Activate')}</Option>
              <Option value="REJECT">{t('companies.decisionReject', 'Reject Application')}</Option>
            </Select>
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.decision !== cur.decision}>
            {({ getFieldValue }) =>
              getFieldValue('decision') === 'REJECT' ? (
                <Form.Item
                  name="rejectionReason"
                  label={t('companies.rejectionReason', 'Rejection Reason')}
                  rules={[{ required: true, message: 'Please provide a reason for rejection' }]}
                >
                  <TextArea rows={3} placeholder="Provide clear explanation for why the registration was rejected..." />
                </Form.Item>
              ) : null
            }
          </Form.Item>

          <Form.Item name="notes" label={t('companies.reviewNotes', 'Internal Notes (Optional)')}>
            <TextArea rows={2} placeholder="Optional internal auditor notes..." />
          </Form.Item>

          <Space style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <Button onClick={() => setReviewModalOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              {t('common.submit', 'Submit Decision')}
            </Button>
          </Space>
        </Form>
      </Modal>

      {/* Change Status Modal */}
      <Modal
        title={t('companies.changeStatus', 'Change Company Status')}
        open={statusModalOpen}
        onCancel={() => {
          setStatusModalOpen(false);
          statusForm.resetFields();
          setSelectedCompany(null);
        }}
        footer={null}
        destroyOnHidden
      >
        {selectedCompany && (
          <div style={{ marginBottom: 16 }}>
            <Paragraph>
              Company: <strong>{selectedCompany.name}</strong> ({selectedCompany.companyCode})
            </Paragraph>
          </div>
        )}
        <Form form={statusForm} layout="vertical" onFinish={handleStatusSubmit}>
          <Form.Item name="status" label="New Status" rules={[{ required: true }]}>
            <Select>
              <Option value="ACTIVE">{t('companies.statusActive', 'Active')}</Option>
              <Option value="INACTIVE">{t('companies.statusInactive', 'Inactive')}</Option>
              <Option value="SUSPENDED">{t('companies.statusSuspended', 'Suspended')}</Option>
              <Option value="UNVERIFIED">{t('companies.statusUnverified', 'Unverified')}</Option>
            </Select>
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.status !== cur.status}>
            {({ getFieldValue }) =>
              getFieldValue('status') === 'SUSPENDED' ? (
                <Form.Item
                  name="reason"
                  label={t('companies.suspensionReason', 'Reason for Suspension')}
                  rules={[{ required: true, message: 'Reason is required when suspending a company' }]}
                >
                  <TextArea rows={3} placeholder="Explain reason for suspension..." />
                </Form.Item>
              ) : null
            }
          </Form.Item>

          <Space style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <Button onClick={() => setStatusModalOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              {t('common.save', 'Save Status')}
            </Button>
          </Space>
        </Form>
      </Modal>

      {/* Edit Company Modal */}
      <Modal
        title={
          selectedCompany
            ? `${t('companies.editTitle', 'Edit Company')} — ${selectedCompany.name}`
            : t('companies.editTitle', 'Edit Company Profile')
        }
        open={editModalOpen}
        onCancel={() => {
          setEditModalOpen(false);
          editForm.resetFields();
          setSelectedCompany(null);
        }}
        width={760}
        footer={null}
        destroyOnHidden
      >
        <Form form={editForm} layout="vertical" onFinish={handleEditSubmit}>
          <Title level={5} style={{ color: brandTokens.navy, marginTop: 4, marginBottom: 12 }}>
            Identity & Registration
          </Title>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="name"
                label={t('companies.wizard.companyName', 'Display / Trading Name')}
                rules={[{ required: true, message: 'Display name is required' }, { min: 2 }]}
              >
                <Input placeholder="e.g. Acme Tech Solutions" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="legalName"
                label={t('companies.wizard.legalName', 'Legal Business Name')}
              >
                <Input placeholder="e.g. Acme Tech Solutions GmbH" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                name="companyCode"
                label={t('companies.wizard.companyCode', 'Company Code')}
              >
                <Input placeholder="e.g. COMP-ACME" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="taxId" label={t('companies.wizard.taxId', 'VAT / Tax ID')}>
                <Input placeholder="e.g. DE123456789" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="registrationNumber"
                label={t('companies.wizard.registrationNumber', 'Commercial Register No.')}
              >
                <Input placeholder="e.g. HRB 98765 B" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={10}>
              <Form.Item name="industryId" label={t('companies.wizard.industry', 'Industry Sector')}>
                <Select placeholder="Select primary industry" allowClear showSearch optionFilterProp="children">
                  {industries.map((ind) => (
                    <Option key={ind.id} value={ind.id}>
                      {ind.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={7}>
              <Form.Item name="companySize" label={t('companies.wizard.companySize', 'Company Size')}>
                <Select placeholder="Select Size" allowClear>
                  <Option value="1-10">1-10 employees</Option>
                  <Option value="11-50">11-50 employees</Option>
                  <Option value="51-200">51-200 employees</Option>
                  <Option value="201-500">201-500 employees</Option>
                  <Option value="501-1000">501-1000 employees</Option>
                  <Option value="1000+">1000+ employees</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={7}>
              <Form.Item name="foundedYear" label={t('companies.wizard.foundedYear', 'Founded Year')}>
                <Input type="number" placeholder="e.g. 2020" min={1800} max={new Date().getFullYear()} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label={t('companies.wizard.description', 'Company Description')}>
            <TextArea rows={2} placeholder="Brief company summary..." />
          </Form.Item>

          <Divider style={{ margin: '16px 0 12px' }} />
          <Title level={5} style={{ color: brandTokens.navy, marginBottom: 12 }}>
            Contact & Location
          </Title>

          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                name="email"
                label={t('companies.wizard.primaryEmail', 'Primary Email')}
                rules={[{ type: 'email', message: 'Valid email required' }]}
              >
                <Input placeholder="contact@company.com" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="phone" label={t('companies.wizard.phone', 'Phone')}>
                <Input placeholder="+49 30 12345678" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="website"
                label={t('companies.wizard.website', 'Website')}
                rules={[{ type: 'url', message: 'Valid URL required' }]}
              >
                <Input placeholder="https://company.com" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="addressLine1" label={t('companies.wizard.address', 'Street Address')}>
                <Input placeholder="Hauptstraße 123" />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="city" label={t('companies.wizard.city', 'City')}>
                <Input placeholder="Berlin" />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="country" label={t('companies.wizard.country', 'Country')}>
                <Select>
                  <Option value="DE">Germany (DE)</Option>
                  <Option value="AT">Austria (AT)</Option>
                  <Option value="CH">Switzerland (CH)</Option>
                  <Option value="GB">United Kingdom (GB)</Option>
                  <Option value="US">United States (US)</Option>
                  <Option value="NL">Netherlands (NL)</Option>
                  <Option value="FR">France (FR)</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '16px 0 12px' }} />
          <Text strong style={{ display: 'block', marginBottom: 8, color: brandTokens.navy }}>
            {t('companies.wizard.hiringPreferences', 'Hiring Preferences')}
          </Text>
          <Space size={24} wrap style={{ marginBottom: 16 }}>
            <Form.Item name="hiringDomestic" valuePropName="checked" noStyle>
              <Checkbox>{t('companies.wizard.domesticHiring', 'Domestic')}</Checkbox>
            </Form.Item>
            <Form.Item name="hiringInternational" valuePropName="checked" noStyle>
              <Checkbox>{t('companies.wizard.internationalHiring', 'International')}</Checkbox>
            </Form.Item>
            <Form.Item name="hiringEu" valuePropName="checked" noStyle>
              <Checkbox>{t('companies.wizard.euHiring', 'EU-wide')}</Checkbox>
            </Form.Item>
          </Space>

          <Space style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Button
              onClick={() => {
                setEditModalOpen(false);
                editForm.resetFields();
                setSelectedCompany(null);
              }}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              {t('common.saveChanges', 'Save Changes')}
            </Button>
          </Space>
        </Form>
      </Modal>

      {/* Delete / Move to Trash Confirmation Modal */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        recordTitle={selectedCompany?.name}
        permanentOnly={isPermanentOnly}
        onCancel={() => {
          setDeleteModalOpen(false);
          setSelectedCompany(null);
        }}
        onConfirm={handleDeleteConfirm}
        loading={submitting}
      />
    </div>
  );
}
