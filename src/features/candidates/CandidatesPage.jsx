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
  App,
  Typography,
  Tooltip,
  Dropdown,
  Progress,
  Tabs,
  Form,
  InputNumber,
  Badge,
  Avatar,
  Alert,
  DatePicker,
  Upload,
  Switch,
  Divider,
  Spin,
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  UserOutlined,
  MoreOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StopOutlined,
  UndoOutlined,
  FileTextOutlined,
  EnvironmentOutlined,
  UploadOutlined,
  MailOutlined,
  BankOutlined,
  GlobalOutlined,
  IdcardOutlined,
  SafetyCertificateOutlined,
  LinkOutlined,
  FilePdfOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { DataTable } from '../../components/common/DataTable.jsx';
import { candidateApi } from '../../services/candidateApi.js';
import { companiesApi } from '../../services/companiesApi.js';
import { brandTokens } from '../../theme/tokens.js';

const { Text, Title, Paragraph } = Typography;
const { Option } = Select;

export function CandidatesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { message, modal } = App.useApp();

  const [activeTab, setActiveTab] = useState('active');
  const [candidates, setCandidates] = useState([]);
  const [counts, setCounts] = useState({
    all: 0,
    active: 0,
    pending: 0,
    inactive: 0,
    suspended: 0,
    trash: 0,
  });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  // Add Candidate Modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeFileList, setResumeFileList] = useState([]);
  const [resumeError, setResumeError] = useState(null);
  const [isParsingResume, setIsParsingResume] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [companiesError, setCompaniesError] = useState(null);
  const [resendingId, setResendingId] = useState(null);

  // Status Change Modal state
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [newStatus, setNewStatus] = useState('ACTIVE');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // State to automatically generate and synchronize Candidate Name
  const [autoCandidateName, setAutoCandidateName] = useState('');

  const updateCandidateName = (override = {}) => {
    const vals = { ...createForm.getFieldsValue(), ...override };
    const name = [vals.firstName, vals.middleName, vals.lastName]
      .map((s) => s?.trim())
      .filter(Boolean)
      .join(' ');
    setAutoCandidateName(name);
  };

  const handleFormValuesChange = (changedValues, allValues) => {
    if ('firstName' in changedValues || 'middleName' in changedValues || 'lastName' in changedValues) {
      const name = [allValues.firstName, allValues.middleName, allValues.lastName]
        .map((s) => s?.trim())
        .filter(Boolean)
        .join(' ');
      setAutoCandidateName(name);
    }
  };

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await candidateApi.getCandidates({
        page: pagination.current,
        limit: pagination.pageSize,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        inTrash: activeTab === 'trash',
      });

      if (res.success) {
        setCandidates(res.items || []);
        if (res.counts) setCounts(res.counts);
        if (res.pagination) {
          setPagination((prev) => ({
            ...prev,
            total: res.pagination.total,
          }));
        }
      }
    } catch (err) {
      message.error(err.response?.data?.error || t('common.error', 'Failed to load candidates.'));
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, search, statusFilter, activeTab, message, t]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  // Load active companies for company selector when Add Modal opens
  const fetchCompanies = useCallback(async () => {
    setLoadingCompanies(true);
    setCompaniesError(null);
    try {
      const res = await companiesApi.getCompanies({ limit: 100, status: 'ACTIVE' });
      const rawList = Array.isArray(res.data)
        ? res.data
        : (Array.isArray(res.items) ? res.items : (Array.isArray(res.data?.items) ? res.data.items : []));
      setCompanies(rawList);
    } catch (err) {
      const msg = err.response?.data?.error || t('candidates.failedToLoadCompanies', 'Failed to load companies.');
      setCompaniesError(msg);
      setCompanies([]);
    } finally {
      setLoadingCompanies(false);
    }
  }, [t]);

  useEffect(() => {
    if (addModalOpen) {
      fetchCompanies();
    }
  }, [addModalOpen, fetchCompanies]);

  const handleResumeSelect = async (file) => {
    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const validExts = ['.pdf', '.doc', '.docx'];
    const hasValidExt = validExts.some((ext) => file.name?.toLowerCase().endsWith(ext));

    if (!validTypes.includes(file.type) && !hasValidExt) {
      const errMsg = t('candidates.invalidResumeFormat', 'Only PDF, DOC, and DOCX documents are accepted.');
      message.error(errMsg);
      setResumeError(errMsg);
      return Upload.LIST_IGNORE;
    }
    if (file.size > 10 * 1024 * 1024) {
      const errMsg = t('candidates.resumeTooLarge', 'Resume file must be 10 MB or smaller.');
      message.error(errMsg);
      setResumeError(errMsg);
      return Upload.LIST_IGNORE;
    }

    setResumeFile(file);
    setResumeFileList([file]);
    setResumeError(null);

    // Automatically trigger resume parsing
    setIsParsingResume(true);
    try {
      const formData = new FormData();
      formData.append('resume', file);
      const parseRes = await candidateApi.parseResume(formData);

      if (parseRes?.parseSuccess && parseRes.extracted) {
        const currentVals = createForm.getFieldsValue();
        const toUpdate = {};
        const extracted = parseRes.extracted;

        const checkAndSet = (key, val) => {
          if (val !== undefined && val !== null && val !== '') {
            const cur = currentVals[key];
            if (cur === undefined || cur === null || cur === '' || (Array.isArray(cur) && cur.length === 0)) {
              toUpdate[key] = val;
            }
          }
        };

        checkAndSet('firstName', extracted.firstName);
        checkAndSet('middleName', extracted.middleName);
        checkAndSet('lastName', extracted.lastName);
        checkAndSet('email', extracted.email);
        checkAndSet('phone', extracted.phone);
        checkAndSet('alternateMobile', extracted.alternateMobile);
        if (extracted.profession) checkAndSet('profession', [extracted.profession]);
        checkAndSet('currentJobTitle', extracted.currentJobTitle);
        checkAndSet('currentCompany', extracted.currentCompany);
        checkAndSet('yearsOfExperience', extracted.yearsOfExperience);
        checkAndSet('preferredLocation', extracted.preferredLocation);
        checkAndSet('addressLine1', extracted.addressLine1);
        checkAndSet('city', extracted.city);
        checkAndSet('state', extracted.state);
        checkAndSet('country', extracted.country);
        checkAndSet('postalCode', extracted.postalCode);
        checkAndSet('linkedinUrl', extracted.linkedinUrl);
        checkAndSet('portfolioUrl', extracted.portfolioUrl);
        checkAndSet('githubUrl', extracted.githubUrl);

        if (Object.keys(toUpdate).length > 0) {
          createForm.setFieldsValue(toUpdate);
          updateCandidateName(toUpdate);
          message.success(
            parseRes.message ||
              t(
                'candidates.resumeAutoFillSuccess',
                'Resume parsed successfully! Empty form fields have been auto-filled.'
              )
          );
        }
      } else if (parseRes?.message) {
        message.info(parseRes.message);
      }
    } catch {
      message.info(
        t(
          'candidates.resumeParseNonFatal',
          'Could not automatically extract text from this document. You can still submit the resume and enter details manually.'
        )
      );
    } finally {
      setIsParsingResume(false);
    }

    return false;
  };

  const handleResumeRemove = () => {
    setResumeFile(null);
    setResumeFileList([]);
    setResumeError(null);
  };

  const handleTableChange = (newPagination) => {
    setPagination((prev) => ({
      ...prev,
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    }));
  };

  const handleCreateCandidate = async (values) => {
    if (!resumeFile) {
      const errMsg = t(
        'candidates.resumeRequired',
        'Resume document is required. Please upload a valid PDF, DOC, or DOCX resume (max 10MB).'
      );
      setResumeError(errMsg);
      message.error(errMsg);
      return;
    }

    setSubmittingCreate(true);
    try {
      const payload = { ...values };

      // Handle profession (tags mode returns an array or string)
      if (Array.isArray(values.profession)) {
        payload.profession = values.profession[0] || null;
      }
      if (values.dateOfBirth) {
        payload.dateOfBirth = dayjs(values.dateOfBirth).toISOString();
      }
      if (values.passportExpiryDate) {
        payload.passportExpiryDate = dayjs(values.passportExpiryDate).toISOString();
      }

      const formData = new FormData();
      Object.entries(payload).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          formData.append(k, v);
        }
      });
      formData.append('resume', resumeFile);
      const res = await candidateApi.createCandidate(formData, true);

      // Distinguish clearly between feedback outcomes
      if (res.alreadyExists) {
        if (res.alreadyActivated) {
          modal.info({
            title: t('candidates.accountAlreadyActiveTitle', 'Candidate Account Already Active'),
            content: (
              <div>
                <p>{res.message}</p>
                <p>
                  <strong>{t('candidates.fullName', 'Full Name')}:</strong> {res.candidate?.fullName}
                </p>
                <p>
                  <strong>{t('candidates.email', 'Email')}:</strong> {res.candidate?.email}
                </p>
                <p style={{ color: '#595959', marginTop: 8 }}>
                  {t(
                    'candidates.accountActiveNote',
                    'This candidate already has an active account. Existing credentials and permissions have been preserved, and no unsolicited activation link was dispatched.'
                  )}
                </p>
              </div>
            ),
            onOk: () => {
              if (res.candidate?.id) navigate(`/admin/candidates/${res.candidate.id}`);
            },
            okText: t('candidates.viewProfile', 'View 360° Profile'),
          });
        } else if (res.invitationSent) {
          modal.info({
            title: t('candidates.existingCandidateFoundTitle', 'Existing Candidate Profile Linked'),
            content: (
              <div>
                <p>{res.message}</p>
                <p>
                  <strong>{t('candidates.fullName', 'Full Name')}:</strong> {res.candidate?.fullName}
                </p>
                <p>
                  <strong>{t('candidates.email', 'Email')}:</strong> {res.candidate?.email}
                </p>
                <Tag color="success" style={{ marginTop: 8 }}>
                  {t('candidates.invitationPending', 'Activation invitation sent')}
                </Tag>
              </div>
            ),
            onOk: () => {
              if (res.candidate?.id) navigate(`/admin/candidates/${res.candidate.id}`);
            },
            okText: t('candidates.viewProfile', 'View 360° Profile'),
          });
        } else {
          modal.warning({
            title: t('candidates.existingCandidateEmailPendingTitle', 'Profile Linked — Email Pending Retry'),
            content: (
              <div>
                <p>{res.message}</p>
                <p>
                  <strong>{t('candidates.fullName', 'Full Name')}:</strong> {res.candidate?.fullName}
                </p>
                <p>
                  <strong>{t('candidates.email', 'Email')}:</strong> {res.candidate?.email}
                </p>
                <Alert
                  type="warning"
                  showIcon
                  message={t(
                    'candidates.emailFailedWarning',
                    'Candidate profile was updated, but the activation email could not be delivered. Status is set to Pending Retry. You can resend the invitation from the candidate actions.'
                  )}
                  style={{ marginTop: 12 }}
                />
              </div>
            ),
            onOk: () => {
              if (res.candidate?.id) navigate(`/admin/candidates/${res.candidate.id}`);
            },
            okText: t('candidates.viewProfile', 'View 360° Profile'),
          });
        }
      } else {
        if (res.invitationSent) {
          message.success(
            t(
              'candidates.createAndEmailSuccess',
              'Candidate profile created and account activation email sent successfully.'
            )
          );
        } else if (res.invitationStatus === 'PENDING_RETRY') {
          modal.warning({
            title: t('candidates.createdEmailFailedTitle', 'Candidate Created — Activation Email Failed'),
            content: (
              <div>
                <p>
                  {t(
                    'candidates.createdEmailFailedDesc',
                    'The candidate profile was saved successfully, but the account activation email could not be delivered. Status is set to Pending Retry. You can resend the invitation from the candidate actions.'
                  )}
                </p>
                <p>
                  <strong>{t('candidates.fullName', 'Full Name')}:</strong> {res.candidate?.fullName}
                </p>
                <p>
                  <strong>{t('candidates.email', 'Email')}:</strong> {res.candidate?.email}
                </p>
              </div>
            ),
            onOk: () => {
              if (res.candidate?.id) navigate(`/admin/candidates/${res.candidate.id}`);
            },
            okText: t('candidates.viewProfile', 'View 360° Profile'),
          });
        } else {
          message.success(t('candidates.createSuccess', 'Candidate profile created successfully in the shared talent pool.'));
        }
      }

      setAddModalOpen(false);
      createForm.resetFields();
      setResumeFile(null);
      setResumeFileList([]);
      fetchCandidates();
    } catch (err) {
      message.error(err.response?.data?.error || t('common.error', 'Failed to create candidate.'));
    } finally {
      setSubmittingCreate(false);
    }
  };

  const handleResendInvitation = async (candidate) => {
    setResendingId(candidate.id);
    try {
      const res = await candidateApi.resendInvitation(candidate.id);
      if (res.delivered) {
        message.success(t('candidates.resendSuccess', 'Account activation email successfully resent.'));
      } else {
        message.warning(
          t('candidates.emailFailedWarning', 'Activation email could not be delivered; status set to Pending Retry.')
        );
      }
      fetchCandidates();
    } catch (err) {
      message.error(err.response?.data?.error || t('candidates.resendFailed', 'Failed to resend activation email.'));
    } finally {
      setResendingId(null);
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedCandidate) return;
    setUpdatingStatus(true);
    try {
      await candidateApi.updateCandidateStatus(selectedCandidate.id, { status: newStatus });
      message.success(t('candidates.statusUpdated', 'Candidate status updated successfully.'));
      setStatusModalOpen(false);
      setSelectedCandidate(null);
      fetchCandidates();
    } catch (err) {
      message.error(err.response?.data?.error || t('common.error', 'Failed to update candidate status.'));
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDelete = (candidate, mode = 'MOVE_TO_TRASH') => {
    modal.confirm({
      title:
        mode === 'DELETE_PERMANENTLY'
          ? t('candidates.permanentDeleteTitle', 'Permanently delete candidate?')
          : t('candidates.moveToTrashTitle', 'Move candidate to trash?'),
      content:
        mode === 'DELETE_PERMANENTLY'
          ? t('candidates.permanentDeleteDesc', 'This candidate and all associated data will be permanently removed.')
          : t('candidates.moveToTrashDesc', 'The candidate profile will be deactivated and moved to trash.'),
      okText: mode === 'DELETE_PERMANENTLY' ? t('common.delete', 'Delete') : t('common.moveToTrash', 'Move to Trash'),
      okType: 'danger',
      cancelText: t('common.cancel', 'Cancel'),
      onOk: async () => {
        try {
          await candidateApi.deleteCandidate(candidate.id, mode);
          message.success(
            mode === 'DELETE_PERMANENTLY'
              ? t('candidates.permanentDeleteSuccess', 'Candidate permanently deleted.')
              : t('candidates.moveToTrashSuccess', 'Candidate moved to trash.')
          );
          fetchCandidates();
        } catch (err) {
          message.error(err.response?.data?.error || t('common.error', 'Action failed.'));
        }
      },
    });
  };

  const handleRestore = async (candidate) => {
    try {
      await candidateApi.restoreCandidate(candidate.id);
      message.success(t('candidates.restoreSuccess', 'Candidate restored from trash.'));
      fetchCandidates();
    } catch (err) {
      message.error(err.response?.data?.error || t('common.error', 'Failed to restore candidate.'));
    }
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

  const renderInvitationTag = (record) => {
    const status = record.invitationStatus || (record.user?.status === 'ACTIVE' ? 'ACCEPTED' : 'NONE');
    const map = {
      ACCEPTED: { color: 'green', text: t('candidates.invitationAccepted', 'Account Active') },
      PENDING: { color: 'blue', text: t('candidates.invitationPending', 'Invitation Sent') },
      PENDING_RETRY: { color: 'volcano', text: t('candidates.invitationPendingRetry', 'Pending Retry') },
      NONE: { color: 'default', text: t('candidates.invitationNone', 'Not Invited') },
    };
    const s = map[status] || { color: 'default', text: status };
    return <Tag color={s.color}>{s.text}</Tag>;
  };

  const getProgressColor = (percent) => {
    if (percent >= 80) return '#52c41a';
    if (percent >= 50) return '#faad14';
    return '#ff4d4f';
  };

  const columns = [
    {
      title: t('candidates.candidate', 'Candidate'),
      key: 'name',
      render: (_, record) => (
        <Space size={8}>
          <Avatar
            style={{ backgroundColor: brandTokens.primary || '#16313f' }}
            icon={<UserOutlined />}
          >
            {record.firstName?.[0]}
          </Avatar>
          <div>
            <Button
              type="link"
              style={{ padding: 0, fontWeight: 600, height: 'auto' }}
              onClick={() => navigate(`/admin/candidates/${record.id}`)}
            >
              {record.fullName || `${record.firstName} ${record.lastName}`}
            </Button>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.email}
              </Text>
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: t('candidates.associatedCompany', 'Company'),
      key: 'company',
      render: (_, record) => (
        record.company ? (
          <Space size={4}>
            <BankOutlined style={{ color: '#8c8c8c' }} />
            <span>{record.company.name}</span>
          </Space>
        ) : (
          <Text type="secondary">—</Text>
        )
      ),
    },
    {
      title: t('candidates.professionRole', 'Profession & Role'),
      key: 'profession',
      render: (_, record) => (
        <div>
          <Text strong>{record.currentJobTitle || record.profession || '—'}</Text>
          {record.currentCompany && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                @ {record.currentCompany}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: t('candidates.experience', 'Experience'),
      dataIndex: 'yearsOfExperience',
      key: 'yearsOfExperience',
      render: (years) => (years !== null && years !== undefined ? `${years} yrs` : '—'),
    },
    {
      title: t('candidates.location', 'Location'),
      key: 'location',
      render: (_, record) => (
        <Space size={4}>
          <EnvironmentOutlined style={{ color: '#8c8c8c' }} />
          <span>{[record.city, record.country].filter(Boolean).join(', ') || '—'}</span>
        </Space>
      ),
    },
    {
      title: t('candidates.profileCompletion', 'Profile Score'),
      dataIndex: 'profileCompletion',
      key: 'profileCompletion',
      render: (score) => (
        <Tooltip title={`${score}% completed`}>
          <div style={{ width: 100 }}>
            <Progress
              percent={score}
              size="small"
              strokeColor={getProgressColor(score)}
              format={(pct) => `${pct}%`}
            />
          </div>
        </Tooltip>
      ),
    },
    {
      title: t('candidates.status', 'Status'),
      dataIndex: 'status',
      key: 'status',
      render: (status) => renderStatusTag(status),
    },
    {
      title: t('candidates.invitationStatus', 'Invitation'),
      key: 'invitationStatus',
      render: (_, record) => renderInvitationTag(record),
    },
    {
      title: t('candidates.applications', 'Applications'),
      key: 'applicationsCount',
      align: 'center',
      render: (_, record) => (
        <Badge
          count={record._count?.applications || 0}
          showZero
          style={{ backgroundColor: (record._count?.applications || 0) > 0 ? '#108ee9' : '#d9d9d9' }}
        />
      ),
    },
    {
      title: t('common.actions', 'Actions'),
      key: 'actions',
      align: 'right',
      render: (_, record) => {
        if (activeTab === 'trash') {
          return (
            <Space>
              <Tooltip title={t('common.restore', 'Restore')}>
                <Button
                  size="small"
                  icon={<UndoOutlined />}
                  onClick={() => handleRestore(record)}
                >
                  {t('common.restore', 'Restore')}
                </Button>
              </Tooltip>
              <Tooltip title={t('common.deletePermanently', 'Delete Permanently')}>
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDelete(record, 'DELETE_PERMANENTLY')}
                />
              </Tooltip>
            </Space>
          );
        }

        const canResend =
          record.invitationStatus !== 'ACCEPTED' &&
          record.user?.status !== 'ACTIVE' &&
          !record.passwordHash;

        const items = [
          {
            key: 'view',
            label: t('candidates.view360', 'View 360° Profile'),
            icon: <EyeOutlined />,
            onClick: () => navigate(`/admin/candidates/${record.id}`),
          },
          {
            key: 'status',
            label: t('candidates.changeStatus', 'Change Status'),
            icon: <CheckCircleOutlined />,
            onClick: () => {
              setSelectedCandidate(record);
              setNewStatus(record.status);
              setStatusModalOpen(true);
            },
          },
          ...(canResend
            ? [
                {
                  key: 'resend',
                  label: t('candidates.resendInvitation', 'Resend Invitation'),
                  icon: <MailOutlined />,
                  disabled: resendingId === record.id,
                  onClick: () => handleResendInvitation(record),
                },
              ]
            : []),
          {
            type: 'divider',
          },
          {
            key: 'trash',
            label: t('common.moveToTrash', 'Move to Trash'),
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => handleDelete(record, 'MOVE_TO_TRASH'),
          },
        ];

        return (
          <Space>
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/admin/candidates/${record.id}`)}
            />
            <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
              <Button type="text" size="small" icon={<MoreOutlined />} />
            </Dropdown>
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <Title level={2} style={{ margin: 0 }}>
            {t('candidates.title', 'Candidate Talent Pool')}
          </Title>
          <Text type="secondary">
            {t('candidates.subtitle', 'Manage shared candidate records, 360° profiles, and application histories.')}
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchCandidates} loading={loading}>
            {t('common.refresh', 'Refresh')}
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setAddModalOpen(true)}
            style={{ backgroundColor: brandTokens.primary }}
          >
            {t('candidates.addCandidate', 'Add Candidate')}
          </Button>
        </Space>
      </div>

      {/* Metric Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} md={4}>
          <Card variant="borderless" styles={{ body: { padding: 16 } }}>
            <Statistic
              title={t('candidates.statTotal', 'Total')}
              value={counts.all}
              prefix={<UserOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={5}>
          <Card variant="borderless" styles={{ body: { padding: 16 } }}>
            <Statistic
              title={t('candidates.statActive', 'Active')}
              value={counts.active}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={5}>
          <Card variant="borderless" styles={{ body: { padding: 16 } }}>
            <Statistic
              title={t('candidates.statPending', 'Pending Approval')}
              value={counts.pending}
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={5}>
          <Card variant="borderless" styles={{ body: { padding: 16 } }}>
            <Statistic
              title={t('candidates.statSuspended', 'Suspended')}
              value={counts.suspended}
              prefix={<StopOutlined style={{ color: '#ff4d4f' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={5}>
          <Card variant="borderless" styles={{ body: { padding: 16 } }}>
            <Statistic
              title={t('candidates.statTrash', 'Trash')}
              value={counts.trash}
              prefix={<DeleteOutlined style={{ color: '#8c8c8c' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Tab Switcher & Filter Toolbar */}
      <Card variant="borderless">
        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key);
            setPagination((prev) => ({ ...prev, current: 1 }));
          }}
          items={[
            {
              key: 'active',
              label: (
                <span>
                  <UserOutlined /> {t('candidates.tabActive', 'Active Talent Pool')} ({counts.all})
                </span>
              ),
            },
            {
              key: 'trash',
              label: (
                <span>
                  <DeleteOutlined /> {t('candidates.tabTrash', 'Trash')} ({counts.trash})
                </span>
              ),
            },
          ]}
          style={{ marginBottom: 16 }}
        />

        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} md={12} lg={8}>
            <Input
              placeholder={t('candidates.searchPlaceholder', 'Search by name, email, profession, city...')}
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onPressEnter={() => {
                setPagination((prev) => ({ ...prev, current: 1 }));
                fetchCandidates();
              }}
              allowClear
            />
          </Col>
          {activeTab === 'active' && (
            <Col xs={24} sm={12} md={6}>
              <Select
                placeholder={t('candidates.filterStatus', 'Filter by status')}
                value={statusFilter || undefined}
                onChange={(val) => {
                  setStatusFilter(val || '');
                  setPagination((prev) => ({ ...prev, current: 1 }));
                }}
                allowClear
                style={{ width: '100%' }}
              >
                <Option value="ACTIVE">{t('candidates.statusActive', 'Active')}</Option>
                <Option value="PENDING_APPROVAL">{t('candidates.statusPending', 'Pending Approval')}</Option>
                <Option value="INACTIVE">{t('candidates.statusInactive', 'Inactive')}</Option>
                <Option value="SUSPENDED">{t('candidates.statusSuspended', 'Suspended')}</Option>
              </Select>
            </Col>
          )}
        </Row>

        {/* Data Table */}
        <DataTable
          columns={columns}
          dataSource={candidates}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
          }}
          onChange={handleTableChange}
        />
      </Card>

      {/* Add Candidate Modal */}
      <Modal
        title={
          <Space>
            <UserOutlined style={{ color: brandTokens.primary }} />
            <span>{t('candidates.addCandidate', 'Add Candidate')}</span>
          </Space>
        }
        open={addModalOpen}
        onCancel={() => {
          setAddModalOpen(false);
          createForm.resetFields();
          setResumeFile(null);
          setResumeFileList([]);
          setResumeError(null);
          setAutoCandidateName('');
        }}
        footer={null}
        width={840}
        destroyOnHidden
      >
        <div style={{ maxHeight: '74vh', overflowY: 'auto', paddingRight: 8 }}>
          <Form
            form={createForm}
            layout="vertical"
            onFinish={handleCreateCandidate}
            onValuesChange={handleFormValuesChange}
          >
            {/* 1. Modal title is "Add Candidate" above */}

            {/* 2. Resume Document */}
            <Form.Item
              label={t('candidates.resumeDocument', 'Resume Document')}
              required
              validateStatus={resumeError ? 'error' : undefined}
              help={resumeError || t('candidates.resumeUploadHint', 'Upload PDF, DOC, or DOCX (max. 10MB)')}
            >
              <Upload
                beforeUpload={handleResumeSelect}
                onRemove={handleResumeRemove}
                fileList={resumeFileList}
                maxCount={1}
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              >
                <Button icon={<UploadOutlined />} loading={isParsingResume}>
                  {isParsingResume
                    ? t('candidates.parsingResume', 'Extracting details from resume...')
                    : t('candidates.selectResume', 'Select Resume Document')}
                </Button>
              </Upload>
            </Form.Item>

            {/* 3. Company */}
            <Form.Item label={t('candidates.company', 'Company')} name="companyId">
              <Select
                placeholder={t('candidates.selectCompany', 'Select company (optional)')}
                allowClear
                loading={loadingCompanies}
                showSearch
                optionFilterProp="children"
                notFoundContent={
                  loadingCompanies ? (
                    <div style={{ textAlign: 'center', padding: 8 }}>
                      <Spin size="small" />
                    </div>
                  ) : companiesError ? (
                    <div style={{ padding: 8, textAlign: 'center' }}>
                      <Text type="danger">{companiesError}</Text>
                      <div style={{ marginTop: 4 }}>
                        <Button size="small" type="link" onClick={fetchCompanies}>
                          {t('common.retry', 'Retry')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '8px 12px', color: '#8c8c8c' }}>
                      {t('candidates.noCompaniesFound', 'No active companies found')}
                    </div>
                  )
                }
              >
                {companies.map((c) => (
                  <Option key={c.id} value={c.id}>
                    {c.name}
                  </Option>
                ))}
              </Select>
              {companiesError && (
                <Alert
                  type="error"
                  showIcon
                  message={companiesError}
                  action={
                    <Button size="small" onClick={fetchCompanies}>
                      {t('common.retry', 'Retry')}
                    </Button>
                  }
                  style={{ marginTop: 6 }}
                />
              )}
            </Form.Item>

            {/* 4. Candidate Name & 5. Profile Completion (%) */}
            <Row gutter={16}>
              <Col xs={24} sm={16}>
                <Form.Item label={t('candidates.candidateName', 'Candidate Name')}>
                  <Input
                    value={autoCandidateName || t('candidates.nameAutoGeneratedPlaceholder', '(Generated automatically from name fields)')}
                    disabled
                    style={{ backgroundColor: '#f5f5f5', color: '#1f1f1f', fontWeight: 600 }}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item label={t('candidates.profileCompletion', 'Profile Completion (%)')}>
                  <Input
                    value={t('candidates.serverCalculatedNotice', 'Server-calculated upon creation (0 - 100%)')}
                    disabled
                    style={{ backgroundColor: '#f5f5f5', color: '#8c8c8c' }}
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* 6. First Name, 7. Middle Name, 8. Last Name */}
            <Row gutter={16}>
              <Col xs={24} sm={8}>
                <Form.Item
                  label={t('candidates.firstName', 'First Name')}
                  name="firstName"
                  rules={[{ required: true, message: 'Please input first name' }]}
                >
                  <Input placeholder="Johann" onChange={(e) => updateCandidateName({ firstName: e.target.value })} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item label={t('candidates.middleName', 'Middle Name')} name="middleName">
                  <Input placeholder="Sebastian (optional)" onChange={(e) => updateCandidateName({ middleName: e.target.value })} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item
                  label={t('candidates.lastName', 'Last Name')}
                  name="lastName"
                  rules={[{ required: true, message: 'Please input last name' }]}
                >
                  <Input placeholder="Bach" onChange={(e) => updateCandidateName({ lastName: e.target.value })} />
                </Form.Item>
              </Col>
            </Row>

            {/* 9. Informational text: Candidate Name is automatically generated from the name fields */}
            <div style={{ marginBottom: 16, marginTop: -8 }}>
              <Text type="secondary" style={{ fontSize: 13, fontStyle: 'italic' }}>
                ℹ️ {t('candidates.nameAutoGeneratedHint', 'Candidate Name is automatically generated from the name fields.')}
              </Text>
            </div>

            {/* 10. Email Address */}
            <Form.Item
              label={t('candidates.email', 'Email Address')}
              name="email"
              rules={[
                { required: true, message: 'Please input email address' },
                { type: 'email', message: 'Please enter a valid email address' },
              ]}
            >
              <Input placeholder="johann.bach@leipzig.de" />
            </Form.Item>

            {/* 11. Mobile Number & 12. Alternate Mobile */}
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item label={t('candidates.phone', 'Mobile Number')} name="phone">
                  <Input placeholder="+49 151 12345678" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label={t('candidates.alternateMobile', 'Alternate Mobile')} name="alternateMobile">
                  <Input placeholder="+49 151 87654321" />
                </Form.Item>
              </Col>
            </Row>

            {/* 13. Date of Birth, 14. Gender, 15. Marital Status, 16. Nationality */}
            <Row gutter={16}>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label={t('candidates.dateOfBirth', 'Date of Birth')} name="dateOfBirth">
                  <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" placeholder="YYYY-MM-DD" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label={t('candidates.gender', 'Gender')} name="gender">
                  <Select placeholder="Select gender" allowClear>
                    <Option value="MALE">Male</Option>
                    <Option value="FEMALE">Female</Option>
                    <Option value="DIVERSE">Diverse</Option>
                    <Option value="PREFER_NOT_TO_SAY">Prefer not to say</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label={t('candidates.maritalStatus', 'Marital Status')} name="maritalStatus">
                  <Select placeholder="Select status" allowClear>
                    <Option value="SINGLE">Single</Option>
                    <Option value="MARRIED">Married</Option>
                    <Option value="DIVORCED">Divorced</Option>
                    <Option value="WIDOWED">Widowed</Option>
                    <Option value="OTHER">Other</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label={t('candidates.nationality', 'Nationality')} name="nationality">
                  <Input placeholder="German" />
                </Form.Item>
              </Col>
            </Row>

            {/* 17. Profession & 18. Employment Type */}
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item label={t('candidates.profession', 'Profession')} name="profession">
                  <Select
                    mode="tags"
                    maxCount={1}
                    placeholder={t('candidates.professionPlaceholder', 'Enter or select candidate profession')}
                    notFoundContent={
                      <div style={{ padding: '8px 12px', color: '#8c8c8c' }}>
                        {t(
                          'candidates.noProfessionsInCatalog',
                          'No professions available in reference catalog. Enter a custom profession.'
                        )}
                      </div>
                    }
                    allowClear
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label={t('candidates.employmentType', 'Employment Type')} name="employmentType">
                  <Select placeholder="Select employment type" allowClear>
                    <Option value="FULL_TIME">Full-Time</Option>
                    <Option value="PART_TIME">Part-Time</Option>
                    <Option value="CONTRACT">Contract</Option>
                    <Option value="FREELANCE">Freelance</Option>
                    <Option value="INTERNSHIP">Internship</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {/* 19. Current Job Title & 20. Current Company */}
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item label={t('candidates.currentJobTitle', 'Current Job Title')} name="currentJobTitle">
                  <Input placeholder="Director Musices / Senior Engineer" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label={t('candidates.currentCompany', 'Current Company')} name="currentCompany">
                  <Input placeholder="Thomaskirche Leipzig / Enterprise AG" />
                </Form.Item>
              </Col>
            </Row>

            {/* 21. Years of Experience & 22. Notice Period (Days) */}
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item label={t('candidates.experienceYears', 'Years of Experience')} name="yearsOfExperience">
                  <InputNumber min={0} max={60} style={{ width: '100%' }} placeholder="10" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label={t('candidates.noticePeriodDays', 'Notice Period (Days)')} name="noticePeriodDays">
                  <InputNumber min={0} max={365} style={{ width: '100%' }} placeholder="30" />
                </Form.Item>
              </Col>
            </Row>

            {/* 23. Current Salary & 24. Expected Salary */}
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item label={t('candidates.currentSalary', 'Current Salary')} name="currentSalary">
                  <InputNumber min={0} style={{ width: '100%' }} placeholder="75000" prefix="€" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label={t('candidates.expectedSalaryAmount', 'Expected Salary')} name="expectedSalary">
                  <InputNumber min={0} style={{ width: '100%' }} placeholder="90000" prefix="€" />
                </Form.Item>
              </Col>
            </Row>

            {/* 25. Preferred Location */}
            <Form.Item label={t('candidates.preferredLocation', 'Preferred Location')} name="preferredLocation">
              <Input placeholder="Leipzig / Munich / Remote" />
            </Form.Item>

            {/* 26. Source & 27. Candidate Status */}
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item label={t('candidates.source', 'Source')} name="source" initialValue="CAREER_PORTAL">
                  <Select>
                    <Option value="CAREER_PORTAL">{t('candidates.sourceCareerPortal', 'Career Portal')}</Option>
                    <Option value="ADMIN">{t('candidates.sourceAdmin', 'Admin Creation')}</Option>
                    <Option value="REFERRAL">{t('candidates.sourceReferral', 'Referral')}</Option>
                    <Option value="LINKEDIN">{t('candidates.sourceLinkedIn', 'LinkedIn')}</Option>
                    <Option value="OTHER">{t('candidates.sourceOther', 'Other')}</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label={t('candidates.status', 'Candidate Status')} name="status" initialValue="ACTIVE">
                  <Select>
                    <Option value="ACTIVE">{t('candidates.statusActive', 'Active')}</Option>
                    <Option value="PENDING_APPROVAL">{t('candidates.statusPending', 'Pending Approval')}</Option>
                    <Option value="INACTIVE">{t('candidates.statusInactive', 'Inactive')}</Option>
                    <Option value="SUSPENDED">{t('candidates.statusSuspended', 'Suspended')}</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {/* 28. Address Line 1 & 29. Address Line 2 */}
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item label={t('candidates.addressLine1', 'Address Line 1')} name="addressLine1">
                  <Input placeholder="Thomaskirchhof 18" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label={t('candidates.addressLine2', 'Address Line 2')} name="addressLine2">
                  <Input placeholder="Appartement 4B (optional)" />
                </Form.Item>
              </Col>
            </Row>

            {/* 30. City, 31. State, 32. Country, 33. Postal Code */}
            <Row gutter={16}>
              <Col xs={24} sm={6}>
                <Form.Item label={t('candidates.city', 'City')} name="city">
                  <Input placeholder="Leipzig" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={6}>
                <Form.Item label={t('candidates.state', 'State')} name="state">
                  <Input placeholder="Saxony" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={6}>
                <Form.Item label={t('candidates.country', 'Country')} name="country" initialValue="DE">
                  <Select>
                    <Option value="DE">Germany (DE)</Option>
                    <Option value="AT">Austria (AT)</Option>
                    <Option value="CH">Switzerland (CH)</Option>
                    <Option value="US">United States (US)</Option>
                    <Option value="GB">United Kingdom (GB)</Option>
                    <Option value="FR">France (FR)</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={6}>
                <Form.Item label={t('candidates.postalCode', 'Postal Code')} name="postalCode">
                  <Input placeholder="04109" />
                </Form.Item>
              </Col>
            </Row>

            {/* 34. Passport Number, 35. Passport Expiry Date, 36. Visa Status, 37. Work Permit Authorized */}
            <Row gutter={16}>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label={t('candidates.passportNumber', 'Passport Number')} name="passportNumber">
                  <Input placeholder="DE-9920192" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label={t('candidates.passportExpiryDate', 'Passport Expiry Date')} name="passportExpiryDate">
                  <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" placeholder="YYYY-MM-DD" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label={t('candidates.visaStatus', 'Visa Status')} name="visaStatus">
                  <Input placeholder="EU Citizen / Permanent" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  label={t('candidates.workPermitAuthorized', 'Work Permit Authorized')}
                  name="workPermitAuthorized"
                  valuePropName="checked"
                  initialValue={true}
                >
                  <Switch checkedChildren={t('common.yes', 'Yes')} unCheckedChildren={t('common.no', 'No')} />
                </Form.Item>
              </Col>
            </Row>

            {/* 38. LinkedIn Profile */}
            <Form.Item
              label={t('candidates.linkedinUrl', 'LinkedIn Profile')}
              name="linkedinUrl"
              rules={[{ type: 'url', message: 'Enter a valid URL' }]}
            >
              <Input placeholder="https://linkedin.com/in/bach" />
            </Form.Item>

            {/* 39. Portfolio URL */}
            <Form.Item
              label={t('candidates.portfolioUrl', 'Portfolio URL')}
              name="portfolioUrl"
              rules={[{ type: 'url', message: 'Enter a valid URL' }]}
            >
              <Input placeholder="https://bach-music.org" />
            </Form.Item>

            {/* 40. GitHub Profile */}
            <Form.Item
              label={t('candidates.githubUrl', 'GitHub Profile')}
              name="githubUrl"
              rules={[{ type: 'url', message: 'Enter a valid URL' }]}
            >
              <Input placeholder="https://github.com/bach" />
            </Form.Item>

            <div style={{ textAlign: 'right', marginTop: 24, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
              <Space>
                <Button
                  onClick={() => {
                    setAddModalOpen(false);
                    createForm.resetFields();
                    setResumeFile(null);
                    setResumeFileList([]);
                    setResumeError(null);
                    setAutoCandidateName('');
                  }}
                >
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button type="primary" htmlType="submit" loading={submittingCreate} style={{ backgroundColor: brandTokens.primary }}>
                  {t('candidates.saveCandidate', 'Save Candidate')}
                </Button>
              </Space>
            </div>
          </Form>
        </div>
      </Modal>

      {/* Change Status Modal */}
      <Modal
        title={t('candidates.changeStatusTitle', 'Update Candidate Status')}
        open={statusModalOpen}
        onCancel={() => {
          setStatusModalOpen(false);
          setSelectedCandidate(null);
        }}
        onOk={handleStatusUpdate}
        confirmLoading={updatingStatus}
        okText={t('common.update', 'Update Status')}
      >
        <p>
          {t('candidates.updatingStatusFor', 'Updating status for')}:{' '}
          <strong>{selectedCandidate?.fullName || selectedCandidate?.email}</strong>
        </p>
        <Select
          value={newStatus}
          onChange={setNewStatus}
          style={{ width: '100%', marginTop: 12 }}
        >
          <Option value="ACTIVE">{t('candidates.statusActive', 'Active')}</Option>
          <Option value="PENDING_APPROVAL">{t('candidates.statusPending', 'Pending Approval')}</Option>
          <Option value="INACTIVE">{t('candidates.statusInactive', 'Inactive')}</Option>
          <Option value="SUSPENDED">{t('candidates.statusSuspended', 'Suspended')}</Option>
        </Select>
      </Modal>
    </div>
  );
}

export default CandidatesPage;
