import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Tag,
  Button,
  Space,
  Typography,
  Input,
  Select,
  Modal,
  App,
  Spin,
  Alert,
  Tooltip,
  Dropdown,
  Timeline,
  Form,
  Badge,
  Empty,
  Divider,
  Tabs,
  Table,
} from 'antd';
import {
  ProjectOutlined,
  ReloadOutlined,
  SearchOutlined,
  EyeOutlined,
  DownloadOutlined,
  HistoryOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  BankOutlined,
  FileTextOutlined,
  LockOutlined,
  SwapOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  SettingOutlined,
  LinkOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { jobsApi } from '../../services/jobsApi.js';
import { usePermissions } from '../../hooks/usePermissions.js';
import { brandTokens, lightSemanticTokens, darkSemanticTokens } from '../../theme/tokens.js';
import { RecruitmentStagesPage } from '../configuration/RecruitmentStagesPage.jsx';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

// Stage category color mapping using design tokens
const getCategoryColor = (category) => {
  switch (category) {
    case 'APPLIED':
      return 'blue';
    case 'SCREENING':
      return 'cyan';
    case 'INTERVIEW':
      return 'purple';
    case 'OFFER':
      return 'gold';
    case 'HIRED':
      return 'green';
    case 'REJECTED':
      return 'red';
    default:
      return 'default';
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case 'HIRED':
    case 'ACCEPTED':
      return 'green';
    case 'REJECTED':
      return 'red';
    case 'INTERVIEW':
    case 'SHORTLISTED':
      return 'blue';
    case 'OFFER':
      return 'gold';
    default:
      return 'default';
  }
};

export function PipelinePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { jobId: routeJobId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { message } = App.useApp();
  const { can } = usePermissions();

  const isDarkMode = useSelector((state) => state.theme?.isDarkMode);
  const semantic = isDarkMode ? darkSemanticTokens : lightSemanticTokens;

  const canRead = can('APPLICATIONS', 'READ');
  const canEdit = can('APPLICATIONS', 'EDIT');

  // Active view tab: 'kanban' | 'list' | 'stages'
  const activeView = searchParams.get('view') || 'kanban';
  const setActiveView = (viewKey) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('view', viewKey);
      return next;
    });
  };

  // Job selection state
  const [jobsList, setJobsList] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(routeJobId || null);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [jobsError, setJobsError] = useState(null);

  // Pipeline state
  const [pipelineData, setPipelineData] = useState(null);
  const [loadingPipeline, setLoadingPipeline] = useState(false);
  const [pipelineError, setPipelineError] = useState(null);

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [listStageFilter, setListStageFilter] = useState('ALL');
  const [listStatusFilter, setListStatusFilter] = useState('ALL');

  // Transition Modal State
  const [transitionModalVisible, setTransitionModalVisible] = useState(false);
  const [selectedAppForTransition, setSelectedAppForTransition] = useState(null);
  const [destinationStage, setDestinationStage] = useState(null);
  const [transitionSubmitting, setTransitionSubmitting] = useState(false);
  const [transitionForm] = Form.useForm();

  // History Modal State
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [selectedAppForHistory, setSelectedAppForHistory] = useState(null);

  // Drag & Drop visual indicator
  const [dragOverStageId, setDragOverStageId] = useState(null);
  const [draggedApp, setDraggedApp] = useState(null);

  // 1. Fetch available jobs for dropdown
  const loadJobs = useCallback(async () => {
    setLoadingJobs(true);
    setJobsError(null);
    try {
      // Backend /api/jobs returns { success: true, items: [...], counts: {...}, pagination: {...} }
      const res = await jobsApi.getJobs({ limit: 100, page: 1, trashed: false });
      const list = Array.isArray(res) ? res : (res.items || res.data?.jobs || res.data || res.jobs || []);
      setJobsList(list);

      if (!routeJobId && list.length > 0) {
        // Auto-select first published or active job if no job specified in URL
        const initialJob = list.find((j) => j.status === 'PUBLISHED') || list[0];
        if (initialJob) {
          setSelectedJobId(initialJob.id);
        }
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || t('pipeline.jobsLoadError', 'Failed to load job openings');
      setJobsError(errMsg);
      message.error(errMsg);
    } finally {
      setLoadingJobs(false);
    }
  }, [routeJobId, message, t]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  // Keep route param in sync with selected job
  useEffect(() => {
    if (routeJobId && routeJobId !== selectedJobId) {
      setSelectedJobId(routeJobId);
    }
  }, [routeJobId, selectedJobId]);

  // 2. Fetch pipeline data for selected job
  const fetchPipeline = useCallback(async (jobIdToFetch, search = '') => {
    if (!jobIdToFetch) return;
    setLoadingPipeline(true);
    setPipelineError(null);
    try {
      const params = search.trim() ? { search: search.trim() } : {};
      const res = await jobsApi.getJobPipeline(jobIdToFetch, params);
      setPipelineData(res);

      // If active job not in jobsList yet, add it
      if (res.job && res.job.id) {
        setJobsList((prev) => {
          if (prev.some((j) => j.id === res.job.id)) return prev;
          return [res.job, ...prev];
        });
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to load recruitment pipeline';
      setPipelineError(errMsg);
      message.error(errMsg);
    } finally {
      setLoadingPipeline(false);
    }
  }, [message]);

  useEffect(() => {
    if (selectedJobId && canRead) {
      fetchPipeline(selectedJobId, searchQuery);
    }
  }, [selectedJobId, canRead, fetchPipeline]);

  // Handle switching job (prevent stale data retention)
  const handleJobChange = (newJobId) => {
    if (newJobId === selectedJobId) return;
    // Clear previous pipeline data immediately so stale candidates are never shown
    setPipelineData(null);
    setSelectedJobId(newJobId);
    const viewParam = activeView ? `?view=${activeView}` : '';
    navigate(`/admin/jobs/${newJobId}/pipeline${viewParam}`);
  };

  // Handle initiate transition modal
  const handleInitiateTransition = (app, targetStage) => {
    if (!canEdit) {
      message.warning('You do not have permission to change application stages.');
      return;
    }

    // Terminal state protection check
    const isTerminal =
      app.status === 'HIRED' ||
      app.status === 'REJECTED' ||
      app.currentStage?.category === 'HIRED' ||
      app.currentStage?.category === 'REJECTED';

    if (isTerminal) {
      message.warning(t('pipeline.terminalWarning', 'Applications in terminal states (Hired or Rejected) cannot be moved.'));
      return;
    }

    if (app.currentStageId === targetStage.id) {
      return; // Already in this stage
    }

    setSelectedAppForTransition(app);
    setDestinationStage(targetStage);
    transitionForm.resetFields();
    setTransitionModalVisible(true);
  };

  // Handle confirm stage transition
  const handleConfirmTransition = async () => {
    try {
      const values = await transitionForm.validateFields();
      if (!selectedAppForTransition || !destinationStage || !selectedJobId) return;

      setTransitionSubmitting(true);

      const payload = {
        destinationStageId: destinationStage.id,
        expectedPreviousStageId: selectedAppForTransition.currentStageId,
        reviewerNotes: values.notes?.trim() || null,
        rejectionReason: values.rejectionReason?.trim() || null,
      };

      const res = await jobsApi.updateApplicationStage(selectedJobId, selectedAppForTransition.id, payload);

      message.success(
        res.message ||
          t('pipeline.moveSuccess', { stage: destinationStage.name, defaultValue: `Application moved to "${destinationStage.name}" successfully` })
      );

      setTransitionModalVisible(false);
      setSelectedAppForTransition(null);
      setDestinationStage(null);

      // Refresh authoritative pipeline state
      await fetchPipeline(selectedJobId, searchQuery);
    } catch (err) {
      if (err.errorFields) return; // Antd form validation error

      if (err.response?.status === 409) {
        // Concurrency conflict detected
        message.error(
          err.response?.data?.message ||
            t('pipeline.conflictError', 'The candidate has already been moved to another stage. Refreshing pipeline...')
        );
        setTransitionModalVisible(false);
        // Immediately refresh state
        fetchPipeline(selectedJobId, searchQuery);
      } else {
        const errMsg = err.response?.data?.message || err.message || 'Failed to update application stage.';
        message.error(errMsg);
      }
    } finally {
      setTransitionSubmitting(false);
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e, app, stage) => {
    if (!canEdit) return;
    const isTerminal =
      app.status === 'HIRED' ||
      app.status === 'REJECTED' ||
      app.currentStage?.category === 'HIRED' ||
      app.currentStage?.category === 'REJECTED';
    if (isTerminal) {
      e.preventDefault();
      return;
    }
    setDraggedApp({ app, sourceStage: stage });
    e.dataTransfer.setData('text/plain', JSON.stringify({ appId: app.id, sourceStageId: stage.id }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, stageId) => {
    e.preventDefault();
    if (!canEdit) return;
    if (dragOverStageId !== stageId) {
      setDragOverStageId(stageId);
    }
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = (e, stageId) => {
    if (dragOverStageId === stageId) {
      setDragOverStageId(null);
    }
  };

  const handleDrop = (e, targetStage) => {
    e.preventDefault();
    setDragOverStageId(null);
    if (!canEdit || !draggedApp) return;

    const { app } = draggedApp;
    setDraggedApp(null);

    if (app.currentStageId === targetStage.id) {
      return;
    }

    handleInitiateTransition(app, targetStage);
  };

  // Filter columns and cards
  const stages = useMemo(() => {
    if (!pipelineData?.stages) return [];
    return pipelineData.stages;
  }, [pipelineData]);

  const activeJob = pipelineData?.job || jobsList.find((j) => j.id === selectedJobId);

  // Flatten applications across all stages for the List View
  const allApplications = useMemo(() => {
    if (!stages) return [];
    const list = [];
    stages.forEach((stage) => {
      const apps = stage.applications || stage.applicants || [];
      apps.forEach((app) => {
        list.push({
          ...app,
          stageName: stage.name,
          stageCategory: stage.category,
          stageId: stage.id,
          stageOrder: stage.order,
        });
      });
    });
    return list;
  }, [stages]);

  // Filtered applications for List View
  const filteredListApplications = useMemo(() => {
    return allApplications.filter((app) => {
      // Stage filter
      if (listStageFilter !== 'ALL' && app.stageId !== listStageFilter) {
        return false;
      }
      // Status filter
      if (listStatusFilter !== 'ALL' && app.status !== listStatusFilter) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const cand = app.candidate || {};
        const name = `${cand.firstName || ''} ${cand.lastName || ''}`.toLowerCase();
        const email = (cand.email || '').toLowerCase();
        const headline = (cand.headline || '').toLowerCase();
        const title = (cand.currentTitle || '').toLowerCase();
        return name.includes(query) || email.includes(query) || headline.includes(query) || title.includes(query);
      }
      return true;
    });
  }, [allApplications, listStageFilter, listStatusFilter, searchQuery]);

  // If user has no read permission
  if (!canRead) {
    return (
      <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 16px' }}>
        <Alert
          type="error"
          showIcon
          message="Access Restricted"
          description="You do not have permission to view the recruitment pipeline (APPLICATIONS: READ required)."
        />
      </div>
    );
  }

  // Columns definition for List View
  const listColumns = [
    {
      title: t('pipeline.list.candidate', 'Candidate Name'),
      key: 'candidate',
      render: (_, record) => {
        const candidate = record.candidate || {};
        const fullName =
          candidate.firstName || candidate.lastName
            ? `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim()
            : candidate.email || 'Candidate';
        return (
          <div>
            <Link
              to={`/admin/candidates/${candidate.id}`}
              style={{ fontWeight: 600, color: isDarkMode ? semantic.textPrimary : brandTokens.navy }}
            >
              {fullName}
            </Link>
            {candidate.email && (
              <div style={{ fontSize: 12, color: semantic.textSecondary }}>{candidate.email}</div>
            )}
          </div>
        );
      },
    },
    {
      title: t('pipeline.list.jobTitle', 'Job Title'),
      key: 'jobTitle',
      render: () => <Text strong>{activeJob?.title || '—'}</Text>,
    },
    {
      title: t('pipeline.list.stage', 'Current Stage'),
      key: 'stage',
      render: (_, record) => (
        <Tag color={getCategoryColor(record.stageCategory)} style={{ fontWeight: 500 }}>
          {record.stageName}
        </Tag>
      ),
    },
    {
      title: t('pipeline.list.status', 'Application Status'),
      key: 'status',
      render: (_, record) => (
        <Tag color={getStatusColor(record.status)}>{record.status || 'SUBMITTED'}</Tag>
      ),
    },
    {
      title: t('pipeline.list.appliedDate', 'Applied Date'),
      key: 'appliedAt',
      render: (_, record) => (
        <Text type="secondary" style={{ fontSize: 13 }}>
          {record.appliedAt ? new Date(record.appliedAt).toLocaleDateString() : '—'}
        </Text>
      ),
    },
    {
      title: t('pipeline.list.experience', 'Relevant Experience'),
      key: 'experience',
      render: (_, record) => {
        const candidate = record.candidate || {};
        return (
          <div style={{ fontSize: 12 }}>
            {candidate.yearsOfExperience !== undefined && candidate.yearsOfExperience !== null && (
              <div style={{ fontWeight: 500 }}>{candidate.yearsOfExperience} yrs exp</div>
            )}
            {(candidate.currentTitle || candidate.currentCompany) && (
              <div style={{ color: semantic.textSecondary }}>
                {candidate.currentTitle}
                {candidate.currentCompany ? ` • ${candidate.currentCompany}` : ''}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: t('pipeline.list.actions', 'Actions'),
      key: 'actions',
      render: (_, record) => {
        const candidate = record.candidate || {};
        const isTerminal =
          record.status === 'HIRED' ||
          record.status === 'REJECTED' ||
          record.stageCategory === 'HIRED' ||
          record.stageCategory === 'REJECTED';
        const resumeUrl = record.resumeUrl || candidate.resumeUrl;

        const moveMenuItems = stages
          .filter((s) => s.id !== record.currentStageId)
          .map((s) => ({
            key: s.id,
            label: (
              <span data-testid={`move-to-stage-${s.id}`}>
                <Space size={6}>
                  <ArrowRightOutlined style={{ fontSize: 11 }} />
                  <span>{s.name}</span>
                  {s.category && (
                    <Tag color={getCategoryColor(s.category)} style={{ margin: 0, fontSize: 10 }}>
                      {s.category}
                    </Tag>
                  )}
                </Space>
              </span>
            ),
            onClick: () => handleInitiateTransition(record, s),
          }));

        return (
          <Space size={8}>
            {resumeUrl && (
              <Tooltip title={t('pipeline.viewResume', 'View Resume')}>
                <Button
                  size="small"
                  type="text"
                  icon={<DownloadOutlined />}
                  href={resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              </Tooltip>
            )}

            <Tooltip title={t('pipeline.stageHistory', 'Stage History')}>
              <Button
                size="small"
                type="text"
                data-testid={`history-btn-${record.id}`}
                icon={<HistoryOutlined />}
                onClick={() => {
                  setSelectedAppForHistory(record);
                  setHistoryModalVisible(true);
                }}
              />
            </Tooltip>

            {isTerminal ? (
              <Tag icon={<LockOutlined />} color="default">
                Terminal
              </Tag>
            ) : canEdit ? (
              <Dropdown menu={{ items: moveMenuItems }} trigger={['click']} placement="bottomRight">
                <Button
                  size="small"
                  type="primary"
                  ghost
                  icon={<SwapOutlined />}
                  data-testid={`move-btn-${record.id}`}
                >
                  {t('pipeline.moveStage', 'Move')}
                </Button>
              </Dropdown>
            ) : null}
          </Space>
        );
      },
    },
  ];

  return (
    <div className="rt-fade-in" style={{ padding: '0 4px 32px 4px' }}>
      {/* Top Header Card: Title, Job Selector, Search, Refresh */}
      <Card
        variant="outlined"
        style={{
          marginBottom: 16,
          borderRadius: 12,
          border: `1px solid ${semantic.borderDefault}`,
          backgroundColor: semantic.bgCard,
        }}
        styles={{ body: { padding: '16px 20px' } }}
      >
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Space align="center" size={12} wrap>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  backgroundColor: isDarkMode ? 'rgba(79, 168, 192, 0.15)' : '#e0f2fe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: brandTokens.teal,
                  fontSize: 20,
                  flexShrink: 0,
                }}
              >
                <ProjectOutlined />
              </div>
              <div>
                <Space align="center" size={8}>
                  <Title level={4} style={{ margin: 0, color: isDarkMode ? semantic.textPrimary : brandTokens.navy }}>
                    {t('pipeline.title', 'Hiring Pipeline')}
                  </Title>
                  {pipelineData?.totalApplications !== undefined && (
                    <Badge
                      count={t('pipeline.totalApplicants', { count: pipelineData.totalApplications, defaultValue: `${pipelineData.totalApplications} applicants` })}
                      style={{ backgroundColor: brandTokens.teal }}
                    />
                  )}
                </Space>
                <div>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    {t('pipeline.subtitle', 'Track candidate progress and advance recruitment workflow stages.')}
                  </Text>
                </div>
              </div>
            </Space>
          </Col>

          {/* Controls: Job Selector, Search, Refresh, Job Details */}
          <Col xs={24} md={12} style={{ textAlign: 'right' }}>
            <Space wrap align="center">
              <Select
                showSearch
                style={{ minWidth: 260 }}
                placeholder={t('pipeline.selectJobPlaceholder', 'Search or choose a job opening...')}
                value={selectedJobId}
                onChange={handleJobChange}
                loading={loadingJobs}
                notFoundContent={
                  loadingJobs ? (
                    <div style={{ textAlign: 'center', padding: 12 }}>
                      <Spin size="small" />
                    </div>
                  ) : jobsError ? (
                    <div style={{ padding: '8px 12px', color: brandTokens.error }}>
                      {jobsError}
                      <div style={{ marginTop: 4 }}>
                        <Button size="small" type="link" onClick={loadJobs}>
                          {t('pipeline.retry', 'Retry')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <Text type="secondary">{t('pipeline.emptyJobs', 'No Job Openings Found')}</Text>
                    </div>
                  )
                }
                optionFilterProp="children"
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={jobsList.map((j) => ({
                  value: j.id,
                  label: `${j.title} (${j.company?.name || 'Company'})`,
                }))}
              />

              <Input
                placeholder={t('pipeline.searchPlaceholder', 'Search applicants...')}
                prefix={<SearchOutlined style={{ color: semantic.textSecondary }} />}
                style={{ width: 180 }}
                allowClear
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onPressEnter={() => fetchPipeline(selectedJobId, searchQuery)}
              />

              <Tooltip title={t('pipeline.refresh', 'Refresh')}>
                <Button
                  icon={<ReloadOutlined spin={loadingPipeline} />}
                  onClick={() => {
                    fetchPipeline(selectedJobId, searchQuery);
                    loadJobs();
                  }}
                  disabled={!selectedJobId || loadingPipeline}
                />
              </Tooltip>

              {activeJob && (
                <Tooltip title={t('pipeline.viewJobDetails', 'Job Details')}>
                  <Button
                    icon={<EyeOutlined />}
                    onClick={() => navigate(`/admin/jobs/${selectedJobId}`)}
                  />
                </Tooltip>
              )}
            </Space>
          </Col>
        </Row>

        {activeJob && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${semantic.borderSubtle}` }}>
            <Space size={16} wrap>
              <Text strong style={{ color: isDarkMode ? semantic.textPrimary : brandTokens.navy }}>
                {activeJob.title}
              </Text>
              {activeJob.company?.name && (
                <Text type="secondary">
                  <BankOutlined style={{ marginRight: 4 }} />
                  {activeJob.company.name}
                </Text>
              )}
              {activeJob.status && (
                <Tag color={activeJob.status === 'PUBLISHED' ? 'success' : 'default'}>
                  {activeJob.status}
                </Tag>
              )}
            </Space>
          </div>
        )}
      </Card>

      {/* Navigation Tabs: Kanban View, List View, Stages & Pipelines */}
      <Tabs
        activeKey={activeView}
        onChange={(key) => {
          setActiveView(key);
          if (key !== 'stages' && selectedJobId) {
            // Re-fetch pipeline to catch any stage configuration updates
            fetchPipeline(selectedJobId, searchQuery);
          }
        }}
        style={{ marginBottom: 16 }}
        items={[
          {
            key: 'kanban',
            label: (
              <span>
                <AppstoreOutlined />
                {t('pipeline.views.kanban', 'Kanban View')}
              </span>
            ),
          },
          {
            key: 'list',
            label: (
              <span>
                <UnorderedListOutlined />
                {t('pipeline.views.list', 'List View')}
                {allApplications.length > 0 && (
                  <Badge
                    count={allApplications.length}
                    style={{ marginLeft: 8, backgroundColor: isDarkMode ? brandTokens.navySoft : '#e2e8f0', color: isDarkMode ? '#fff' : brandTokens.navy }}
                  />
                )}
              </span>
            ),
          },
          {
            key: 'stages',
            label: (
              <span>
                <SettingOutlined />
                {t('pipeline.views.stages', 'Stages & Pipelines')}
              </span>
            ),
          },
        ]}
      />

      {/* View Content based on activeView */}
      {activeView === 'stages' ? (
        /* Stages & Pipelines View */
        <div>
          <Alert
            message={t('pipeline.stagesBannerTitle', 'Recruitment Stages Configuration')}
            description={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <span>
                  {t(
                    'pipeline.stagesBannerDesc',
                    'Define and reorder stages for the hiring pipeline. Stages configured here reflect dynamically across all jobs.'
                  )}
                </span>
                <Button
                  size="small"
                  icon={<LinkOutlined />}
                  onClick={() => navigate('/admin/configuration/recruitment-stages')}
                >
                  {t('pipeline.openFullConfiguration', 'Open in Platform Configuration')}
                </Button>
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <RecruitmentStagesPage />
        </div>
      ) : jobsError ? (
        /* Job List Load Error State */
        <Card
          variant="outlined"
          style={{
            borderRadius: 12,
            border: `1px solid ${semantic.borderDefault}`,
            backgroundColor: semantic.bgCard,
            textAlign: 'center',
            padding: '40px 20px',
          }}
        >
          <Alert
            type="error"
            showIcon
            message={t('pipeline.jobsLoadError', 'Failed to load job openings')}
            description={jobsError}
            style={{ marginBottom: 16 }}
          />
          <Button type="primary" icon={<ReloadOutlined />} onClick={loadJobs}>
            {t('pipeline.retryLoadJobs', 'Retry Loading Jobs')}
          </Button>
        </Card>
      ) : !loadingJobs && jobsList.length === 0 ? (
        /* Empty Jobs in Database State */
        <Card
          variant="outlined"
          style={{
            borderRadius: 12,
            border: `1px solid ${semantic.borderDefault}`,
            backgroundColor: semantic.bgCard,
            textAlign: 'center',
            padding: '60px 20px',
          }}
        >
          <Empty
            description={
              <div>
                <Title level={4}>{t('pipeline.emptyJobs', 'No Job Openings Found')}</Title>
                <Text type="secondary">{t('pipeline.emptyJobsDesc', 'There are currently no job openings in the system. Create a job posting to start managing candidate pipelines.')}</Text>
                <div style={{ marginTop: 20 }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/admin/jobs/new')}>
                    {t('pipeline.createJob', 'Create Job Opening')}
                  </Button>
                </div>
              </div>
            }
          />
        </Card>
      ) : pipelineError ? (
        /* Pipeline API Error State */
        <Card
          variant="outlined"
          style={{
            borderRadius: 12,
            border: `1px solid ${semantic.borderDefault}`,
            backgroundColor: semantic.bgCard,
            textAlign: 'center',
            padding: '40px 20px',
          }}
        >
          <Alert
            type="error"
            showIcon
            message="Error Loading Pipeline"
            description={pipelineError}
            style={{ marginBottom: 16 }}
          />
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={() => fetchPipeline(selectedJobId, searchQuery)}
          >
            {t('pipeline.retry', 'Retry')}
          </Button>
        </Card>
      ) : !selectedJobId ? (
        /* No Job Selected State */
        <Card
          variant="outlined"
          style={{
            borderRadius: 12,
            border: `1px solid ${semantic.borderDefault}`,
            backgroundColor: semantic.bgCard,
            textAlign: 'center',
            padding: '60px 20px',
          }}
        >
          <Empty
            description={
              <div>
                <Title level={4}>{t('pipeline.noJobSelected', 'No Job Selected')}</Title>
                <Text type="secondary">
                  {t('pipeline.noJobSelectedDesc', 'Please select a job opening above to view and manage its recruitment pipeline.')}
                </Text>
              </div>
            }
          />
        </Card>
      ) : loadingPipeline && !pipelineData ? (
        /* Loading Pipeline State */
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16, color: semantic.textSecondary }}>
            {t('common.loading', 'Loading recruitment pipeline...')}
          </div>
        </div>
      ) : stages.length === 0 ? (
        /* No Active Stages State */
        <Card
          variant="outlined"
          style={{
            borderRadius: 12,
            border: `1px solid ${semantic.borderDefault}`,
            backgroundColor: semantic.bgCard,
            textAlign: 'center',
            padding: '60px 20px',
          }}
        >
          <Empty
            description={
              <div>
                <Title level={4}>{t('pipeline.noStages', 'No Active Recruitment Stages')}</Title>
                <Text type="secondary">
                  {t('pipeline.noStagesDesc', 'Configure active recruitment stages in Platform Configuration to display the Kanban pipeline.')}
                </Text>
                <div style={{ marginTop: 16 }}>
                  <Button type="primary" onClick={() => setActiveView('stages')}>
                    Configure Stages
                  </Button>
                </div>
              </div>
            }
          />
        </Card>
      ) : activeView === 'list' ? (
        /* List View */
        <Card
          variant="outlined"
          style={{
            borderRadius: 12,
            border: `1px solid ${semantic.borderDefault}`,
            backgroundColor: semantic.bgCard,
          }}
          styles={{ body: { padding: '16px' } }}
        >
          {/* List Filters: Stage filter, Status filter */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <Space wrap>
              <Text strong>{t('pipeline.filterStage', 'Stage')}:</Text>
              <Select
                value={listStageFilter}
                onChange={setListStageFilter}
                style={{ width: 180 }}
                options={[
                  { value: 'ALL', label: t('pipeline.list.allStages', 'All Stages') },
                  ...stages.map((s) => ({ value: s.id, label: s.name })),
                ]}
              />

              <Text strong style={{ marginLeft: 8 }}>{t('pipeline.status', 'Status')}:</Text>
              <Select
                value={listStatusFilter}
                onChange={setListStatusFilter}
                style={{ width: 160 }}
                options={[
                  { value: 'ALL', label: t('pipeline.list.allStatuses', 'All Statuses') },
                  { value: 'SUBMITTED', label: 'SUBMITTED' },
                  { value: 'SHORTLISTED', label: 'SHORTLISTED' },
                  { value: 'INTERVIEW', label: 'INTERVIEW' },
                  { value: 'OFFER', label: 'OFFER' },
                  { value: 'HIRED', label: 'HIRED' },
                  { value: 'REJECTED', label: 'REJECTED' },
                ]}
              />
            </Space>

            <Text type="secondary" style={{ fontSize: 13 }}>
              {t('pipeline.list.totalRecords', { total: filteredListApplications.length, defaultValue: `Total ${filteredListApplications.length} candidates` })}
            </Text>
          </div>

          <Table
            data-testid="pipeline-list-table"
            rowKey="id"
            columns={listColumns}
            dataSource={filteredListApplications}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            locale={{ emptyText: t('pipeline.list.noApplicantsFound', 'No candidates match the specified filter criteria.') }}
          />
        </Card>
      ) : (
        /* Kanban View Container */
        <div
          data-testid="kanban-board-container"
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: 16,
            overflowX: 'auto',
            overflowY: 'hidden',
            paddingBottom: 20,
            alignItems: 'flex-start',
            minHeight: 'calc(100vh - 320px)',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {stages.map((stage) => {
            const isDragOver = dragOverStageId === stage.id;
            const applications = stage.applications || stage.applicants || [];

            // Apply search filter locally if entered
            const filteredApplications = searchQuery.trim()
              ? applications.filter((app) => {
                  const query = searchQuery.toLowerCase();
                  const name = `${app.candidate?.firstName || ''} ${app.candidate?.lastName || ''}`.toLowerCase();
                  const email = (app.candidate?.email || '').toLowerCase();
                  const headline = (app.candidate?.headline || '').toLowerCase();
                  return name.includes(query) || email.includes(query) || headline.includes(query);
                })
              : applications;

            return (
              <div
                key={stage.id}
                data-testid={`stage-column-${stage.id}`}
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDragLeave={(e) => handleDragLeave(e, stage.id)}
                onDrop={(e) => handleDrop(e, stage)}
                style={{
                  flex: '0 0 320px',
                  width: 320,
                  maxWidth: 320,
                  backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                  border: isDragOver
                    ? `2px dashed ${brandTokens.teal}`
                    : `1px solid ${semantic.borderDefault}`,
                  borderRadius: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: 'calc(100vh - 320px)',
                  transition: 'border-color 0.2s, background-color 0.2s',
                }}
              >
                {/* Column Header */}
                <div
                  style={{
                    padding: '14px 16px',
                    borderBottom: `1px solid ${semantic.borderDefault}`,
                    backgroundColor: isDarkMode ? 'rgba(79, 168, 192, 0.08)' : '#f1f5f9',
                    borderTopLeftRadius: 11,
                    borderTopRightRadius: 11,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Space size={8}>
                    <Text strong style={{ fontSize: 14, color: isDarkMode ? semantic.textPrimary : brandTokens.navy }}>
                      {stage.name}
                    </Text>
                    {stage.category && (
                      <Tag color={getCategoryColor(stage.category)} style={{ margin: 0, fontSize: 11 }}>
                        {stage.category}
                      </Tag>
                    )}
                  </Space>
                  <Badge
                    count={stage.totalApplicants ?? applications.length}
                    overflowCount={999}
                    style={{
                      backgroundColor: isDarkMode ? brandTokens.navySoft : '#e2e8f0',
                      color: isDarkMode ? '#fff' : brandTokens.navy,
                      fontWeight: 600,
                      boxShadow: 'none',
                    }}
                  />
                </div>

                {/* Column Body: Applicant Cards List */}
                <div
                  style={{
                    padding: 12,
                    overflowY: 'auto',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  {filteredApplications.length === 0 ? (
                    <div
                      style={{
                        padding: '32px 12px',
                        textAlign: 'center',
                        color: semantic.textSecondary,
                        fontSize: 13,
                      }}
                    >
                      {t('pipeline.noApplicants', 'No applicants in this stage')}
                    </div>
                  ) : (
                    filteredApplications.map((app) => {
                      const candidate = app.candidate || {};
                      const fullName =
                        candidate.firstName || candidate.lastName
                          ? `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim()
                          : candidate.email || 'Candidate';
                      const isTerminal =
                        app.status === 'HIRED' ||
                        app.status === 'REJECTED' ||
                        stage.category === 'HIRED' ||
                        stage.category === 'REJECTED';

                      const resumeUrl = app.resumeUrl || candidate.resumeUrl;

                      // Dropdown menu items for moving stage
                      const moveMenuItems = stages
                        .filter((s) => s.id !== stage.id)
                        .map((s) => ({
                          key: s.id,
                          label: (
                            <span data-testid={`move-to-stage-${s.id}`}>
                              <Space size={6}>
                                <ArrowRightOutlined style={{ fontSize: 11 }} />
                                <span>{s.name}</span>
                                {s.category && (
                                  <Tag color={getCategoryColor(s.category)} style={{ margin: 0, fontSize: 10 }}>
                                    {s.category}
                                  </Tag>
                                )}
                              </Space>
                            </span>
                          ),
                          onClick: () => handleInitiateTransition(app, s),
                        }));

                      return (
                        <Card
                          key={app.id}
                          data-testid={`applicant-card-${app.id}`}
                          variant="outlined"
                          draggable={canEdit && !isTerminal}
                          onDragStart={(e) => handleDragStart(e, app, stage)}
                          style={{
                            borderRadius: 8,
                            border: `1px solid ${semantic.borderDefault}`,
                            backgroundColor: semantic.bgCard,
                            cursor: canEdit && !isTerminal ? 'grab' : 'default',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                            transition: 'box-shadow 0.2s, transform 0.2s',
                          }}
                          styles={{ body: { padding: '14px' } }}
                        >
                          {/* Candidate Name & Status */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                            <Link
                              to={`/admin/candidates/${candidate.id}`}
                              style={{
                                fontWeight: 600,
                                fontSize: 14,
                                color: isDarkMode ? semantic.textPrimary : brandTokens.navy,
                                textDecoration: 'none',
                              }}
                            >
                              {fullName}
                            </Link>
                            <Tag color={getStatusColor(app.status)} style={{ margin: 0, fontSize: 10 }}>
                              {app.status || 'SUBMITTED'}
                            </Tag>
                          </div>

                          {/* Candidate Headline / Title */}
                          {(candidate.currentTitle || candidate.headline) && (
                            <div style={{ fontSize: 12, color: semantic.textSecondary, marginBottom: 4 }}>
                              {candidate.currentTitle || candidate.headline}
                              {candidate.currentCompany ? ` • ${candidate.currentCompany}` : ''}
                            </div>
                          )}

                          {/* Experience & Location */}
                          <div style={{ fontSize: 12, color: semantic.textSecondary, marginBottom: 8 }}>
                            <Space size={8} split="•" wrap>
                              {candidate.yearsOfExperience !== undefined && candidate.yearsOfExperience !== null && (
                                <span>{candidate.yearsOfExperience} yrs exp</span>
                              )}
                              {candidate.location && <span>{candidate.location}</span>}
                              {app.appliedAt && (
                                <span>
                                  <ClockCircleOutlined style={{ marginRight: 4 }} />
                                  {new Date(app.appliedAt).toLocaleDateString()}
                                </span>
                              )}
                            </Space>
                          </div>

                          <Divider style={{ margin: '8px 0' }} />

                          {/* Action Buttons: Resume, History, Move Stage */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Space size={4}>
                              {resumeUrl ? (
                                <Tooltip title={t('pipeline.viewResume', 'View Resume')}>
                                  <Button
                                    size="small"
                                    type="text"
                                    icon={<DownloadOutlined />}
                                    href={resumeUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  />
                                </Tooltip>
                              ) : null}

                              <Tooltip title={t('pipeline.stageHistory', 'Stage History')}>
                                <Button
                                  size="small"
                                  type="text"
                                  data-testid={`history-btn-${app.id}`}
                                  icon={<HistoryOutlined />}
                                  onClick={() => {
                                    setSelectedAppForHistory(app);
                                    setHistoryModalVisible(true);
                                  }}
                                />
                              </Tooltip>
                            </Space>

                            {/* Move Stage Action */}
                            {isTerminal ? (
                              <Tooltip title={t('pipeline.terminalWarning', 'Applications in terminal states cannot be moved.')}>
                                <Tag icon={<LockOutlined />} color="default" style={{ margin: 0, cursor: 'not-allowed' }}>
                                  Terminal
                                </Tag>
                              </Tooltip>
                            ) : canEdit ? (
                              <Dropdown
                                menu={{ items: moveMenuItems }}
                                trigger={['click']}
                                placement="bottomRight"
                              >
                                <Button
                                  size="small"
                                  type="primary"
                                  ghost
                                  icon={<SwapOutlined />}
                                  data-testid={`move-btn-${app.id}`}
                                >
                                  {t('pipeline.moveStage', 'Move')}
                                </Button>
                              </Dropdown>
                            ) : null}
                          </div>
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stage Transition Modal */}
      <Modal
        title={
          <Space>
            <SwapOutlined style={{ color: brandTokens.teal }} />
            <span>{t('pipeline.transitionModalTitle', 'Move Application Stage')}</span>
          </Space>
        }
        open={transitionModalVisible}
        onOk={handleConfirmTransition}
        onCancel={() => {
          if (!transitionSubmitting) {
            setTransitionModalVisible(false);
            setSelectedAppForTransition(null);
            setDestinationStage(null);
          }
        }}
        confirmLoading={transitionSubmitting}
        okText={t('pipeline.confirm', 'Confirm Transition')}
        cancelText={t('pipeline.cancel', 'Cancel')}
        destroyOnHidden
      >
        {selectedAppForTransition && destinationStage && (
          <div>
            <div
              style={{
                backgroundColor: isDarkMode ? 'rgba(79, 168, 192, 0.08)' : '#f8fafc',
                padding: '12px 16px',
                borderRadius: 8,
                border: `1px solid ${semantic.borderDefault}`,
                marginBottom: 16,
              }}
            >
              <Row gutter={[16, 8]}>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Candidate:
                  </Text>
                  <div>
                    <Text strong>
                      {selectedAppForTransition.candidate?.firstName} {selectedAppForTransition.candidate?.lastName}
                    </Text>
                  </div>
                </Col>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Destination Stage:
                  </Text>
                  <div>
                    <Tag color={getCategoryColor(destinationStage.category)}>
                      {destinationStage.name}
                    </Tag>
                  </div>
                </Col>
              </Row>
            </div>

            {/* If destination is REJECTED, show warning notice */}
            {(destinationStage.category === 'REJECTED' || destinationStage.name?.toLowerCase().includes('reject')) && (
              <Alert
                type="warning"
                showIcon
                message="Application Rejection"
                description="Moving this applicant to the Rejected stage requires a stated rejection reason."
                style={{ marginBottom: 16 }}
              />
            )}

            <Form form={transitionForm} layout="vertical">
              {(destinationStage.category === 'REJECTED' || destinationStage.name?.toLowerCase().includes('reject')) && (
                <Form.Item
                  name="rejectionReason"
                  label={t('pipeline.rejectionReason', 'Rejection Reason')}
                  rules={[{ required: true, message: t('pipeline.rejectionReasonRequired', 'Please specify the rejection reason') }]}
                >
                  <Input.TextArea
                    rows={3}
                    placeholder={t('pipeline.rejectionReasonPlaceholder', 'Enter reason for rejection (required)...')}
                  />
                </Form.Item>
              )}

              <Form.Item name="notes" label={t('pipeline.notes', 'Reviewer Notes')}>
                <Input.TextArea
                  rows={3}
                  placeholder={t('pipeline.notesPlaceholder', 'Add optional notes or feedback for this stage transition...')}
                />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>

      {/* Candidate Stage History Modal */}
      <Modal
        title={
          <Space>
            <HistoryOutlined style={{ color: brandTokens.teal }} />
            <span>
              {t('pipeline.historyTitle', 'Candidate Stage History')}
              {selectedAppForHistory?.candidate && ` — ${selectedAppForHistory.candidate.firstName} ${selectedAppForHistory.candidate.lastName}`}
            </span>
          </Space>
        }
        open={historyModalVisible}
        onCancel={() => {
          setHistoryModalVisible(false);
          setSelectedAppForHistory(null);
        }}
        footer={[
          <Button key="close" onClick={() => setHistoryModalVisible(false)}>
            Close
          </Button>,
        ]}
        width={640}
        destroyOnHidden
      >
        {selectedAppForHistory && (
          <div style={{ marginTop: 16 }}>
            {(!selectedAppForHistory.stageHistories || selectedAppForHistory.stageHistories.length === 0) &&
            (!selectedAppForHistory.stageHistory || selectedAppForHistory.stageHistory.length === 0) ? (
              <Empty description={t('pipeline.noHistory', 'No stage transition history recorded yet.')} />
            ) : (
              <Timeline
                items={(selectedAppForHistory.stageHistories || selectedAppForHistory.stageHistory || []).map((h) => {
                  const destStage = stages.find((s) => s.id === h.destinationStageId);
                  const isReject = h.rejectionReason || destStage?.category === 'REJECTED';
                  return {
                    color: isReject ? 'red' : 'green',
                    children: (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Space size={8}>
                            <Text strong>{destStage?.name || 'Recruitment Stage'}</Text>
                            {destStage?.category && (
                              <Tag color={getCategoryColor(destStage.category)} style={{ margin: 0, fontSize: 10 }}>
                                {destStage.category}
                              </Tag>
                            )}
                          </Space>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {new Date(h.createdAt).toLocaleString()}
                          </Text>
                        </div>

                        {h.actor && (
                          <div style={{ fontSize: 12, color: semantic.textSecondary, marginTop: 2 }}>
                            {t('pipeline.transitionBy', {
                              actor: h.actor.name || h.actor.email || 'Admin',
                              defaultValue: `Transitioned by ${h.actor.name || h.actor.email || 'Admin'}`,
                            })}
                          </div>
                        )}

                        {h.rejectionReason && (
                          <div style={{ marginTop: 6 }}>
                            <Tag color="error">Rejection Reason</Tag>
                            <Text type="danger" style={{ fontSize: 12 }}>
                              {h.rejectionReason}
                            </Text>
                          </div>
                        )}

                        {h.notes && (
                          <div
                            style={{
                              marginTop: 6,
                              padding: '6px 10px',
                              backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
                              borderRadius: 6,
                              fontSize: 12,
                            }}
                          >
                            <Text type="secondary" style={{ fontStyle: 'italic' }}>
                              "{h.notes}"
                            </Text>
                          </div>
                        )}
                      </div>
                    ),
                  };
                })}
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default PipelinePage;
