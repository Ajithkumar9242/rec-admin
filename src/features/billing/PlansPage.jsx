import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Tag,
  Space,
  Button,
  message,
  Typography,
  Descriptions,
  Popconfirm,
  Badge,
  Tabs,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  StopOutlined,
  UndoOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { DataTable } from '../../components/common/DataTable.jsx';
import { DeleteConfirmationModal } from '../../components/common/DeleteConfirmationModal.jsx';
import { billingApi, formatBillingError } from '../../services/billingApi.js';
import { brandTokens, lightSemanticTokens, darkSemanticTokens } from '../../theme/tokens.js';

const { Text, Paragraph } = Typography;
const { Option } = Select;

export function PlansPage() {
  const { t } = useTranslation();
  const isDarkMode = useSelector((state) => state.theme?.isDarkMode);
  const semantic = isDarkMode ? darkSemanticTokens : lightSemanticTokens;

  const [activeTab, setActiveTab] = useState('active');
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Deletion modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedPlanForDelete, setSelectedPlanForDelete] = useState(null);
  const [isPermanentOnly, setIsPermanentOnly] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let res;
      if (activeTab === 'trash') {
        res = await billingApi.getPlans({ trashed: 'true' });
      } else if (activeTab === 'inactive') {
        res = await billingApi.getPlans({ trashed: 'false', includeArchived: 'true' });
      } else {
        res = await billingApi.getPlans({ status: 'ACTIVE', trashed: 'false' });
      }

      if (res.success) {
        let data = res.data;
        if (activeTab === 'inactive') {
          data = data.filter((p) => p.status !== 'ACTIVE');
        }
        setPlans(data);
      }
    } catch (err) {
      setError(formatBillingError(err, t('common.networkError')));
    } finally {
      setLoading(false);
    }
  }, [activeTab, t]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleCreate = async (values) => {
    try {
      setSubmitting(true);
      await billingApi.createPlan(values);
      message.success(t('billing.plans.createSuccess'));
      setIsCreateModalOpen(false);
      createForm.resetFields();
      await fetchPlans();
    } catch (err) {
      message.error(formatBillingError(err, 'Failed to create plan.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (values) => {
    if (!selectedPlan) return;
    try {
      setSubmitting(true);
      await billingApi.updatePlan(selectedPlan.id, values);
      message.success(t('billing.plans.updateSuccess'));
      setIsEditModalOpen(false);
      setSelectedPlan(null);
      editForm.resetFields();
      await fetchPlans();
    } catch (err) {
      message.error(formatBillingError(err, 'Failed to update plan.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (plan) => {
    try {
      const nextStatus = plan.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await billingApi.togglePlanStatus(plan.id, nextStatus);
      message.success(`${plan.name}: ${t(`billing.statuses.${nextStatus}`)}`);
      await fetchPlans();
    } catch (err) {
      message.error(formatBillingError(err, 'Failed to toggle status.'));
    }
  };

  const handleOpenDelete = (plan, permanent = false) => {
    setSelectedPlanForDelete(plan);
    setIsPermanentOnly(permanent);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (mode) => {
    if (!selectedPlanForDelete) return;
    try {
      setDeleteLoading(true);
      if (mode === 'DELETE_PERMANENTLY' || isPermanentOnly) {
        await billingApi.deletePlanPermanently(selectedPlanForDelete.id);
        message.success(t('billing.plans.permanentDeleteSuccess', 'Plan permanently deleted.'));
      } else {
        await billingApi.archivePlan(selectedPlanForDelete.id);
        message.success(t('billing.plans.archiveSuccess'));
      }
      setIsDeleteModalOpen(false);
      setSelectedPlanForDelete(null);
      await fetchPlans();
    } catch (err) {
      message.error(formatBillingError(err, 'Failed to delete plan.'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleRestore = async (plan) => {
    try {
      setLoading(true);
      const res = await billingApi.restorePlan(plan.id);
      message.success(res.message || t('billing.plans.restoreSuccess', 'Plan restored successfully as Inactive.'));
      await fetchPlans();
    } catch (err) {
      message.error(formatBillingError(err, 'Failed to restore plan.'));
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (plan) => {
    setSelectedPlan(plan);
    editForm.setFieldsValue({
      name: plan.name,
      description: plan.description,
      price: Number(plan.price),
      offerPrice: plan.offerPrice ? Number(plan.offerPrice) : null,
      currency: plan.currency,
      billingInterval: plan.billingInterval,
      candidateAccessLimit: plan.candidateAccessLimit,
      jobPostingLimit: plan.jobPostingLimit,
      teamMemberLimit: plan.teamMemberLimit,
      status: plan.status,
    });
    setIsEditModalOpen(true);
  };

  const openViewModal = (plan) => {
    setSelectedPlan(plan);
    setIsViewModalOpen(true);
  };

  const getRetentionDetails = (deletedAt) => {
    if (!deletedAt) return null;
    const deletedDate = new Date(deletedAt);
    const purgeDate = new Date(deletedDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const daysRemaining = Math.max(0, Math.ceil((purgeDate - now) / (1000 * 60 * 60 * 24)));
    return {
      deletedDate: deletedDate.toLocaleDateString(),
      daysRemaining,
      purgeDate: purgeDate.toLocaleDateString(),
    };
  };

  const standardColumns = [
    {
      title: t('billing.plans.name'),
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13.5, color: semantic.textPrimary }}>{name}</div>
          {record.description && (
            <div style={{ fontSize: 12, color: semantic.textSecondary, marginTop: 2 }}>{record.description}</div>
          )}
        </div>
      ),
    },
    {
      title: t('billing.plans.regularPrice', 'Regular Price'),
      dataIndex: 'price',
      key: 'price',
      render: (price, record) => (
        <span style={{ fontWeight: 600, fontSize: 13.5, color: semantic.textPrimary }}>
          {Number(price).toFixed(2)} {record.currency}
        </span>
      ),
    },
    {
      title: t('billing.plans.offerPrice', 'Offer Price'),
      dataIndex: 'offerPrice',
      key: 'offerPrice',
      render: (offerPrice, record) =>
        offerPrice ? (
          <Tag color="orange" style={{ fontWeight: 600, borderRadius: 4 }}>
            {t('billing.plans.offerPrice')}: {Number(offerPrice).toFixed(2)} {record.currency}
          </Tag>
        ) : (
          <span style={{ color: semantic.textDisabled }}>—</span>
        ),
    },
    {
      title: t('billing.plans.billingInterval'),
      dataIndex: 'billingInterval',
      key: 'billingInterval',
      render: (interval) => (
        <Tag
          color="cyan"
          style={{
            borderRadius: 4,
            fontWeight: 500,
            fontSize: 11.5,
            border: 'none',
            background: isDarkMode ? 'rgba(79, 168, 192, 0.15)' : '#e0f2fe',
            color: isDarkMode ? '#7dd3fc' : '#0369a1',
          }}
        >
          {t(`billing.intervals.${interval}`) || interval}
        </Tag>
      ),
    },
    {
      title: t('billing.plans.candidateAccess'),
      dataIndex: 'candidateAccessLimit',
      key: 'candidateAccessLimit',
      render: (limit) => <span style={{ fontSize: 13, color: semantic.textPrimary }}>{limit}</span>,
    },
    {
      title: t('billing.plans.jobPostings'),
      dataIndex: 'jobPostingLimit',
      key: 'jobPostingLimit',
      render: (limit) => <span style={{ fontSize: 13, color: semantic.textPrimary }}>{limit}</span>,
    },
    {
      title: t('billing.plans.teamMembers'),
      dataIndex: 'teamMemberLimit',
      key: 'teamMemberLimit',
      render: (limit) => <span style={{ fontSize: 13, color: semantic.textPrimary }}>{limit}</span>,
    },
    {
      title: t('billing.plans.activeSubscriptions'),
      key: 'activeSubs',
      render: (_, record) => (
        <Badge
          count={record._count?.subscriptions || 0}
          overflowCount={999}
          style={{
            backgroundColor: isDarkMode ? brandTokens.teal : brandTokens.navy,
            borderRadius: 6,
            fontWeight: 600,
          }}
        />
      ),
    },
    {
      title: t('billing.plans.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = 'default';
        if (status === 'ACTIVE') color = 'success';
        if (status === 'INACTIVE') color = 'warning';
        if (status === 'ARCHIVED') color = 'magenta';
        return (
          <Tag color={color} style={{ borderRadius: 4, fontWeight: 500 }}>
            {t(`billing.statuses.${status}`)}
          </Tag>
        );
      },
    },
    {
      title: t('table.actions'),
      key: 'planActions',
      fixed: 'right',
      render: (_, record) => (
        <Space size={6}>
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined style={{ color: isDarkMode ? brandTokens.teal : brandTokens.navy }} />}
            onClick={() => openViewModal(record)}
            title={t('billing.plans.viewPlan')}
            style={{ borderRadius: 6 }}
          />
          {record.status !== 'ARCHIVED' && (
            <>
              <Button
                type="text"
                size="small"
                icon={<EditOutlined style={{ color: brandTokens.teal }} />}
                onClick={() => openEditModal(record)}
                title={t('billing.plans.editPlan')}
                style={{ borderRadius: 6 }}
              />
              <Button
                type="text"
                size="small"
                icon={
                  record.status === 'ACTIVE' ? (
                    <StopOutlined style={{ color: brandTokens.amber }} />
                  ) : (
                    <CheckCircleOutlined style={{ color: brandTokens.success }} />
                  )
                }
                onClick={() => handleToggleStatus(record)}
                title={record.status === 'ACTIVE' ? t('billing.plans.deactivate') : t('billing.plans.activate')}
                style={{ borderRadius: 6 }}
              />
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleOpenDelete(record, false)}
                title={t('billing.plans.archivePlan')}
                style={{ borderRadius: 6 }}
              />
            </>
          )}
        </Space>
      ),
    },
  ];

  const trashColumns = [
    {
      title: t('billing.plans.name'),
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13.5, color: semantic.textPrimary }}>{name}</div>
          {record.description && (
            <div style={{ fontSize: 12, color: semantic.textSecondary, marginTop: 2 }}>{record.description}</div>
          )}
        </div>
      ),
    },
    {
      title: t('billing.plans.price'),
      dataIndex: 'price',
      key: 'price',
      render: (price, record) => (
        <div>
          <span style={{ fontWeight: 600, color: semantic.textPrimary }}>
            {Number(price).toFixed(2)} {record.currency}
          </span>{' '}
          <span style={{ fontSize: 12, color: semantic.textSecondary }}>
            / {t(`billing.intervals.${record.billingInterval}`)}
          </span>
        </div>
      ),
    },
    {
      title: t('trash.deletedAt', 'Deleted Date'),
      dataIndex: 'deletedAt',
      key: 'deletedAt',
      render: (d) => (
        <span style={{ color: semantic.textSecondary }}>
          {d ? new Date(d).toLocaleDateString() : '-'}
        </span>
      ),
    },
    {
      title: t('trash.retention', 'Retention Status'),
      key: 'retention',
      render: (_, record) => {
        const ret = getRetentionDetails(record.deletedAt);
        if (!ret) return '-';
        const isExpiringSoon = ret.daysRemaining <= 5;
        return (
          <Space direction="vertical" size={2}>
            <Tag color={isExpiringSoon ? 'red' : 'gold'} style={{ borderRadius: 4, fontWeight: 500 }}>
              {ret.daysRemaining} {t('trash.daysRemaining', 'days remaining')}
            </Tag>
            <span style={{ fontSize: 11, color: semantic.textSecondary }}>
              Purge: {ret.purgeDate}
            </span>
          </Space>
        );
      },
    },
    {
      title: t('billing.plans.activeSubscriptions', 'Subscriptions'),
      key: 'activeSubs',
      render: (_, record) => (
        <Badge
          count={record._count?.subscriptions || 0}
          overflowCount={999}
          style={{ backgroundColor: '#64748b', borderRadius: 6, fontWeight: 600 }}
        />
      ),
    },
    {
      title: t('table.actions'),
      key: 'trashActions',
      fixed: 'right',
      render: (_, record) => {
        const hasSubscriptions = (record._count?.subscriptions || 0) > 0;
        return (
          <Space size={6}>
            <Popconfirm
              title={t('billing.plans.restoreConfirm', 'Restore this plan as Inactive?')}
              onConfirm={() => handleRestore(record)}
              okText={t('common.submit')}
              cancelText={t('common.cancel')}
            >
              <Button
                type="text"
                size="small"
                icon={<UndoOutlined style={{ color: brandTokens.teal }} />}
                title={t('billing.plans.restore', 'Restore Plan')}
                style={{ borderRadius: 6 }}
              />
            </Popconfirm>
            {hasSubscriptions ? (
              <Tooltip title={t('billing.plans.cannotPermanentDeleteWithSubs', 'Cannot permanently delete plan because historical or active subscriptions exist.')}>
                <Button
                  type="text"
                  size="small"
                  disabled
                  icon={<DeleteOutlined style={{ color: semantic.textDisabled }} />}
                  style={{ borderRadius: 6 }}
                />
              </Tooltip>
            ) : (
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleOpenDelete(record, true)}
                title={t('trash.permanentDelete', 'Permanent Delete')}
                style={{ borderRadius: 6 }}
              />
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div className="rt-page-container" style={{ maxWidth: 1400, margin: '0 auto' }}>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          { key: 'active', label: t('billing.plans.activePlans', 'Active Plans') },
          { key: 'inactive', label: t('billing.plans.inactivePlans', 'Inactive / Archived Plans') },
          { key: 'trash', label: t('billing.plans.trashPlans', 'Trash & Retention') },
        ]}
        style={{ marginBottom: 16 }}
      />

      <DataTable
        title={
          activeTab === 'trash'
            ? t('billing.plans.trashTitle', 'Plan Trash & Retention')
            : activeTab === 'inactive'
            ? t('billing.plans.inactiveTitle', 'Inactive Plans')
            : t('billing.plans.title')
        }
        subtitle={
          activeTab === 'trash'
            ? t('billing.plans.trashSubtitle', 'Soft-deleted subscription plans retained for 30 days before permanent deletion.')
            : t('billing.plans.subtitle')
        }
        columns={activeTab === 'trash' ? trashColumns : standardColumns}
        dataSource={plans}
        loading={loading}
        error={error}
        onRefresh={fetchPlans}
        onCreate={activeTab === 'active' ? () => setIsCreateModalOpen(true) : undefined}
        createButtonText={t('billing.plans.createPlan')}
        exportFilename={`billing_plans_${activeTab}`}
      />

      {/* CREATE PLAN MODAL */}
      <Modal
        title={t('billing.plans.createPlan')}
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        footer={null}
        destroyOnHidden
        centered
        width={600}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreate}
          style={{ marginTop: 12 }}
          initialValues={{
            currency: 'EUR',
            billingInterval: 'MONTHLY',
            candidateAccessLimit: 50,
            jobPostingLimit: 5,
            teamMemberLimit: 3,
            status: 'ACTIVE',
          }}
        >
          <Form.Item
            name="name"
            label={t('billing.plans.name')}
            rules={[{ required: true, message: 'Plan name is required' }]}
          >
            <Input placeholder="e.g. Professional Starter" />
          </Form.Item>

          <Form.Item name="description" label={t('billing.plans.description')}>
            <Input.TextArea rows={2} placeholder="Optional plan description" />
          </Form.Item>

          <Space size={16} style={{ display: 'flex' }}>
            <Form.Item
              name="price"
              label={t('billing.plans.price')}
              rules={[{ required: true, message: 'Price is required' }]}
              style={{ flex: 1 }}
            >
              <InputNumber min={0} step={0.01} precision={2} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="offerPrice"
              label={t('billing.plans.offerPrice')}
              style={{ flex: 1 }}
            >
              <InputNumber min={0} step={0.01} precision={2} placeholder="Optional" style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="currency"
              label={t('billing.plans.currency')}
              rules={[{ required: true }]}
              style={{ width: 110 }}
            >
              <Select>
                <Option value="EUR">EUR (€)</Option>
                <Option value="USD">USD ($)</Option>
                <Option value="GBP">GBP (£)</Option>
              </Select>
            </Form.Item>
          </Space>

          <Form.Item
            name="billingInterval"
            label={t('billing.plans.billingInterval')}
            rules={[{ required: true }]}
          >
            <Select>
              <Option value="DAY">{t('billing.intervals.DAY')}</Option>
              <Option value="MONTHLY">{t('billing.intervals.MONTHLY')}</Option>
              <Option value="YEARLY">{t('billing.intervals.YEARLY')}</Option>
              <Option value="ONE_TIME">{t('billing.intervals.ONE_TIME')}</Option>
            </Select>
          </Form.Item>

          <Space size={16} style={{ display: 'flex' }}>
            <Form.Item
              name="candidateAccessLimit"
              label={t('billing.plans.candidateAccess')}
              extra={t('billing.plans.candidateAccessHelp')}
              rules={[{ required: true }]}
              style={{ flex: 1 }}
            >
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="jobPostingLimit"
              label={t('billing.plans.jobPostings')}
              rules={[{ required: true }]}
              style={{ flex: 1 }}
            >
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="teamMemberLimit"
              label={t('billing.plans.teamMembers')}
              rules={[{ required: true }]}
              style={{ flex: 1 }}
            >
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Space>

          <Form.Item style={{ marginTop: 24, textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setIsCreateModalOpen(false)}>{t('common.cancel')}</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                style={{
                  backgroundColor: isDarkMode ? brandTokens.teal : brandTokens.navy,
                  borderColor: isDarkMode ? brandTokens.teal : brandTokens.navy,
                  fontWeight: 600,
                }}
              >
                {t('common.save')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* EDIT PLAN MODAL */}
      <Modal
        title={t('billing.plans.editPlan')}
        open={isEditModalOpen}
        onCancel={() => setIsEditModalOpen(false)}
        footer={null}
        destroyOnHidden
        centered
        width={600}
      >
        <Form form={editForm} layout="vertical" onFinish={handleEdit} style={{ marginTop: 12 }}>
          <Form.Item name="name" label={t('billing.plans.name')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="description" label={t('billing.plans.description')}>
            <Input.TextArea rows={2} />
          </Form.Item>

          <Space size={16} style={{ display: 'flex' }}>
            <Form.Item name="price" label={t('billing.plans.price')} rules={[{ required: true }]} style={{ flex: 1 }}>
              <InputNumber min={0} step={0.01} precision={2} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name="offerPrice" label={t('billing.plans.offerPrice')} style={{ flex: 1 }}>
              <InputNumber min={0} step={0.01} precision={2} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name="currency" label={t('billing.plans.currency')} rules={[{ required: true }]} style={{ width: 110 }}>
              <Select>
                <Option value="EUR">EUR (€)</Option>
                <Option value="USD">USD ($)</Option>
                <Option value="GBP">GBP (£)</Option>
              </Select>
            </Form.Item>
          </Space>

          <Form.Item name="billingInterval" label={t('billing.plans.billingInterval')} rules={[{ required: true }]}>
            <Select>
              <Option value="DAY">{t('billing.intervals.DAY')}</Option>
              <Option value="MONTHLY">{t('billing.intervals.MONTHLY')}</Option>
              <Option value="YEARLY">{t('billing.intervals.YEARLY')}</Option>
              <Option value="ONE_TIME">{t('billing.intervals.ONE_TIME')}</Option>
            </Select>
          </Form.Item>

          <Space size={16} style={{ display: 'flex' }}>
            <Form.Item name="candidateAccessLimit" label={t('billing.plans.candidateAccess')} rules={[{ required: true }]} style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name="jobPostingLimit" label={t('billing.plans.jobPostings')} rules={[{ required: true }]} style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name="teamMemberLimit" label={t('billing.plans.teamMembers')} rules={[{ required: true }]} style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Space>

          <Form.Item name="status" label={t('billing.plans.status')} rules={[{ required: true }]}>
            <Select>
              <Option value="ACTIVE">{t('billing.statuses.ACTIVE')}</Option>
              <Option value="INACTIVE">{t('billing.statuses.INACTIVE')}</Option>
            </Select>
          </Form.Item>

          <Form.Item style={{ marginTop: 24, textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setIsEditModalOpen(false)}>{t('common.cancel')}</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                style={{
                  backgroundColor: isDarkMode ? brandTokens.teal : brandTokens.navy,
                  borderColor: isDarkMode ? brandTokens.teal : brandTokens.navy,
                  fontWeight: 600,
                }}
              >
                {t('common.save')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* VIEW PLAN MODAL */}
      <Modal
        title={t('billing.plans.viewPlan')}
        open={isViewModalOpen}
        onCancel={() => setIsViewModalOpen(false)}
        centered
        footer={[
          <Button key="close" onClick={() => setIsViewModalOpen(false)}>
            {t('common.back')}
          </Button>,
        ]}
        width={550}
      >
        {selectedPlan && (
          <Descriptions bordered column={1} size="small" style={{ marginTop: 12 }}>
            <Descriptions.Item label={t('billing.plans.name')}>{selectedPlan.name}</Descriptions.Item>
            <Descriptions.Item label={t('billing.plans.description')}>{selectedPlan.description || '-'}</Descriptions.Item>
            <Descriptions.Item label={t('billing.plans.price')}>
              {Number(selectedPlan.price).toFixed(2)} {selectedPlan.currency}
            </Descriptions.Item>
            <Descriptions.Item label={t('billing.plans.offerPrice')}>
              {selectedPlan.offerPrice ? `${Number(selectedPlan.offerPrice).toFixed(2)} ${selectedPlan.currency}` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('billing.plans.billingInterval')}>
              <Tag color="cyan">{t(`billing.intervals.${selectedPlan.billingInterval}`)}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t('billing.plans.candidateAccess')}>
              <strong>{selectedPlan.candidateAccessLimit}</strong> {t('billing.subscriptions.candidateAccess')} / {t(`billing.intervals.${selectedPlan.billingInterval}`)}
            </Descriptions.Item>
            <Descriptions.Item label={t('billing.plans.jobPostings')}>
              <strong>{selectedPlan.jobPostingLimit}</strong> {t('billing.subscriptions.jobPostings')}
            </Descriptions.Item>
            <Descriptions.Item label={t('billing.plans.teamMembers')}>
              <strong>{selectedPlan.teamMemberLimit}</strong> {t('billing.subscriptions.teamMembers')}
            </Descriptions.Item>
            <Descriptions.Item label={t('billing.plans.status')}>
              <Tag color={selectedPlan.status === 'ACTIVE' ? 'success' : 'default'}>
                {t(`billing.statuses.${selectedPlan.status}`)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t('billing.plans.activeSubscriptions')}>
              {selectedPlan._count?.subscriptions || 0}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* SAFE DELETE / MOVE TO TRASH / PERMANENT DELETE MODAL */}
      <DeleteConfirmationModal
        open={isDeleteModalOpen}
        recordTitle={selectedPlanForDelete?.name}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setSelectedPlanForDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        loading={deleteLoading}
        permanentOnly={isPermanentOnly}
      />
    </div>
  );
}

export default PlansPage;
