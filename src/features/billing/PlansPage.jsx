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
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { DataTable } from '../../components/common/DataTable.jsx';
import { billingApi, formatBillingError } from '../../services/billingApi.js';
import { brandTokens } from '../../theme/tokens.js';

const { Text, Paragraph } = Typography;
const { Option } = Select;

export function PlansPage() {
  const { t } = useTranslation();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await billingApi.getPlans({ includeArchived: 'true' });
      if (res.success) {
        setPlans(res.data);
      }
    } catch (err) {
      setError(formatBillingError(err, t('common.networkError')));
    } finally {
      setLoading(false);
    }
  }, [t]);

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

  const handleArchive = async (plan) => {
    try {
      await billingApi.archivePlan(plan.id);
      message.success(t('billing.plans.archiveSuccess'));
      await fetchPlans();
    } catch (err) {
      message.error(formatBillingError(err, 'Failed to archive plan.'));
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

  const columns = [
    {
      title: t('billing.plans.name'),
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <div>
          <div style={{ fontWeight: 600, color: brandTokens.navy }}>{name}</div>
          {record.description && (
            <div style={{ fontSize: 12, color: brandTokens.muted }}>{record.description}</div>
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
          <span style={{ fontWeight: 600 }}>
            {Number(price).toFixed(2)} {record.currency}
          </span>
          {record.offerPrice && (
            <Tag color="orange" style={{ marginLeft: 6 }}>
              {t('billing.plans.offerPrice')}: {Number(record.offerPrice).toFixed(2)} {record.currency}
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: t('billing.plans.billingInterval'),
      dataIndex: 'billingInterval',
      key: 'billingInterval',
      render: (interval) => (
        <Tag color="cyan">{t(`billing.intervals.${interval}`)}</Tag>
      ),
    },
    {
      title: t('billing.plans.candidateAccess'),
      dataIndex: 'candidateAccessLimit',
      key: 'candidateAccessLimit',
      render: (limit) => (
        <span>{limit} {t('billing.subscriptions.candidateAccess')}</span>
      ),
    },
    {
      title: t('billing.plans.jobPostings'),
      dataIndex: 'jobPostingLimit',
      key: 'jobPostingLimit',
    },
    {
      title: t('billing.plans.teamMembers'),
      dataIndex: 'teamMemberLimit',
      key: 'teamMemberLimit',
    },
    {
      title: t('billing.plans.activeSubscriptions'),
      key: 'activeSubs',
      render: (_, record) => record._count?.subscriptions || 0,
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
        return <Tag color={color}>{t(`billing.statuses.${status}`)}</Tag>;
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
            icon={<EyeOutlined style={{ color: brandTokens.navy }} />}
            onClick={() => openViewModal(record)}
            title={t('billing.plans.viewPlan')}
          />
          {record.status !== 'ARCHIVED' && (
            <>
              <Button
                type="text"
                size="small"
                icon={<EditOutlined style={{ color: brandTokens.teal }} />}
                onClick={() => openEditModal(record)}
                title={t('billing.plans.editPlan')}
              />
              <Button
                type="text"
                size="small"
                icon={record.status === 'ACTIVE' ? <StopOutlined style={{ color: brandTokens.amber }} /> : <CheckCircleOutlined style={{ color: brandTokens.success }} />}
                onClick={() => handleToggleStatus(record)}
                title={record.status === 'ACTIVE' ? t('billing.plans.deactivate') : t('billing.plans.activate')}
              />
              <Popconfirm
                title={t('billing.plans.archiveConfirm')}
                onConfirm={() => handleArchive(record)}
                okText={t('common.submit')}
                cancelText={t('common.cancel')}
              >
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  title={t('billing.plans.archivePlan')}
                />
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <DataTable
        title={t('billing.plans.title')}
        subtitle={t('billing.plans.subtitle')}
        columns={columns}
        dataSource={plans}
        loading={loading}
        error={error}
        onRefresh={fetchPlans}
        onCreate={() => setIsCreateModalOpen(true)}
        createButtonText={t('billing.plans.createPlan')}
        exportFilename="billing_plans"
      />

      {/* CREATE PLAN MODAL */}
      <Modal
        title={t('billing.plans.createPlan')}
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        footer={null}
        destroyOnHidden
        width={600}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreate}
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
              style={{ width: 100 }}
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

          <Form.Item style={{ marginTop: 24, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsCreateModalOpen(false)}>{t('common.cancel')}</Button>
              <Button type="primary" htmlType="submit" loading={submitting} style={{ background: brandTokens.navy }}>
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
        width={600}
      >
        <Form form={editForm} layout="vertical" onFinish={handleEdit}>
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

            <Form.Item name="currency" label={t('billing.plans.currency')} rules={[{ required: true }]} style={{ width: 100 }}>
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

          <Form.Item style={{ marginTop: 24, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsEditModalOpen(false)}>{t('common.cancel')}</Button>
              <Button type="primary" htmlType="submit" loading={submitting} style={{ background: brandTokens.navy }}>
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
    </div>
  );
}
