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
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  PrinterOutlined,
  DollarOutlined,
  CloseCircleOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { DataTable } from '../../components/common/DataTable.jsx';
import { billingApi, formatBillingError } from '../../services/billingApi.js';
import { brandTokens } from '../../theme/tokens.js';

const { Text, Title } = Typography;
const { Option } = Select;

export function InvoicesPage() {
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
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

  const handleCreate = async (values) => {
    try {
      setSubmitting(true);
      await billingApi.createInvoice(values);
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
    paymentForm.setFieldsValue({
      amount: Number(invoice.grossTotal),
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
      render: (num) => <span style={{ fontWeight: 600, color: brandTokens.navy }}>{num}</span>,
    },
    {
      title: t('billing.invoices.employer'),
      key: 'company',
      render: (_, record) => (
        <div>
          <div>{record.company?.name}</div>
          {record.taxIdSnapshot && (
            <div style={{ fontSize: 11, color: brandTokens.muted }}>Tax ID: {record.taxIdSnapshot}</div>
          )}
        </div>
      ),
    },
    {
      title: t('billing.invoices.issueDate'),
      dataIndex: 'issueDate',
      key: 'issueDate',
      render: (d) => new Date(d).toLocaleDateString(),
    },
    {
      title: t('billing.invoices.dueDate'),
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (d) => new Date(d).toLocaleDateString(),
    },
    {
      title: t('billing.invoices.netAmount'),
      dataIndex: 'netAmount',
      key: 'netAmount',
      render: (net, r) => `${Number(net).toFixed(2)} ${r.currency}`,
    },
    {
      title: t('billing.invoices.taxAmount'),
      key: 'tax',
      render: (_, r) => (
        <span>
          {Number(r.taxAmount).toFixed(2)} {r.currency}
          <div style={{ fontSize: 11, color: brandTokens.muted }}>
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
        <span style={{ fontWeight: 700, color: brandTokens.navy }}>
          {Number(gross).toFixed(2)} {r.currency}
        </span>
      ),
    },
    {
      title: t('billing.invoices.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = 'default';
        if (status === 'PAID') color = 'success';
        if (status === 'OPEN') color = 'blue';
        if (status === 'OVERDUE') color = 'volcano';
        if (status === 'VOID') color = 'default';
        return <Tag color={color}>{t(`billing.statuses.${status}`)}</Tag>;
      },
    },
    {
      title: t('table.actions'),
      key: 'invActions',
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined style={{ color: brandTokens.navy }} />}
            onClick={() => openViewModal(record)}
            title={t('billing.invoices.viewInvoice')}
          />
          {record.status === 'OPEN' && (
            <>
              <Button
                type="text"
                size="small"
                icon={<DollarOutlined style={{ color: brandTokens.success }} />}
                onClick={() => openPaymentModal(record)}
                title={t('billing.invoices.recordPayment')}
              />
              <Button
                type="text"
                size="small"
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => openVoidModal(record)}
                title={t('billing.invoices.void')}
              />
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
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
        title={t('billing.invoices.createInvoice')}
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        footer={null}
        destroyOnHidden
        width={550}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{
            currency: 'EUR',
            netAmount: 100,
            dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
          }}
        >
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
            />
          </Form.Item>

          <Space size={16} style={{ display: 'flex' }}>
            <Form.Item
              name="netAmount"
              label={t('billing.invoices.netAmount')}
              rules={[{ required: true }]}
              style={{ flex: 1 }}
            >
              <InputNumber min={0} step={0.01} precision={2} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="currency"
              label={t('billing.invoices.currency')}
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

          <Form.Item name="dueDate" label={t('billing.invoices.dueDate')} rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>

          <Form.Item style={{ marginTop: 24, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsCreateModalOpen(false)}>{t('common.cancel')}</Button>
              <Button type="primary" htmlType="submit" loading={submitting} style={{ background: brandTokens.navy }}>
                {t('billing.invoices.createInvoice')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* RECORD PAYMENT MODAL */}
      <Modal
        title={t('billing.invoices.recordPayment')}
        open={isPaymentModalOpen}
        onCancel={() => setIsPaymentModalOpen(false)}
        footer={null}
        destroyOnHidden
        width={450}
      >
        {selectedInvoice && (
          <Form form={paymentForm} layout="vertical" onFinish={handleRecordPayment}>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">Invoice: </Text>
              <strong>{selectedInvoice.invoiceNumber}</strong>
              <div>
                <Text type="secondary">Gross Total: </Text>
                <strong>{Number(selectedInvoice.grossTotal).toFixed(2)} {selectedInvoice.currency}</strong>
              </div>
            </div>

            <Form.Item
              name="amount"
              label={t('billing.invoices.paymentAmount')}
              rules={[{ required: true }]}
            >
              <InputNumber min={0.01} step={0.01} precision={2} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="paymentMethod"
              label={t('billing.invoices.paymentMethod')}
              rules={[{ required: true }]}
            >
              <Select>
                <Option value="manual_bank_transfer">SEPA / Bank Transfer</Option>
                <Option value="stripe">Stripe</Option>
                <Option value="credit_card">Credit Card</Option>
                <Option value="cash">Cash / Direct</Option>
              </Select>
            </Form.Item>

            <Form.Item name="reference" label={t('billing.invoices.paymentRef')}>
              <Input placeholder="e.g. Bank reference TXN-94819" />
            </Form.Item>

            <Form.Item style={{ textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setIsPaymentModalOpen(false)}>{t('common.cancel')}</Button>
                <Button type="primary" htmlType="submit" loading={submitting} style={{ background: brandTokens.navy }}>
                  Confirm Payment
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* VOID MODAL */}
      <Modal
        title={t('billing.invoices.void')}
        open={isVoidModalOpen}
        onCancel={() => setIsVoidModalOpen(false)}
        footer={null}
        destroyOnHidden
        width={450}
      >
        <Form form={voidForm} layout="vertical" onFinish={handleVoid}>
          <Alert
            message={t('billing.invoices.voidConfirm')}
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Form.Item
            name="reason"
            label={t('billing.invoices.voidReason')}
            rules={[{ required: true, min: 3, message: 'Please enter a valid void reason' }]}
          >
            <Input.TextArea rows={3} placeholder="Issued in error, duplicate, contract canceled..." />
          </Form.Item>

          <Form.Item style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsVoidModalOpen(false)}>{t('common.cancel')}</Button>
              <Button danger type="primary" htmlType="submit" loading={submitting}>
                {t('billing.invoices.void')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* VIEW INVOICE MODAL */}
      <Modal
        title={`${t('billing.invoices.viewInvoice')} — ${selectedInvoice?.invoiceNumber || ''}`}
        open={isViewModalOpen}
        onCancel={() => setIsViewModalOpen(false)}
        footer={[
          <Button key="print" icon={<PrinterOutlined />} onClick={handlePrint}>
            {t('billing.invoices.downloadPrint')}
          </Button>,
          <Button key="close" onClick={() => setIsViewModalOpen(false)}>
            {t('common.back')}
          </Button>,
        ]}
        width={650}
      >
        {selectedInvoice && (
          <div style={{ padding: '8px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <Title level={4} style={{ margin: 0, color: brandTokens.navy }}>
                  Recrui<span style={{ color: brandTokens.teal }}>Train</span>
                </Title>
                <div style={{ fontSize: 12, color: brandTokens.muted }}>Abrechnungsservice GmbH</div>
                <div style={{ fontSize: 12, color: brandTokens.muted }}>USt-IdNr.: DE345892110</div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <Tag color={selectedInvoice.status === 'PAID' ? 'success' : 'default'} style={{ fontSize: 13, padding: '2px 8px' }}>
                  {t(`billing.statuses.${selectedInvoice.status}`)}
                </Tag>
                <div style={{ fontWeight: 600, marginTop: 4 }}>{selectedInvoice.invoiceNumber}</div>
                <div style={{ fontSize: 12, color: brandTokens.muted }}>
                  {t('billing.invoices.issueDate')}: {new Date(selectedInvoice.issueDate).toLocaleDateString()}
                </div>
                <div style={{ fontSize: 12, color: brandTokens.muted }}>
                  {t('billing.invoices.dueDate')}: {new Date(selectedInvoice.dueDate).toLocaleDateString()}
                </div>
              </div>
            </div>

            <Card size="small" style={{ marginBottom: 20, backgroundColor: '#fcfdfd' }}>
              <div style={{ fontWeight: 600, color: brandTokens.navy }}>
                {selectedInvoice.legalNameSnapshot || selectedInvoice.company?.name}
              </div>
              {selectedInvoice.taxIdSnapshot && (
                <div style={{ fontSize: 12, color: brandTokens.muted }}>
                  {t('billing.invoices.taxId')}: {selectedInvoice.taxIdSnapshot}
                </div>
              )}
              {selectedInvoice.billingAddressSnapshot && (
                <div style={{ fontSize: 12, color: brandTokens.muted }}>
                  {selectedInvoice.billingAddressSnapshot}
                </div>
              )}
            </Card>

            {/* Itemized Reconciled Arithmetic */}
            <Descriptions bordered column={1} size="small" style={{ marginBottom: 20 }}>
              <Descriptions.Item label={t('billing.invoices.netAmount')}>
                {Number(selectedInvoice.netAmount).toFixed(2)} {selectedInvoice.currency}
              </Descriptions.Item>
              <Descriptions.Item label={`${t('billing.invoices.taxAmount')} (${(Number(selectedInvoice.taxRate) * 100).toFixed(0)}%)`}>
                {Number(selectedInvoice.taxAmount).toFixed(2)} {selectedInvoice.currency}
              </Descriptions.Item>
              <Descriptions.Item label={<strong>{t('billing.invoices.grossTotal')}</strong>}>
                <strong style={{ fontSize: 16, color: brandTokens.navy }}>
                  {Number(selectedInvoice.grossTotal).toFixed(2)} {selectedInvoice.currency}
                </strong>
              </Descriptions.Item>
            </Descriptions>

            {/* Payments List */}
            {selectedInvoice.payments?.length > 0 && (
              <div>
                <Title level={5} style={{ fontSize: 14, color: brandTokens.navy }}>
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
                      render: (s) => <Tag color={s === 'SUCCEEDED' ? 'success' : 'default'}>{s}</Tag>,
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
