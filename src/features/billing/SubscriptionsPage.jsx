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
  CreditCardOutlined,
  SyncOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { usePermissions } from '../../hooks/usePermissions.js';
import { DataTable } from '../../components/common/DataTable.jsx';
import { billingApi, formatBillingError } from '../../services/billingApi.js';
import { brandTokens, lightSemanticTokens, darkSemanticTokens } from '../../theme/tokens.js';

const { Text, Title, Paragraph } = Typography;
const { Option } = Select;

export function SubscriptionsPage() {
  const { t } = useTranslation();
  const isDarkMode = useSelector((state) => state.theme?.isDarkMode);
  const semantic = isDarkMode ? darkSemanticTokens : lightSemanticTokens;
  const { can, isSuperAdmin } = usePermissions();

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

  const handleOpenPortal = async (customerId) => {
    try {
      const res = await billingApi.createStripePortalSession({
        customerId,
        returnUrl: window.location.href,
      });
      if (res.success && res.data?.url) {
        window.open(res.data.url, '_blank');
      }
    } catch (err) {
      message.error(formatBillingError(err, 'Failed to open Stripe Customer Portal.'));
    }
  };

  const handleApplyPlanQuotas = async (sub, confirmBelowUsage = false) => {
    if (!sub) return;
    try {
      setSubmitting(true);
      const res = await billingApi.applyPlanQuotas(sub.id, { confirmBelowUsage });
      message.success(res.message || 'Plan quotas applied successfully.');
      await fetchSubscriptions();
      if (selectedSub && selectedSub.id === sub.id) {
        const refreshed = await billingApi.getSubscription(sub.id);
        if (refreshed.success) {
          setSelectedSub(refreshed.data);
          setSubDetails(refreshed.data);
        }
      }
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.code === 'CONFIRMATION_REQUIRED_BELOW_USAGE') {
        Modal.confirm({
          title: t('billing.subscriptions.confirmQuotaReduction', 'Confirm Quota Reduction Below Usage'),
          icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
          content: (
            <div>
              <p>{errData.error}</p>
              <div style={{ fontSize: 12, color: semantic.textSecondary }}>
                Existing jobs and team members will be preserved. No existing records will be deleted, unpublished, or deactivated. However, new quota-consuming actions will be blocked until usage complies with the new limit.
              </div>
            </div>
          ),
          okText: t('common.confirmApply', 'Apply Anyway'),
          okType: 'danger',
          cancelText: t('common.cancel', 'Cancel'),
          onOk: () => handleApplyPlanQuotas(sub, true),
        });
      } else {
        message.error(formatBillingError(err, 'Failed to apply plan quotas.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: t('billing.subscriptions.employer', 'Employer'),
      key: 'company',
      render: (_, record) => (
        <span style={{ fontWeight: 600, fontSize: 13.5, color: semantic.textPrimary }}>
          {record.company?.name || '—'}
        </span>
      ),
    },
    {
      title: t('billing.plans.name', 'Plan Name'),
      key: 'plan',
      render: (_, record) => (
        <span style={{ fontWeight: 500, color: semantic.textPrimary }}>{record.plan?.name || '—'}</span>
      ),
    },
    {
      title: t('billing.subscriptions.status', 'Subscription Status'),
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = 'default';
        if (status === 'ACTIVE') color = 'success';
        if (status === 'CANCELLED') color = 'orange';
        if (status === 'EXPIRED') color = 'volcano';
        if (status === 'REVOKED') color = 'red';
        if (status === 'PAST_DUE') color = 'gold';
        return (
          <Tag color={color} style={{ borderRadius: 4, fontWeight: 500 }}>
            {t(`billing.statuses.${status}`) || status}
          </Tag>
        );
      },
    },
    {
      title: t('billing.subscriptions.price', 'Subscription Price'),
      key: 'price',
      render: (_, record) => (
        <div>
          <span style={{ fontWeight: 600, fontSize: 13, color: semantic.textPrimary }}>
            {Number(record.price).toFixed(2)} {record.currency}
          </span>
          <span style={{ fontSize: 11.5, color: semantic.textSecondary, marginLeft: 4 }}>
            / {t(`billing.intervals.${record.billingInterval}`) || record.billingInterval}
          </span>
        </div>
      ),
    },
    {
      title: t('billing.subscriptions.candidateAccess', 'Candidate Access'),
      key: 'candidateUsage',
      render: (_, record) => {
        const usage = record.candidateAccessUsage ?? 0;
        const limit = record.candidateAccessLimit;
        const isOverQuota = usage > limit;
        return (
          <div>
            <span style={{ fontWeight: 500, color: isOverQuota ? '#ef4444' : semantic.textPrimary }}>
              {usage} / {limit}
            </span>
            {isOverQuota ? (
              <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>
                ({usage - limit} over quota)
              </div>
            ) : (
              <div style={{ fontSize: 11, color: semantic.textSecondary }}>
                {Math.max(0, limit - usage)} remaining
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: t('billing.subscriptions.jobPostings', 'Job Postings'),
      key: 'jobUsage',
      render: (_, record) => {
        if (record.jobPostingUsage !== undefined) {
          const usage = record.jobPostingUsage;
          const limit = record.jobPostingLimit;
          const isOverQuota = usage > limit;
          return (
            <div>
              <span style={{ fontWeight: 500, color: isOverQuota ? '#ef4444' : semantic.textPrimary }}>
                {usage} / {limit} {t('billing.subscriptions.jobsUsed', 'jobs used')}
              </span>
              {isOverQuota ? (
                <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>
                  ({usage - limit} over quota)
                </div>
              ) : (
                <div style={{ fontSize: 11, color: semantic.textSecondary }}>
                  {Math.max(0, limit - usage)} {t('billing.subscriptions.remaining', 'remaining')}
                </div>
              )}
            </div>
          );
        }
        return (
          <div>
            <div style={{ fontSize: 12, color: semantic.textPrimary }}>Limit: {record.jobPostingLimit}</div>
            <Tag color="default" style={{ fontSize: 10.5, borderRadius: 4, marginTop: 2 }}>{t('billing.subscriptions.notIntegrated', 'Module Pending')}</Tag>
          </div>
        );
      },
    },
    {
      title: t('billing.subscriptions.teamMembers', 'Team Members'),
      key: 'teamUsage',
      render: (_, record) => {
        if (record.teamMemberUsage !== undefined) {
          const usage = record.teamMemberUsage;
          const limit = record.teamMemberLimit;
          const isOverQuota = usage > limit;
          return (
            <div>
              <span style={{ fontWeight: 500, color: isOverQuota ? '#ef4444' : semantic.textPrimary }}>
                {usage} / {limit} {t('billing.subscriptions.seatsUsed', 'seats used')}
              </span>
              {isOverQuota ? (
                <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>
                  ({usage - limit} over quota)
                </div>
              ) : (
                <div style={{ fontSize: 11, color: semantic.textSecondary }}>
                  {Math.max(0, limit - usage)} {t('billing.subscriptions.remaining', 'remaining')}
                </div>
              )}
            </div>
          );
        }
        return (
          <div>
            <div style={{ fontSize: 12, color: semantic.textPrimary }}>Limit: {record.teamMemberLimit}</div>
            <Tag color="default" style={{ fontSize: 10.5, borderRadius: 4, marginTop: 2 }}>{t('billing.subscriptions.notIntegrated', 'Module Pending')}</Tag>
          </div>
        );
      },
    },
    {
      title: t('billing.subscriptions.startDate', 'Start Date'),
      dataIndex: 'startDate',
      key: 'startDate',
      render: (d) => (
        <span style={{ fontSize: 12.5, color: semantic.textSecondary }}>
          {d ? new Date(d).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      title: t('billing.subscriptions.endDateOrRenewal', 'End Date / Renewal Date'),
      key: 'endDateOrRenewal',
      render: (_, record) => {
        if (record.billingInterval === 'ONE_TIME') {
          return <Tag color="blue" style={{ borderRadius: 4 }}>One Time / Lifetime</Tag>;
        }
        if (record.status === 'ACTIVE' && record.nextBillingDate) {
          return (
            <div>
              <span style={{ fontSize: 11, color: brandTokens.teal, fontWeight: 500 }}>Renews: </span>
              <span style={{ fontSize: 12.5, color: semantic.textPrimary }}>{new Date(record.nextBillingDate).toLocaleDateString()}</span>
            </div>
          );
        }
        if (record.endDate) {
          return (
            <div>
              <span style={{ fontSize: 11, color: semantic.textSecondary }}>Ends: </span>
              <span style={{ fontSize: 12.5, color: semantic.textPrimary }}>{new Date(record.endDate).toLocaleDateString()}</span>
            </div>
          );
        }
        return '—';
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
            icon={<EyeOutlined style={{ color: isDarkMode ? brandTokens.teal : brandTokens.navy }} />}
            onClick={() => openViewModal(record)}
            title={t('billing.subscriptions.viewDetails')}
            style={{ borderRadius: 6 }}
          />
          {record.status === 'ACTIVE' && can('BILLING', 'EDIT') && (
            <>
              <Button
                type="text"
                size="small"
                icon={<EditOutlined style={{ color: brandTokens.teal }} />}
                onClick={() => openEntitlementsModal(record)}
                title={t('billing.subscriptions.editEntitlements')}
                style={{ borderRadius: 6 }}
              />
              <Button
                type="text"
                size="small"
                icon={<SyncOutlined style={{ color: isDarkMode ? brandTokens.teal : brandTokens.navySoft }} />}
                onClick={() => handleApplyPlanQuotas(record)}
                title={t('billing.subscriptions.applyPlanQuotas', 'Apply Current Plan Quotas')}
                style={{ borderRadius: 6 }}
              />
              <Button
                type="text"
                size="small"
                icon={<SwapOutlined style={{ color: isDarkMode ? brandTokens.teal : brandTokens.navySoft }} />}
                onClick={() => openUpgradeModal(record)}
                title={t('billing.subscriptions.upgradeDowngrade')}
                style={{ borderRadius: 6 }}
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
                style={{ borderRadius: 6 }}
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
                style={{ borderRadius: 6 }}
              />
            </>
          )}
          {record.stripeCustomerId && (
            <Button
              type="text"
              size="small"
              icon={<CreditCardOutlined style={{ color: brandTokens.teal }} />}
              onClick={() => handleOpenPortal(record.stripeCustomerId)}
              title={t('billing.subscriptions.stripePortal', 'Stripe Customer Portal')}
              style={{ borderRadius: 6 }}
            />
          )}
          <Button
            type="text"
            size="small"
            icon={<HistoryOutlined style={{ color: semantic.textSecondary }} />}
            onClick={() => openHistoryModal(record)}
            title={t('billing.subscriptions.history')}
            style={{ borderRadius: 6 }}
          />
        </Space>
      ),
    },
  ];

  return (
    <div className="rt-page-container" style={{ maxWidth: 1400, margin: '0 auto' }}>
      <DataTable
        title={t('billing.subscriptions.title')}
        subtitle={t('billing.subscriptions.subtitle')}
        columns={columns}
        dataSource={subscriptions}
        loading={loading}
        error={error}
        onRefresh={fetchSubscriptions}
        onCreate={
          can('BILLING', 'CREATE')
            ? () => {
                fetchDropdownData();
                setIsCreateModalOpen(true);
              }
            : undefined
        }
        createButtonText={can('BILLING', 'CREATE') ? t('billing.subscriptions.createSubscription') : undefined}
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
        centered
        width={600}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreate}
          style={{ marginTop: 12 }}
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
                backgroundColor: isDarkMode ? 'rgba(79, 168, 192, 0.08)' : brandTokens.tealBg,
                borderColor: isDarkMode ? 'rgba(79, 168, 192, 0.25)' : brandTokens.border,
                borderRadius: 8,
              }}
            >
              <Title level={5} style={{ margin: '0 0 8px 0', fontSize: 14, color: semantic.textPrimary }}>
                {selectedPlanForCreate.name} — {t('billing.subscriptions.planSummary')}
              </Title>
              <Descriptions column={2} size="small">
                <Descriptions.Item label={t('billing.plans.price')}>
                  <strong>{Number(selectedPlanForCreate.offerPrice ?? selectedPlanForCreate.price).toFixed(2)} {selectedPlanForCreate.currency}</strong>
                </Descriptions.Item>
                <Descriptions.Item label={t('billing.plans.billingInterval')}>
                  <Tag color="cyan" style={{ borderRadius: 4 }}>{t(`billing.intervals.${selectedPlanForCreate.billingInterval}`)}</Tag>
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
        centered
        width={550}
      >
        {selectedSub && (
          <Form form={entitlementsForm} layout="vertical" onFinish={handleUpdateEntitlements} style={{ marginTop: 12 }}>
            <Alert
              message={`Current Candidate Usage: ${selectedSub.candidateAccessUsage} / ${selectedSub.candidateAccessLimit}`}
              type="info"
              showIcon
              style={{ marginBottom: 16, borderRadius: 8 }}
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

            <Form.Item style={{ marginTop: 20, textAlign: 'right', marginBottom: 0 }}>
              <Space>
                <Button onClick={() => setIsEditEntitlementsOpen(false)}>{t('common.cancel')}</Button>
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
        )}
      </Modal>

      {/* UPGRADE / DOWNGRADE MODAL */}
      <Modal
        title={t('billing.subscriptions.upgradeDowngrade')}
        open={isUpgradeModalOpen}
        onCancel={() => setIsUpgradeModalOpen(false)}
        footer={null}
        destroyOnHidden
        centered
        width={500}
      >
        {selectedSub && (
          <Form form={upgradeForm} layout="vertical" onFinish={handleUpgrade} style={{ marginTop: 12 }}>
            <div style={{ marginBottom: 16 }}>
              <Text style={{ color: semantic.textSecondary }}>Current Plan: </Text>
              <strong style={{ color: semantic.textPrimary }}>{selectedSub.plan?.name}</strong>{' '}
              <span style={{ color: semantic.textSecondary }}>({Number(selectedSub.price).toFixed(2)} {selectedSub.currency})</span>
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

            <Form.Item style={{ marginTop: 24, textAlign: 'right', marginBottom: 0 }}>
              <Space>
                <Button onClick={() => setIsUpgradeModalOpen(false)}>{t('common.cancel')}</Button>
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
        centered
        width={450}
      >
        <Form form={cancelForm} layout="vertical" onFinish={handleCancel} style={{ marginTop: 12 }}>
          <Paragraph style={{ color: semantic.textSecondary }}>{t('billing.subscriptions.cancelConfirm')}</Paragraph>
          <Form.Item name="reason" label={t('billing.subscriptions.cancelReason')}>
            <Input.TextArea rows={3} placeholder="Customer requested cancellation, etc." />
          </Form.Item>

          <Form.Item style={{ textAlign: 'right', marginTop: 20, marginBottom: 0 }}>
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
        centered
        width={480}
      >
        <Form form={revokeForm} layout="vertical" onFinish={handleRevoke} style={{ marginTop: 12 }}>
          <Alert
            message={t('billing.subscriptions.revokeConfirm')}
            type="error"
            showIcon
            style={{ marginBottom: 16, borderRadius: 8 }}
          />
          <Form.Item
            name="reason"
            label={t('billing.subscriptions.revokeReason')}
            rules={[{ required: true, min: 3, message: 'A mandatory revocation reason is required' }]}
          >
            <Input.TextArea rows={3} placeholder="Non-payment, terms violation, administrative termination..." />
          </Form.Item>

          <Form.Item style={{ textAlign: 'right', marginTop: 20, marginBottom: 0 }}>
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
        centered
        footer={[
          <Button key="close" onClick={() => setIsViewModalOpen(false)}>
            {t('common.back')}
          </Button>,
        ]}
        width={680}
      >
        {selectedSub && (
          <div style={{ marginTop: 12 }}>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 18 }}>
              <Descriptions.Item label={t('billing.subscriptions.selectCompany')} span={1}>
                <strong>{selectedSub.company?.name}</strong>
              </Descriptions.Item>
              <Descriptions.Item label={t('billing.invoices.taxId', 'Tax ID / VAT')} span={1}>
                <span>{selectedSub.company?.taxId || 'N/A'}</span>
              </Descriptions.Item>
              <Descriptions.Item label={t('billing.plans.name')}>{selectedSub.plan?.name}</Descriptions.Item>
              <Descriptions.Item label={t('billing.subscriptions.status')}>
                <Tag color={selectedSub.status === 'ACTIVE' ? 'success' : 'default'} style={{ borderRadius: 4 }}>
                  {t(`billing.statuses.${selectedSub.status}`) || selectedSub.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('billing.plans.price')}>
                {Number(selectedSub.price).toFixed(2)} {selectedSub.currency}
              </Descriptions.Item>
              <Descriptions.Item label={t('billing.plans.billingInterval')}>
                <Tag color="cyan" style={{ borderRadius: 4 }}>
                  {t(`billing.intervals.${selectedSub.billingInterval}`) || selectedSub.billingInterval}
                </Tag>
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

            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Title level={5} style={{ color: semantic.textPrimary, margin: 0, fontSize: 14 }}>
                  {t('billing.subscriptions.entitlements', 'Entitlements & Quotas')}
                </Title>
                {selectedSub.status === 'ACTIVE' && selectedSub.plan && (
                  <Button
                    size="small"
                    type="primary"
                    icon={<SyncOutlined />}
                    loading={submitting}
                    style={{
                      backgroundColor: isDarkMode ? brandTokens.teal : brandTokens.navy,
                      borderColor: isDarkMode ? brandTokens.teal : brandTokens.navy,
                      borderRadius: 6,
                    }}
                    onClick={() => handleApplyPlanQuotas(selectedSub)}
                  >
                    {t('billing.subscriptions.applyPlanQuotas', 'Apply Current Plan Quotas')}
                  </Button>
                )}
              </div>

              {selectedSub.plan && (
                Boolean(
                  selectedSub.candidateAccessLimit !== selectedSub.plan.candidateAccessLimit ||
                  selectedSub.jobPostingLimit !== selectedSub.plan.jobPostingLimit ||
                  selectedSub.teamMemberLimit !== selectedSub.plan.teamMemberLimit
                ) ? (
                  <Alert
                    message={t('billing.subscriptions.quotaMismatchNotice', 'Plan Quota Discrepancy')}
                    description={t(
                      'billing.subscriptions.quotaMismatchDesc',
                      'The plan configuration has been updated since this subscription was created. This subscription retains its snapshot quotas until current plan quotas are explicitly applied.'
                    )}
                    type="info"
                    showIcon
                    style={{ marginBottom: 12, borderRadius: 8 }}
                  />
                ) : null
              )}

              <div className="rt-permission-matrix-container" style={{ background: semantic.bgCard }}>
                <table className="rt-matrix-table">
                  <thead>
                    <tr>
                      <th className="rt-matrix-th" style={{ textAlign: 'left' }}>Resource</th>
                      <th className="rt-matrix-th" style={{ textAlign: 'center' }}>Effective Limit (Snapshot)</th>
                      <th className="rt-matrix-th" style={{ textAlign: 'center' }}>Current Plan Limit</th>
                      <th className="rt-matrix-th" style={{ textAlign: 'center' }}>Current Usage</th>
                      <th className="rt-matrix-th" style={{ textAlign: 'center' }}>Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="rt-matrix-tr">
                      <td className="rt-matrix-td" style={{ fontWeight: 600, color: semantic.textPrimary }}>Candidate Access</td>
                      <td className="rt-matrix-td" style={{ textAlign: 'center' }}>{selectedSub.candidateAccessLimit}</td>
                      <td className="rt-matrix-td" style={{ textAlign: 'center' }}>{selectedSub.plan?.candidateAccessLimit ?? selectedSub.candidateAccessLimit}</td>
                      <td className="rt-matrix-td" style={{ textAlign: 'center', fontWeight: 600 }}>{selectedSub.candidateAccessUsage ?? 0}</td>
                      <td className="rt-matrix-td" style={{ textAlign: 'center', color: brandTokens.success, fontWeight: 600 }}>
                        {Math.max(0, selectedSub.candidateAccessLimit - (selectedSub.candidateAccessUsage ?? 0))}
                      </td>
                    </tr>
                    <tr className="rt-matrix-tr">
                      <td className="rt-matrix-td" style={{ fontWeight: 600, color: semantic.textPrimary }}>Job Postings</td>
                      <td className="rt-matrix-td" style={{ textAlign: 'center' }}>{selectedSub.jobPostingLimit}</td>
                      <td className="rt-matrix-td" style={{ textAlign: 'center' }}>{selectedSub.plan?.jobPostingLimit ?? selectedSub.jobPostingLimit}</td>
                      <td className="rt-matrix-td" style={{ textAlign: 'center', fontWeight: 600 }}>
                        {subDetails?.usageSnapshot?.jobPostings?.currentUsage ?? selectedSub.jobPostingUsage ?? 0}
                      </td>
                      <td className="rt-matrix-td" style={{ textAlign: 'center', color: brandTokens.success, fontWeight: 600 }}>
                        {Math.max(0, selectedSub.jobPostingLimit - (subDetails?.usageSnapshot?.jobPostings?.currentUsage ?? selectedSub.jobPostingUsage ?? 0))}
                      </td>
                    </tr>
                    <tr className="rt-matrix-tr">
                      <td className="rt-matrix-td" style={{ fontWeight: 600, color: semantic.textPrimary }}>Team Members</td>
                      <td className="rt-matrix-td" style={{ textAlign: 'center' }}>{selectedSub.teamMemberLimit}</td>
                      <td className="rt-matrix-td" style={{ textAlign: 'center' }}>{selectedSub.plan?.teamMemberLimit ?? selectedSub.teamMemberLimit}</td>
                      <td className="rt-matrix-td" style={{ textAlign: 'center', fontWeight: 600 }}>
                        {subDetails?.usageSnapshot?.teamMembers?.currentUsage ?? selectedSub.teamMemberUsage ?? 0}
                      </td>
                      <td className="rt-matrix-td" style={{ textAlign: 'center', color: brandTokens.success, fontWeight: 600 }}>
                        {Math.max(0, selectedSub.teamMemberLimit - (subDetails?.usageSnapshot?.teamMembers?.currentUsage ?? selectedSub.teamMemberUsage ?? 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* HISTORY MODAL */}
      <Modal
        title={t('billing.subscriptions.history')}
        open={isHistoryModalOpen}
        onCancel={() => setIsHistoryModalOpen(false)}
        centered
        footer={[
          <Button key="close" onClick={() => setIsHistoryModalOpen(false)}>
            {t('common.back')}
          </Button>,
        ]}
        width={650}
      >
        {historyLogs.length === 0 ? (
          <Text style={{ color: semantic.textSecondary }}>No historical audit records found for this subscription.</Text>
        ) : (
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {historyLogs.map((log) => (
              <Card
                size="small"
                key={log.id}
                style={{
                  marginBottom: 8,
                  borderRadius: 8,
                  borderColor: semantic.borderDefault,
                  background: semantic.bgCard,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Tag color="blue" style={{ borderRadius: 4 }}>{log.action}</Tag>
                  <Text style={{ fontSize: 12, color: semantic.textSecondary }}>
                    {new Date(log.createdAt).toLocaleString()}
                  </Text>
                </div>
                <div style={{ fontSize: 12, color: semantic.textPrimary }}>
                  <Text strong>Actor: </Text>{log.actor}
                </div>
                {log.details && (
                  <pre
                    style={{
                      fontSize: 11,
                      background: isDarkMode ? 'rgba(0,0,0,0.2)' : '#f8fafc',
                      border: `1px solid ${semantic.borderSubtle}`,
                      color: semantic.textPrimary,
                      padding: 8,
                      borderRadius: 6,
                      marginTop: 6,
                      overflowX: 'auto',
                    }}
                  >
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

export default SubscriptionsPage;
