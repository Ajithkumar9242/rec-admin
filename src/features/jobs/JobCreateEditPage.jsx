import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  DatePicker,
  Button,
  Card,
  Row,
  Col,
  Space,
  Typography,
  Alert,
  Tag,
  Modal,
  Upload,
  Divider,
  App,
  Spin,
  Tooltip,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  CheckCircleOutlined,
  CloseOutlined,
  UploadOutlined,
  InfoCircleOutlined,
  BankOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { jobsApi } from '../../services/jobsApi.js';
import { companiesApi } from '../../services/companiesApi.js';
import { configurationApi } from '../../services/configurationApi.js';
import { brandTokens } from '../../theme/tokens.js';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export function JobCreateEditPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const { message, modal } = App.useApp();

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingTxt, setUploadingTxt] = useState(false);

  // Reference catalogs
  const [companies, setCompanies] = useState([]);
  const [industries, setIndustries] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [existingJob, setExistingJob] = useState(null);

  // Load catalogs on mount
  useEffect(() => {
    const loadCatalogs = async () => {
      try {
        const [compRes, indRes] = await Promise.all([
          companiesApi.getCompanies({ limit: 100, trashed: false }).catch(() => ({ data: [] })),
          configurationApi.getIndustries({ limit: 100 }).catch(() => ({ data: [] })),
        ]);
        const compList = compRes.items || compRes.data || [];
        setCompanies(compList);
        const indList = indRes.items || indRes.data || [];
        setIndustries(indList);
      } catch (err) {
        // non-blocking
      }
    };
    loadCatalogs();
  }, []);

  // Eligible scopes based on selected company authoritative permissions
  const eligibleScopeOptions = useMemo(() => {
    if (!selectedCompany) {
      return [
        { label: t('jobs.hiringScope.DOMESTIC') || 'Domestic Hiring', value: 'DOMESTIC' },
        { label: t('jobs.hiringScope.EU') || 'EU-wide Hiring', value: 'EU' },
        { label: t('jobs.hiringScope.INTERNATIONAL') || 'International Hiring', value: 'INTERNATIONAL' },
      ];
    }
    const options = [];
    if (selectedCompany.hiringDomestic) {
      options.push({
        label: t('jobs.hiringScope.DOMESTIC') || 'Domestic Hiring',
        value: 'DOMESTIC',
      });
    }
    if (selectedCompany.hiringEu) {
      options.push({
        label: t('jobs.hiringScope.EU') || 'EU-wide Hiring',
        value: 'EU',
      });
    }
    if (selectedCompany.hiringInternational) {
      options.push({
        label: t('jobs.hiringScope.INTERNATIONAL') || 'International Hiring',
        value: 'INTERNATIONAL',
      });
    }
    return options;
  }, [selectedCompany, t]);

  // Fetch company details when company is selected
  const handleCompanyChange = useCallback(async (companyId) => {
    if (!companyId) {
      setSelectedCompany(null);
      setCompanyUsers([]);
      form.setFieldValue('hiringScopes', []);
      return;
    }
    try {
      const res = await companiesApi.getCompany(companyId);
      const companyData = res.data || res;
      setSelectedCompany(companyData);
      setCompanyUsers(companyData.users || []);

      // Clear any selected scopes that the new company is not eligible to use
      const currentScopes = form.getFieldValue('hiringScopes') || [];
      const validScopes = (Array.isArray(currentScopes) ? currentScopes : [currentScopes]).filter((scope) => {
        if (scope === 'DOMESTIC') return companyData.hiringDomestic;
        if (scope === 'EU') return companyData.hiringEu;
        if (scope === 'INTERNATIONAL') return companyData.hiringInternational;
        return false;
      });
      form.setFieldValue('hiringScopes', validScopes);
    } catch (err) {
      // ignore
    }
  }, [form]);

  // Load existing job if in edit mode
  useEffect(() => {
    if (!isEditMode) return;
    const fetchJob = async () => {
      setLoading(true);
      try {
        const res = await jobsApi.getJob(id);
        const job = res.data || res;
        setExistingJob(job);

        // Pre-fetch selected company full data
        if (job.companyId) {
          await handleCompanyChange(job.companyId);
        }

        const initialScopes = Array.isArray(job.hiringScopes) && job.hiringScopes.length > 0
          ? job.hiringScopes
          : (job.hiringScope ? [job.hiringScope] : ['DOMESTIC']);

        const initialArrangements = Array.isArray(job.workArrangements) && job.workArrangements.length > 0
          ? job.workArrangements
          : (job.workArrangement ? [job.workArrangement] : (job.workplaceType ? (Array.isArray(job.workplaceType) ? job.workplaceType : [job.workplaceType]) : ['ON_SITE']));

        form.setFieldsValue({
          title: job.title,
          jobCode: job.jobCode,
          industryId: job.industryId,
          keywords: Array.isArray(job.keywords) ? job.keywords : [],
          companyId: job.companyId,
          department: job.department,
          profession: job.profession,
          openings: job.openings ?? 1,
          hiringManagerId: job.hiringManagerId,
          recruiterId: job.recruiterId,
          targetJoiningDate: job.targetJoiningDate ? dayjs(job.targetJoiningDate) : undefined,
          hiringScopes: initialScopes,
          employmentType: job.employmentType || 'FULL_TIME',
          compensationType: job.compensationType || 'ANNUAL',
          currency: job.currency || 'EUR',
          minSalary: job.minSalary != null ? Number(job.minSalary) : undefined,
          maxSalary: job.maxSalary != null ? Number(job.maxSalary) : undefined,
          salaryNegotiable: Boolean(job.salaryNegotiable),
          minExperience: job.minExperience ?? 0,
          maxExperience: job.maxExperience ?? 5,
          maxApplicantsLimit: job.maxApplicantsLimit != null ? Number(job.maxApplicantsLimit) : undefined,
          autoCloseOnLimit: Boolean(job.autoCloseOnLimit),
          address: job.address,
          city: job.city,
          state: job.state,
          country: job.country || 'DE',
          workplaceType: initialArrangements,
          germanLevel: job.germanLevel || undefined,
          englishLevel: job.englishLevel || undefined,
          otherLanguages: Array.isArray(job.otherLanguages) ? job.otherLanguages : [],
          description: job.description,
          responsibilities: job.responsibilities,
          requirements: job.requirements,
          benefits: job.benefits,
        });
      } catch (err) {
        const errMsg = err.response?.data?.message || err.message || 'Failed to load job';
        message.error(errMsg);
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [id, isEditMode, form, handleCompanyChange, message]);

  // Handle .txt description upload
  const processTxtUpload = async (file) => {
    setUploadingTxt(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await jobsApi.parseDescriptionFile(formData);
      if (res.text) {
        form.setFieldsValue({ description: res.text });
        message.success(t('jobs.messages.uploadSuccess'));
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Upload failed';
      message.error(errMsg);
    } finally {
      setUploadingTxt(false);
    }
  };

  const handleTxtFileBeforeUpload = (file) => {
    const isTxt = file.name.toLowerCase().endsWith('.txt') || file.type === 'text/plain';
    if (!isTxt) {
      message.error(t('jobs.messages.invalidTxt'));
      return Upload.LIST_IGNORE;
    }

    const currentDesc = form.getFieldValue('description');
    if (currentDesc && currentDesc.trim().length > 0) {
      modal.confirm({
        title: t('jobs.actions.uploadConfirmTitle'),
        content: t('jobs.actions.uploadConfirmDesc'),
        okText: t('common.submit'),
        cancelText: t('common.cancel'),
        onOk: () => processTxtUpload(file),
      });
    } else {
      processTxtUpload(file);
    }

    return false; // Prevent automatic upload by antd
  };

  // Submit Handler
  const handleSubmit = async (targetStatus) => {
    try {
      // If publishing, validate all fields strictly
      if (targetStatus === 'PUBLISHED') {
        await form.validateFields();
        if (selectedCompany && selectedCompany.status !== 'ACTIVE') {
          message.error(`Company status is "${selectedCompany.status}". Only ACTIVE companies can publish jobs.`);
          return;
        }
        if (selectedCompany && !selectedCompany.hiringDomestic && !selectedCompany.hiringEu && !selectedCompany.hiringInternational) {
          message.error('Selected company has no active hiring scopes permitted. Update company configuration before publishing.');
          return;
        }
      } else {
        // Draft: validate at least basic title and company
        await form.validateFields(['title', 'companyId']);
      }

      const values = form.getFieldsValue(true);

      // Hiring scope gating check
      if (selectedCompany) {
        const scopes = values.hiringScopes || [];
        for (const scope of scopes) {
          if (scope === 'DOMESTIC' && !selectedCompany.hiringDomestic) {
            message.error(t('jobs.hiringScope.gatedDomestic'));
            return;
          }
          if (scope === 'EU' && !selectedCompany.hiringEu) {
            message.error(t('jobs.hiringScope.gatedEu'));
            return;
          }
          if (scope === 'INTERNATIONAL' && !selectedCompany.hiringInternational) {
            message.error(t('jobs.hiringScope.gatedInternational'));
            return;
          }
        }
      }

      const selectedScopes = Array.isArray(values.hiringScopes) && values.hiringScopes.length > 0
        ? values.hiringScopes
        : ['DOMESTIC'];

      const rawArrangements = Array.isArray(values.workplaceType)
        ? values.workplaceType
        : (values.workplaceType ? [values.workplaceType] : ['ON_SITE']);
      const selectedArrangements = rawArrangements.length > 0 ? rawArrangements : ['ON_SITE'];

      // Format payload
      const payload = {
        companyId: values.companyId,
        title: values.title?.trim(),
        jobCode: values.jobCode?.trim() || null,
        industryId: values.industryId || null,
        keywords: Array.isArray(values.keywords) ? values.keywords : [],
        department: values.department?.trim() || null,
        profession: values.profession?.trim() || null,
        openings: values.openings ? Number(values.openings) : 1,
        hiringManagerId: values.hiringManagerId || null,
        recruiterId: values.recruiterId || null,
        targetJoiningDate: values.targetJoiningDate ? values.targetJoiningDate.toISOString() : null,
        hiringScopes: selectedScopes,
        hiringScope: selectedScopes[0],
        employmentType: values.employmentType || 'FULL_TIME',
        compensationType: values.compensationType || 'ANNUAL',
        currency: values.currency || 'EUR',
        minSalary: values.minSalary != null ? Number(values.minSalary) : null,
        maxSalary: values.maxSalary != null ? Number(values.maxSalary) : null,
        salaryNegotiable: Boolean(values.salaryNegotiable),
        minExperience: values.minExperience != null ? Number(values.minExperience) : 0,
        maxExperience: values.maxExperience != null ? Number(values.maxExperience) : 5,
        maxApplicantsLimit: values.maxApplicantsLimit != null ? Number(values.maxApplicantsLimit) : null,
        autoCloseOnLimit: Boolean(values.autoCloseOnLimit),
        address: values.address?.trim() || null,
        city: values.city?.trim() || null,
        state: values.state?.trim() || null,
        country: values.country || 'DE',
        workArrangement: selectedArrangements[0] || 'ON_SITE',
        workArrangements: selectedArrangements,
        workplaceType: selectedArrangements,
        germanLevel: values.germanLevel || null,
        englishLevel: values.englishLevel || null,
        otherLanguages: Array.isArray(values.otherLanguages) ? values.otherLanguages : [],
        description: values.description?.trim() || '',
        responsibilities: values.responsibilities?.trim() || null,
        requirements: values.requirements?.trim() || null,
        benefits: values.benefits?.trim() || null,
        status: targetStatus,
      };

      setSubmitting(true);
      if (isEditMode) {
        await jobsApi.updateJob(id, payload);
        message.success(t('jobs.messages.updateSuccess'));
      } else {
        await jobsApi.createJob(payload);
        message.success(t('jobs.messages.createSuccess'));
      }
      navigate('/admin/jobs');
    } catch (err) {
      if (err.errorFields) {
        message.error('Please resolve validation errors before proceeding.');
      } else if (
        err.response?.data?.code === 'QUOTA_EXCEEDED' ||
        err.response?.data?.code === 'JOB_POSTING_QUOTA_EXCEEDED' ||
        err.response?.data?.resourceType === 'jobPosting'
      ) {
        const { limit, currentUsage } = err.response.data;
        Modal.warning({
          title: t('jobs.quota.exceededTitle', 'Job Posting Limit Reached'),
          content: (
            <div>
              <p style={{ marginTop: 8 }}>
                {t('jobs.quota.exceededDesc', {
                  defaultValue: `Your company has reached its subscription quota of active jobs (${currentUsage ?? limit} / ${limit}). To publish more jobs, please upgrade your subscription plan.`,
                  usage: currentUsage ?? limit,
                  limit,
                })}
              </p>
              <Button
                type="primary"
                style={{ marginTop: 12, backgroundColor: brandTokens.navy, borderColor: brandTokens.navy }}
                onClick={() => {
                  Modal.destroyAll();
                  navigate('/admin/billing/subscriptions');
                }}
              >
                {t('jobs.quota.upgradePlan', 'Manage Subscriptions / Upgrade')}
              </Button>
            </div>
          ),
          okButtonProps: { style: { display: 'none' } },
          closable: true,
          maskClosable: true,
        });
      } else {
        const errMsg = err.response?.data?.message || err.message || 'Operation failed';
        message.error(errMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel Handler
  const handleCancel = () => {
    if (form.isFieldsTouched()) {
      modal.confirm({
        title: t('jobs.actions.discardTitle'),
        content: t('jobs.actions.discardDesc'),
        okText: t('common.submit'),
        cancelText: t('common.cancel'),
        okButtonProps: { danger: true },
        onOk: () => navigate('/admin/jobs'),
      });
    } else {
      navigate('/admin/jobs');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 4px 60px 4px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <Space align="center" size={12}>
          <Button icon={<ArrowLeftOutlined />} onClick={handleCancel} />
          <div>
            <Title level={4} style={{ margin: 0, color: brandTokens.navy }}>
              {isEditMode ? t('jobs.editJob') : t('jobs.createJob')}
            </Title>
            <Text type="secondary">
              {isEditMode
                ? `Editing job ID: ${existingJob?.jobCode || id}`
                : 'Configure and publish an official job opening on behalf of an onboarded enterprise.'}
            </Text>
          </div>
        </Space>

        {/* Action Buttons Header */}
        <Space>
          <Button icon={<CloseOutlined />} onClick={handleCancel}>
            {t('jobs.actions.cancel')}
          </Button>
          <Button
            icon={<SaveOutlined />}
            onClick={() => handleSubmit('DRAFT')}
            loading={submitting}
          >
            {t('jobs.actions.saveDraft')}
          </Button>
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={() => handleSubmit('PUBLISHED')}
            loading={submitting}
            style={{ backgroundColor: brandTokens.navy, borderColor: brandTokens.navy }}
          >
            {t('jobs.actions.publish')}
          </Button>
        </Space>
      </div>

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          openings: 1,
          compensationType: 'ANNUAL',
          currency: 'EUR',
          minExperience: 0,
          maxExperience: 5,
          salaryNegotiable: false,
          autoCloseOnLimit: false,
          country: 'DE',
          workplaceType: ['ON_SITE'],
          employmentType: 'FULL_TIME',
          hiringScopes: [],
          keywords: [],
          otherLanguages: [],
        }}
      >
        {/* ==================================================== */}
        {/* Section A — Basic Information */}
        {/* ==================================================== */}
        <Card
          title={t('jobs.sections.basic')}
          variant="outlined"
          style={{ marginBottom: 20 }}
          styles={{ header: { backgroundColor: '#f8fafc', fontWeight: 600 } }}
        >
          <Row gutter={16}>
            <Col xs={24} md={16}>
              <Form.Item
                name="title"
                label={t('jobs.fields.jobTitle')}
                rules={[
                  { required: true, message: 'Job title is required' },
                  { min: 3, message: 'Job title must be at least 3 characters' },
                ]}
              >
                <Input placeholder="e.g. Senior Full-Stack Cloud Engineer" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="jobCode" label={t('jobs.fields.jobCode')}>
                <Input placeholder="e.g. ENG-2026-001" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="industryId" label={t('jobs.fields.industry')}>
                <Select placeholder="Select industry sector" allowClear showSearch optionFilterProp="children">
                  {industries.map((ind) => (
                    <Option key={ind.id} value={ind.id}>
                      {ind.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="keywords" label={t('jobs.fields.keywords')}>
                <Select
                  mode="tags"
                  placeholder="Type keyword and press Enter (e.g. React, Node.js, Cloud)"
                  tokenSeparators={[',']}
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* ==================================================== */}
        {/* Section B — Organization & Roles */}
        {/* ==================================================== */}
        <Card
          title={t('jobs.sections.organization')}
          variant="outlined"
          style={{ marginBottom: 20 }}
          styles={{ header: { backgroundColor: '#f8fafc', fontWeight: 600 } }}
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="companyId"
                label={t('jobs.fields.company')}
                rules={[{ required: true, message: 'A valid company relationship is required' }]}
              >
                <Select
                  placeholder="Select company"
                  onChange={handleCompanyChange}
                  showSearch
                  optionFilterProp="children"
                  disabled={isEditMode}
                >
                  {companies.map((comp) => (
                    <Option key={comp.id} value={comp.id}>
                      {comp.name} {comp.status === 'ACTIVE' ? '(Active)' : `(${comp.status})`}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="hiringScopes"
                label={t('jobs.hiringScope.title')}
                rules={[{ required: true, message: 'At least one hiring scope must be selected' }]}
              >
                <Select
                  mode="multiple"
                  placeholder={
                    !selectedCompany
                      ? 'Select a company first'
                      : eligibleScopeOptions.length === 0
                      ? 'No hiring scopes permitted for this company'
                      : 'Select hiring scope(s)'
                  }
                  options={eligibleScopeOptions}
                  disabled={!selectedCompany || eligibleScopeOptions.length === 0}
                  allowClear
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Company Hiring Capability Banner */}
          {selectedCompany && (
            <Alert
              style={{ marginBottom: 16 }}
              type={selectedCompany.status === 'ACTIVE' ? 'info' : 'warning'}
              showIcon
              message={
                <Space size={16} wrap>
                  <Text strong>{selectedCompany.name} Details:</Text>
                  <span>
                    Status:{' '}
                    <Tag color={selectedCompany.status === 'ACTIVE' ? 'success' : 'warning'}>
                      {selectedCompany.status}
                    </Tag>
                  </span>
                  <span>
                    Domestic:{' '}
                    <Tag color={selectedCompany.hiringDomestic ? 'green' : 'default'}>
                      {selectedCompany.hiringDomestic ? 'Enabled' : 'Disabled'}
                    </Tag>
                  </span>
                  <span>
                    EU-wide:{' '}
                    <Tag color={selectedCompany.hiringEu ? 'blue' : 'default'}>
                      {selectedCompany.hiringEu ? 'Enabled' : 'Disabled'}
                    </Tag>
                  </span>
                  <span>
                    International:{' '}
                    <Tag color={selectedCompany.hiringInternational ? 'purple' : 'default'}>
                      {selectedCompany.hiringInternational ? 'Enabled' : 'Disabled'}
                    </Tag>
                  </span>
                </Space>
              }
              description={
                selectedCompany.status !== 'ACTIVE' ? (
                  <div style={{ marginTop: 4 }}>
                    <Text type="danger">
                      Company status is "{selectedCompany.status}". Only ACTIVE companies can publish jobs.
                    </Text>
                  </div>
                ) : eligibleScopeOptions.length === 0 ? (
                  <div style={{ marginTop: 4 }}>
                    <Text type="danger">
                      This company has no enabled hiring scopes. Update company configuration before publishing jobs.
                    </Text>
                  </div>
                ) : null
              }
            />
          )}

          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                name="employmentType"
                label={t('jobs.employmentType.title')}
                rules={[{ required: true, message: 'Employment type is required' }]}
              >
                <Select placeholder="Select employment type">
                  <Option value="FULL_TIME">{t('jobs.employmentType.FULL_TIME')}</Option>
                  <Option value="PART_TIME">{t('jobs.employmentType.PART_TIME')}</Option>
                  <Option value="CONTRACT">{t('jobs.employmentType.CONTRACT')}</Option>
                  <Option value="INTERNSHIP">{t('jobs.employmentType.INTERNSHIP')}</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="department" label={t('jobs.fields.department')}>
                <Input placeholder="e.g. Engineering, Sales, Product" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="profession" label={t('jobs.fields.profession')}>
                <Input placeholder="e.g. Software Engineer, Account Executive" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={6}>
              <Form.Item name="openings" label={t('jobs.fields.openings')}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="hiringManagerId" label={t('jobs.fields.hiringManager')}>
                <Select placeholder="Assign Hiring Manager" allowClear>
                  {companyUsers.map((u) => (
                    <Option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} ({u.role || 'Member'})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="recruiterId" label={t('jobs.fields.recruiter')}>
                <Select placeholder="Assign Recruiter" allowClear>
                  {companyUsers.map((u) => (
                    <Option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} ({u.role || 'Member'})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="targetJoiningDate" label={t('jobs.fields.targetJoiningDate')}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* ==================================================== */}
        {/* Section C — Compensation & Experience */}
        {/* ==================================================== */}
        <Card
          title={t('jobs.sections.compensation')}
          variant="outlined"
          style={{ marginBottom: 20 }}
          styles={{ header: { backgroundColor: '#f8fafc', fontWeight: 600 } }}
        >
          <Row gutter={16}>
            <Col xs={24} md={6}>
              <Form.Item
                name="compensationType"
                label={t('jobs.fields.compensationType')}
                rules={[{ required: true }]}
              >
                <Select>
                  <Option value="ANNUAL">Annual Salary</Option>
                  <Option value="MONTHLY">Monthly Salary</Option>
                  <Option value="HOURLY">Hourly Rate</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="currency" label={t('jobs.fields.currency')} rules={[{ required: true }]}>
                <Select>
                  <Option value="EUR">EUR (€)</Option>
                  <Option value="USD">USD ($)</Option>
                  <Option value="GBP">GBP (£)</Option>
                  <Option value="CHF">CHF (CHF)</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item
                name="minSalary"
                label={t('jobs.fields.minSalary')}
                rules={[
                  { required: true, message: 'Minimum salary is required' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      const max = getFieldValue('maxSalary');
                      if (value != null && max != null && Number(value) > Number(max)) {
                        return Promise.reject(new Error(t('jobs.messages.salaryValidation')));
                      }
                      return Promise.resolve();
                    },
                  }),
                ]}
              >
                <InputNumber min={0} style={{ width: '100%' }} placeholder="e.g. 60000" />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item
                name="maxSalary"
                label={t('jobs.fields.maxSalary')}
                rules={[
                  { required: true, message: 'Maximum salary is required' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      const min = getFieldValue('minSalary');
                      if (value != null && min != null && Number(value) < Number(min)) {
                        return Promise.reject(new Error(t('jobs.messages.salaryValidation')));
                      }
                      return Promise.resolve();
                    },
                  }),
                ]}
              >
                <InputNumber min={0} style={{ width: '100%' }} placeholder="e.g. 85000" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16} align="middle">
            <Col xs={24} md={6}>
              <Form.Item name="salaryNegotiable" label={t('jobs.fields.salaryNegotiable')} valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item
                name="minExperience"
                label={t('jobs.fields.minExperience')}
                rules={[
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      const max = getFieldValue('maxExperience');
                      if (value != null && max != null && Number(value) > Number(max)) {
                        return Promise.reject(new Error(t('jobs.messages.experienceValidation')));
                      }
                      return Promise.resolve();
                    },
                  }),
                ]}
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item
                name="maxExperience"
                label={t('jobs.fields.maxExperience')}
                rules={[
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      const min = getFieldValue('minExperience');
                      if (value != null && min != null && Number(value) < Number(min)) {
                        return Promise.reject(new Error(t('jobs.messages.experienceValidation')));
                      }
                      return Promise.resolve();
                    },
                  }),
                ]}
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={3}>
              <Form.Item name="maxApplicantsLimit" label={t('jobs.fields.maxApplicantsLimit')}>
                <InputNumber min={1} style={{ width: '100%' }} placeholder="Unlimited" />
              </Form.Item>
            </Col>
            <Col xs={24} md={3}>
              <Form.Item name="autoCloseOnLimit" label={t('jobs.fields.autoCloseOnLimit')} valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* ==================================================== */}
        {/* Section D — Location & Workplace */}
        {/* ==================================================== */}
        <Card
          title={t('jobs.sections.location')}
          variant="outlined"
          style={{ marginBottom: 20 }}
          styles={{ header: { backgroundColor: '#f8fafc', fontWeight: 600 } }}
        >
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                name="workplaceType"
                label={t('jobs.fields.workplaceType')}
                rules={[{ required: true, message: 'Please select at least one workplace arrangement' }]}
              >
                <Select
                  mode="multiple"
                  allowClear
                  placeholder={t('jobs.workplace.selectPlaceholder') || 'Select workplace arrangement(s)'}
                >
                  <Option value="ON_SITE">{t('jobs.workplace.ON_SITE')}</Option>
                  <Option value="HYBRID">{t('jobs.workplace.HYBRID')}</Option>
                  <Option value="REMOTE">{t('jobs.workplace.REMOTE')}</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="country" label={t('jobs.fields.country')} rules={[{ required: true }]}>
                <Select showSearch optionFilterProp="children">
                  <Option value="DE">Germany (DE)</Option>
                  <Option value="AT">Austria (AT)</Option>
                  <Option value="CH">Switzerland (CH)</Option>
                  <Option value="FR">France (FR)</Option>
                  <Option value="NL">Netherlands (NL)</Option>
                  <Option value="GB">United Kingdom (GB)</Option>
                  <Option value="US">United States (US)</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="city" label={t('jobs.fields.city')}>
                <Input placeholder="e.g. Berlin, Munich, Hamburg" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={16}>
              <Form.Item name="address" label={t('jobs.fields.address')}>
                <Input placeholder="e.g. Friedrichstraße 42" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="state" label={t('jobs.fields.state')}>
                <Input placeholder="e.g. Bavaria, Berlin" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* ==================================================== */}
        {/* Section E — Language Requirements & Preferences */}
        {/* ==================================================== */}
        <Card
          title={t('jobs.sections.languages')}
          variant="outlined"
          style={{ marginBottom: 20 }}
          styles={{ header: { backgroundColor: '#f8fafc', fontWeight: 600 } }}
        >
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                name="germanLevel"
                label={t('jobs.fields.germanLevel')}
              >
                <Select placeholder="Select CEFR Level (Optional)" allowClear>
                  <Option value="A1">A1 — Beginner</Option>
                  <Option value="A2">A2 — Elementary</Option>
                  <Option value="B1">B1 — Intermediate</Option>
                  <Option value="B2">B2 — Upper-Intermediate</Option>
                  <Option value="C1">C1 — Advanced</Option>
                  <Option value="C2">C2 — Mastery / Native</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="englishLevel" label={t('jobs.fields.englishLevel')}>
                <Select placeholder="Select CEFR Level (Optional)" allowClear>
                  <Option value="A1">A1 — Beginner</Option>
                  <Option value="A2">A2 — Elementary</Option>
                  <Option value="B1">B1 — Intermediate</Option>
                  <Option value="B2">B2 — Upper-Intermediate</Option>
                  <Option value="C1">C1 — Advanced</Option>
                  <Option value="C2">C2 — Mastery / Native</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="otherLanguages" label={t('jobs.fields.otherLanguages')}>
                <Select
                  mode="tags"
                  placeholder="e.g. French B1, Spanish A2 (Optional)"
                  tokenSeparators={[',']}
                  allowClear
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* ==================================================== */}
        {/* Section F — Job Description & Requirements */}
        {/* ==================================================== */}
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>{t('jobs.sections.description')}</span>
              <Upload
                accept=".txt"
                showUploadList={false}
                beforeUpload={handleTxtFileBeforeUpload}
              >
                <Button
                  size="small"
                  icon={<UploadOutlined />}
                  loading={uploadingTxt}
                >
                  {t('jobs.actions.uploadTxt')}
                </Button>
              </Upload>
            </div>
          }
          variant="outlined"
          style={{ marginBottom: 20 }}
          styles={{ header: { backgroundColor: '#f8fafc', fontWeight: 600 } }}
        >
          <Form.Item
            name="description"
            label={t('jobs.fields.jobDescription')}
            rules={[
              { required: true, message: 'Job description is required' },
              { min: 10, message: 'Description must be at least 10 characters' },
            ]}
          >
            <TextArea
              rows={6}
              placeholder="Provide a comprehensive job description or upload a .txt file..."
            />
          </Form.Item>

          <Form.Item name="responsibilities" label={t('jobs.fields.responsibilities')}>
            <TextArea rows={4} placeholder="Key duties, day-to-day responsibilities, and team collaboration..." />
          </Form.Item>

          <Form.Item name="requirements" label={t('jobs.fields.requirements')}>
            <TextArea rows={4} placeholder="Required skills, education, certifications, and technologies..." />
          </Form.Item>

          <Form.Item name="benefits" label={t('jobs.fields.benefits')}>
            <TextArea rows={3} placeholder="Health insurance, remote stipend, 30 days vacation, pension scheme..." />
          </Form.Item>
        </Card>

        {/* Bottom Actions Sticky/Bar */}
        <Card variant="outlined" styles={{ body: { padding: '16px 24px' } }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <Button icon={<CloseOutlined />} onClick={handleCancel}>
              {t('jobs.actions.cancel')}
            </Button>
            <Button
              icon={<SaveOutlined />}
              onClick={() => handleSubmit('DRAFT')}
              loading={submitting}
            >
              {t('jobs.actions.saveDraft')}
            </Button>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => handleSubmit('PUBLISHED')}
              loading={submitting}
              style={{ backgroundColor: brandTokens.navy, borderColor: brandTokens.navy }}
            >
              {t('jobs.actions.publish')}
            </Button>
          </div>
        </Card>
      </Form>
    </div>
  );
}
export default JobCreateEditPage;
