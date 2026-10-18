import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Descriptions,
  Tag,
  Button,
  Space,
  Typography,
  Progress,
  App,
  Skeleton,
  Table,
  Badge,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Switch,
  Divider,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  CheckCircleOutlined,
  GlobalOutlined,
  LinkedinOutlined,
  GithubOutlined,
  LinkOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  IdcardOutlined,
  SafetyCertificateOutlined,
  MailOutlined,
  BankOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { candidateApi } from '../../services/candidateApi.js';
import { companiesApi } from '../../services/companiesApi.js';
import { brandTokens } from '../../theme/tokens.js';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export function CandidateDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { message } = App.useApp();

  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [resending, setResending] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [downloadingResume, setDownloadingResume] = useState(false);

  const handleResendInvitation = async () => {
    setResending(true);
    try {
      const res = await candidateApi.resendInvitation(id);
      if (res.delivered) {
        message.success(t('candidates.resendSuccess', 'Account activation email successfully resent.'));
      } else {
        message.warning(t('candidates.emailFailedWarning', 'Activation email could not be delivered; status set to Pending Retry.'));
      }
      fetchCandidate();
    } catch (err) {
      message.error(err.response?.data?.error || t('candidates.resendFailed', 'Failed to resend activation email.'));
    } finally {
      setResending(false);
    }
  };

  const fetchCandidate = useCallback(async () => {
    setLoading(true);
    try {
      const res = await candidateApi.getCandidate(id);
      if (res.success) {
        setCandidate(res.data);
      }
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to load candidate details.');
    } finally {
      setLoading(false);
    }
  }, [id, message]);

  useEffect(() => {
    fetchCandidate();
  }, [fetchCandidate]);

  const fetchCompanies = useCallback(async () => {
    setLoadingCompanies(true);
    try {
      const res = await companiesApi.getCompanies({ limit: 100, status: 'ACTIVE' });
      const rawList = Array.isArray(res.data)
        ? res.data
        : (Array.isArray(res.items) ? res.items : (Array.isArray(res.data?.items) ? res.data.items : []));
      setCompanies(rawList);
    } catch {
      // Non-fatal, companies dropdown will show empty state
    } finally {
      setLoadingCompanies(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handlePreviewResume = async () => {
    setLoadingPreview(true);
    try {
      const blob = await candidateApi.getResumeBlob(id, 'inline');
      const url = URL.createObjectURL(blob);
      setPreviewBlobUrl(url);
      setPreviewModalOpen(true);
    } catch (err) {
      message.error(err.response?.data?.error || t('candidates.previewFailed', 'Failed to retrieve resume for preview.'));
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleClosePreview = () => {
    setPreviewModalOpen(false);
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
      setPreviewBlobUrl(null);
    }
  };

  const handleDownloadResume = async () => {
    setDownloadingResume(true);
    try {
      const blob = await candidateApi.getResumeBlob(id, 'attachment');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = candidate?.resumeFileName || 'Candidate_Resume.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      message.error(err.response?.data?.error || t('candidates.downloadFailed', 'Failed to download resume document.'));
    } finally {
      setDownloadingResume(false);
    }
  };

  const handleEditSubmit = async (values) => {
    setSubmittingEdit(true);
    try {
      const payload = {
        ...values,
        companyId: values.companyId || null,
        dateOfBirth: values.dateOfBirth ? values.dateOfBirth.toISOString() : undefined,
        passportExpiryDate: values.passportExpiryDate ? values.passportExpiryDate.toISOString() : undefined,
      };
      const res = await candidateApi.updateCandidate(id, payload);
      if (res.success) {
        message.success(t('candidates.profileUpdateSuccess', 'Candidate profile updated successfully.'));
        setCandidate(res.data);
        setEditModalOpen(false);
        fetchCandidate();
      }
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to update candidate.');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const openEditModal = () => {
    if (!candidate) return;
    form.setFieldsValue({
      companyId: candidate.companyId || candidate.company?.id || null,
      firstName: candidate.firstName,
      middleName: candidate.middleName,
      lastName: candidate.lastName,
      phone: candidate.phone,
      alternateMobile: candidate.alternateMobile,
      dateOfBirth: candidate.dateOfBirth ? dayjs(candidate.dateOfBirth) : null,
      gender: candidate.gender,
      maritalStatus: candidate.maritalStatus,
      nationality: candidate.nationality,
      addressLine1: candidate.addressLine1,
      addressLine2: candidate.addressLine2,
      city: candidate.city,
      state: candidate.state,
      postalCode: candidate.postalCode,
      country: candidate.country || 'DE',
      profession: candidate.profession,
      employmentType: candidate.employmentType,
      currentJobTitle: candidate.currentJobTitle,
      currentCompany: candidate.currentCompany,
      yearsOfExperience: candidate.yearsOfExperience ? Number(candidate.yearsOfExperience) : null,
      noticePeriodDays: candidate.noticePeriodDays,
      currentSalary: candidate.currentSalary ? Number(candidate.currentSalary) : null,
      expectedSalary: candidate.expectedSalary ? Number(candidate.expectedSalary) : null,
      preferredLocation: candidate.preferredLocation,
      willingToRelocate: Boolean(candidate.willingToRelocate),
      headline: candidate.headline,
      summary: candidate.summary,
      passportNumber: candidate.passportNumber,
      passportExpiryDate: candidate.passportExpiryDate ? dayjs(candidate.passportExpiryDate) : null,
      visaStatus: candidate.visaStatus,
      workPermitAuthorized: Boolean(candidate.workPermitAuthorized),
      linkedinUrl: candidate.linkedinUrl,
      portfolioUrl: candidate.portfolioUrl,
      githubUrl: candidate.githubUrl,
    });
    setEditModalOpen(true);
  };

  const getProgressColor = (percent) => {
    if (percent >= 80) return '#52c41a';
    if (percent >= 50) return '#faad14';
    return '#ff4d4f';
  };

  const renderStatusTag = (status) => {
    const map = {
      ACTIVE: { color: 'success', text: t('candidates.statusActive', 'Active') },
      PENDING_APPROVAL: { color: 'gold', text: t('candidates.statusPending', 'Pending Approval') },
      INACTIVE: { color: 'default', text: t('candidates.statusInactive', 'Inactive') },
      SUSPENDED: { color: 'error', text: t('candidates.statusSuspended', 'Suspended') },
    };
    const s = map[status] || { color: 'default', text: status };
    return <Tag color={s.color}>{s.text}</Tag>;
  };

  const renderInvitationTag = (cand) => {
    const status = cand.invitationStatus || (cand.user?.status === 'ACTIVE' ? 'ACCEPTED' : 'NONE');
    const map = {
      ACCEPTED: { color: 'green', text: t('candidates.invitationAccepted', 'Account Active') },
      PENDING: { color: 'blue', text: t('candidates.invitationPending', 'Invitation Sent') },
      PENDING_RETRY: { color: 'volcano', text: t('candidates.invitationPendingRetry', 'Pending Retry') },
      NONE: { color: 'default', text: t('candidates.invitationNone', 'Not Invited') },
    };
    const s = map[status] || { color: 'default', text: status };
    return <Tag color={s.color}>{s.text}</Tag>;
  };

  const applicationColumns = [
    {
      title: t('jobs.jobTitle', 'Job Title'),
      dataIndex: ['job', 'title'],
      key: 'jobTitle',
      render: (title, record) => (
        <a onClick={() => navigate(`/admin/jobs/${record.jobId}`)} style={{ fontWeight: 600 }}>
          {title}
        </a>
      ),
    },
    {
      title: t('jobs.company', 'Company'),
      dataIndex: ['job', 'company', 'name'],
      key: 'companyName',
      render: (name) => name || '—',
    },
    {
      title: t('candidates.currentStage', 'Recruitment Stage'),
      dataIndex: ['currentStage', 'name'],
      key: 'stage',
      render: (stage) => <Tag color="blue">{stage || 'Initial Screening'}</Tag>,
    },
    {
      title: t('candidates.applicationStatus', 'Status'),
      dataIndex: 'status',
      key: 'status',
      render: (st) => <Badge status="processing" text={st} />,
    },
    {
      title: t('candidates.appliedDate', 'Applied Date'),
      dataIndex: 'appliedAt',
      key: 'appliedAt',
      render: (d) => (d ? dayjs(d).format('YYYY-MM-DD HH:mm') : '—'),
    },
  ];

  if (loading) {
    return (
      <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        <Skeleton active paragraph={{ rows: 12 }} />
      </div>
    );
  }

  if (!candidate) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Title level={4}>{t('candidates.notFound', 'Candidate not found.')}</Title>
        <Button onClick={() => navigate('/admin/candidates')}>
          {t('candidates.backToList', 'Back to Candidates')}
        </Button>
      </div>
    );
  }

  const canResend =
    candidate.invitationStatus !== 'ACCEPTED' &&
    candidate.user?.status !== 'ACTIVE' &&
    !candidate.passwordHash;

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      {/* Back Button & Top Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/candidates')}>
          {t('candidates.backToDirectory', 'Candidate Directory')}
        </Button>
        <Space>
          {canResend && (
            <Button
              icon={<MailOutlined />}
              onClick={handleResendInvitation}
              loading={resending}
            >
              {t('candidates.resendInvitation', 'Resend Invitation')}
            </Button>
          )}
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={openEditModal}
            style={{ backgroundColor: brandTokens.primary }}
          >
            {t('candidates.editProfile', 'Edit 360° Profile')}
          </Button>
        </Space>
      </div>

      {/* Hero Header Card */}
      <Card variant="borderless" style={{ marginBottom: 24 }}>
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} md={16}>
            <Space align="center" size={12}>
              <Title level={2} style={{ margin: 0 }}>
                {candidate.fullName || `${candidate.firstName} ${candidate.lastName}`}
              </Title>
              {renderStatusTag(candidate.status)}
            </Space>
            {candidate.headline && (
              <div style={{ marginTop: 6 }}>
                <Text style={{ fontSize: 16, color: '#595959' }}>{candidate.headline}</Text>
              </div>
            )}
            <div style={{ marginTop: 10, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {candidate.currentJobTitle && (
                <Text>
                  <strong>{candidate.currentJobTitle}</strong>
                  {candidate.currentCompany ? ` at ${candidate.currentCompany}` : ''}
                </Text>
              )}
              <span>
                <EnvironmentOutlined style={{ marginRight: 4, color: '#8c8c8c' }} />
                {[candidate.city, candidate.state, candidate.country].filter(Boolean).join(', ') || '—'}
              </span>
              <span>
                <CalendarOutlined style={{ marginRight: 4, color: '#8c8c8c' }} />
                {t('candidates.joined', 'Joined')}: {dayjs(candidate.createdAt).format('MMMM YYYY')}
              </span>
            </div>
          </Col>
          <Col xs={24} md={8} style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
              {t('candidates.profileCompletion', 'Profile Completion Score')}
            </Text>
            <Progress
              type="circle"
              percent={candidate.profileCompletion || 0}
              strokeColor={getProgressColor(candidate.profileCompletion || 0)}
              size={100}
            />
          </Col>
        </Row>
      </Card>

      {/* Section A: Personal & Contact Details */}
      <Card
        title={
          <Space>
            <IdcardOutlined style={{ color: brandTokens.primary }} />
            <span>{t('candidates.sectionA', 'Section A — Personal & Contact Information')}</span>
          </Space>
        }
        variant="borderless"
        style={{ marginBottom: 24 }}
      >
        <Descriptions bordered size="small" column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label={t('candidates.firstName', 'First Name')}>
            {candidate.firstName || '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('candidates.middleName', 'Middle Name')}>
            {candidate.middleName || '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('candidates.lastName', 'Last Name')}>
            {candidate.lastName || '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('candidates.primaryEmail', 'Primary Email')}>
            {candidate.email}
          </Descriptions.Item>
          <Descriptions.Item label={t('candidates.phone', 'Phone')}>
            {candidate.phone || '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('candidates.alternateMobile', 'Alternate Mobile')}>
            {candidate.alternateMobile || '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('candidates.dateOfBirth', 'Date of Birth')}>
            {candidate.dateOfBirth ? dayjs(candidate.dateOfBirth).format('YYYY-MM-DD') : '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('candidates.gender', 'Gender')}>
            {candidate.gender || '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('candidates.nationality', 'Nationality')}>
            {candidate.nationality || '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('candidates.associatedCompany', 'Company Association')}>
            {candidate.company?.name || '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('candidates.invitationStatus', 'Invitation Status')}>
            {renderInvitationTag(candidate)}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Section B: Address & Residential Location */}
      <Card
        title={
          <Space>
            <EnvironmentOutlined style={{ color: brandTokens.primary }} />
            <span>{t('candidates.sectionB', 'Section B — Residential Address')}</span>
          </Space>
        }
        variant="borderless"
        style={{ marginBottom: 24 }}
      >
        <Descriptions bordered size="small" column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label={t('candidates.addressLine1', 'Address Line 1')}>
            {candidate.addressLine1 || '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('candidates.addressLine2', 'Address Line 2')}>
            {candidate.addressLine2 || '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('candidates.city', 'City')}>
            {candidate.city || '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('candidates.state', 'State / Region')}>
            {candidate.state || '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('candidates.postalCode', 'Postal Code')}>
            {candidate.postalCode || '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('candidates.country', 'Country')}>
            {candidate.country || 'DE'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Section C: Professional Background & Career Preferences */}
      <Card
        title={
          <Space>
            <GlobalOutlined style={{ color: brandTokens.primary }} />
            <span>{t('candidates.sectionC', 'Section C — Professional Details & Preferences')}</span>
          </Space>
        }
        variant="borderless"
        style={{ marginBottom: 24 }}
      >
        <Descriptions bordered size="small" column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label={t('candidates.profession', 'Profession')}>
            {candidate.profession || '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('candidates.employmentType', 'Employment Type')}>
            {candidate.employmentType || '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('candidates.experienceYears', 'Experience')}>
            {candidate.yearsOfExperience !== null && candidate.yearsOfExperience !== undefined
              ? `${candidate.yearsOfExperience} years`
              : '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('candidates.currentCompany', 'Current Company')}>
            {candidate.currentCompany || '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('candidates.currentJobTitle', 'Current Job Title')}>
            {candidate.currentJobTitle || '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('candidates.noticePeriodDays', 'Notice Period')}>
            {candidate.noticePeriodDays ? `${candidate.noticePeriodDays} days` : '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('candidates.expectedSalary', 'Expected Salary')}>
            {candidate.expectedSalary ? `€ ${Number(candidate.expectedSalary).toLocaleString()}` : '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('candidates.willingToRelocate', 'Willing to Relocate')}>
            {candidate.willingToRelocate ? (
              <Tag color="green">{t('common.yes', 'Yes')}</Tag>
            ) : (
              <Tag>{t('common.no', 'No')}</Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label={t('candidates.preferredLocation', 'Preferred Location')}>
            {candidate.preferredLocation || '—'}
          </Descriptions.Item>
        </Descriptions>

        {candidate.summary && (
          <div style={{ marginTop: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>
              {t('candidates.summary', 'Professional Summary')}:
            </Text>
            <Paragraph style={{ backgroundColor: '#fafafa', padding: 12, borderRadius: 6, margin: 0 }}>
              {candidate.summary}
            </Paragraph>
          </div>
        )}
      </Card>

      {/* Section D & E: Work Auth and Online Links in 2 Columns */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <Card
            title={
              <Space>
                <SafetyCertificateOutlined style={{ color: brandTokens.primary }} />
                <span>{t('candidates.sectionD', 'Section D — Work Authorization')}</span>
              </Space>
            }
            variant="borderless"
            style={{ height: '100%' }}
          >
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label={t('candidates.workPermitAuthorized', 'Authorized to Work')}>
                {candidate.workPermitAuthorized ? (
                  <Tag color="success">{t('candidates.authorized', 'Authorized')}</Tag>
                ) : (
                  <Tag color="warning">{t('candidates.authorizationRequired', 'Visa/Permit Required')}</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label={t('candidates.visaStatus', 'Visa Status')}>
                {candidate.visaStatus || '—'}
              </Descriptions.Item>
              <Descriptions.Item label={t('candidates.passportNumber', 'Passport Number')}>
                {candidate.passportNumber || '—'}
              </Descriptions.Item>
              <Descriptions.Item label={t('candidates.passportExpiryDate', 'Passport Expiry')}>
                {candidate.passportExpiryDate ? dayjs(candidate.passportExpiryDate).format('YYYY-MM-DD') : '—'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card
            title={
              <Space>
                <GlobalOutlined style={{ color: brandTokens.primary }} />
                <span>{t('candidates.sectionE', 'Section E — Online Profiles & Links')}</span>
              </Space>
            }
            variant="borderless"
            style={{ height: '100%' }}
          >
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="LinkedIn">
                {candidate.linkedinUrl ? (
                  <a href={candidate.linkedinUrl} target="_blank" rel="noopener noreferrer">
                    <LinkedinOutlined style={{ marginRight: 6 }} />
                    {candidate.linkedinUrl}
                  </a>
                ) : (
                  '—'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="GitHub">
                {candidate.githubUrl ? (
                  <a href={candidate.githubUrl} target="_blank" rel="noopener noreferrer">
                    <GithubOutlined style={{ marginRight: 6 }} />
                    {candidate.githubUrl}
                  </a>
                ) : (
                  '—'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Portfolio / Website">
                {candidate.portfolioUrl ? (
                  <a href={candidate.portfolioUrl} target="_blank" rel="noopener noreferrer">
                    <LinkOutlined style={{ marginRight: 6 }} />
                    {candidate.portfolioUrl}
                  </a>
                ) : (
                  '—'
                )}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      {/* Section F: Resume / Curriculum Vitae */}
      <Card
        title={
          <Space>
            <FilePdfOutlined style={{ color: '#ff4d4f' }} />
            <span>{t('candidates.sectionF', 'Section F — Curriculum Vitae / Resume')}</span>
          </Space>
        }
        variant="borderless"
        style={{ marginBottom: 24 }}
      >
        {candidate.resumeFileName || candidate.resumeUrl ? (
          <Space size={16} align="center" wrap>
            <FilePdfOutlined style={{ fontSize: 32, color: '#ff4d4f' }} />
            <div>
              <Text strong style={{ fontSize: 15, display: 'block' }}>
                {candidate.resumeFileName || 'Candidate_Resume.pdf'}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {candidate.resumeMimeType || 'application/pdf'} &bull; Verified format
              </Text>
            </div>
            <Space>
              <Button
                icon={<EyeOutlined />}
                onClick={handlePreviewResume}
                loading={loadingPreview}
              >
                {t('candidates.previewResume', 'Preview Document')}
              </Button>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleDownloadResume}
                loading={downloadingResume}
              >
                {t('candidates.downloadResume', 'Download Document')}
              </Button>
            </Space>
          </Space>
        ) : (
          <Text type="secondary">
            {t('candidates.noResume', 'No resume document has been uploaded yet for this candidate.')}
          </Text>
        )}
      </Card>

      {/* Section G: Job Applications & Pipeline History */}
      <Card
        title={
          <Space>
            <CheckCircleOutlined style={{ color: brandTokens.primary }} />
            <span>
              {t('candidates.sectionG', 'Section G — Applications & Recruitment History')} (
              {candidate.applications?.length || 0})
            </span>
          </Space>
        }
        variant="borderless"
      >
        <Table
          columns={applicationColumns}
          dataSource={candidate.applications || []}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: t('candidates.noApplications', 'Candidate has not submitted any job applications yet.') }}
        />
      </Card>

      {/* Edit Profile Modal */}
      <Modal
        title={t('candidates.editProfileTitle', 'Edit Candidate 360° Profile')}
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        footer={null}
        width={760}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleEditSubmit}>
          <Divider orientation="left">{t('candidates.companyAssociation', 'Company Association')}</Divider>
          <Form.Item
            label={t('candidates.company', 'Associated Company')}
            name="companyId"
            tooltip={t('candidates.companyTooltip', 'Select company to associate this candidate with, or clear to place in shared talent pool.')}
          >
            <Select
              allowClear
              showSearch
              placeholder={t('candidates.selectCompany', 'Select company (optional)...')}
              loading={loadingCompanies}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={companies.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
              notFoundContent={
                loadingCompanies
                  ? t('common.loading', 'Loading companies...')
                  : t('candidates.noCompaniesFound', 'No active companies found.')
              }
            />
          </Form.Item>

          <Divider orientation="left">{t('candidates.personalInfo', 'Personal Information')}</Divider>
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item label={t('candidates.firstName', 'First Name')} name="firstName" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label={t('candidates.middleName', 'Middle Name')} name="middleName">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label={t('candidates.lastName', 'Last Name')} name="lastName" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label={t('candidates.phone', 'Phone Number')} name="phone">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label={t('candidates.alternateMobile', 'Alternate Mobile')} name="alternateMobile">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item label={t('candidates.dateOfBirth', 'Date of Birth')} name="dateOfBirth">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label={t('candidates.gender', 'Gender')} name="gender">
                <Select allowClear>
                  <Option value="MALE">Male</Option>
                  <Option value="FEMALE">Female</Option>
                  <Option value="DIVERSE">Diverse / Non-binary</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label={t('candidates.nationality', 'Nationality')} name="nationality">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">{t('candidates.addressDetails', 'Address Details')}</Divider>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label={t('candidates.addressLine1', 'Address Line 1')} name="addressLine1">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label={t('candidates.city', 'City')} name="city">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item label={t('candidates.state', 'State')} name="state">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label={t('candidates.postalCode', 'Postal Code')} name="postalCode">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label={t('candidates.country', 'Country')} name="country">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">{t('candidates.professionalDetails', 'Professional Details')}</Divider>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label={t('candidates.currentJobTitle', 'Current Job Title')} name="currentJobTitle">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label={t('candidates.currentCompany', 'Current Company')} name="currentCompany">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item label={t('candidates.experienceYears', 'Years of Experience')} name="yearsOfExperience">
                <InputNumber min={0} max={60} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label={t('candidates.noticePeriodDays', 'Notice Period (Days)')} name="noticePeriodDays">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label={t('candidates.expectedSalary', 'Expected Salary (€)')} name="expectedSalary">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label={t('candidates.headline', 'Professional Headline')} name="headline">
            <Input />
          </Form.Item>

          <Form.Item label={t('candidates.summary', 'Professional Summary')} name="summary">
            <TextArea rows={3} />
          </Form.Item>

          <Divider orientation="left">{t('candidates.workAuthOnline', 'Work Auth & Online Profiles')}</Divider>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label={t('candidates.workPermitAuthorized', 'Authorized to Work in Location')}
                name="workPermitAuthorized"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label={t('candidates.visaStatus', 'Visa Status')} name="visaStatus">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label={t('candidates.passportNumber', 'Passport Number')} name="passportNumber">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label={t('candidates.passportExpiryDate', 'Passport Expiry Date')} name="passportExpiryDate">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item label="LinkedIn URL" name="linkedinUrl">
                <Input placeholder="https://linkedin.com/in/..." />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="GitHub URL" name="githubUrl">
                <Input placeholder="https://github.com/..." />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Portfolio URL" name="portfolioUrl">
                <Input placeholder="https://..." />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ textAlign: 'right', marginTop: 24 }}>
            <Space>
              <Button onClick={() => setEditModalOpen(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type="primary" htmlType="submit" loading={submittingEdit}>
                {t('common.saveChanges', 'Save Changes')}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Resume Document Preview Modal */}
      <Modal
        title={
          <Space>
            <FilePdfOutlined style={{ color: '#ff4d4f' }} />
            <span>{candidate?.resumeFileName || 'Resume Document Preview'}</span>
          </Space>
        }
        open={previewModalOpen}
        onCancel={handleClosePreview}
        footer={[
          <Button key="close" onClick={handleClosePreview}>
            {t('common.close', 'Close')}
          </Button>,
          <Button
            key="download"
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleDownloadResume}
            loading={downloadingResume}
          >
            {t('candidates.downloadResume', 'Download')}
          </Button>,
        ]}
        width={900}
        destroyOnHidden
      >
        {previewBlobUrl ? (
          <iframe
            src={previewBlobUrl}
            title="Resume Preview"
            style={{ width: '100%', height: '70vh', border: '1px solid #e8e8e8', borderRadius: 4 }}
          />
        ) : (
          <Skeleton active />
        )}
      </Modal>
    </div>
  );
}

export default CandidateDetailsPage;
