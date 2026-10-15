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
  Checkbox,
  Card,
  Alert,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  CloseCircleOutlined,
  StopOutlined,
  SwapOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { DataTable } from '../../components/common/DataTable.jsx';
import { billingApi, formatBillingError } from '../../services/billingApi.js';
import { brandTokens } from '../../theme/tokens.js';

const { Text, Title, Paragraph } = Typography;
const { Option } = Select;

export function SubscriptionsPage() {
  const { t } = useTranslation();
  const [subscriptions, setSubscriptions] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditEntitlementsOpen, setIsEditEntitlementsOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const [selectedSub, setSelectedSub] = useState(null);
  const [subDetails, setSubDetails] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Forms
  const [createForm] = Form.useForm();
  const [entitlementsForm] = Form.useForm();
  const [upgradeForm] = Form.useForm();
  const [cancelForm] = Form.useForm();
  const [revokeForm] = Form.useForm();

  // Selection state for Create Subscription modal preview
  const [selectedPlanForCreate, setSelectedPlanForCreate] = useState(null);

  const fetchSubscriptions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await billingApi.getSubscriptions();
      if (res.success) {
        setSubscriptions(res.data);
      }
    } catch (err) {
      setError(formatBillingError(err, t('common.networkError')));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const fetchDropdownData = useCallback(async () => {
    try {
      const [compRes, planRes] = await Promise.allSettled([
        billingApi.getCompanies(),
        billingApi.getPlans({ status: 'ACTIVE' }),
      ]);
      if (compRes.status === 'fulfilled' && compRes.value?.success) {
        setCompanies(compRes.value.data);
      }
      if (planRes.status === 'fulfilled' && planRes.value?.success) {
        setPlans(planRes.value.data);
      }
    } catch (err) {
      // Non-fatal, handled by select empty states
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
    fetchDropdownData();
  }, [fetchSubscriptions, fetchDropdownData]);

  const handleCreate = async (values) => {
    try {
      setSubmitting(true);
      await billingApi.createSubscription(values);
      message.success(t('billing.subscriptions.createSuccess'));
      setIsCreateModalOpen(false);
      createForm.resetFields();
      setSelectedPlanForCreate(null);
      await fetchSubscriptions();
    } catch (err) {
      message.error(formatBillingError(err, 'Failed to create subscription.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateEntitlements = async (values) => {
    if (!selectedSub) return;
    try {
      setSubmitting(true);
      await billingApi.updateEntitlements(selectedSub.id, values);
      message.success(t('billing.subscriptions.entitlementSuccess'));
      setIsEditEntitlementsOpen(false);
      setSelectedSub(null);
      entitlementsForm.resetFields();
      await fetchSubscriptions();
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.code === 'CONFIRMATION_REQUIRED_BELOW_USAGE') {
        message.warning(errData.error);
      } else {
        message.error(formatBillingError(err, 'Failed to update entitlements.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpgrade = async (values) => {
    if (!selectedSub) return;
    try {
      setSubmitting(true);
      await billingApi.upgradeSubscription(selectedSub.id, values);
      message.success(t('billing.subscriptions.upgradeSuccess'));
      setIsUpgradeModalOpen(false);
      setSelectedSub(null);
      upgradeForm.resetFields();
      await fetchSubscriptions();
    } catch (err) {
      message.error(formatBillingError(err, 'Failed to change plan.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (values) => {
    if (!selectedSub) return;
    try {
      setSubmitting(true);
      await billingApi.cancelSubscription(selectedSub.id, values);
      message.success(t('billing.subscriptions.cancelSuccess'));
      setIsCancelModalOpen(false);
      setSelectedSub(null);
      cancelForm.resetFields();
      await fetchSubscriptions();
    } catch (err) {
      message.error(formatBillingError(err, 'Failed to cancel subscription.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (values) => {
    if (!selectedSub) return;
    try {
      setSubmitting(true);
      await billingApi.revokeSubscription(selectedSub.id, values);
      message.success(t('billing.subscriptions.revokeSuccess'));
      setIsRevokeModalOpen(false);
      setSelectedSub(null);
      revokeForm.resetFields();
      await fetchSubscriptions();
    } catch (err) {
      message.error(formatBillingError(err, 'Failed to revoke subscription.'));
    } finally {
      setSubmitting(false);
    }
  };

  const openViewModal = async (sub) => {
    setSelectedSub(sub);
    setIsViewModalOpen(true);
    try {
      const res = await billingApi.getSubscription(sub.id);
      if (res.success) {
        setSubDetails(res.data);
      }
    } catch (err) {
      message.error(formatBillingError(err, 'Failed to load subscription details.'));
    }
  };

  const openHistoryModal = async (sub) => {
    setSelectedSub(sub);
    setIsHistoryModalOpen(true);
    try {
      const res = await billingApi.getSubscriptionHistory(sub.id);
      if (res.success) {
        setHistoryLogs(res.data);
      }
    } catch (err) {
      message.error(formatBillingError(err, 'Failed to load subscription history.'));
    }
  };

  const openEntitlementsModal = (sub) => {
    setSelectedSub(sub);
    entitlementsForm.setFieldsValue({
      candidateAccessLimit: sub.candidateAccessLimit,
      jobPostingLimit: sub.jobPostingLimit,
      teamMemberLimit: sub.teamMemberLimit,
      confirmBelowUsage: false,
    });
    setIsEditEntitlementsOpen(true);
  };

  const openUpgradeModal = (sub) => {
    setSelectedSub(sub);
    upgradeForm.setFieldsValue({ newPlanId: sub.planId });
    setIsUpgradeModalOpen(true);
  };

  const columns = [
    {
      title: t('billing.subscriptions.selectCompany'),
      key: 'company',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600, color: brandTokens.navy }}>{record.company?.name}</div>
          {record.company?.taxId && (
            <div style={{ fontSize: 11, color: brandTokens.muted }}>Tax ID: {record.company.taxId}</div>
          )}
        </div>
      ),
    },
    {
      title: t('billing.plans.name'),
      key: 'plan',
      render: (_, record) => (
        <div>
          <span style={{ fontWeight: 500 }}>{record.plan?.name}</span>
          <div style={{ fontSize: 12, color: brandTokens.muted }}>
            {Number(record.price).toFixed(2)} {record.currency} / {t(`billing.intervals.${record.billingInterval}`)}
          </div>
        </div>
      ),
    },
    {
      title: t('billing.subscriptions.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = 'default';
        if (status === 'ACTIVE') color = 'success';
        if (status === 'CANCELLED') color = 'orange';
        if (status === 'EXPIRED') color = 'volcano';
        if (status === 'REVOKED') color = 'red';
        if (status === 'PAST_DUE') color = 'gold';
        return <Tag color={color}>{t(`billing.statuses.${status}`)}</Tag>;
      },
    },
    {
      title: t('billing.subscriptions.candidateAccess'),
      key: 'candidateUsage',
      render: (_, record) => (
        <div>
          <span>{record.candidateAccessUsage} / {record.candidateAccessLimit}</span>
          <div style={{ fontSize: 11, color: brandTokens.muted }}>
            {Math.max(0, record.candidateAccessLimit - record.candidateAccessUsage)} remaining
          </div>
        </div>
      ),
    },
    {
      title: t('billing.subscriptions.jobPostings'),
      key: 'jobUsage',
      render: (_, record) => (
        <div>
          <div>Limit: {record.jobPostingLimit}</div>
          <Tag color="default" style={{ fontSize: 10 }}>{t('billing.subscriptions.notIntegrated')}</Tag>
        </div>
      ),
    },
    {
      title: t('billing.subscriptions.teamMembers'),
      key: 'teamUsage',
      render: (_, record) => (
        <div>
          <div>Limit: {record.teamMemberLimit}</div>
          <Tag color="default" style={{ fontSize: 10 }}>{t('billing.subscriptions.notIntegrated')}</Tag>
        </div>
      ),
    },
    {
      title: t('billing.subscriptions.startDate'),
      dataIndex: 'startDate',
      key: 'startDate',
      render: (d) => (d ? new Date(d).toLocaleDateString() : '-'),
    },
    {
      title: t('billing.subscriptions.endDate'),
      dataIndex: 'endDate',
      key: 'endDate',
      render: (d, record) => {
        if (record.billingInterval === 'ONE_TIME') {
          return <Tag color="blue">One Time / Lifetime</Tag>;
        }
        return d ? new Date(d).toLocaleDateString() : '-';
      },
    },
    {
      title: t('table.actions'),
      key: 'subActions',
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined style={{ color: brandTokens.navy }} />}
            onClick={() => openViewModal(record)}
            title={t('billing.subscriptions.viewDetails')}
          />
          {record.status === 'ACTIVE' && (
            <>
              <Button
                type="text"
                size="small"
                icon={<EditOutlined style={{ color: brandTokens.teal }} />}
                onClick={() => openEntitlementsModal(record)}
                title={t('billing.subscriptions.editEntitlements')}
              />
              <Button
                type="text"
                size="small"
                icon={<SwapOutlined style={{ color: brandTokens.navySoft }} />}
                onClick={() => openUpgradeModal(record)}
                title={t('billing.subscriptions.upgradeDowngrade')}
              />
              <Button
                type="text"
                size="small"
                icon={<CloseCircleOutlined style={{ color: brandTokens.amber }} />}
                onClick={() => {
                  setSelectedSub(record);
                  setIsCancelModalOpen(true);
                }}
                title={t('billing.subscriptions.cancel')}
              />
              <Button
                type="text"
                size="small"
                danger
                icon={<StopOutlined />}
                onClick={() => {
                  setSelectedSub(record);
                  setIsRevokeModalOpen(true);
                }}
                title={t('billing.subscriptions.revoke')}
              />
            </>
          )}
          <Button
            type="text"
            size="small"
            icon={<HistoryOutlined style={{ color: brandTokens.muted }} />}
            onClick={() => openHistoryModal(record)}
            title={t('billing.subscriptions.history')}
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <DataTable
        title={t('billing.subscriptions.title')}
        subtitle={t('billing.subscriptions.subtitle')}
        columns={columns}
        dataSource={subscriptions}
        loading={loading}
        error={error}
        onRefresh={fetchSubscriptions}
        onCreate={() => {
          fetchDropdownData();
          setIsCreateModalOpen(true);
        }}
        createButtonText={t('billing.subscriptions.createSubscription')}
        exportFilename="billing_subscriptions"
      />

      {/* CREATE SUBSCRIPTION MODAL */}
      <Modal
        title={t('billing.subscriptions.createSubscription')}
        open={isCreateModalOpen}
        onCancel={() => {
          setIsCreateModalOpen(false);
          setSelectedPlanForCreate(null);
        }}
        footer={null}
        destroyOnHidden
        width={600}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{
            startDate: new Date().toISOString().split('T')[0],
          }}
        >
          <Form.Item
            name="companyId"
            label={t('billing.subscriptions.selectCompany')}
            rules={[{ required: true, message: 'Please select an employer' }]}
          >
            <Select
              showSearch
              placeholder={t('billing.subscriptions.selectCompanyPlaceholder')}
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={companies.map((c) => ({
                value: c.id,
                label: `${c.name} ${c.taxId ? `(${c.taxId})` : ''}`,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="planId"
            label={t('billing.subscriptions.selectPlan')}
            rules={[{ required: true, message: 'Please select an active plan' }]}
          >
            <Select
              showSearch
              placeholder={t('billing.subscriptions.selectPlanPlaceholder')}
              onChange={(val) => {
                const p = plans.find((item) => item.id === val);
                setSelectedPlanForCreate(p);
              }}
              options={plans.map((p) => ({
                value: p.id,
                label: `${p.name} - ${Number(p.price).toFixed(2)} ${p.currency} (${t(`billing.intervals.${p.billingInterval}`)})`,
              }))}
            />
          </Form.Item>

          {/* Real-time Plan Preview Card */}
          {selectedPlanForCreate && (
            <Card
              size="small"
              style={{
                marginBottom: 16,
                backgroundColor: brandTokens.tealBg,
                borderColor: brandTokens.border,
              }}
            >
              <Title level={5} style={{ margin: '0 0 8px 0', color: brandTokens.navy }}>
                {selectedPlanForCreate.name} — {t('billing.subscriptions.planSummary')}
              </Title>
              <Descriptions column={2} size="small">
                <Descriptions.Item label={t('billing.plans.price')}>
                  <strong>{Number(selectedPlanForCreate.offerPrice ?? selectedPlanForCreate.price).toFixed(2)} {selectedPlanForCreate.currency}</strong>
                </Descriptions.Item>
                <Descriptions.Item label={t('billing.plans.billingInterval')}>
                  <Tag color="cyan">{t(`billing.intervals.${selectedPlanForCreate.billingInterval}`)}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label={t('billing.plans.candidateAccess')}>
                  {selectedPlanForCreate.candidateAccessLimit} / {t(`billing.intervals.${selectedPlanForCreate.billingInterval}`)}
                </Descriptions.Item>
                <Descriptions.Item label={t('billing.plans.jobPostings')}>
                  {selectedPlanForCreate.jobPostingLimit} postings
                </Descriptions.Item>
                <Descriptions.Item label={t('billing.plans.teamMembers')}>
                  {selectedPlanForCreate.teamMemberLimit} members
                </Descriptions.Item>
              </Descriptions>
            </Card>
          )}

          <Form.Item
            name="startDate"
            label={t('billing.subscriptions.startDate')}
            rules={[{ required: true }]}
          >
            <Input type="date" />
          </Form.Item>

          <Form.Item style={{ marginTop: 24, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsCreateModalOpen(false)}>{t('common.cancel')}</Button>
              <Button type="primary" htmlType="submit" loading={submitting} style={{ background: brandTokens.navy }}>
                {t('common.submit')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* ADJUST ENTITLEMENTS MODAL */}
      <Modal
        title={t('billing.subscriptions.editEntitlements')}
        open={isEditEntitlementsOpen}
        onCancel={() => setIsEditEntitlementsOpen(false)}
        footer={null}
        destroyOnHidden
        width={550}
      >
        {selectedSub && (
          <Form form={entitlementsForm} layout="vertical" onFinish={handleUpdateEntitlements}>
            <Alert
              message={`Current Candidate Usage: ${selectedSub.candidateAccessUsage} / ${selectedSub.candidateAccessLimit}`}
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Form.Item
              name="candidateAccessLimit"
              label={t('billing.plans.candidateAccess')}
              rules={[{ required: true }]}
            >
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="jobPostingLimit"
              label={t('billing.plans.jobPostings')}
              rules={[{ required: true }]}
            >
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="teamMemberLimit"
              label={t('billing.plans.teamMembers')}
              rules={[{ required: true }]}
            >
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name="confirmBelowUsage" valuePropName="checked">
              <Checkbox>
                {t('billing.subscriptions.confirmBelowUsage')}
              </Checkbox>
            </Form.Item>

            <Form.Item style={{ marginTop: 20, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setIsEditEntitlementsOpen(false)}>{t('common.cancel')}</Button>
                <Button type="primary" htmlType="submit" loading={submitting} style={{ background: brandTokens.navy }}>
                  {t('common.save')}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* UPGRADE / DOWNGRADE MODAL */}
      <Modal
        title={t('billing.subscriptions.upgradeDowngrade')}
        open={isUpgradeModalOpen}
        onCancel={() => setIsUpgradeModalOpen(false)}
        footer={null}
        destroyOnHidden
        width={500}
      >
        {selectedSub && (
          <Form form={upgradeForm} layout="vertical" onFinish={handleUpgrade}>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">Current Plan: </Text>
              <strong>{selectedSub.plan?.name}</strong> ({Number(selectedSub.price).toFixed(2)} {selectedSub.currency})
            </div>

            <Form.Item
              name="newPlanId"
              label="Select Target Plan"
              rules={[{ required: true }]}
            >
              <Select
                options={plans.map((p) => ({
                  value: p.id,
                  label: `${p.name} - ${Number(p.offerPrice ?? p.price).toFixed(2)} ${p.currency} (${t(`billing.intervals.${p.billingInterval}`)})`,
                }))}
              />
            </Form.Item>

            <Form.Item style={{ marginTop: 24, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setIsUpgradeModalOpen(false)}>{t('common.cancel')}</Button>
                <Button type="primary" htmlType="submit" loading={submitting} style={{ background: brandTokens.navy }}>
                  Confirm Plan Change
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* CANCEL MODAL */}
      <Modal
        title={t('billing.subscriptions.cancel')}
        open={isCancelModalOpen}
        onCancel={() => setIsCancelModalOpen(false)}
        footer={null}
        destroyOnHidden
        width={450}
      >
        <Form form={cancelForm} layout="vertical" onFinish={handleCancel}>
          <Paragraph>{t('billing.subscriptions.cancelConfirm')}</Paragraph>
          <Form.Item name="reason" label={t('billing.subscriptions.cancelReason')}>
            <Input.TextArea rows={3} placeholder="Customer requested cancellation, etc." />
          </Form.Item>

          <Form.Item style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsCancelModalOpen(false)}>{t('common.cancel')}</Button>
              <Button danger type="primary" htmlType="submit" loading={submitting}>
                {t('billing.subscriptions.cancel')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* REVOKE MODAL */}
      <Modal
        title={t('billing.subscriptions.revoke')}
        open={isRevokeModalOpen}
        onCancel={() => setIsRevokeModalOpen(false)}
        footer={null}
        destroyOnHidden
        width={480}
      >
        <Form form={revokeForm} layout="vertical" onFinish={handleRevoke}>
          <Alert
            message={t('billing.subscriptions.revokeConfirm')}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Form.Item
            name="reason"
            label={t('billing.subscriptions.revokeReason')}
            rules={[{ required: true, min: 3, message: 'A mandatory revocation reason is required' }]}
          >
            <Input.TextArea rows={3} placeholder="Non-payment, terms violation, administrative termination..." />
          </Form.Item>

          <Form.Item style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsRevokeModalOpen(false)}>{t('common.cancel')}</Button>
              <Button danger type="primary" htmlType="submit" loading={submitting}>
                {t('billing.subscriptions.revoke')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* VIEW DETAILS & USAGE MODAL */}
      <Modal
        title={t('billing.subscriptions.viewDetails')}
        open={isViewModalOpen}
        onCancel={() => {
          setIsViewModalOpen(false);
          setSubDetails(null);
        }}
        footer={[
          <Button key="close" onClick={() => setIsViewModalOpen(false)}>
            {t('common.back')}
          </Button>,
        ]}
        width={650}
      >
        {selectedSub && (
          <div>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label={t('billing.subscriptions.selectCompany')} span={2}>
                <strong>{selectedSub.company?.name}</strong>
              </Descriptions.Item>
              <Descriptions.Item label={t('billing.plans.name')}>{selectedSub.plan?.name}</Descriptions.Item>
              <Descriptions.Item label={t('billing.subscriptions.status')}>
                <Tag color={selectedSub.status === 'ACTIVE' ? 'success' : 'default'}>
                  {t(`billing.statuses.${selectedSub.status}`)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('billing.plans.price')}>
                {Number(selectedSub.price).toFixed(2)} {selectedSub.currency}
              </Descriptions.Item>
              <Descriptions.Item label={t('billing.plans.billingInterval')}>
                <Tag color="cyan">{t(`billing.intervals.${selectedSub.billingInterval}`)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('billing.subscriptions.startDate')}>
                {new Date(selectedSub.startDate).toLocaleDateString()}
              </Descriptions.Item>
              <Descriptions.Item label={t('billing.subscriptions.endDate')}>
                {selectedSub.billingInterval === 'ONE_TIME' ? 'One Time / Lifetime' : selectedSub.endDate ? new Date(selectedSub.endDate).toLocaleDateString() : '-'}
              </Descriptions.Item>
              {selectedSub.cancelledAt && (
                <Descriptions.Item label="Cancelled At" span={2}>
                  {new Date(selectedSub.cancelledAt).toLocaleString()} ({selectedSub.cancellationReason || 'N/A'})
                </Descriptions.Item>
              )}
              {selectedSub.revokedAt && (
                <Descriptions.Item label="Revoked At" span={2}>
                  {new Date(selectedSub.revokedAt).toLocaleString()} ({selectedSub.revokedReason || 'N/A'})
                </Descriptions.Item>
              )}
            </Descriptions>

            <Title level={5} style={{ color: brandTokens.navy, marginBottom: 8 }}>
              {t('billing.subscriptions.entitlements')}
            </Title>

            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label={t('billing.subscriptions.candidateAccess')}>
                <span>
                  <strong>{selectedSub.candidateAccessUsage}</strong> of <strong>{selectedSub.candidateAccessLimit}</strong> used ({Math.max(0, selectedSub.candidateAccessLimit - selectedSub.candidateAccessUsage)} remaining)
                </span>
                <Tag color="green" style={{ marginLeft: 8 }}>INTEGRATED</Tag>
              </Descriptions.Item>

              <Descriptions.Item label={t('billing.subscriptions.jobPostings')}>
                <span>Limit: <strong>{selectedSub.jobPostingLimit}</strong> active postings</span>
                <Tag color="default" style={{ marginLeft: 8 }}>{t('billing.subscriptions.notIntegrated')}</Tag>
                <div style={{ fontSize: 11, color: brandTokens.muted, marginTop: 4 }}>
                  {t('billing.subscriptions.notIntegratedHelp')}
                </div>
              </Descriptions.Item>

              <Descriptions.Item label={t('billing.subscriptions.teamMembers')}>
                <span>Limit: <strong>{selectedSub.teamMemberLimit}</strong> seats</span>
                <Tag color="default" style={{ marginLeft: 8 }}>{t('billing.subscriptions.notIntegrated')}</Tag>
                <div style={{ fontSize: 11, color: brandTokens.muted, marginTop: 4 }}>
                  {t('billing.subscriptions.notIntegratedHelp')}
                </div>
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>

      {/* HISTORY MODAL */}
      <Modal
        title={t('billing.subscriptions.history')}
        open={isHistoryModalOpen}
        onCancel={() => setIsHistoryModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsHistoryModalOpen(false)}>
            {t('common.back')}
          </Button>,
        ]}
        width={650}
      >
        {historyLogs.length === 0 ? (
          <Text type="secondary">No historical audit records found for this subscription.</Text>
        ) : (
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {historyLogs.map((log) => (
              <Card size="small" key={log.id} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Tag color="blue">{log.action}</Tag>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {new Date(log.createdAt).toLocaleString()}
                  </Text>
                </div>
                <div style={{ fontSize: 12 }}>
                  <Text strong>Actor: </Text>{log.actor}
                </div>
                {log.details && (
                  <pre style={{ fontSize: 11, background: '#f5f5f5', padding: 6, borderRadius: 4, marginTop: 6, overflowX: 'auto' }}>
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                )}
              </Card>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
