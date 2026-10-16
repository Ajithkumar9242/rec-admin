import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Steps,
  Form,
  Input,
  Select,
  Checkbox,
  Button,
  Space,
  Row,
  Col,
  Typography,
  Divider,
  Alert,
  App,
  Upload,
  Table,
  Tag,
  Modal,
  Radio,
  Breadcrumb,
  Tooltip,
  Spin,
} from 'antd';
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CheckOutlined,
  UploadOutlined,
  PlusOutlined,
  DeleteOutlined,
  FilePdfOutlined,
  InfoCircleOutlined,
  LinkOutlined,
  VideoCameraOutlined,
  PictureOutlined,
  SafetyCertificateOutlined,
  LockOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { companiesApi } from '../../services/companiesApi.js';
import { configurationApi } from '../../services/configurationApi.js';
import { brandTokens } from '../../theme/tokens.js';

const { Text, Title, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// Helper to strictly validate video URLs
function validateVideoUrl(url) {
  if (!url) return true;
  const trimmed = url.trim();
  const youtubePattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\/)[\w-]{11}/i;
  const vimeoPattern = /^(https?:\/\/)?(www\.)?(player\.)?vimeo\.com\/(video\/)?\d+/i;
  const cloudinaryPattern = /^https:\/\/res\.cloudinary\.com\/[\w-]+\/video\/upload\/.+/i;
  return youtubePattern.test(trimmed) || vimeoPattern.test(trimmed) || cloudinaryPattern.test(trimmed);
}

export function CompanyOnboardingWizard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { message } = App.useApp();

  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingDocDefId, setUploadingDocDefId] = useState(null);

  // Branding input mode: 'url' | 'upload'
  const [logoMode, setLogoMode] = useState('url');
  const [bannerMode, setBannerMode] = useState('url');

  // Metadata
  const [industries, setIndustries] = useState([]);
  const [docDefinitions, setDocDefinitions] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [integrations, setIntegrations] = useState(null);

  // Success modal state for SMTP unconfigured activation link
  const [successModalData, setSuccessModalData] = useState(null);

  // Direct URL modal for documents
  const [urlDocModalOpen, setUrlDocModalOpen] = useState(false);
  const [activeDefForUrl, setActiveDefForUrl] = useState(null);

  // Load industries, active document definitions, and integrations status
  useEffect(() => {
    async function loadData() {
      try {
        const [indRes, docRes, intRes] = await Promise.all([
          configurationApi.getIndustries({ limit: 100, status: 'ACTIVE' }).catch(() => ({ data: [] })),
          configurationApi.getDocumentDefinitions({ targetType: 'COMPANY', status: 'ACTIVE' }).catch(() => ({ data: [] })),
          companiesApi.getIntegrationsStatus().catch(() => ({ data: {} })),
        ]);
        if (indRes.data) setIndustries(indRes.data);
        if (docRes.data) setDocDefinitions(docRes.data);
        if (intRes.data) setIntegrations(intRes.data);
      } catch (err) {
        // Non-blocking
      }
    }
    loadData();
  }, []);

  // Steps definition
  const steps = [
    {
      title: t('companies.wizard.identityTitle', 'Identity & Overview'),
      description: 'Registration & Scope',
    },
    {
      title: t('companies.wizard.contactTitle', 'Contact & Address'),
      description: 'Offices & Billing',
    },
    {
      title: t('companies.wizard.brandingTitle', 'Branding Assets'),
      description: 'Logo, Banner & Video',
    },
    {
      title: t('companies.wizard.documentsTitle', 'Compliance Documents'),
      description: 'Legal Verification',
    },
    {
      title: t('companies.wizard.adminTitle', 'Initial Administrator'),
      description: 'Provision Account',
    },
  ];

  // Step 0 validation fields
  const step0Fields = ['name', 'companyCode', 'industryId', 'companySize', 'foundedYear'];
  // Step 1 validation fields
  const step1Fields = ['email', 'hrEmail', 'supportEmail', 'website', 'country', 'city', 'addressLine1'];
  // Step 2 validation fields
  const step2Fields = ['logoUrl', 'bannerUrl', 'promoVideoUrl'];
  // Step 4 validation fields
  const step4Fields = ['initialAdminEmail', 'initialAdminFirstName', 'initialAdminLastName'];

  // Handle advancing to next step with step-specific validation
  const handleNext = async () => {
    try {
      if (currentStep === 0) {
        await form.validateFields(step0Fields);
      } else if (currentStep === 1) {
        await form.validateFields(step1Fields);
      } else if (currentStep === 2) {
        await form.validateFields(step2Fields);
      } else if (currentStep === 3) {
        // Check mandatory document definitions
        const mandatoryDefs = docDefinitions.filter((d) => d.isRequired);
        const attachedDefIds = new Set(documents.map((d) => d.documentDefinitionId).filter(Boolean));
        const missingDefs = mandatoryDefs.filter((d) => !attachedDefIds.has(d.id));

        if (missingDefs.length > 0) {
          message.warning(
            `Missing mandatory compliance document(s): ${missingDefs.map((d) => d.name).join(', ')}`
          );
        }
      }
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      message.error(t('common.resolveErrors', 'Please correct the highlighted fields before proceeding.'));
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => prev - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Add document to list
  const handleAddDocument = (
    defId,
    name,
    fileUrl,
    originalName = null,
    fileSize = null,
    publicId = null,
    mimeType = null,
    isPrivate = true
  ) => {
    if (!name || !fileUrl) {
      message.error('Document name and file URL are required');
      return;
    }
    setDocuments((prev) => {
      // Replace if definition already exists, else append
      const filtered = defId ? prev.filter((d) => d.documentDefinitionId !== defId) : prev;
      return [
        ...filtered,
        {
          id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          documentDefinitionId: defId || null,
          name,
          fileUrl,
          fileName: originalName || name,
          fileSize,
          publicId: publicId || null,
          mimeType: mimeType || null,
          isPrivate: isPrivate !== undefined ? Boolean(isPrivate) : true,
        },
      ];
    });
  };

  const handleRemoveDocument = (id) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  // Upload asset for Logo
  const handleLogoUpload = async (file) => {
    // Client-side validations
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!allowed.includes(file.type)) {
      message.error('Invalid image type. Please upload a PNG, JPEG, SVG, or WebP.');
      return Upload.LIST_IGNORE;
    }
    if (file.size > 5 * 1024 * 1024) {
      message.error('Logo file size must be less than 5MB.');
      return Upload.LIST_IGNORE;
    }

    try {
      setUploadingLogo(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'logo');

      const res = await companiesApi.uploadAsset(formData);
      form.setFieldValue('logoUrl', res.data.fileUrl);
      message.success('Logo uploaded successfully.');
    } catch (err) {
      const errMsg =
        err.response?.data?.error ||
        err.message ||
        'Upload failed. If Cloudinary is unconfigured, please enter a direct image URL.';
      message.error(errMsg);
    } finally {
      setUploadingLogo(false);
    }
    return false; // Prevent default upload behavior
  };

  // Upload asset for Banner
  const handleBannerUpload = async (file) => {
    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowed.includes(file.type)) {
      message.error('Invalid image type. Please upload a PNG, JPEG, or WebP image.');
      return Upload.LIST_IGNORE;
    }
    if (file.size > 10 * 1024 * 1024) {
      message.error('Banner file size must be less than 10MB.');
      return Upload.LIST_IGNORE;
    }

    try {
      setUploadingBanner(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'banner');

      const res = await companiesApi.uploadAsset(formData);
      form.setFieldValue('bannerUrl', res.data.fileUrl);
      message.success('Banner uploaded successfully.');
    } catch (err) {
      const errMsg =
        err.response?.data?.error ||
        err.message ||
        'Upload failed. If Cloudinary is unconfigured, please enter a direct banner URL.';
      message.error(errMsg);
    } finally {
      setUploadingBanner(false);
    }
    return false;
  };

  // Upload compliance document
  const handleDocumentUpload = async (file, def) => {
    // Client-side extension & MIME check
    const ext = file.name.split('.').pop().toLowerCase();
    const acceptedTypes = def?.acceptedFileTypes || ['pdf', 'png', 'jpg', 'jpeg'];
    const isAllowedExt = acceptedTypes.some((t) => t.toLowerCase().replace('.', '') === ext);

    if (!isAllowedExt) {
      message.error(
        `File extension .${ext} is not allowed for "${def.name}". Permitted: ${acceptedTypes.join(', ')}`
      );
      return Upload.LIST_IGNORE;
    }

    const maxMb = def?.maxFileSizeMb || 10;
    if (file.size > maxMb * 1024 * 1024) {
      message.error(`File size exceeds maximum permitted limit of ${maxMb}MB.`);
      return Upload.LIST_IGNORE;
    }

    try {
      setUploadingDocDefId(def.id);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'document');
      formData.append('documentDefinitionId', def.id);
      formData.append('isPrivate', 'true');

      const res = await companiesApi.uploadAsset(formData);
      handleAddDocument(
        def.id,
        def.name,
        res.data.fileUrl,
        file.name,
        file.size,
        res.data.publicId,
        res.data.mimeType,
        true
      );
      message.success(`Uploaded "${file.name}" successfully.`);
    } catch (err) {
      const errMsg =
        err.response?.data?.error ||
        err.message ||
        'Upload failed. If Cloudinary is unconfigured, please attach via direct URL.';
      message.error(errMsg);
    } finally {
      setUploadingDocDefId(null);
    }
    return false;
  };

  // Final submission of entire onboarding wizard
  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      // Validate all fields across all mounted steps
      const values = await form.validateFields();

      // Check required documents
      const mandatoryDefs = docDefinitions.filter((d) => d.isRequired);
      const attachedDefIds = new Set(documents.map((d) => d.documentDefinitionId).filter(Boolean));
      const missingDefs = mandatoryDefs.filter((d) => !attachedDefIds.has(d.id));

      if (missingDefs.length > 0) {
        message.error(
          `Cannot submit: Mandatory compliance document(s) missing: ${missingDefs.map((d) => d.name).join(', ')}`
        );
        setCurrentStep(3); // Navigate back to documents step
        setSubmitting(false);
        return;
      }

      // Build canonical company payload
      const payload = {
        name: values.name?.trim(),
        legalName: values.legalName?.trim() || null,
        companyCode: values.companyCode?.trim() || undefined,
        taxId: values.taxId?.trim() || null,
        registrationNumber: values.registrationNumber?.trim() || null,
        industryId: values.industryId || null,
        companySize: values.companySize || null,
        foundedYear: values.foundedYear ? parseInt(values.foundedYear, 10) : null,
        description: values.description?.trim() || null,

        // Hiring preferences
        hiringDomestic: Boolean(values.hiringDomestic),
        hiringInternational: Boolean(values.hiringInternational),
        hiringEu: Boolean(values.hiringEu),

        // Contacts & Address
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

        // Branding
        logoUrl: values.logoUrl?.trim() || null,
        bannerUrl: values.bannerUrl?.trim() || null,
        promoVideoUrl: values.promoVideoUrl?.trim() || null,

        // Initial Admin
        initialAdminFirstName: values.initialAdminFirstName?.trim() || null,
        initialAdminLastName: values.initialAdminLastName?.trim() || null,
        initialAdminEmail: values.initialAdminEmail?.trim() || null,
        sendInvitation: Boolean(values.sendInvitation),

        // Attached documents
        documents: documents.map((d) => ({
          documentDefinitionId: d.documentDefinitionId,
          name: d.name,
          fileUrl: d.fileUrl,
          publicId: d.publicId || null,
          fileSizeBytes: d.fileSize || d.fileSizeBytes || null,
          mimeType: d.mimeType || null,
          isPrivate: d.isPrivate !== undefined ? d.isPrivate : true,
        })),
      };

      const res = await companiesApi.createCompany(payload);
      message.success(t('companies.wizard.createSuccess', 'Company successfully created!'));

      if (res.activationUrl) {
        // SMTP unconfigured: display modal with direct activation URL
        setSuccessModalData({
          company: res.data,
          activationUrl: res.activationUrl,
        });
      } else {
        navigate(`/admin/companies/${res.data.id}`);
      }
    } catch (err) {
      const errResponse = err.response?.data;
      const isDuplicateCode =
        errResponse?.code === 'DUPLICATE_COMPANY_CODE' ||
        errResponse?.field === 'companyCode' ||
        errResponse?.error?.toLowerCase().includes('company code');

      if (isDuplicateCode) {
        form.setFields([
          {
            name: 'companyCode',
            errors: [errResponse?.error || 'Company code is already in use.'],
          },
        ]);
        setCurrentStep(0);
        message.error(errResponse?.error || 'Company code conflict. Please choose another code.');
        return;
      }

      if (errResponse?.issues) {
        // Map backend validation issues directly into Ant Design form fields
        const fieldErrors = errResponse.issues.map((issue) => ({
          name: issue.field,
          errors: [issue.message],
        }));
        form.setFields(fieldErrors);

        // Find which step contains the first error and switch to it
        const firstField = errResponse.issues[0]?.field;
        if (step0Fields.includes(firstField)) {
          setCurrentStep(0);
        } else if (step1Fields.includes(firstField)) {
          setCurrentStep(1);
        } else if (step2Fields.includes(firstField)) {
          setCurrentStep(2);
        } else if (step4Fields.includes(firstField)) {
          setCurrentStep(4);
        }

        message.error(`Validation error: ${errResponse.issues[0]?.message} on "${firstField}"`);
      } else {
        const msg = errResponse?.error || err.message || 'Failed to create company';
        message.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Watch fields for live preview
  const currentLogoUrl = Form.useWatch('logoUrl', form);
  const currentBannerUrl = Form.useWatch('bannerUrl', form);
  const currentPromoVideoUrl = Form.useWatch('promoVideoUrl', form);

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', padding: '0 12px 48px' }}>
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <Link to="/admin/dashboard">{t('shell.dashboard', 'Dashboard')}</Link> },
          { title: <Link to="/admin/companies">{t('shell.companies', 'Companies')}</Link> },
          { title: t('companies.onboardingWizard', 'Onboard New Company') },
        ]}
      />

      {/* Header Bar */}
      <div
        style={{
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/admin/companies')}
            style={{ marginBottom: 4, paddingLeft: 0, color: brandTokens.slate }}
          >
            {t('common.back', 'Back to Companies')}
          </Button>
          <Title level={2} style={{ margin: 0, color: brandTokens.navy, fontWeight: 700 }}>
            {t('companies.newCompanyTitle', 'Company Onboarding Wizard')}
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            {t(
              'companies.newCompanySubtitle',
              'Guide a new employer organization through compliance verification, asset branding, document collection, and initial administrative account provisioning.'
            )}
          </Text>
        </div>
      </div>

      {/* Stepper Card */}
      <Card
        variant="outlined"
        style={{
          marginBottom: 24,
          borderRadius: 8,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
        styles={{ body: { padding: '20px 24px' } }}
      >
        <Steps
          current={currentStep}
          onChange={(targetStep) => {
            // Allow stepping backwards freely; forwards only with validation
            if (targetStep < currentStep) {
              setCurrentStep(targetStep);
            }
          }}
          items={steps}
        />
      </Card>

      {/* Form Card: Persistent Rendering of ALL Steps */}
      <Card
        variant="outlined"
        style={{
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          borderColor: '#e2e8f0',
        }}
        styles={{ body: { padding: '32px 36px' } }}
      >
        <Form
          form={form}
          layout="vertical"
          scrollToFirstError
          initialValues={{
            country: 'DE',
            hiringDomestic: true,
            hiringInternational: false,
            hiringEu: false,
            sendInvitation: true,
          }}
        >
          {/* ================================================================ */}
          {/* STEP 0: IDENTITY & OVERVIEW                                      */}
          {/* ================================================================ */}
          <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
            <div style={{ marginBottom: 24 }}>
              <Title level={4} style={{ color: brandTokens.navy, margin: 0 }}>
                {t('companies.wizard.identityTitle', 'Company Identity & Registration')}
              </Title>
              <Text type="secondary">
                Configure canonical company name, commercial registration identifiers, and primary industry classification.
              </Text>
            </div>

            <Row gutter={24}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="name"
                  label={t('companies.wizard.companyName', 'Display / Trading Name')}
                  rules={[
                    { required: true, message: 'Display name is required' },
                    { min: 2, message: 'Must be at least 2 characters' },
                  ]}
                  tooltip="The canonical public name of the company displayed throughout the platform."
                >
                  <Input placeholder="e.g. Acme Tech Solutions" size="large" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="legalName"
                  label={t('companies.wizard.legalName', 'Legal Business Name')}
                  tooltip="Official legal entity registered in commercial register (if different from display name)."
                >
                  <Input placeholder="e.g. Acme Tech Solutions GmbH" size="large" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={24}>
              <Col xs={24} md={8}>
                <Form.Item
                  name="companyCode"
                  label={t('companies.wizard.companyCode', 'Company Code (Unique ID)')}
                  tooltip="Leave blank to auto-generate a unique code like COMP-XXXX"
                >
                  <Input placeholder="Auto-generated if blank (e.g. COMP-ACME)" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  name="taxId"
                  label={t('companies.wizard.taxId', 'VAT / Tax ID Number')}
                  tooltip="Official tax identification number (e.g. DE123456789)"
                >
                  <Input placeholder="e.g. DE123456789" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  name="registrationNumber"
                  label={t('companies.wizard.registrationNumber', 'Commercial Register No.')}
                  tooltip="Commercial registration file number (e.g. HRB 98765 B)"
                >
                  <Input placeholder="e.g. HRB 98765 B" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={24}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="industryId"
                  label={t('companies.wizard.industry', 'Industry Sector')}
                  rules={[{ required: true, message: 'Please select an industry sector' }]}
                >
                  <Select placeholder="Select primary industry" allowClear showSearch optionFilterProp="children">
                    {industries.map((ind) => (
                      <Option key={ind.id} value={ind.id}>
                        {ind.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item
                  name="companySize"
                  label={t('companies.wizard.companySize', 'Company Size')}
                >
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
              <Col xs={24} md={6}>
                <Form.Item
                  name="foundedYear"
                  label={t('companies.wizard.foundedYear', 'Founded Year')}
                >
                  <Input type="number" placeholder="e.g. 2020" min={1800} max={new Date().getFullYear()} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="description"
              label={t('companies.wizard.description', 'Company Description')}
            >
              <TextArea rows={3} placeholder="Brief summary of company business, sector focus, and mission..." />
            </Form.Item>

            <Divider style={{ margin: '20px 0' }} />
            <Text strong style={{ display: 'block', marginBottom: 12, color: brandTokens.navy }}>
              {t('companies.wizard.hiringPreferences', 'Hiring Scope Preferences')}
            </Text>
            <Space size={32} wrap>
              <Form.Item name="hiringDomestic" valuePropName="checked" noStyle>
                <Checkbox>{t('companies.wizard.domesticHiring', 'Domestic Hiring')}</Checkbox>
              </Form.Item>
              <Form.Item name="hiringInternational" valuePropName="checked" noStyle>
                <Checkbox>{t('companies.wizard.internationalHiring', 'International Hiring')}</Checkbox>
              </Form.Item>
              <Form.Item name="hiringEu" valuePropName="checked" noStyle>
                <Checkbox>{t('companies.wizard.euHiring', 'EU-wide Hiring')}</Checkbox>
              </Form.Item>
            </Space>
          </div>

          {/* ================================================================ */}
          {/* STEP 1: CONTACT & ADDRESS                                        */}
          {/* ================================================================ */}
          <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
            <div style={{ marginBottom: 24 }}>
              <Title level={4} style={{ color: brandTokens.navy, margin: 0 }}>
                {t('companies.wizard.contactTitle', 'Contact Details & Address')}
              </Title>
              <Text type="secondary">
                Official contact communication channels, headquarters location, and billing address.
              </Text>
            </div>

            <Row gutter={24}>
              <Col xs={24} md={8}>
                <Form.Item
                  name="email"
                  label={t('companies.wizard.primaryEmail', 'Primary Corporate Email')}
                  rules={[{ type: 'email', message: 'Valid email required' }]}
                  tooltip="Main point of contact for platform communications."
                >
                  <Input placeholder="contact@company.com" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  name="hrEmail"
                  label={t('companies.wizard.hrEmail', 'HR / Recruitment Email')}
                  rules={[{ type: 'email', message: 'Valid email required' }]}
                  tooltip="Receives candidate applications and interview updates."
                >
                  <Input placeholder="recruiting@company.com" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  name="supportEmail"
                  label={t('companies.wizard.supportEmail', 'Support Email')}
                  rules={[{ type: 'email', message: 'Valid email required' }]}
                >
                  <Input placeholder="support@company.com" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={24}>
              <Col xs={24} md={8}>
                <Form.Item name="phone" label={t('companies.wizard.phone', 'Phone Number')}>
                  <Input placeholder="+49 30 12345678" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="alternatePhone" label="Alternate Phone">
                  <Input placeholder="+49 30 87654321" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  name="website"
                  label={t('companies.wizard.website', 'Official Website')}
                  rules={[{ type: 'url', message: 'Valid URL required (e.g. https://...)' }]}
                >
                  <Input placeholder="https://company.com" />
                </Form.Item>
              </Col>
            </Row>

            <Divider style={{ margin: '20px 0' }} />
            <Title level={5} style={{ color: brandTokens.navy }}>
              Registered Physical Address
            </Title>

            <Row gutter={24}>
              <Col xs={24} md={12}>
                <Form.Item name="addressLine1" label={t('companies.wizard.address', 'Street Address')}>
                  <Input placeholder="Hauptstraße 123" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="addressLine2" label={t('companies.wizard.address2', 'Address Line 2')}>
                  <Input placeholder="Gebäude B, 3. OG" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={24}>
              <Col xs={24} md={8}>
                <Form.Item name="city" label={t('companies.wizard.city', 'City')}>
                  <Input placeholder="Berlin" />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name="state" label={t('companies.wizard.state', 'State / Region')}>
                  <Input placeholder="Berlin" />
                </Form.Item>
              </Col>
              <Col xs={24} md={5}>
                <Form.Item name="postalCode" label={t('companies.wizard.postalCode', 'Postal Code')}>
                  <Input placeholder="10115" />
                </Form.Item>
              </Col>
              <Col xs={24} md={5}>
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

            <Divider style={{ margin: '20px 0' }} />
            <Title level={5} style={{ color: brandTokens.navy }}>
              Billing Specifics
            </Title>

            <Row gutter={24}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="billingEmail"
                  label={t('companies.wizard.billingEmail', 'Invoices & Billing Email')}
                  rules={[{ type: 'email', message: 'Valid email required' }]}
                >
                  <Input placeholder="invoices@company.com" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="billingAddress"
                  label={t('companies.wizard.billingAddress', 'Billing Address (if different)')}
                >
                  <Input placeholder="Leave blank to use primary physical address" />
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* ================================================================ */}
          {/* STEP 2: BRANDING ASSETS (DUAL URL & UPLOAD MODES)                 */}
          {/* ================================================================ */}
          <div style={{ display: currentStep === 2 ? 'block' : 'none' }}>
            <div style={{ marginBottom: 20 }}>
              <Title level={4} style={{ color: brandTokens.navy, margin: 0 }}>
                {t('companies.wizard.brandingTitle', 'Branding & Visual Assets')}
              </Title>
              <Text type="secondary">
                Upload images directly or provide existing CDN / Cloudinary image URLs. All images can be previewed live.
              </Text>
            </div>

            {/* Storage status notice */}
            <Alert
              type={integrations?.cloudinary?.configured ? 'success' : 'info'}
              showIcon
              message={
                integrations?.cloudinary?.configured
                  ? 'Cloudinary Storage Active'
                  : 'Cloudinary Storage Unconfigured'
              }
              description={
                integrations?.cloudinary?.configured
                  ? 'Cloudinary asset storage is operational. You can upload local files directly or supply external CDN URLs.'
                  : 'Cloudinary storage credentials are not active in this environment. Direct file uploads will be rejected with an explicit configuration error. Please provide public image URLs instead.'
              }
              style={{ marginBottom: 28 }}
            />

            {/* LOGO SECTION */}
            <Card
              size="small"
              variant="outlined"
              style={{ marginBottom: 24, backgroundColor: '#fcfcfd', borderColor: '#e2e8f0' }}
              title={
                <Space>
                  <PictureOutlined style={{ color: brandTokens.primary }} />
                  <span style={{ fontWeight: 600 }}>Company Logo</span>
                </Space>
              }
              extra={
                <Radio.Group
                  size="small"
                  value={logoMode}
                  onChange={(e) => setLogoMode(e.target.value)}
                  optionType="button"
                  buttonStyle="solid"
                >
                  <Radio.Button value="url">Direct URL</Radio.Button>
                  <Radio.Button value="upload">Upload File</Radio.Button>
                </Radio.Group>
              }
            >
              <Row gutter={24} align="middle">
                <Col xs={24} md={16}>
                  {logoMode === 'url' ? (
                    <Form.Item
                      name="logoUrl"
                      label={t('companies.wizard.logoUrl', 'Company Logo URL')}
                      rules={[{ type: 'url', message: 'Valid URL required (e.g. https://...)' }]}
                      tooltip="Direct URL to a square PNG, JPEG, SVG or WebP logo"
                    >
                      <Input
                        placeholder="https://res.cloudinary.com/.../logo.png"
                        prefix={<LinkOutlined style={{ color: '#94a3b8' }} />}
                        allowClear
                      />
                    </Form.Item>
                  ) : (
                    <div>
                      <Text style={{ display: 'block', marginBottom: 8 }}>
                        Upload high-resolution square logo (PNG, JPEG, WebP, SVG — max 5MB):
                      </Text>
                      <Upload.Dragger
                        name="file"
                        multiple={false}
                        showUploadList={false}
                        beforeUpload={handleLogoUpload}
                        disabled={uploadingLogo}
                        style={{ padding: '16px 0', borderColor: '#cbd5e1' }}
                      >
                        <p className="ant-upload-drag-icon" style={{ marginBottom: 8 }}>
                          {uploadingLogo ? <Spin /> : <UploadOutlined style={{ color: brandTokens.navy, fontSize: 24 }} />}
                        </p>
                        <p className="ant-upload-text" style={{ fontSize: 13, margin: 0 }}>
                          Click or drag logo file to this area to upload
                        </p>
                        <p className="ant-upload-hint" style={{ fontSize: 11, color: '#94a3b8' }}>
                          PNG, JPEG, SVG, WebP up to 5MB
                        </p>
                      </Upload.Dragger>
                      {/* Hidden form item to track URL */}
                      <Form.Item name="logoUrl" noStyle>
                        <Input type="hidden" />
                      </Form.Item>
                    </div>
                  )}
                </Col>
                <Col xs={24} md={8} style={{ textAlign: 'center' }}>
                  <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 8 }}>
                    Logo Preview
                  </Text>
                  <div
                    style={{
                      width: 100,
                      height: 100,
                      margin: '0 auto',
                      border: '2px dashed #cbd5e1',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#fff',
                      overflow: 'hidden',
                    }}
                  >
                    {currentLogoUrl ? (
                      <img
                        src={currentLogoUrl}
                        alt="Logo Preview"
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <PictureOutlined style={{ fontSize: 32, color: '#cbd5e1' }} />
                    )}
                  </div>
                  {currentLogoUrl && (
                    <Button
                      type="link"
                      danger
                      size="small"
                      style={{ marginTop: 6 }}
                      onClick={() => form.setFieldValue('logoUrl', '')}
                    >
                      Remove Logo
                    </Button>
                  )}
                </Col>
              </Row>
            </Card>

            {/* BANNER SECTION */}
            <Card
              size="small"
              variant="outlined"
              style={{ marginBottom: 24, backgroundColor: '#fcfcfd', borderColor: '#e2e8f0' }}
              title={
                <Space>
                  <PictureOutlined style={{ color: brandTokens.primary }} />
                  <span style={{ fontWeight: 600 }}>Company Banner / Header</span>
                </Space>
              }
              extra={
                <Radio.Group
                  size="small"
                  value={bannerMode}
                  onChange={(e) => setBannerMode(e.target.value)}
                  optionType="button"
                  buttonStyle="solid"
                >
                  <Radio.Button value="url">Direct URL</Radio.Button>
                  <Radio.Button value="upload">Upload File</Radio.Button>
                </Radio.Group>
              }
            >
              <Row gutter={24} align="middle">
                <Col xs={24} md={14}>
                  {bannerMode === 'url' ? (
                    <Form.Item
                      name="bannerUrl"
                      label={t('companies.wizard.bannerUrl', 'Company Banner URL')}
                      rules={[{ type: 'url', message: 'Valid URL required (e.g. https://...)' }]}
                      tooltip="Wide panoramic or 16:9 aspect ratio image for company header"
                    >
                      <Input
                        placeholder="https://res.cloudinary.com/.../banner.jpg"
                        prefix={<LinkOutlined style={{ color: '#94a3b8' }} />}
                        allowClear
                      />
                    </Form.Item>
                  ) : (
                    <div>
                      <Text style={{ display: 'block', marginBottom: 8 }}>
                        Upload wide panoramic header image (PNG, JPEG, WebP — max 10MB):
                      </Text>
                      <Upload.Dragger
                        name="file"
                        multiple={false}
                        showUploadList={false}
                        beforeUpload={handleBannerUpload}
                        disabled={uploadingBanner}
                        style={{ padding: '16px 0', borderColor: '#cbd5e1' }}
                      >
                        <p className="ant-upload-drag-icon" style={{ marginBottom: 8 }}>
                          {uploadingBanner ? <Spin /> : <UploadOutlined style={{ color: brandTokens.navy, fontSize: 24 }} />}
                        </p>
                        <p className="ant-upload-text" style={{ fontSize: 13, margin: 0 }}>
                          Click or drag banner file to this area to upload
                        </p>
                        <p className="ant-upload-hint" style={{ fontSize: 11, color: '#94a3b8' }}>
                          16:9 ratio recommended, max 10MB
                        </p>
                      </Upload.Dragger>
                      <Form.Item name="bannerUrl" noStyle>
                        <Input type="hidden" />
                      </Form.Item>
                    </div>
                  )}
                </Col>
                <Col xs={24} md={10} style={{ textAlign: 'center' }}>
                  <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 8 }}>
                    16:9 Banner Preview
                  </Text>
                  <div
                    style={{
                      width: '100%',
                      aspectRatio: '16 / 9',
                      maxHeight: 120,
                      margin: '0 auto',
                      border: '2px dashed #cbd5e1',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#fff',
                      overflow: 'hidden',
                    }}
                  >
                    {currentBannerUrl ? (
                      <img
                        src={currentBannerUrl}
                        alt="Banner Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <PictureOutlined style={{ fontSize: 32, color: '#cbd5e1' }} />
                    )}
                  </div>
                  {currentBannerUrl && (
                    <Button
                      type="link"
                      danger
                      size="small"
                      style={{ marginTop: 6 }}
                      onClick={() => form.setFieldValue('bannerUrl', '')}
                    >
                      Remove Banner
                    </Button>
                  )}
                </Col>
              </Row>
            </Card>

            {/* PROMOTIONAL VIDEO SECTION */}
            <Card
              size="small"
              variant="outlined"
              style={{ backgroundColor: '#fcfcfd', borderColor: '#e2e8f0' }}
              title={
                <Space>
                  <VideoCameraOutlined style={{ color: brandTokens.primary }} />
                  <span style={{ fontWeight: 600 }}>Promotional Video</span>
                </Space>
              }
            >
              <Form.Item
                name="promoVideoUrl"
                label={t('companies.wizard.promoVideoUrl', 'Promotional Video URL')}
                rules={[
                  { type: 'url', message: 'Valid URL required' },
                  {
                    validator: (_, value) => {
                      if (!value || validateVideoUrl(value)) {
                        return Promise.resolve();
                      }
                      return Promise.reject(
                        new Error(
                          'Only legitimate YouTube (youtu.be/watch), Vimeo, or Cloudinary video stream URLs are accepted. Raw HTML scripts or embeds are rejected.'
                        )
                      );
                    },
                  },
                ]}
                tooltip="Supported video hosts: YouTube, Vimeo, or direct Cloudinary video streams. Scripts and auto-playing embeds are rejected."
              >
                <Input
                  placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                  prefix={<VideoCameraOutlined style={{ color: '#94a3b8' }} />}
                  allowClear
                />
              </Form.Item>

              {currentPromoVideoUrl && validateVideoUrl(currentPromoVideoUrl) && (
                <div style={{ marginTop: 8 }}>
                  <Tag color="success" icon={<CheckCircleOutlined />}>
                    Valid video host verified
                  </Tag>
                  <Button
                    type="link"
                    size="small"
                    href={currentPromoVideoUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open preview in new tab (no autoplay)
                  </Button>
                </div>
              )}
            </Card>
          </div>

          {/* ================================================================ */}
          {/* STEP 3: COMPLIANCE DOCUMENTS (PDF & DEFINITION CONSTRAINTS)       */}
          {/* ================================================================ */}
          <div style={{ display: currentStep === 3 ? 'block' : 'none' }}>
            <div style={{ marginBottom: 20 }}>
              <Title level={4} style={{ color: brandTokens.navy, margin: 0 }}>
                {t('companies.wizard.documentsTitle', 'Required & Optional Compliance Documents')}
              </Title>
              <Text type="secondary">
                Attach company verification documents configured under Platform Configuration. Legitimate PDF files are verified with binary magic-byte inspection. Sensitive documents are stored private by default.
              </Text>
            </div>

            {/* List of active document definitions */}
            <div style={{ marginBottom: 28 }}>
              <Title level={5} style={{ color: brandTokens.navy, marginBottom: 12 }}>
                Active Document Requirements
              </Title>
              {docDefinitions.length === 0 ? (
                <Alert
                  type="info"
                  message="No active company document definitions found."
                  description="You can proceed without platform-mandated documents, or use 'Add Custom Document' below."
                  style={{ marginBottom: 16 }}
                />
              ) : (
                <Space direction="vertical" style={{ width: '100%' }} size={12}>
                  {docDefinitions.map((def) => {
                    const attachedDoc = documents.find((d) => d.documentDefinitionId === def.id);
                    const isAttached = Boolean(attachedDoc);
                    const acceptedTypes = def.acceptedFileTypes?.join(', ') || 'PDF';

                    return (
                      <Card
                        key={def.id}
                        size="small"
                        variant="outlined"
                        style={{
                          borderColor: def.isRequired && !isAttached ? '#f59e0b' : '#e2e8f0',
                          backgroundColor: isAttached ? '#f0fdf4' : '#ffffff',
                          borderRadius: 6,
                        }}
                      >
                        <Row justify="space-between" align="middle" gutter={16}>
                          <Col xs={24} sm={14}>
                            <Space align="start">
                              <FilePdfOutlined
                                style={{
                                  fontSize: 24,
                                  color: isAttached ? '#16a34a' : brandTokens.navy,
                                  marginTop: 2,
                                }}
                              />
                              <div>
                                <Space wrap>
                                  <Text strong style={{ fontSize: 14 }}>
                                    {def.name}
                                  </Text>
                                  {def.isRequired ? (
                                    <Tag color="error">Required</Tag>
                                  ) : (
                                    <Tag>Optional</Tag>
                                  )}
                                  <Tag color="cyan">Max {def.maxFileSizeMb}MB</Tag>
                                  <Tag color="blue">{acceptedTypes.toUpperCase()}</Tag>
                                </Space>
                                {def.description && (
                                  <Text
                                    type="secondary"
                                    style={{ display: 'block', fontSize: 12, marginTop: 4 }}
                                  >
                                    {def.description}
                                  </Text>
                                )}
                              </div>
                            </Space>
                          </Col>

                          <Col xs={24} sm={10} style={{ textAlign: 'right', marginTop: 8 }}>
                            {isAttached ? (
                              <Space>
                                <Tag color="success" icon={<CheckCircleOutlined />}>
                                  Attached: {attachedDoc.fileName || attachedDoc.name}
                                </Tag>
                                <Button
                                  type="text"
                                  danger
                                  size="small"
                                  icon={<DeleteOutlined />}
                                  onClick={() => handleRemoveDocument(attachedDoc.id)}
                                />
                              </Space>
                            ) : (
                              <Space wrap>
                                {/* Direct file upload button */}
                                <Upload
                                  beforeUpload={(file) => handleDocumentUpload(file, def)}
                                  showUploadList={false}
                                  disabled={uploadingDocDefId === def.id}
                                >
                                  <Button
                                    size="small"
                                    icon={<UploadOutlined />}
                                    loading={uploadingDocDefId === def.id}
                                  >
                                    Upload File
                                  </Button>
                                </Upload>

                                {/* Direct URL attach button */}
                                <Button
                                  size="small"
                                  icon={<LinkOutlined />}
                                  onClick={() => {
                                    setActiveDefForUrl(def);
                                    setUrlDocModalOpen(true);
                                  }}
                                >
                                  Provide URL
                                </Button>
                              </Space>
                            )}
                          </Col>
                        </Row>
                      </Card>
                    );
                  })}
                </Space>
              )}
            </div>

            {/* Attached Documents Table */}
            <div style={{ marginTop: 24 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <Title level={5} style={{ margin: 0, color: brandTokens.navy }}>
                  Attached Documents ({documents.length})
                </Title>
                <Button
                  type="dashed"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setActiveDefForUrl(null);
                    setUrlDocModalOpen(true);
                  }}
                >
                  Add Custom Document
                </Button>
              </div>

              <Table
                dataSource={documents}
                pagination={false}
                size="middle"
                rowKey="id"
                locale={{ emptyText: 'No compliance documents attached yet.' }}
                columns={[
                  {
                    title: 'Document Name',
                    dataIndex: 'name',
                    render: (name) => (
                      <Space>
                        <FilePdfOutlined style={{ color: '#ef4444' }} />
                        <Text strong>{name}</Text>
                      </Space>
                    ),
                  },
                  {
                    title: 'Source / URL',
                    dataIndex: 'fileUrl',
                    ellipsis: true,
                    render: (url) => (
                      <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>
                        {url}
                      </a>
                    ),
                  },
                  {
                    title: 'Privacy & Access',
                    dataIndex: 'isPrivate',
                    render: (isPrivate) =>
                      isPrivate ? (
                        <Tag icon={<LockOutlined />} color="gold">
                          Private / Encrypted
                        </Tag>
                      ) : (
                        <Tag color="blue">Public</Tag>
                      ),
                  },
                  {
                    title: 'Action',
                    align: 'right',
                    render: (_, record) => (
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleRemoveDocument(record.id)}
                      >
                        Remove
                      </Button>
                    ),
                  },
                ]}
              />
            </div>
          </div>

          {/* ================================================================ */}
          {/* STEP 4: INITIAL ADMINISTRATOR                                     */}
          {/* ================================================================ */}
          <div style={{ display: currentStep === 4 ? 'block' : 'none' }}>
            <div style={{ marginBottom: 20 }}>
              <Title level={4} style={{ color: brandTokens.navy, margin: 0 }}>
                {t('companies.wizard.adminTitle', 'Initial Company Administrator')}
              </Title>
              <Text type="secondary">
                Provision the primary employer account holder. An invitation email with a secure cryptographic one-time setup token will be generated.
              </Text>
            </div>

            <Alert
              type="info"
              showIcon
              icon={<SafetyCertificateOutlined />}
              message="Zero-Knowledge Security Architecture"
              description="Administrator passwords are never set in plain text. When created, a high-entropy single-use cryptographic token is stored securely in PostgreSQL. If SMTP is unconfigured, the generated link will be presented on screen."
              style={{ marginBottom: 24 }}
            />

            <Row gutter={24}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="initialAdminFirstName"
                  label={t('companies.wizard.initialAdminFirstName', 'First Name')}
                >
                  <Input placeholder="e.g. Alex" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="initialAdminLastName"
                  label={t('companies.wizard.initialAdminLastName', 'Last Name')}
                >
                  <Input placeholder="e.g. Schmidt" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="initialAdminEmail"
              label={t('companies.wizard.initialAdminEmail', 'Administrator Email Address')}
              rules={[{ type: 'email', message: 'Valid email required' }]}
              tooltip="This administrator will manage company profile settings, job postings, and team access."
            >
              <Input placeholder="admin@company.com" size="large" />
            </Form.Item>

            <Form.Item
              name="sendInvitation"
              valuePropName="checked"
              style={{ marginTop: 16 }}
            >
              <Checkbox>
                {t(
                  'companies.wizard.sendInvitationLabel',
                  'Send one-time activation link to this administrator via email'
                )}
              </Checkbox>
            </Form.Item>

            {/* Summary Review Card */}
            <Divider style={{ margin: '24px 0' }} />
            <Card
              size="small"
              variant="outlined"
              style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderRadius: 8 }}
              title={
                <Text strong style={{ color: brandTokens.navy }}>
                  Review Company Onboarding Summary
                </Text>
              }
            >
              <Form.Item
                noStyle
                shouldUpdate={(prev, cur) =>
                  prev.name !== cur.name ||
                  prev.legalName !== cur.legalName ||
                  prev.country !== cur.country ||
                  prev.city !== cur.city ||
                  prev.email !== cur.email ||
                  prev.initialAdminEmail !== cur.initialAdminEmail
                }
              >
                {() => (
                  <Row gutter={[16, 12]}>
                    <Col xs={12} sm={8}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Display Name:</Text>
                      <div style={{ fontWeight: 600 }}>{form.getFieldValue('name') || '—'}</div>
                    </Col>
                    <Col xs={12} sm={8}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Legal Name:</Text>
                      <div>{form.getFieldValue('legalName') || '—'}</div>
                    </Col>
                    <Col xs={12} sm={8}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Country / City:</Text>
                      <div>{`${form.getFieldValue('country') || 'DE'} / ${form.getFieldValue('city') || '—'}`}</div>
                    </Col>
                    <Col xs={12} sm={8}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Corporate Email:</Text>
                      <div>{form.getFieldValue('email') || '—'}</div>
                    </Col>
                    <Col xs={12} sm={8}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Documents Attached:</Text>
                      <div>
                        <Tag color={documents.length > 0 ? 'blue' : 'default'}>
                          {documents.length} document(s)
                        </Tag>
                      </div>
                    </Col>
                    <Col xs={12} sm={8}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Administrator Email:</Text>
                      <div>{form.getFieldValue('initialAdminEmail') || '—'}</div>
                    </Col>
                  </Row>
                )}
              </Form.Item>
            </Card>
          </div>

          {/* ================================================================ */}
          {/* STEP CONTROLS (PREVIOUS / NEXT / SUBMIT)                         */}
          {/* ================================================================ */}
          <Divider style={{ margin: '32px 0 24px' }} />
          <Row justify="space-between" align="middle">
            <Col>
              {currentStep > 0 && (
                <Button icon={<ArrowLeftOutlined />} onClick={handlePrev} size="large">
                  {t('companies.wizard.prev', 'Previous')}
                </Button>
              )}
            </Col>
            <Col>
              {currentStep < steps.length - 1 ? (
                <Button
                  type="primary"
                  icon={<ArrowRightOutlined />}
                  onClick={handleNext}
                  size="large"
                  style={{
                    backgroundColor: brandTokens.navy,
                    borderColor: brandTokens.navy,
                    padding: '0 24px',
                  }}
                >
                  {t('companies.wizard.next', 'Next Step')}
                </Button>
              ) : (
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  loading={submitting}
                  onClick={handleSubmit}
                  size="large"
                  style={{
                    backgroundColor: '#16a34a',
                    borderColor: '#16a34a',
                    padding: '0 28px',
                    fontWeight: 600,
                  }}
                >
                  {t('companies.wizard.submit', 'Complete Onboarding')}
                </Button>
              )}
            </Col>
          </Row>
        </Form>
      </Card>

      {/* ================================================================ */}
      {/* DOCUMENT ATTACH MODAL (FILE UPLOAD OR DIRECT URL)                */}
      {/* ================================================================ */}
      <AttachDocumentModal
        open={urlDocModalOpen}
        activeDef={activeDefForUrl}
        onCancel={() => {
          setUrlDocModalOpen(false);
          setActiveDefForUrl(null);
        }}
        onAttach={(defId, docName, fileUrl, originalName, fileSize, publicId, mimeType) => {
          handleAddDocument(defId, docName, fileUrl, originalName, fileSize, publicId, mimeType);
          setUrlDocModalOpen(false);
          setActiveDefForUrl(null);
          message.success(`Document "${docName}" attached.`);
        }}
      />

      {/* ================================================================ */}
      {/* ACTIVATION LINK MODAL (SMTP UNCONFIGURED)                        */}
      {/* ================================================================ */}
      <Modal
        title="Company Onboarded Successfully"
        open={Boolean(successModalData)}
        closable={false}
        destroyOnClose
        footer={[
          <Button
            key="profile"
            type="primary"
            style={{ backgroundColor: brandTokens.navy, borderColor: brandTokens.navy }}
            onClick={() => navigate(`/admin/companies/${successModalData.company.id}`)}
          >
            Go to Company Profile
          </Button>,
        ]}
      >
        <Paragraph>
          Company <strong>{successModalData?.company?.name}</strong> has been successfully registered with status{' '}
          <Tag color="processing">IN_REVIEW</Tag>.
        </Paragraph>
        {successModalData?.activationUrl && (
          <div style={{ marginTop: 16 }}>
            <Alert
              type="warning"
              showIcon
              message="Email Service Unconfigured — Direct Activation Link"
              description={
                <div>
                  <Paragraph style={{ margin: '8px 0 6px 0', fontSize: 13 }}>
                    Because SMTP is unconfigured in this server environment, please provide the following secure activation URL directly to the company administrator:
                  </Paragraph>
                  <Space.Compact style={{ width: '100%' }}>
                    <Input
                      readOnly
                      value={successModalData.activationUrl}
                      style={{ fontSize: 12, fontFamily: 'monospace' }}
                    />
                    <Button
                      icon={<CopyOutlined />}
                      onClick={() => {
                        navigator.clipboard.writeText(successModalData.activationUrl);
                        message.success('Activation link copied to clipboard!');
                      }}
                    >
                      Copy
                    </Button>
                  </Space.Compact>
                </div>
              }
            />
          </div>
        )}
      </Modal>
    </div>
  );
}

/**
 * Dedicated Document Attachment Modal (File Upload or External URL)
 * Maintains isolated form instance cleanly connected to Form element
 */
function AttachDocumentModal({ open, activeDef, onCancel, onAttach }) {
  const { message } = App.useApp();
  const [modalForm] = Form.useForm();
  const [attachType, setAttachType] = useState('file'); // 'file' | 'url'
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const acceptedTypes = activeDef?.acceptedFileTypes || ['.pdf', '.png', '.jpg', '.jpeg'];
  const maxMb = activeDef?.maxFileSizeMb || 15;

  const handleFinish = async (values) => {
    const defId = activeDef?.id || null;
    const docName = (activeDef?.name || values.customName || selectedFile?.name || 'Document').trim();
    const isDocPrivate = values.isPrivate !== undefined ? Boolean(values.isPrivate) : true;

    if (attachType === 'file') {
      if (!selectedFile) {
        message.error('Please select a file to upload');
        return;
      }

      try {
        setUploading(true);
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('type', 'document');
        if (defId) formData.append('documentDefinitionId', defId);
        formData.append('name', docName);
        formData.append('isPrivate', isDocPrivate);

        const res = await companiesApi.uploadAsset(formData);
        onAttach(
          defId,
          docName,
          res.data.fileUrl,
          selectedFile.name,
          selectedFile.size,
          res.data.publicId,
          res.data.mimeType,
          isDocPrivate
        );
        handleClose();
      } catch (err) {
        const errMsg =
          err.response?.data?.error ||
          err.message ||
          'Upload failed. Please check file format and size or provide a direct URL.';
        message.error(errMsg);
      } finally {
        setUploading(false);
      }
    } else {
      onAttach(
        defId,
        docName,
        values.fileUrl,
        undefined,
        undefined,
        undefined,
        undefined,
        isDocPrivate
      );
      handleClose();
    }
  };

  const handleClose = () => {
    modalForm.resetFields();
    setSelectedFile(null);
    setAttachType('file');
    onCancel();
  };

  const handleFileChange = (file) => {
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    const isAllowed = acceptedTypes.some((t) => t.toLowerCase().replace('.', '') === ext.replace('.', ''));
    if (!isAllowed) {
      message.error(`File type ${ext} is not allowed. Permitted: ${acceptedTypes.join(', ')}`);
      return Upload.LIST_IGNORE;
    }
    if (file.size > maxMb * 1024 * 1024) {
      message.error(`File size exceeds maximum permitted limit of ${maxMb}MB.`);
      return Upload.LIST_IGNORE;
    }
    setSelectedFile(file);
    if (!activeDef && !modalForm.getFieldValue('customName')) {
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      modalForm.setFieldValue('customName', baseName);
    }
    return false; // prevent default upload
  };

  return (
    <Modal
      title={
        activeDef
          ? `Attach Document: ${activeDef.name}`
          : 'Attach Custom Document'
      }
      open={open}
      onCancel={handleClose}
      footer={null}
      destroyOnClose
    >
      <div style={{ marginBottom: 16, textAlign: 'center' }}>
        <Radio.Group
          value={attachType}
          onChange={(e) => setAttachType(e.target.value)}
          buttonStyle="solid"
        >
          <Radio.Button value="file">
            <UploadOutlined style={{ marginRight: 6 }} />
            Upload File
          </Radio.Button>
          <Radio.Button value="url">
            <LinkOutlined style={{ marginRight: 6 }} />
            Provide Direct URL
          </Radio.Button>
        </Radio.Group>
      </div>

      <Form
        form={modalForm}
        layout="vertical"
        onFinish={handleFinish}
      >
        {!activeDef && (
          <Form.Item
            name="customName"
            label="Document Name"
            rules={[{ required: true, message: 'Please provide a document name' }]}
          >
            <Input placeholder="e.g. Tax Clearance Certificate" />
          </Form.Item>
        )}

        {attachType === 'file' ? (
          <Form.Item
            label="Select Document File"
            required
            help={`Allowed formats: ${acceptedTypes.join(', ')} • Max size: ${maxMb}MB`}
          >
            <Upload.Dragger
              beforeUpload={handleFileChange}
              maxCount={1}
              fileList={selectedFile ? [selectedFile] : []}
              onRemove={() => setSelectedFile(null)}
              accept={acceptedTypes.join(',')}
            >
              <p className="ant-upload-drag-icon">
                <UploadOutlined style={{ fontSize: 28, color: brandTokens.navy }} />
              </p>
              <p className="ant-upload-text">Click or drag document file to this area</p>
              <p className="ant-upload-hint">Confidential compliance document will be securely stored.</p>
            </Upload.Dragger>
          </Form.Item>
        ) : (
          <Form.Item
            name="fileUrl"
            label="File URL"
            rules={[
              { required: true, message: 'File URL is required' },
              { type: 'url', message: 'Please enter a valid URL (e.g. https://...)' },
            ]}
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

        <Space style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <Button onClick={handleClose} disabled={uploading}>
            Cancel
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={uploading}
            style={{ backgroundColor: brandTokens.navy, borderColor: brandTokens.navy }}
          >
            {attachType === 'file' ? 'Upload & Attach' : 'Attach URL'}
          </Button>
        </Space>
      </Form>
    </Modal>
  );
}

