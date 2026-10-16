import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Tag,
  Button,
  Space,
  Typography,
  Descriptions,
  Tabs,
  Table,
  Badge,
  Input,
  Select,
  Modal,
  App,
  Spin,
  Alert,
  Tooltip,
  Popconfirm,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  StopOutlined,
  ClockCircleOutlined,
  SearchOutlined,
  ReloadOutlined,
  FileTextOutlined,
  DownloadOutlined,
  EyeOutlined,
  UserOutlined,
  BankOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { jobsApi } from '../../services/jobsApi.js';
import { brandTokens } from '../../theme/tokens.js';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

export function JobDetailsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const { message, modal } = App.useApp();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTabKey, setActiveTabKey] = useState('overview');

  // Applicants state
  const [applicants, setApplicants] = useState([]);
  const [applicantsLoading, setApplicantsLoading] = useState(false);
  const [applicantSearch, setApplicantSearch] = useState('');
  const [applicantStatusFilter, setApplicantStatusFilter] = useState('');
  const [applicantPagination, setApplicantPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  // Cover Letter Modal
  const [coverLetterModalOpen, setCoverLetterModalOpen] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState(null);

  // Moderation state
  const [moderationModalOpen, setModerationModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState(null);
  const [moderationReason, setModerationReason] = useState('');
  const [submittingModeration, setSubmittingModeration] = useState(false);

  // Fetch Job details
  const fetchJob = useCallback(async () => {
    setLoading(true);
    try {
      const res = await jobsApi.getJob(id);
      setJob(res.data || res);
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to load job';
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  }, [id, message]);

  // Fetch Applicants
  const fetchApplicants = useCallback(async () => {
    if (!id) return;
    setApplicantsLoading(true);
    try {
      const params = {
        page: applicantPagination.current,
        limit: applicantPagination.pageSize,
        ...(applicantSearch.trim() ? { search: applicantSearch.trim() } : {}),
        ...(applicantStatusFilter ? { status: applicantStatusFilter } : {}),
      };
      const res = await jobsApi.getJobApplicants(id, params);
      const items = res.items || res.data || [];
      setApplicants(items);
      if (res.pagination) {
        setApplicantPagination((prev) => ({
          ...prev,
          total: res.pagination.total || 0,
        }));
      }
    } catch (err) {
      // non-blocking
    } finally {
      setApplicantsLoading(false);
    }
  }, [id, applicantPagination.current, applicantPagination.pageSize, applicantSearch, applicantStatusFilter]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  useEffect(() => {
    if (activeTabKey === 'applicants') {
      fetchApplicants();
    }
  }, [activeTabKey, fetchApplicants]);

  // Moderation handlers
  const handleOpenModeration = (status) => {
    setTargetStatus(status);
    setModerationReason('');
    setModerationModalOpen(true);
  };

  const handleConfirmModeration = async () => {
    if (!targetStatus) return;
    setSubmittingModeration(true);
    try {
      await jobsApi.updateJobStatus(id, {
        status: targetStatus,
        reason: moderationReason.trim() || undefined,
      });
      message.success(t('jobs.messages.statusUpdateSuccess'));
      setModerationModalOpen(false);
      fetchJob();
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Status change failed';
      message.error(errMsg);
    } finally {
      setSubmittingModeration(false);
    }
  };

  const handleArchiveJob = () => {
    modal.confirm({
      title: t('jobs.actions.archive'),
      content: `Are you sure you want to archive job "${job?.title}"?`,
      okText: t('common.submit'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await jobsApi.deleteJob(id);
          message.success(t('jobs.messages.deleteSuccess'));
          navigate('/admin/jobs');
        } catch (err) {
          const errMsg = err.response?.data?.message || err.message || 'Failed to archive job';
          message.error(errMsg);
        }
      },
    });
  };

  // Status Badge Helper
  const getStatusTag = (status) => {
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

  // Scope Tag Helper
  const getScopeTag = (scope) => {
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

  // Applicant columns
  const applicantColumns = [
    {
      title: t('jobs.applicantsTab.candidate'),
      key: 'candidate',
      render: (_, record) => {
        const c = record.candidate;
        return (
          <div>
            <div style={{ fontWeight: 600 }}>
              {c ? `${c.firstName || ''} ${c.lastName || ''}`.trim() : 'Candidate'}
            </div>
            {c?.headline && <div style={{ fontSize: 12, color: '#64748b' }}>{c.headline}</div>}
          </div>
        );
      },
    },
    {
      title: t('jobs.applicantsTab.email'),
      key: 'email',
      render: (_, record) => record.candidate?.email || '—',
    },
    {
      title: t('jobs.applicantsTab.phone'),
      key: 'phone',
      render: (_, record) => record.candidate?.phone || '—',
    },
    {
      title: t('jobs.applicantsTab.appliedAt'),
      dataIndex: 'appliedAt',
      key: 'appliedAt',
      render: (val) => (val ? new Date(val).toLocaleDateString() : '—'),
    },
    {
      title: t('jobs.applicantsTab.stage'),
      key: 'stage',
      render: (_, record) => {
        const stageName = record.currentStage?.name;
        return stageName ? <Tag color="blue">{stageName}</Tag> : <Tag>Applied</Tag>;
      },
    },
    {
      title: t('jobs.applicantsTab.status'),
      dataIndex: 'status',
      key: 'status',
      render: (st) => {
        let color = 'default';
        if (st === 'HIRED' || st === 'ACCEPTED') color = 'success';
        if (st === 'REJECTED') color = 'error';
        if (st === 'SHORTLISTED' || st === 'INTERVIEW') color = 'processing';
        return <Tag color={color}>{st || 'SUBMITTED'}</Tag>;
      },
    },
    {
      title: t('jobs.applicantsTab.coverLetter'),
      key: 'coverLetter',
      render: (_, record) => {
        if (!record.coverLetter) return <Text type="secondary">—</Text>;
        return (
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedApplicant(record);
              setCoverLetterModalOpen(true);
            }}
          >
            {t('jobs.applicantsTab.viewCoverLetter')}
          </Button>
        );
      },
    },
    {
      title: t('jobs.applicantsTab.resume'),
      key: 'resume',
      render: (_, record) => {
        const resumeUrl = record.resumeUrl || record.candidate?.resumeUrl;
        if (!resumeUrl) return <Text type="secondary">—</Text>;
        return (
          <Button
            size="small"
            type="link"
            icon={<DownloadOutlined />}
            href={resumeUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {record.candidate?.resumeFileName || 'Resume'}
          </Button>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!job) {
    return (
      <Alert
        type="error"
        message="Job posting not found"
        description="The requested job posting may have been deleted or does not exist."
      />
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 4px 40px 4px' }}>
      {/* Top Navigation & Profile Header */}
      <Card variant="outlined" style={{ marginBottom: 20 }} styles={{ body: { padding: '20px 24px' } }}>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col xs={24} md={16}>
            <Space align="start" size={16}>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/jobs')} />
              <div>
                <Space align="center" size={8} wrap>
                  <Title level={3} style={{ margin: 0, color: brandTokens.navy }}>
                    {job.title}
                  </Title>
                  {job.jobCode && <Tag style={{ fontWeight: 600 }}>{job.jobCode}</Tag>}
                  {getStatusTag(job.status)}
                  {job.deletedAt && (
                    <Tag color="volcano" style={{ fontWeight: 600 }}>
                      In Trash ({new Date(job.deletedAt).toLocaleDateString()})
                    </Tag>
                  )}
                  {getScopeTag(job.hiringScope)}
                </Space>
                <div style={{ marginTop: 6 }}>
                  <Text type="secondary">
                    Company:{' '}
                    <Link
                      to={`/admin/companies/${job.companyId}`}
                      style={{ fontWeight: 600, color: brandTokens.teal }}
                    >
                      {job.company?.name || 'Company'}
                    </Link>
                    {' • '}
                    {job.city && job.country ? `${job.city}, ${job.country} • ` : ''}
                    {job.workArrangement || job.workplaceType || 'ON_SITE'}
                  </Text>
                </div>
              </div>
            </Space>
          </Col>

          {/* Action Buttons */}
          <Col xs={24} md={8} style={{ textAlign: 'right' }}>
            <Space wrap>
              {!job.deletedAt && (
                <Button
                  icon={<EditOutlined />}
                  onClick={() => navigate(`/admin/jobs/${id}/edit`)}
                >
                  {t('jobs.actions.edit')}
                </Button>
              )}

              {/* Status Moderation */}
              {!job.deletedAt && (job.status === 'DRAFT' || job.status === 'CLOSED') ? (
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleOpenModeration('PUBLISHED')}
                  style={{ backgroundColor: '#16a34a', borderColor: '#16a34a' }}
                >
                  {t('jobs.actions.publish')}
                </Button>
              ) : null}

              {!job.deletedAt && job.status === 'PUBLISHED' ? (
                <>
                  <Button
                    icon={<ClockCircleOutlined />}
                    onClick={() => handleOpenModeration('DRAFT')}
                  >
                    {t('jobs.actions.suspend')}
                  </Button>
                  <Button
                    danger
                    icon={<StopOutlined />}
                    onClick={() => handleOpenModeration('CLOSED')}
                  >
                    {t('jobs.actions.close')}
                  </Button>
                </>
              ) : null}

              {job.deletedAt ? (
                <Popconfirm
                  title={t('jobs.restoreTitle', 'Restore Job?')}
                  description={`Restore "${job.title}" back to Active Jobs (Draft status)?`}
                  onConfirm={async () => {
                    try {
                      const res = await jobsApi.restoreJob(job.id);
                      message.success(res.message || 'Job restored successfully.');
                      fetchJob();
                    } catch (err) {
                      const errMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Restore failed';
                      message.error(errMsg);
                    }
                  }}
                  okText="Restore"
                  cancelText="Cancel"
                >
                  <Button
                    type="primary"
                    style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                  >
                    Restore from Trash
                  </Button>
                </Popconfirm>
              ) : (
                job.status !== 'ARCHIVED' && (
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={handleArchiveJob}
                  >
                    {t('jobs.actions.archive')}
                  </Button>
                )
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Main Tabs */}
      <Tabs
        activeKey={activeTabKey}
        onChange={setActiveTabKey}
        items={[
          {
            key: 'overview',
            label: (
              <span>
                <FileTextOutlined style={{ marginRight: 6 }} />
                {t('jobs.jobDetails')}
              </span>
            ),
            children: (
              <div>
                {/* Basic & Organization Card */}
                <Card title="Organization & Roles" variant="outlined" style={{ marginBottom: 20 }}>
                  <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }}>
                    <Descriptions.Item label={t('jobs.fields.company')}>
                      <Link to={`/admin/companies/${job.companyId}`}>
                        {job.company?.name}
                      </Link>
                    </Descriptions.Item>
                    <Descriptions.Item label={t('jobs.fields.industry')}>
                      {job.industry?.name || '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label={t('jobs.employmentType.title')}>
                      {t(`jobs.employmentType.${job.employmentType}`, job.employmentType)}
                    </Descriptions.Item>
                    <Descriptions.Item label={t('jobs.fields.department')}>
                      {job.department || '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label={t('jobs.fields.profession')}>
                      {job.profession || '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label={t('jobs.fields.openings')}>
                      {job.openings ?? 1}
                    </Descriptions.Item>
                    <Descriptions.Item label={t('jobs.fields.targetJoiningDate')}>
                      {job.targetJoiningDate ? new Date(job.targetJoiningDate).toLocaleDateString() : '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label={t('jobs.fields.keywords')}>
                      {Array.isArray(job.keywords) && job.keywords.length > 0 ? (
                        <Space wrap size={4}>
                          {job.keywords.map((k, i) => (
                            <Tag key={i}>{k}</Tag>
                          ))}
                        </Space>
                      ) : (
                        '—'
                      )}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>

                {/* Compensation & Experience Card */}
                <Card title="Compensation & Experience" variant="outlined" style={{ marginBottom: 20 }}>
                  <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }}>
                    <Descriptions.Item label={t('jobs.fields.compensationType')}>
                      {job.compensationType || 'ANNUAL'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Salary Range">
                      {job.minSalary != null && job.maxSalary != null
                        ? `${Number(job.minSalary).toLocaleString()} – ${Number(job.maxSalary).toLocaleString()} ${job.currency || 'EUR'}`
                        : 'Not disclosed'}
                    </Descriptions.Item>
                    <Descriptions.Item label={t('jobs.fields.salaryNegotiable')}>
                      {job.salaryNegotiable ? 'Yes' : 'No'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Experience Range">
                      {`${job.minExperience ?? 0} – ${job.maxExperience ?? 5} years`}
                    </Descriptions.Item>
                    <Descriptions.Item label={t('jobs.fields.maxApplicantsLimit')}>
                      {job.maxApplicantsLimit ? `${job.maxApplicantsLimit} applicants` : 'Unlimited'}
                    </Descriptions.Item>
                    <Descriptions.Item label={t('jobs.fields.autoCloseOnLimit')}>
                      {job.autoCloseOnLimit ? 'Yes' : 'No'}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>

                {/* Location & Languages Card */}
                <Card title="Workplace, Location & Languages" variant="outlined" style={{ marginBottom: 20 }}>
                  <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }}>
                    <Descriptions.Item label={t('jobs.fields.workplaceType')}>
                      {job.workArrangement || job.workplaceType || 'ON_SITE'}
                    </Descriptions.Item>
                    <Descriptions.Item label={t('jobs.fields.country')}>
                      {job.country || 'DE'}
                    </Descriptions.Item>
                    <Descriptions.Item label={t('jobs.fields.city')}>
                      {job.city || '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label={t('jobs.fields.address')}>
                      {job.address || '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label={t('jobs.fields.germanLevel')}>
                      <Tag color="cyan">{job.germanLevel || 'B2'}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label={t('jobs.fields.englishLevel')}>
                      {job.englishLevel ? <Tag color="blue">{job.englishLevel}</Tag> : 'Not specified'}
                    </Descriptions.Item>
                    {Array.isArray(job.otherLanguages) && job.otherLanguages.length > 0 && (
                      <Descriptions.Item label={t('jobs.fields.otherLanguages')} span={3}>
                        <Space wrap size={4}>
                          {job.otherLanguages.map((l, i) => (
                            <Tag key={i}>{l}</Tag>
                          ))}
                        </Space>
                      </Descriptions.Item>
                    )}
                  </Descriptions>
                </Card>

                {/* Description & Requirements Content */}
                <Card title={t('jobs.fields.jobDescription')} variant="outlined" style={{ marginBottom: 20 }}>
                  <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{job.description}</Paragraph>

                  {job.responsibilities && (
                    <>
                      <Title level={5} style={{ marginTop: 20 }}>{t('jobs.fields.responsibilities')}</Title>
                      <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{job.responsibilities}</Paragraph>
                    </>
                  )}

                  {job.requirements && (
                    <>
                      <Title level={5} style={{ marginTop: 20 }}>{t('jobs.fields.requirements')}</Title>
                      <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{job.requirements}</Paragraph>
                    </>
                  )}

                  {job.benefits && (
                    <>
                      <Title level={5} style={{ marginTop: 20 }}>{t('jobs.fields.benefits')}</Title>
                      <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{job.benefits}</Paragraph>
                    </>
                  )}
                </Card>
              </div>
            ),
          },
          {
            key: 'applicants',
            label: (
              <span>
                <UserOutlined style={{ marginRight: 6 }} />
                {t('jobs.applicants')} ({job._count?.applications || applicants.length || 0})
              </span>
            ),
            children: (
              <div>
                {/* Search & Filter Toolbar */}
                <Card variant="outlined" style={{ marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
                  <Row justify="space-between" align="middle" gutter={[12, 12]}>
                    <Col xs={24} md={16}>
                      <Space wrap size={10}>
                        <Input
                          placeholder="Search candidate name, email, phone..."
                          prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                          value={applicantSearch}
                          onChange={(e) => setApplicantSearch(e.target.value)}
                          onPressEnter={() => {
                            setApplicantPagination((p) => ({ ...p, current: 1 }));
                            fetchApplicants();
                          }}
                          style={{ width: 280 }}
                          allowClear
                        />
                        <Select
                          placeholder="Application Status"
                          value={applicantStatusFilter || undefined}
                          onChange={(val) => {
                            setApplicantStatusFilter(val || '');
                            setApplicantPagination((p) => ({ ...p, current: 1 }));
                          }}
                          style={{ width: 160 }}
                          allowClear
                        >
                          <Option value="SUBMITTED">SUBMITTED</Option>
                          <Option value="IN_REVIEW">IN_REVIEW</Option>
                          <Option value="SHORTLISTED">SHORTLISTED</Option>
                          <Option value="INTERVIEW">INTERVIEW</Option>
                          <Option value="OFFER">OFFER</Option>
                          <Option value="HIRED">HIRED</Option>
                          <Option value="REJECTED">REJECTED</Option>
                        </Select>
                        <Button icon={<ReloadOutlined />} onClick={fetchApplicants}>
                          {t('common.retry', 'Refresh')}
                        </Button>
                      </Space>
                    </Col>
                  </Row>
                </Card>

                {/* Applicants Table */}
                <Table
                  columns={applicantColumns}
                  dataSource={applicants}
                  rowKey="id"
                  loading={applicantsLoading}
                  pagination={{
                    current: applicantPagination.current,
                    pageSize: applicantPagination.pageSize,
                    total: applicantPagination.total,
                    onChange: (page, pageSize) => {
                      setApplicantPagination({ current: page, pageSize, total: applicantPagination.total });
                    },
                  }}
                  locale={{
                    emptyText: t('jobs.applicantsTab.noApplicants'),
                  }}
                />
              </div>
            ),
          },
        ]}
      />

      {/* Cover Letter Modal */}
      <Modal
        title={`Cover Letter: ${selectedApplicant?.candidate?.firstName || ''} ${selectedApplicant?.candidate?.lastName || ''}`}
        open={coverLetterModalOpen}
        onCancel={() => setCoverLetterModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setCoverLetterModalOpen(false)}>
            {t('jobs.applicantsTab.closeModal')}
          </Button>,
        ]}
      >
        <div style={{ marginTop: 12, maxHeight: 400, overflowY: 'auto' }}>
          <Paragraph style={{ whiteSpace: 'pre-wrap' }}>
            {selectedApplicant?.coverLetter || 'No cover letter provided.'}
          </Paragraph>
        </div>
      </Modal>

      {/* Moderation Status Modal */}
      <Modal
        title={`Moderation: Update status to ${targetStatus}`}
        open={moderationModalOpen}
        onOk={handleConfirmModeration}
        onCancel={() => setModerationModalOpen(false)}
        confirmLoading={submittingModeration}
        okText={t('common.submit')}
        cancelText={t('common.cancel')}
      >
        <div style={{ marginTop: 12 }}>
          <Text type="secondary">
            Provide an optional administrative note or reason for updating this job's status:
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
export default JobDetailsPage;
