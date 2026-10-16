import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Tabs,
  Row,
  Col,
  Descriptions,
  Tag,
  Button,
  Space,
  Table,
  Modal,
  Form,
  Input,
  Select,
  Typography,
  Divider,
  Alert,
  App,
  Popconfirm,
  Badge,
  Spin,
  Image,
  Checkbox,
  Upload,
  Radio,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  StopOutlined,
  DownloadOutlined,
  DeleteOutlined,
  UserAddOutlined,
  CloudDownloadOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  AuditOutlined,
  TeamOutlined,
  FilePdfOutlined,
  GlobalOutlined,
  MailOutlined,
  EyeOutlined,
  UploadOutlined,
  LinkOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DeleteConfirmationModal } from '../../components/common/DeleteConfirmationModal.jsx';
import { companiesApi } from '../../services/companiesApi.js';
import { configurationApi } from '../../services/configurationApi.js';
import { brandTokens } from '../../theme/tokens.js';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export function CompanyDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { message } = App.useApp();

  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [docDefinitions, setDocDefinitions] = useState([]);

  // Modals
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [docUploadModalOpen, setDocUploadModalOpen] = useState(false);
  const [docAttachMode, setDocAttachMode] = useState('file'); // 'file' | 'url'
  const [selectedDocFile, setSelectedDocFile] = useState(null);
  const [docReviewModalOpen, setDocReviewModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [industries, setIndustries] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Forms
  const [reviewForm] = Form.useForm();
  const [statusForm] = Form.useForm();
  const [docUploadForm] = Form.useForm();
  const [docReviewForm] = Form.useForm();
  const [inviteForm] = Form.useForm();
  const [editForm] = Form.useForm();

  // Load single company profile
  const fetchCompany = useCallback(async () => {
    try {
      setLoading(true);
      const res = await companiesApi.getCompany(id);
      setCompany(res.data);
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to load company profile');
      navigate('/admin/companies');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchCompany();
    configurationApi
      .getDocumentDefinitions({ targetType: 'COMPANY', status: 'ACTIVE' })
      .then((res) => setDocDefinitions(res.data || []))
      .catch(() => {});
    configurationApi
      .getIndustries({ limit: 100 })
      .then((res) => setIndustries(res.data || []))
      .catch(() => {});
  }, [fetchCompany]);

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

  // Review Company submission
  const handleReviewSubmit = async (values) => {
    try {
      setSubmitting(true);
      await companiesApi.reviewCompany(company.id, values);
      message.success('Company review submitted successfully');
      setReviewModalOpen(false);
      reviewForm.resetFields();
      fetchCompany();
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  // Status Change submission
  const handleStatusSubmit = async (values) => {
    try {
      setSubmitting(true);
      await companiesApi.updateCompanyStatus(company.id, values);
      message.success('Company status updated');
      setStatusModalOpen(false);
      statusForm.resetFields();
      fetchCompany();
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to update status');
    } finally {
      setSubmitting(false);
    }
  };

  // Edit Company handlers
  const handleOpenEditModal = () => {
    if (!company) return;
    editForm.setFieldsValue({
      name: company.name || '',
      legalName: company.legalName || '',
      companyCode: company.companyCode || '',
      taxId: company.taxId || '',
      registrationNumber: company.registrationNumber || '',
      industryId: company.industryId || company.industry?.id || null,
      companySize: company.companySize || null,
      foundedYear: company.foundedYear || null,
      email: company.email || '',
      hrEmail: company.hrEmail || '',
      supportEmail: company.supportEmail || '',
      phone: company.phone || '',
      alternatePhone: company.alternatePhone || '',
      website: company.website || '',
      addressLine1: company.addressLine1 || '',
      addressLine2: company.addressLine2 || '',
      city: company.city || '',
      state: company.state || '',
      postalCode: company.postalCode || '',
      country: company.country || 'DE',
      billingEmail: company.billingEmail || '',
      billingAddress: company.billingAddress || '',
      description: company.description || '',
      hiringDomestic: Boolean(company.hiringDomestic),
      hiringInternational: Boolean(company.hiringInternational),
      hiringEu: Boolean(company.hiringEu),
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (values) => {
    if (!company) return;
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

      await companiesApi.updateCompany(company.id, payload);
      message.success(t('companies.updateSuccess', 'Company details updated successfully.'));
      setEditModalOpen(false);
      editForm.resetFields();
      await fetchCompany();
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

  // Delete Company handler
  const handleDeleteCompany = async (mode) => {
    if (!company) return;
    try {
      setSubmitting(true);
      const res = await companiesApi.deleteCompany(company.id, mode);
      message.success(
        res.message ||
          (mode === 'DELETE_PERMANENTLY'
            ? t('companies.deletedPermanently', 'Company permanently deleted.')
            : t('companies.movedToTrash', 'Company moved to Trash with 30-day retention.'))
      );
      setDeleteModalOpen(false);
      navigate('/admin/companies');
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to delete company.');
    } finally {
      setSubmitting(false);
    }
  };

  // Restore Company handler
  const handleRestoreCompany = async () => {
    if (!company) return;
    try {
      setSubmitting(true);
      const res = await companiesApi.restoreCompany(company.id);
      message.success(res.message || 'Company restored from trash successfully.');
      await fetchCompany();
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to restore company from trash.');
    } finally {
      setSubmitting(false);
    }
  };

  // Document Upload submission
  const handleDocUploadSubmit = async (values) => {
    try {
      setSubmitting(true);
      if (docAttachMode === 'file') {
        if (!selectedDocFile) {
          message.error('Please choose a file to upload');
          setSubmitting(false);
          return;
        }

        const formData = new FormData();
        formData.append('file', selectedDocFile);
        formData.append('type', 'document');
        if (values.documentDefinitionId) {
          formData.append('documentDefinitionId', values.documentDefinitionId);
        }
        if (values.name) {
          formData.append('name', values.name.trim());
        }
        formData.append('isPrivate', values.isPrivate !== undefined ? values.isPrivate : true);

        await companiesApi.uploadCompanyDocument(company.id, formData);
        message.success('Document uploaded and attached successfully');
      } else {
        await companiesApi.addCompanyDocument(company.id, values);
        message.success('Document URL attached successfully');
      }
      setDocUploadModalOpen(false);
      docUploadForm.resetFields();
      setSelectedDocFile(null);
      setDocAttachMode('file');
      fetchCompany();
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to attach document');
    } finally {
      setSubmitting(false);
    }
  };

  // Document Review submission
  const handleDocReviewSubmit = async (values) => {
    if (!selectedDoc) return;
    try {
      setSubmitting(true);
      await companiesApi.reviewCompanyDocument(company.id, selectedDoc.id, values);
      message.success('Document review updated');
      setDocReviewModalOpen(false);
      docReviewForm.resetFields();
      setSelectedDoc(null);
      fetchCompany();
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to update document review');
    } finally {
      setSubmitting(false);
    }
  };

  // Document Delete
  const handleDocDelete = async (docId) => {
    try {
      await companiesApi.deleteCompanyDocument(company.id, docId);
      message.success('Document deleted');
      fetchCompany();
    } catch (err) {
      message.error('Failed to delete document');
    }
  };

  // Document Download
  const handleDownload = async (docId) => {
    try {
      const res = await companiesApi.getDocumentDownloadUrl(company.id, docId);
      let url = res.data?.downloadUrl || res.data?.url;
      if (url) {
        if (url.startsWith('/')) {
          const apiBase = import.meta.env.VITE_API_URL || '/api';
          url = `${apiBase.replace(/\/api\/?$/, '')}${url}`;
        }
        window.open(url, '_blank');
      }
    } catch (err) {
      message.error('Failed to generate download URL');
    }
  };

  // Document Preview
  const handlePreview = async (docId) => {
    try {
      const res = await companiesApi.getDocumentDownloadUrl(company.id, docId);
      let url = res.data?.previewUrl || res.data?.url;
      if (url) {
        if (url.startsWith('/')) {
          const apiBase = import.meta.env.VITE_API_URL || '/api';
          url = `${apiBase.replace(/\/api\/?$/, '')}${url}`;
        }
        window.open(url, '_blank');
      }
    } catch (err) {
      message.error('Failed to open document preview');
    }
  };

  // Invite Team Member submission
  const handleInviteSubmit = async (values) => {
    try {
      setSubmitting(true);
      const res = await companiesApi.sendCompanyInvitation(company.id, values);
      message.success(res.delivered ? 'Invitation email sent!' : 'Invitation generated successfully.');
      setInviteModalOpen(false);
      inviteForm.resetFields();
      fetchCompany();
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to dispatch invitation');
    } finally {
      setSubmitting(false);
    }
  };

  // Resend / Retry Invitation
  const handleResendInvitation = async (invitationId) => {
    try {
      const res = await companiesApi.resendCompanyInvitation(company.id, invitationId);
      message.success(
        res.delivered
          ? 'Invitation email resent successfully!'
          : 'Invitation token regenerated. Email service unconfigured or failed.'
      );
      fetchCompany();
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to resend invitation');
    }
  };

  if (loading || !company) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  // Document table columns
  const docColumns = [
    {
      title: 'Document Name',
      key: 'name',
      render: (_, r) => (
        <Space>
          <FilePdfOutlined style={{ color: '#ef4444', fontSize: 16 }} />
          <div>
            <Text strong>{r.name}</Text>
            {r.documentDefinition && (
              <div style={{ fontSize: 11, color: '#64748b' }}>
                Category: {r.documentDefinition.name}
              </div>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: 'Review Status',
      dataIndex: 'reviewStatus',
      key: 'reviewStatus',
      render: (status, r) => {
        let tag = <Tag color="processing">Pending</Tag>;
        if (status === 'APPROVED') tag = <Tag color="success">Approved</Tag>;
        if (status === 'REJECTED') tag = <Tag color="error">Rejected</Tag>;
        return (
          <Space direction="vertical" size={2}>
            {tag}
            {r.reviewedBy && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                By: {r.reviewedBy}
              </Text>
            )}
            {r.rejectionReason && (
              <Text type="danger" style={{ fontSize: 11 }}>
                Reason: {r.rejectionReason}
              </Text>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Access Privacy',
      dataIndex: 'isPrivate',
      key: 'isPrivate',
      render: (isPrivate) => (
        <Tag color={isPrivate ? 'blue' : 'default'}>{isPrivate ? 'Confidential' : 'Public'}</Tag>
      ),
    },
    {
      title: 'Uploaded At',
      dataIndex: 'uploadedAt',
      key: 'uploadedAt',
      render: (val) => (val ? new Date(val).toLocaleDateString() : '—'),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_, r) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handlePreview(r.id)}
          >
            Preview
          </Button>
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(r.id)}
          >
            Download
          </Button>
          <Button
            size="small"
            onClick={() => {
              setSelectedDoc(r);
              docReviewForm.setFieldsValue({ decision: 'APPROVE', rejectionReason: '' });
              setDocReviewModalOpen(true);
            }}
          >
            Review
          </Button>
          <Popconfirm
            title="Delete this document?"
            onConfirm={() => handleDocDelete(r.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Tab Items
  const tabItems = [
    {
      key: 'profile',
      label: t('companies.tabs.profile', 'Profile Overview'),
      children: (
        <div>
          <Row gutter={[24, 24]}>
            <Col xs={24} md={16}>
              <Card title="Corporate Identity & Location" variant="outlined" size="small" style={{ marginBottom: 20 }}>
                <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
                  <Descriptions.Item label="Trading Name">{company.name}</Descriptions.Item>
                  <Descriptions.Item label="Legal Name">{company.legalName || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Company Code">{company.companyCode || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Tax / VAT ID">{company.taxId || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Commercial Register">{company.registrationNumber || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Industry Sector">{company.industry?.name || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Company Size">{company.companySize ? `${company.companySize} employees` : '—'}</Descriptions.Item>
                  <Descriptions.Item label="Founded Year">{company.foundedYear || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Official Website">
                    {company.website ? (
                      <a href={company.website} target="_blank" rel="noreferrer">
                        {company.website}
                      </a>
                    ) : (
                      '—'
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="Primary Email">{company.email || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Corporate Phone">{company.phone || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Country">{company.country || 'DE'}</Descriptions.Item>
                  <Descriptions.Item label="Registered Address" span={2}>
                    {[company.addressLine1, company.addressLine2, company.city, company.state, company.postalCode, company.country]
                      .filter(Boolean)
                      .join(', ') || '—'}
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              <Card title="Company Description & Scope" variant="outlined" size="small">
                <Paragraph>{company.description || 'No description provided.'}</Paragraph>
                <Divider style={{ margin: '12px 0' }} />
                <Space size={16}>
                  <Text strong>Hiring Scope:</Text>
                  {company.hiringDomestic && <Tag color="green">Domestic</Tag>}
                  {company.hiringInternational && <Tag color="blue">International</Tag>}
                  {company.hiringEu && <Tag color="purple">EU-wide</Tag>}
                </Space>
              </Card>
            </Col>

            <Col xs={24} md={8}>
              <Card title="Branding Assets" variant="outlined" size="small" style={{ marginBottom: 20 }}>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Logo</Text>
                  {company.logoUrl ? (
                    <Image
                      src={company.logoUrl}
                      alt="Logo"
                      style={{ maxHeight: 120, objectFit: 'contain', border: '1px solid #e2e8f0', borderRadius: 8, padding: 8 }}
                    />
                  ) : (
                    <Tag>No Logo Uploaded</Tag>
                  )}
                </div>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Banner</Text>
                  {company.bannerUrl ? (
                    <Image
                      src={company.bannerUrl}
                      alt="Banner"
                      style={{ width: '100%', maxHeight: 100, objectFit: 'cover', borderRadius: 6 }}
                    />
                  ) : (
                    <Tag>No Banner Uploaded</Tag>
                  )}
                </div>
                {company.promoVideoUrl && (
                  <div style={{ textAlign: 'center' }}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Promotional Video</Text>
                    <a href={company.promoVideoUrl} target="_blank" rel="noreferrer">
                      Watch Video
                    </a>
                  </div>
                )}
              </Card>

              {/* Quick Status Summary Box */}
              <Card title="Compliance Status" variant="outlined" size="small">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>Account Status:</Text>
                    {renderStatusTag(company.status)}
                  </div>
                  {company.reviewedAt && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">Reviewed By:</Text>
                      <Text>{company.reviewedBy}</Text>
                    </div>
                  )}
                  {company.reviewedAt && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">Reviewed At:</Text>
                      <Text>{new Date(company.reviewedAt).toLocaleDateString()}</Text>
                    </div>
                  )}
                  {company.rejectionReason && (
                    <Alert type="error" message={`Rejection: ${company.rejectionReason}`} />
                  )}
                  {company.suspensionReason && (
                    <Alert type="warning" message={`Suspension: ${company.suspensionReason}`} />
                  )}
                </Space>
              </Card>
            </Col>
          </Row>
        </div>
      ),
    },
    {
      key: 'documents',
      label: `${t('companies.tabs.documents', 'Documents & Compliance')} (${company.documents?.length || 0})`,
      children: (
        <div>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text type="secondary">
              Review and verify statutory documents submitted by this organization.
            </Text>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setDocUploadModalOpen(true)}
              style={{ backgroundColor: brandTokens.navy, borderColor: brandTokens.navy }}
            >
              Attach Document
            </Button>
          </div>
          <Table
            dataSource={company.documents || []}
            columns={docColumns}
            rowKey="id"
            pagination={{ pageSize: 5 }}
          />
        </div>
      ),
    },
    {
      key: 'general',
      label: t('companies.tabs.general', 'General Details'),
      children: (
        <Card variant="outlined" size="small">
          <Descriptions column={2} bordered>
            <Descriptions.Item label="Canonical System ID">{company.id}</Descriptions.Item>
            <Descriptions.Item label="Company Unique Code">{company.companyCode}</Descriptions.Item>
            <Descriptions.Item label="Account Created">{new Date(company.createdAt).toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="Last Updated">{new Date(company.updatedAt).toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="Primary Country">{company.country}</Descriptions.Item>
            <Descriptions.Item label="Billing Address">{company.billingAddress || '—'}</Descriptions.Item>
          </Descriptions>
        </Card>
      ),
    },
    {
      key: 'notifications',
      label: t('companies.tabs.notifications', 'Notification Contacts'),
      children: (
        <Card variant="outlined" size="small">
          <Descriptions column={1} bordered>
            <Descriptions.Item label="Primary Corporate Email">{company.email || '—'}</Descriptions.Item>
            <Descriptions.Item label="HR / Recruitment Inquiries">{company.hrEmail || '—'}</Descriptions.Item>
            <Descriptions.Item label="Support / General Inquiries">{company.supportEmail || '—'}</Descriptions.Item>
            <Descriptions.Item label="Invoices & Accounting Email">{company.billingEmail || '—'}</Descriptions.Item>
          </Descriptions>
        </Card>
      ),
    },
    {
      key: 'security',
      label: t('companies.tabs.security', 'Security & Verification'),
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          <Card title="Compliance Verification Trail" variant="outlined" size="small">
            <Descriptions column={2} bordered>
              <Descriptions.Item label="Verification Status">{renderStatusTag(company.status)}</Descriptions.Item>
              <Descriptions.Item label="Reviewer">{company.reviewedBy || 'Not reviewed yet'}</Descriptions.Item>
              <Descriptions.Item label="Reviewed Timestamp">
                {company.reviewedAt ? new Date(company.reviewedAt).toLocaleString() : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Internal Review Notes">
                {company.reviewNotes || '—'}
              </Descriptions.Item>
              {company.rejectionReason && (
                <Descriptions.Item label="Applicant Rejection Notice" span={2}>
                  <Text type="danger">{company.rejectionReason}</Text>
                </Descriptions.Item>
              )}
              {company.suspensionReason && (
                <Descriptions.Item label="Suspension Notice" span={2}>
                  <Text type="danger">{company.suspensionReason}</Text>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          <Card title="Recent Invitations" variant="outlined" size="small">
            <Table
              dataSource={company.invitations || []}
              rowKey="id"
              pagination={false}
              size="small"
              columns={[
                { title: 'Recipient Email', dataIndex: 'email' },
                { title: 'Role', dataIndex: 'role' },
                {
                  title: 'Expires At',
                  dataIndex: 'expiresAt',
                  render: (val) => new Date(val).toLocaleString(),
                },
                {
                  title: 'Status',
                  render: (_, r) =>
                    r.acceptedAt ? (
                      <Tag color="success">Accepted</Tag>
                    ) : new Date(r.expiresAt) > new Date() ? (
                      <Tag color="processing">Pending Setup</Tag>
                    ) : (
                      <Tag color="default">Expired</Tag>
                    ),
                },
                {
                  title: 'Actions',
                  key: 'actions',
                  render: (_, r) =>
                    !r.acceptedAt ? (
                      <Button
                        size="small"
                        type="link"
                        icon={<MailOutlined />}
                        onClick={() => handleResendInvitation(r.id)}
                      >
                        Resend
                      </Button>
                    ) : null,
                },
              ]}
            />
          </Card>
        </Space>
      ),
    },
    {
      key: 'recruitment',
      label: t('companies.tabs.recruitment', 'Recruitment Settings'),
      children: (
        <Card variant="outlined" size="small">
          <Descriptions column={2} bordered>
            <Descriptions.Item label="Domestic Candidates Allowed">
              {company.hiringDomestic ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="International Candidates Allowed">
              {company.hiringInternational ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="EU Mobility Hiring">
              {company.hiringEu ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="Active Job Postings (Count)">
              0 (No jobs registered yet)
            </Descriptions.Item>
          </Descriptions>
        </Card>
      ),
    },
    {
      key: 'integrations',
      label: t('companies.tabs.integrations', 'Integrations & Storage'),
      children: (
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card title="Cloudinary Storage Registry" variant="outlined" size="small">
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="Logo Public ID">{company.logoPublicId || 'None'}</Descriptions.Item>
                <Descriptions.Item label="Banner Public ID">{company.bannerPublicId || 'None'}</Descriptions.Item>
                <Descriptions.Item label="Promo Video Public ID">{company.promoVideoPublicId || 'None'}</Descriptions.Item>
                <Descriptions.Item label="Document Count">{company.documents?.length || 0}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card title="Billing & Stripe Subscription" variant="outlined" size="small">
              {company.subscriptions && company.subscriptions.length > 0 ? (
                <Descriptions column={1} bordered size="small">
                  <Descriptions.Item label="Active Plan">{company.subscriptions[0].plan?.name || 'Standard'}</Descriptions.Item>
                  <Descriptions.Item label="Status">{company.subscriptions[0].status}</Descriptions.Item>
                </Descriptions>
              ) : (
                <Text type="secondary">No active subscription provisioned for this company.</Text>
              )}
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'team',
      label: `${t('companies.tabs.team', 'Team & Users')} (${company.users?.length || 0})`,
      children: (
        <div>
          <Alert
            type="info"
            showIcon
            message="Team Management Module Scheduled"
            description="The full granular multi-seat role matrix (Recruiter, Hiring Manager, Coordinator) is scheduled for an upcoming phase. Initial company administrators and user seats are managed here."
            style={{ marginBottom: 16 }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              onClick={() => setInviteModalOpen(true)}
              style={{ backgroundColor: brandTokens.navy, borderColor: brandTokens.navy }}
            >
              {t('companies.team.inviteBtn', 'Invite Team Member')}
            </Button>
          </div>
          <Table
            dataSource={company.users || []}
            rowKey="id"
            pagination={false}
            columns={[
              {
                title: 'User / Name',
                key: 'name',
                render: (_, r) => (
                  <Space>
                    <Text strong>{[r.firstName, r.lastName].filter(Boolean).join(' ') || 'Administrator'}</Text>
                  </Space>
                ),
              },
              { title: 'Email Address', dataIndex: 'email' },
              {
                title: 'Role',
                dataIndex: 'role',
                render: (role) => <Tag color="blue">{role}</Tag>,
              },
              {
                title: 'Status',
                dataIndex: 'status',
                render: (status) =>
                  status === 'ACTIVE' ? (
                    <Tag color="success">Active</Tag>
                  ) : (
                    <Tag color="warning">Invited</Tag>
                  ),
              },
              {
                title: 'Added At',
                dataIndex: 'createdAt',
                render: (val) => new Date(val).toLocaleDateString(),
              },
            ]}
          />
        </div>
      ),
    },
    {
      key: 'audit',
      label: `${t('companies.tabs.audit', 'Audit Log')} (${company.auditLogs?.length || 0})`,
      children: (
        <Table
          dataSource={company.auditLogs || []}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          size="small"
          columns={[
            {
              title: 'Timestamp',
              dataIndex: 'createdAt',
              render: (val) => new Date(val).toLocaleString(),
            },
            {
              title: 'Action',
              dataIndex: 'action',
              render: (action) => <Tag>{action}</Tag>,
            },
            { title: 'Actor', dataIndex: 'actor' },
            {
              title: 'Details',
              dataIndex: 'details',
              render: (details) =>
                details ? (
                  <Text code style={{ fontSize: 11 }}>
                    {JSON.stringify(details)}
                  </Text>
                ) : (
                  '—'
                ),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div style={{ padding: '0 4px' }}>
      {/* Top Navigation & Action Header */}
      <div style={{ marginBottom: 16 }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/admin/companies')}
          style={{ marginBottom: 8, paddingLeft: 0 }}
        >
          {t('common.back', 'Back to Companies')}
        </Button>

        <Card variant="outlined" styles={{ body: { padding: '20px 24px' } }}>
          <Row justify="space-between" align="middle" gutter={[16, 16]}>
            <Col>
              <Space align="center" size={12}>
                <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: brandTokens.navy }}>
                  {company.name}
                </h1>
                {company.companyCode && (
                  <Tag style={{ fontSize: 13, fontWeight: 600 }}>{company.companyCode}</Tag>
                )}
                {renderStatusTag(company.status)}
                {company.deletedAt && (
                  <Tag color="volcano" style={{ fontSize: 12, padding: '2px 8px' }}>
                    In Trash ({new Date(company.deletedAt).toLocaleDateString()})
                  </Tag>
                )}
              </Space>
              {company.legalName && (
                <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                  {company.legalName}
                </Text>
              )}
            </Col>

            <Col>
              <Space wrap>
                {company.deletedAt ? (
                  <Popconfirm
                    title="Restore company from trash?"
                    description="This will restore the company and re-enable active management."
                    onConfirm={handleRestoreCompany}
                    okText="Restore"
                    cancelText="Cancel"
                  >
                    <Button
                      type="primary"
                      icon={<UndoOutlined />}
                      loading={submitting}
                      style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                    >
                      Restore from Trash
                    </Button>
                  </Popconfirm>
                ) : (
                  <>
                    {company.status === 'IN_REVIEW' && (
                      <Button
                        type="primary"
                        icon={<CheckCircleOutlined />}
                        onClick={() => {
                          reviewForm.setFieldsValue({ decision: 'APPROVE', notes: '' });
                          setReviewModalOpen(true);
                        }}
                        style={{ backgroundColor: '#0284c7', borderColor: '#0284c7' }}
                      >
                        {t('companies.reviewApplication', 'Review Application')}
                      </Button>
                    )}
                    <Button
                      icon={<StopOutlined />}
                      onClick={() => {
                        statusForm.setFieldsValue({ status: company.status, reason: '' });
                        setStatusModalOpen(true);
                      }}
                    >
                      {t('companies.changeStatus', 'Change Status')}
                    </Button>
                    <Button
                      icon={<EditOutlined />}
                      onClick={handleOpenEditModal}
                    >
                      {t('common.edit', 'Edit')}
                    </Button>
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => setDeleteModalOpen(true)}
                    >
                      {t('common.delete', 'Delete')}
                    </Button>
                  </>
                )}
              </Space>
            </Col>
          </Row>
        </Card>
      </div>

      {/* Tabs */}
      <Card variant="outlined" styles={{ body: { padding: '16px 24px' } }}>
        <Tabs defaultActiveKey="profile" items={tabItems} />
      </Card>

      {/* Review Company Modal */}
      <Modal
        title={t('companies.reviewTitle', 'Company Compliance Review')}
        open={reviewModalOpen}
        onCancel={() => setReviewModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
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
                  <TextArea rows={3} placeholder="Dispatched via email to applicant..." />
                </Form.Item>
              ) : null
            }
          </Form.Item>

          <Form.Item name="notes" label={t('companies.reviewNotes', 'Internal Review Notes')}>
            <TextArea rows={2} placeholder="Optional internal auditor notes..." />
          </Form.Item>

          <Space style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <Button onClick={() => setReviewModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              Submit Decision
            </Button>
          </Space>
        </Form>
      </Modal>

      {/* Change Status Modal */}
      <Modal
        title={t('companies.changeStatus', 'Change Company Status')}
        open={statusModalOpen}
        onCancel={() => setStatusModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={statusForm} layout="vertical" onFinish={handleStatusSubmit}>
          <Form.Item name="status" label="New Status" rules={[{ required: true }]}>
            <Select>
              <Option value="ACTIVE">Active</Option>
              <Option value="INACTIVE">Inactive</Option>
              <Option value="SUSPENDED">Suspended</Option>
              <Option value="UNVERIFIED">Unverified</Option>
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
            <Button onClick={() => setStatusModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              Save Status
            </Button>
          </Space>
        </Form>
      </Modal>

      {/* Attach Document Modal */}
      <Modal
        title="Attach Company Document"
        open={docUploadModalOpen}
        onCancel={() => {
          setDocUploadModalOpen(false);
          setSelectedDocFile(null);
          docUploadForm.resetFields();
        }}
        footer={null}
        destroyOnHidden
      >
        <div style={{ marginBottom: 16, textAlign: 'center' }}>
          <Radio.Group
            value={docAttachMode}
            onChange={(e) => setDocAttachMode(e.target.value)}
            buttonStyle="solid"
          >
            <Radio.Button value="file">
              <UploadOutlined style={{ marginRight: 6 }} />
              Upload File
            </Radio.Button>
            <Radio.Button value="url">
              <LinkOutlined style={{ marginRight: 6 }} />
              Attach External URL
            </Radio.Button>
          </Radio.Group>
        </div>

        <Form form={docUploadForm} layout="vertical" onFinish={handleDocUploadSubmit}>
          <Form.Item name="documentDefinitionId" label="Document Category">
            <Select placeholder="Select configured definition (optional)" allowClear>
              {docDefinitions.map((d) => (
                <Option key={d.id} value={d.id}>
                  {d.name} {d.isRequired ? '(Required)' : ''}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="name"
            label="Document Name"
            rules={[{ required: docAttachMode === 'url', message: 'Document name is required' }]}
          >
            <Input placeholder="e.g. Commercial Registration Certificate" />
          </Form.Item>

          {docAttachMode === 'file' ? (
            <Form.Item
              label="Document File"
              required
              help="Accepts PDF, PNG, JPG, JPEG documents up to 15MB"
            >
              <Upload.Dragger
                beforeUpload={(file) => {
                  const ext = '.' + file.name.split('.').pop().toLowerCase();
                  const allowed = ['.pdf', '.png', '.jpg', '.jpeg'];
                  if (!allowed.includes(ext)) {
                    message.error(`File format ${ext} is not allowed. Permitted: ${allowed.join(', ')}`);
                    return Upload.LIST_IGNORE;
                  }
                  if (file.size > 15 * 1024 * 1024) {
                    message.error('File size exceeds the 15MB limit.');
                    return Upload.LIST_IGNORE;
                  }
                  setSelectedDocFile(file);
                  if (!docUploadForm.getFieldValue('name')) {
                    docUploadForm.setFieldValue('name', file.name.replace(/\.[^/.]+$/, ''));
                  }
                  return false;
                }}
                maxCount={1}
                fileList={selectedDocFile ? [selectedDocFile] : []}
                onRemove={() => setSelectedDocFile(null)}
                accept=".pdf,.png,.jpg,.jpeg"
              >
                <p className="ant-upload-drag-icon">
                  <UploadOutlined style={{ fontSize: 28, color: brandTokens.navy }} />
                </p>
                <p className="ant-upload-text">Click or drag document file to upload</p>
                <p className="ant-upload-hint">Document will be uploaded securely with encryption.</p>
              </Upload.Dragger>
            </Form.Item>
          ) : (
            <Form.Item
              name="fileUrl"
              label="File URL (Cloudinary / CDN / Document Host)"
              rules={[{ required: true, message: 'Valid file URL required' }, { type: 'url' }]}
            >
              <Input placeholder="https://res.cloudinary.com/.../document.pdf" />
            </Form.Item>
          )}

          <Form.Item name="isPrivate" label="Privacy Level" initialValue={true}>
            <Select>
              <Option value={true}>Private / Confidential (Authenticated Stream Only)</Option>
              <Option value={false}>Public (Anyone with URL may access)</Option>
            </Select>
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.isPrivate !== cur.isPrivate}>
            {({ getFieldValue }) =>
              getFieldValue('isPrivate') === false ? (
                <Alert
                  type="warning"
                  showIcon
                  style={{ marginBottom: 16 }}
                  message="Warning: Public Document Access"
                  description="Anyone with the public URL will be able to access, view, and download this document without authentication. Only choose Public for documents intended for open public sharing."
                />
              ) : null
            }
          </Form.Item>

          <Space style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <Button
              onClick={() => {
                setDocUploadModalOpen(false);
                setSelectedDocFile(null);
                docUploadForm.resetFields();
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              style={{ backgroundColor: brandTokens.navy, borderColor: brandTokens.navy }}
            >
              {docAttachMode === 'file' ? 'Upload & Attach' : 'Attach Document'}
            </Button>
          </Space>
        </Form>
      </Modal>

      {/* Review Document Modal */}
      <Modal
        title="Review Document"
        open={docReviewModalOpen}
        onCancel={() => setDocReviewModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={docReviewForm} layout="vertical" onFinish={handleDocReviewSubmit}>
          <Form.Item name="decision" label="Decision" rules={[{ required: true }]}>
            <Select>
              <Option value="APPROVE">Approve Document</Option>
              <Option value="REJECT">Reject Document</Option>
            </Select>
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.decision !== cur.decision}>
            {({ getFieldValue }) =>
              getFieldValue('decision') === 'REJECT' ? (
                <Form.Item
                  name="rejectionReason"
                  label="Rejection Reason"
                  rules={[{ required: true, message: 'Please specify reason for rejecting document' }]}
                >
                  <TextArea rows={3} placeholder="e.g. Document expired or unreadable" />
                </Form.Item>
              ) : null
            }
          </Form.Item>

          <Space style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <Button onClick={() => setDocReviewModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              Save Review
            </Button>
          </Space>
        </Form>
      </Modal>

      {/* Invite Team Member Modal */}
      <Modal
        title="Invite Company User"
        open={inviteModalOpen}
        onCancel={() => setInviteModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={inviteForm} layout="vertical" onFinish={handleInviteSubmit}>
          <Form.Item
            name="email"
            label="User Email Address"
            rules={[{ required: true, message: 'Email required' }, { type: 'email' }]}
          >
            <Input placeholder="user@company.com" />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={12}>
              <Form.Item name="firstName" label="First Name">
                <Input placeholder="First Name" />
              </Form.Item>
            </Col>
            <Col xs={12}>
              <Form.Item name="lastName" label="Last Name">
                <Input placeholder="Last Name" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="role" label="Role" initialValue="ADMIN">
            <Select>
              <Option value="ADMIN">Administrator</Option>
              <Option value="RECRUITER">Recruiter</Option>
              <Option value="MEMBER">Team Member</Option>
            </Select>
          </Form.Item>

          <Space style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <Button onClick={() => setInviteModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              Send Invitation
            </Button>
          </Space>
        </Form>
      </Modal>

      {/* Edit Company Modal */}
      <Modal
        title={
          company
            ? `${t('companies.editTitle', 'Edit Company')} — ${company.name}`
            : t('companies.editTitle', 'Edit Company Profile')
        }
        open={editModalOpen}
        onCancel={() => {
          setEditModalOpen(false);
          editForm.resetFields();
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
        recordTitle={company?.name}
        onCancel={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteCompany}
        loading={submitting}
      />
    </div>
  );
}
