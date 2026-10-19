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
  Table,
  Card,
  Alert,
  Divider,
  DatePicker,
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  PrinterOutlined,
  DollarOutlined,
  CloseCircleOutlined,
  SearchOutlined,
  CreditCardOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { DataTable } from '../../components/common/DataTable.jsx';
import { billingApi, formatBillingError } from '../../services/billingApi.js';
import { brandTokens, lightSemanticTokens, darkSemanticTokens } from '../../theme/tokens.js';

const { Text, Title } = Typography;
const { Option } = Select;

export function InvoicesPage() {
  const { t } = useTranslation();
  const isDarkMode = useSelector((state) => state.theme?.isDarkMode);
  const semantic = isDarkMode ? darkSemanticTokens : lightSemanticTokens;

  const [invoices, setInvoices] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);

  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [createForm] = Form.useForm();
  const [paymentForm] = Form.useForm();
  const [voidForm] = Form.useForm();

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await billingApi.getInvoices();
      if (res.success) {
        setInvoices(res.data);
      }
    } catch (err) {
      setError(formatBillingError(err, t('common.networkError')));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const fetchCompanies = useCallback(async () => {
    try {
      const res = await billingApi.getCompanies();
      if (res.success) setCompanies(res.data);
    } catch (err) {
      // Ignored
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
    fetchCompanies();
  }, [fetchInvoices, fetchCompanies]);

  // Handle return from Stripe Checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const invoiceId = params.get('invoice_id');
    const status = params.get('status');

    if (sessionId && invoiceId && status === 'success') {
      billingApi
        .confirmInvoiceStripeCheckout(invoiceId, { sessionId })
        .then((res) => {
          message.success('Stripe payment verified and recorded successfully!');
          fetchInvoices();
          window.history.replaceState({}, document.title, window.location.pathname);
        })
        .catch((err) => {
          message.error(formatBillingError(err, 'Failed to verify Stripe payment session.'));
        });
    }
  }, [fetchInvoices]);

  const handlePayWithStripe = async (invoice) => {
    try {
      setStripeLoading(true);
      const res = await billingApi.createInvoiceStripeCheckout(invoice.id);
      if (res.success && res.data?.url) {
        window.location.href = res.data.url;
      } else {
        message.error('Failed to initiate Stripe checkout session.');
      }
    } catch (err) {
      message.error(formatBillingError(err, 'Failed to initiate Stripe checkout.'));
    } finally {
      setStripeLoading(false);
    }
  };

  const handleCreate = async (values) => {
    try {
      setSubmitting(true);
      const payload = { ...values };
      if (payload.dueDate) {
        payload.dueDate = typeof payload.dueDate === 'string'
          ? payload.dueDate
          : (payload.dueDate.format ? payload.dueDate.format('YYYY-MM-DD') : String(payload.dueDate));
      }
      await billingApi.createInvoice(payload);
      message.success(t('billing.invoices.createSuccess'));
      setIsCreateModalOpen(false);
      createForm.resetFields();
      await fetchInvoices();
    } catch (err) {
      message.error(formatBillingError(err, 'Failed to issue invoice.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordPayment = async (values) => {
    if (!selectedInvoice) return;
    try {
      setSubmitting(true);
      await billingApi.recordPayment(selectedInvoice.id, values);
      message.success(t('billing.invoices.paymentSuccess'));
      setIsPaymentModalOpen(false);
      setSelectedInvoice(null);
      paymentForm.resetFields();
      await fetchInvoices();
    } catch (err) {
      message.error(formatBillingError(err, 'Failed to record payment.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoid = async (values) => {
    if (!selectedInvoice) return;
    try {
      setSubmitting(true);
      await billingApi.voidInvoice(selectedInvoice.id, values);
      message.success(t('billing.invoices.voidSuccess'));
      setIsVoidModalOpen(false);
      setSelectedInvoice(null);
      voidForm.resetFields();
      await fetchInvoices();
    } catch (err) {
      message.error(formatBillingError(err, 'Failed to void invoice.'));
    } finally {
      setSubmitting(false);
    }
  };

  const openViewModal = (invoice) => {
    setSelectedInvoice(invoice);
    setIsViewModalOpen(true);
  };

  const openPaymentModal = (invoice) => {
    setSelectedInvoice(invoice);
    const totalPaid = (invoice.payments || [])
      .filter((p) => p.status === 'SUCCEEDED')
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const outstanding = Math.max(0, Number(invoice.grossTotal) - totalPaid);
    paymentForm.setFieldsValue({
      amount: Number(outstanding.toFixed(2)),
      paymentMethod: 'manual_bank_transfer',
      reference: '',
    });
    setIsPaymentModalOpen(true);
  };

  const openVoidModal = (invoice) => {
    setSelectedInvoice(invoice);
    setIsVoidModalOpen(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const columns = [
    {
      title: t('billing.invoices.invoiceNumber'),
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      render: (num) => (
        <span style={{ fontWeight: 600, color: isDarkMode ? brandTokens.teal : brandTokens.navy }}>
          {num}
        </span>
      ),
    },
    {
      title: t('billing.invoices.employer'),
      key: 'company',
      render: (_, record) => (
        <span style={{ fontWeight: 500, color: semantic.textPrimary }}>
          {record.company?.name || record.legalNameSnapshot || '—'}
        </span>
      ),
    },
    {
      title: t('billing.invoices.issueDate'),
      dataIndex: 'issueDate',
      key: 'issueDate',
      render: (d) => (
        <span style={{ fontSize: 12.5, color: semantic.textSecondary }}>
          {d ? new Date(d).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      title: t('billing.invoices.dueDate'),
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (d) => (
        <span style={{ fontSize: 12.5, color: semantic.textSecondary }}>
          {d ? new Date(d).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      title: t('billing.invoices.netAmount'),
      dataIndex: 'netAmount',
      key: 'netAmount',
      render: (net, r) => (
        <span style={{ color: semantic.textPrimary, fontWeight: 500 }}>
          {Number(net).toFixed(2)} {r.currency}
        </span>
      ),
    },
    {
      title: t('billing.invoices.taxAmount'),
      dataIndex: 'taxAmount',
      key: 'taxAmount',
      render: (tax, r) => (
        <span>
          <span style={{ color: semantic.textPrimary }}>
            {Number(tax).toFixed(2)} {r.currency}
          </span>
          <div style={{ fontSize: 11, color: semantic.textSecondary }}>
            {(Number(r.taxRate) * 100).toFixed(0)}% Tax
          </div>
        </span>
      ),
    },
    {
      title: t('billing.invoices.grossTotal'),
      dataIndex: 'grossTotal',
      key: 'grossTotal',
      render: (gross, r) => (
        <span style={{ fontWeight: 700, color: semantic.textPrimary, fontSize: 13.5 }}>
          {Number(gross).toFixed(2)} {r.currency}
        </span>
      ),
    },
    {
      title: t('billing.invoices.paymentStatus', 'Payment Status'),
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = 'default';
        if (status === 'PAID') color = 'success';
        if (status === 'OPEN') color = 'blue';
        if (status === 'OVERDUE') color = 'volcano';
        if (status === 'VOID') color = 'default';
        return (
          <Tag color={color} style={{ borderRadius: 4, fontWeight: 500 }}>
            {t(`billing.statuses.${status}`) || status}
          </Tag>
        );
      },
    },
    {
      title: t('table.actions'),
      key: 'invActions',
      fixed: 'right',
      render: (_, record) => {
        const totalPaid = (record.payments || [])
          .filter((p) => p.status === 'SUCCEEDED')
          .reduce((sum, p) => sum + Number(p.amount), 0);
        const hasOutstanding = Number(record.grossTotal) - totalPaid > 0.001;
        const isPayable = record.status !== 'PAID' && record.status !== 'VOID' && hasOutstanding;

        return (
          <Space size={6}>
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined style={{ color: isDarkMode ? brandTokens.teal : brandTokens.navy }} />}
              onClick={() => openViewModal(record)}
              title={t('billing.invoices.viewInvoice')}
              style={{ borderRadius: 6 }}
            />
            {isPayable && (
              <>
                <Button
                  type="text"
                  size="small"
                  icon={<CreditCardOutlined style={{ color: brandTokens.teal }} />}
                  loading={stripeLoading}
                  onClick={() => handlePayWithStripe(record)}
                  title={t('billing.invoices.payWithStripe', 'Pay with Stripe')}
                  style={{ borderRadius: 6 }}
                />
                <Button
                  type="text"
                  size="small"
                  icon={<DollarOutlined style={{ color: brandTokens.success }} />}
                  onClick={() => openPaymentModal(record)}
                  title={t('billing.invoices.recordPayment', 'Record Manual Payment')}
                  style={{ borderRadius: 6 }}
                />
              </>
            )}
            {record.status === 'OPEN' && (
              <Button
                type="text"
                size="small"
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => openVoidModal(record)}
                title={t('billing.invoices.void')}
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
      <DataTable
        title={t('billing.invoices.title')}
        subtitle={t('billing.invoices.subtitle')}
        columns={columns}
        dataSource={invoices}
        loading={loading}
        error={error}
        onRefresh={fetchInvoices}
        onCreate={() => {
          fetchCompanies();
          setIsCreateModalOpen(true);
        }}
        createButtonText={t('billing.invoices.createInvoice')}
        exportFilename="billing_invoices"
      />

      {/* CREATE INVOICE MODAL */}
      <Modal
        title={
          <div className="rt-modal-title-wrapper">
            <div className="rt-modal-icon-badge">
              <PlusOutlined />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: semantic.textPrimary }}>
                {t('billing.invoices.createInvoice')}
              </div>
              <div className="rt-modal-subtitle">
                {t('billing.invoices.createSubtitle', 'Generate an itemized billing invoice for an employer organization.')}
              </div>
            </div>
          </div>
        }
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        footer={null}
        destroyOnHidden
        centered
        width={580}
        styles={{
          body: { padding: '8px 2px 0 2px' },
        }}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{
            currency: 'EUR',
            netAmount: 100,
            dueDate: dayjs().add(14, 'day'),
          }}
        >
          <div className="rt-modal-form-scroll">
            <div className="rt-form-section-header">
              {t('billing.invoices.sectionRecipient', 'Recipient & Currency')}
            </div>

            <Form.Item
              name="companyId"
              label={t('billing.invoices.employer')}
              rules={[{ required: true }]}
            >
              <Select
                showSearch
                placeholder={t('billing.subscriptions.selectCompanyPlaceholder')}
                options={companies.map((c) => ({
                  value: c.id,
                  label: `${c.name} ${c.taxId ? `(${c.taxId})` : ''}`,
                }))}
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            <Space size={16} style={{ display: 'flex' }}>
              <Form.Item
                name="netAmount"
                label={t('billing.invoices.netAmount')}
                rules={[{ required: true }]}
                style={{ flex: 1 }}
              >
                <InputNumber min={0} step={0.01} precision={2} style={{ width: '100%', borderRadius: 8 }} />
              </Form.Item>

              <Form.Item
                name="currency"
                label={t('billing.invoices.currency')}
                rules={[{ required: true }]}
                style={{ width: 110 }}
              >
                <Select style={{ borderRadius: 8 }}>
                  <Option value="EUR">EUR (€)</Option>
                  <Option value="USD">USD ($)</Option>
                  <Option value="GBP">GBP (£)</Option>
                </Select>
              </Form.Item>
            </Space>

            <div className="rt-form-section-header">
              {t('billing.invoices.sectionTerms', 'Payment Terms')}
            </div>

            <Form.Item name="dueDate" label={t('billing.invoices.dueDate')} rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%', borderRadius: 8 }} format="YYYY-MM-DD" placeholder="YYYY-MM-DD" />
            </Form.Item>
          </div>

          <div className="rt-modal-footer-sticky">
            <Button onClick={() => setIsCreateModalOpen(false)} style={{ borderRadius: 8 }}>
              {t('common.cancel')}
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              style={{
                backgroundColor: isDarkMode ? brandTokens.teal : brandTokens.navy,
                borderColor: isDarkMode ? brandTokens.teal : brandTokens.navy,
                fontWeight: 600,
                borderRadius: 8,
              }}
            >
              {t('billing.invoices.createInvoice')}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* RECORD PAYMENT MODAL */}
      <Modal
        title={
          <div className="rt-modal-title-wrapper">
            <div className="rt-modal-icon-badge">
              <DollarOutlined />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: semantic.textPrimary }}>
                {t('billing.invoices.recordPayment')}
              </div>
              <div className="rt-modal-subtitle">
                {selectedInvoice?.invoiceNumber ? `Invoice ${selectedInvoice.invoiceNumber}` : 'Record manual receipt'}
              </div>
            </div>
          </div>
        }
        open={isPaymentModalOpen}
        onCancel={() => setIsPaymentModalOpen(false)}
        footer={null}
        destroyOnHidden
        centered
        width={480}
        styles={{
          body: { padding: '8px 2px 0 2px' },
        }}
      >
        {selectedInvoice && (
          <Form form={paymentForm} layout="vertical" onFinish={handleRecordPayment}>
            <div className="rt-modal-form-scroll">
              <Card
                size="small"
                style={{
                  marginBottom: 16,
                  borderRadius: 8,
                  borderColor: semantic.borderDefault,
                  background: isDarkMode ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Text style={{ color: semantic.textSecondary, fontSize: 12 }}>Invoice Number</Text>
                    <div style={{ fontWeight: 600, color: semantic.textPrimary }}>{selectedInvoice.invoiceNumber}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <Text style={{ color: semantic.textSecondary, fontSize: 12 }}>Gross Total</Text>
                    <div style={{ fontWeight: 700, color: isDarkMode ? brandTokens.teal : brandTokens.navy }}>
                      {Number(selectedInvoice.grossTotal).toFixed(2)} {selectedInvoice.currency}
                    </div>
                  </div>
                </div>
              </Card>

              <Form.Item
                name="amount"
                label={t('billing.invoices.paymentAmount')}
                rules={[{ required: true }]}
              >
                <InputNumber min={0.01} step={0.01} precision={2} style={{ width: '100%', borderRadius: 8 }} />
              </Form.Item>

              <Form.Item
                name="paymentMethod"
                label={t('billing.invoices.paymentMethod')}
                rules={[{ required: true }]}
              >
                <Select style={{ borderRadius: 8 }}>
                  <Option value="manual_bank_transfer">SEPA / Bank Transfer (Manual)</Option>
                  <Option value="manual_credit_card">Credit Card (Terminal / Offline)</Option>
                  <Option value="manual_cash">Cash / Direct</Option>
                  <Option value="manual_other">Other Manual Accounting</Option>
                </Select>
              </Form.Item>

              <Form.Item name="reference" label={t('billing.invoices.paymentRef')}>
                <Input placeholder="e.g. Bank reference TXN-94819" style={{ borderRadius: 8 }} />
              </Form.Item>
            </div>

            <div className="rt-modal-footer-sticky">
              <Button onClick={() => setIsPaymentModalOpen(false)} style={{ borderRadius: 8 }}>
                {t('common.cancel')}
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                style={{
                  backgroundColor: isDarkMode ? brandTokens.teal : brandTokens.navy,
                  borderColor: isDarkMode ? brandTokens.teal : brandTokens.navy,
                  fontWeight: 600,
                  borderRadius: 8,
                }}
              >
                Confirm Payment
              </Button>
            </div>
          </Form>
        )}
      </Modal>

      {/* VOID MODAL */}
      <Modal
        title={
          <div className="rt-modal-title-wrapper">
            <div className="rt-modal-icon-badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: brandTokens.error }}>
              <CloseCircleOutlined />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: semantic.textPrimary }}>
                {t('billing.invoices.void')}
              </div>
              <div className="rt-modal-subtitle">
                {selectedInvoice?.invoiceNumber ? `Void Invoice ${selectedInvoice.invoiceNumber}` : 'Cancel invoice record'}
              </div>
            </div>
          </div>
        }
        open={isVoidModalOpen}
        onCancel={() => setIsVoidModalOpen(false)}
        footer={null}
        destroyOnHidden
        centered
        width={480}
        styles={{
          body: { padding: '8px 2px 0 2px' },
        }}
      >
        <Form form={voidForm} layout="vertical" onFinish={handleVoid}>
          <div className="rt-modal-form-scroll">
            <Alert
              message={t('billing.invoices.voidConfirm')}
              type="warning"
              showIcon
              style={{ marginBottom: 16, borderRadius: 8 }}
            />
            <Form.Item
              name="reason"
              label={t('billing.invoices.voidReason')}
              rules={[{ required: true, min: 3, message: 'Please enter a valid void reason' }]}
            >
              <Input.TextArea rows={3} placeholder="Issued in error, duplicate, contract canceled..." style={{ borderRadius: 8 }} />
            </Form.Item>
          </div>

          <div className="rt-modal-footer-sticky">
            <Button onClick={() => setIsVoidModalOpen(false)} style={{ borderRadius: 8 }}>
              {t('common.cancel')}
            </Button>
            <Button danger type="primary" htmlType="submit" loading={submitting} style={{ borderRadius: 8, fontWeight: 600 }}>
              {t('billing.invoices.void')}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* VIEW INVOICE MODAL */}
      <Modal
        title={
          <div className="rt-modal-title-wrapper">
            <div className="rt-modal-icon-badge">
              <EyeOutlined />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: semantic.textPrimary }}>
                {t('billing.invoices.viewInvoice')}
              </div>
              <div className="rt-modal-subtitle">
                {selectedInvoice?.invoiceNumber || ''}
              </div>
            </div>
          </div>
        }
        open={isViewModalOpen}
        onCancel={() => setIsViewModalOpen(false)}
        centered
        footer={[
          <Button key="print" icon={<PrinterOutlined />} onClick={handlePrint} style={{ borderRadius: 8 }}>
            {t('billing.invoices.downloadPrint')}
          </Button>,
          <Button key="close" onClick={() => setIsViewModalOpen(false)} style={{ borderRadius: 8 }}>
            {t('common.back')}
          </Button>,
        ]}
        width={680}
      >
        {selectedInvoice && (
          <div className="rt-invoice-sheet" style={{ marginTop: 8 }}>
            <div className="rt-invoice-header">
              <div>
                <Title level={4} style={{ margin: 0, color: isDarkMode ? brandTokens.teal : brandTokens.navy }}>
                  Recrui<span style={{ color: brandTokens.teal }}>Train</span>
                </Title>
                <div style={{ fontSize: 12, color: semantic.textSecondary }}>Abrechnungsservice GmbH</div>
                <div style={{ fontSize: 12, color: semantic.textSecondary }}>USt-IdNr.: DE345892110</div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <Tag
                  color={selectedInvoice.status === 'PAID' ? 'success' : selectedInvoice.status === 'VOID' ? 'default' : 'orange'}
                  style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, fontWeight: 500 }}
                >
                  {t(`billing.statuses.${selectedInvoice.status}`)}
                </Tag>
                <div style={{ fontWeight: 600, marginTop: 4, color: semantic.textPrimary }}>{selectedInvoice.invoiceNumber}</div>
                <div style={{ fontSize: 12, color: semantic.textSecondary }}>
                  {t('billing.invoices.issueDate')}: {new Date(selectedInvoice.issueDate).toLocaleDateString()}
                </div>
                <div style={{ fontSize: 12, color: semantic.textSecondary }}>
                  {t('billing.invoices.dueDate')}: {new Date(selectedInvoice.dueDate).toLocaleDateString()}
                </div>
              </div>
            </div>

            <Card
              size="small"
              style={{
                marginBottom: 20,
                backgroundColor: isDarkMode ? 'rgba(79, 168, 192, 0.08)' : '#fcfdfd',
                borderColor: semantic.borderDefault,
                borderRadius: 8,
              }}
            >
              <div style={{ fontWeight: 600, color: semantic.textPrimary }}>
                {selectedInvoice.legalNameSnapshot || selectedInvoice.company?.name}
              </div>
              {selectedInvoice.taxIdSnapshot && (
                <div style={{ fontSize: 12, color: semantic.textSecondary, marginTop: 2 }}>
                  {t('billing.invoices.taxId')}: {selectedInvoice.taxIdSnapshot}
                </div>
              )}
              {selectedInvoice.billingAddressSnapshot && (
                <div style={{ fontSize: 12, color: semantic.textSecondary, marginTop: 2 }}>
                  {selectedInvoice.billingAddressSnapshot}
                </div>
              )}
            </Card>

            {/* Itemized Reconciled Arithmetic */}
            <Descriptions bordered column={1} size="small" style={{ marginBottom: 20, borderRadius: 8, overflow: 'hidden' }}>
              <Descriptions.Item label={t('billing.invoices.netAmount')}>
                <span style={{ fontWeight: 500, color: semantic.textPrimary }}>
                  {Number(selectedInvoice.netAmount).toFixed(2)} {selectedInvoice.currency}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label={`${t('billing.invoices.taxAmount')} (${(Number(selectedInvoice.taxRate) * 100).toFixed(0)}%)`}>
                <span style={{ color: semantic.textSecondary }}>
                  {Number(selectedInvoice.taxAmount).toFixed(2)} {selectedInvoice.currency}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label={<strong>{t('billing.invoices.grossTotal')}</strong>}>
                <strong style={{ fontSize: 16, color: isDarkMode ? brandTokens.teal : brandTokens.navy }}>
                  {Number(selectedInvoice.grossTotal).toFixed(2)} {selectedInvoice.currency}
                </strong>
              </Descriptions.Item>
            </Descriptions>

            {/* Payments List */}
            {selectedInvoice.payments?.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <Title level={5} style={{ fontSize: 13.5, color: semantic.textPrimary, marginBottom: 10 }}>
                  {t('billing.invoices.paymentHistory')}
                </Title>
                <Table
                  size="small"
                  pagination={false}
                  rowKey="id"
                  dataSource={selectedInvoice.payments}
                  columns={[
                    {
                      title: 'Date',
                      dataIndex: 'paidAt',
                      render: (d) => (d ? new Date(d).toLocaleString() : '-'),
                    },
                    { title: 'Amount', dataIndex: 'amount', render: (a, r) => `${Number(a).toFixed(2)} ${r.currency}` },
                    { title: 'Method', dataIndex: 'paymentMethod' },
                    {
                      title: 'Status',
                      dataIndex: 'status',
                      render: (s) => <Tag color={s === 'SUCCEEDED' ? 'success' : 'default'} style={{ borderRadius: 4 }}>{s}</Tag>,
                    },
                  ]}
                />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default InvoicesPage;
