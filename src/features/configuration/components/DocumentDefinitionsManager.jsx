import React, { useState, useEffect, useCallback, useContext } from 'react';
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
  Switch,
} from 'antd';
import {
  FileTextOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { ReactReduxContext } from 'react-redux';
import { DataTable, StatusBadge } from '../../../components/common/DataTable.jsx';
import { DeleteConfirmationModal } from '../../../components/common/DeleteConfirmationModal.jsx';
import { configurationApi, formatConfigurationError } from '../../../services/configurationApi.js';
import { brandTokens, lightSemanticTokens, darkSemanticTokens } from '../../../theme/tokens.js';

const { Text, Paragraph } = Typography;

const COMMON_FILE_TYPES = [
  '.pdf',
  'application/pdf',
  '.docx',
  '.doc',
  '.png',
  '.jpg',
  '.jpeg',
  '.rtf',
  '.txt',
];

export function DocumentDefinitionsManager({ targetType = 'COMPANY' }) {
  const { t } = useTranslation();
  const reduxContext = useContext(ReactReduxContext);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return reduxContext?.store ? Boolean(reduxContext.store.getState()?.theme?.isDarkMode) : false;
  });

  useEffect(() => {
    if (!reduxContext?.store) return;
    const unsubscribe = reduxContext.store.subscribe(() => {
      setIsDarkMode(Boolean(reduxContext.store.getState()?.theme?.isDarkMode));
    });
    return unsubscribe;
  }, [reduxContext]);

  const semantic = isDarkMode ? darkSemanticTokens : lightSemanticTokens;

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const isCompany = targetType === 'COMPANY';
  const pageTitle = isCompany
    ? t('configuration.documents.companyTitle')
    : t('configuration.documents.candidateTitle');
  const pageSubtitle = isCompany
    ? t('configuration.documents.companySubtitle')
    : t('configuration.documents.candidateSubtitle');
  const createButtonText = isCompany
    ? t('configuration.documents.createCompany')
    : t('configuration.documents.createCandidate');

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await configurationApi.getDocumentDefinitions({ targetType, limit: 100 });
      if (res.success) {
        setDocuments(res.data || []);
      }
    } catch (err) {
      setError(formatConfigurationError(err, 'Failed to fetch document definitions.'));
    } finally {
      setLoading(false);
    }
  }, [targetType]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleCreate = async (values) => {
    try {
      setSubmitting(true);
      await configurationApi.createDocumentDefinition({
        ...values,
        targetType,
      });
      message.success(t('configuration.documents.createSuccess'));
      setIsCreateModalOpen(false);
      createForm.resetFields();
      await fetchDocuments();
    } catch (err) {
      message.error(formatConfigurationError(err, 'Failed to create document definition.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (values) => {
    if (!selectedDoc) return;
    try {
      setSubmitting(true);
      await configurationApi.updateDocumentDefinition(selectedDoc.id, values);
      message.success(t('configuration.documents.updateSuccess'));
      setIsEditModalOpen(false);
      setSelectedDoc(null);
      editForm.resetFields();
      await fetchDocuments();
    } catch (err) {
      message.error(formatConfigurationError(err, 'Failed to update document definition.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (record) => {
    const newStatus = record.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await configurationApi.toggleDocumentStatus(record.id, newStatus);
      message.success(t('configuration.documents.toggleSuccess'));
      await fetchDocuments();
    } catch (err) {
      message.error(formatConfigurationError(err, 'Failed to update status.'));
    }
  };

  const handleDeleteConfirm = async (mode) => {
    if (!selectedDoc) return;
    try {
      setSubmitting(true);
      await configurationApi.deleteDocumentDefinition(selectedDoc.id, mode);
      message.success(
        mode === 'DELETE_PERMANENTLY'
          ? 'Document definition permanently deleted.'
          : 'Document definition moved to Trash.'
      );
      setIsDeleteModalOpen(false);
      setSelectedDoc(null);
      await fetchDocuments();
    } catch (err) {
      message.error(formatConfigurationError(err, 'Failed to delete document definition.'));
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (record) => {
    setSelectedDoc(record);
    editForm.setFieldsValue({
      name: record.name,
      code: record.code,
      description: record.description,
      isRequired: record.isRequired,
      acceptedFileTypes: record.acceptedFileTypes,
      maxFileSizeMb: record.maxFileSizeMb,
    });
    setIsEditModalOpen(true);
  };

  const openViewModal = (record) => {
    setSelectedDoc(record);
    setIsViewModalOpen(true);
  };

  const openDeleteModal = (record) => {
    setSelectedDoc(record);
    setIsDeleteModalOpen(true);
  };

  const columns = [
    {
      title: t('configuration.documents.name'),
      dataIndex: 'name',
      key: 'name',
      render: (name) => (
        <Space>
          <FileTextOutlined style={{ color: brandTokens.navy }} />
          <Text strong style={{ color: brandTokens.navy }}>
            {name}
          </Text>
        </Space>
      ),
    },
    {
      title: t('configuration.documents.code'),
      dataIndex: 'code',
      key: 'code',
      render: (code) => (code ? <Tag color="blue">{code}</Tag> : <Text type="secondary">—</Text>),
    },
    {
      title: t('configuration.documents.isRequired'),
      dataIndex: 'isRequired',
      key: 'isRequired',
      render: (isRequired) => (
        <Tag color={isRequired ? 'error' : 'default'}>
          {isRequired ? t('configuration.documents.requiredTag') : t('configuration.documents.optionalTag')}
        </Tag>
      ),
    },
    {
      title: t('configuration.documents.acceptedFileTypes'),
      dataIndex: 'acceptedFileTypes',
      key: 'acceptedFileTypes',
      render: (types) => (
        <Space wrap size={4}>
          {(types || []).map((type) => (
            <Tag key={type} color="cyan">
              {type}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: t('configuration.documents.maxFileSize'),
      dataIndex: 'maxFileSizeMb',
      key: 'maxFileSizeMb',
      render: (size) => `${size} MB`,
    },
    {
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => (
        <Space size={8}>
          <StatusBadge status={status} />
          <Switch
            size="small"
            checked={status === 'ACTIVE'}
            onChange={() => handleToggleStatus(record)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <DataTable
        title={pageTitle}
        subtitle={pageSubtitle}
        columns={columns}
        dataSource={documents}
        loading={loading}
        error={error}
        onRefresh={fetchDocuments}
        onCreate={() => {
          createForm.resetFields();
          createForm.setFieldsValue({
            isRequired: false,
            acceptedFileTypes: ['.pdf', 'application/pdf'],
            maxFileSizeMb: 10,
          });
          setIsCreateModalOpen(true);
        }}
        createButtonText={createButtonText}
        onView={openViewModal}
        onEdit={openEditModal}
        onDelete={openDeleteModal}
        exportFilename={`${targetType.toLowerCase()}_document_definitions_export`}
      />

      {/* Create Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: isDarkMode ? 'rgba(59, 130, 246, 0.16)' : 'rgba(30, 58, 138, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                color: brandTokens.navy,
              }}
            >
              <FileTextOutlined />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16, color: semantic.textPrimary, lineHeight: 1.3 }}>
                {t('configuration.documents.createTitle')}
              </div>
              <div style={{ fontSize: 12, color: semantic.textSecondary, fontWeight: 400 }}>
                {isCompany
                  ? t('configuration.documents.createCompanySubtitle', 'Configure compliance and identity document requirements for employers')
                  : t('configuration.documents.createCandidateSubtitle', 'Configure candidate resume and verification document rules')}
              </div>
            </div>
          </div>
        }
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        footer={null}
        destroyOnHidden
        styles={{
          content: {
            borderRadius: 14,
            border: `1px solid ${semantic.borderDefault}`,
            background: semantic.bgCard,
            padding: 0,
            overflow: 'hidden',
          },
          header: {
            background: semantic.bgCard,
            borderBottom: `1px solid ${semantic.borderSubtle}`,
            padding: '18px 24px',
            margin: 0,
          },
          body: {
            padding: '20px 24px',
          },
        }}
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            name="name"
            label={<span style={{ fontWeight: 500, color: semantic.textPrimary }}>{t('configuration.documents.name')}</span>}
            rules={[
              { required: true, message: 'Document name is required' },
              { min: 2, message: 'Minimum 2 characters' },
            ]}
          >
            <Input placeholder={isCompany ? 'e.g. Commercial Register Extract' : 'e.g. Resume / CV'} style={{ borderRadius: 8, height: 38 }} />
          </Form.Item>

          <Form.Item
            name="code"
            label={<span style={{ fontWeight: 500, color: semantic.textPrimary }}>{t('configuration.documents.code')}</span>}
          >
            <Input placeholder="e.g. HANDELSREGISTER, CV" style={{ textTransform: 'uppercase', borderRadius: 8, height: 38 }} />
          </Form.Item>

          <Form.Item
            name="isRequired"
            label={<span style={{ fontWeight: 500, color: semantic.textPrimary }}>{t('configuration.documents.isRequired')}</span>}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="acceptedFileTypes"
            label={<span style={{ fontWeight: 500, color: semantic.textPrimary }}>{t('configuration.documents.acceptedFileTypes')}</span>}
            extra={<span style={{ fontSize: 12, color: semantic.textSecondary }}>{t('configuration.documents.acceptedFileTypesHelp')}</span>}
            rules={[{ required: true, message: 'At least one file type is required' }]}
          >
            <Select mode="tags" placeholder="Select or type file extensions/MIME types" style={{ minHeight: 38 }}>
              {COMMON_FILE_TYPES.map((t) => (
                <Select.Option key={t} value={t}>
                  {t}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="maxFileSizeMb"
            label={<span style={{ fontWeight: 500, color: semantic.textPrimary }}>{t('configuration.documents.maxFileSize')}</span>}
            rules={[{ required: true, message: 'File size limit is required' }]}
          >
            <Space.Compact style={{ width: '100%' }}>
              <InputNumber min={1} max={100} style={{ width: '100%', height: 38, borderRadius: '8px 0 0 8px' }} />
              <Button disabled style={{ pointerEvents: 'none', color: '#8c8c8c', height: 38, borderRadius: '0 8px 8px 0' }}>MB</Button>
            </Space.Compact>
          </Form.Item>

          <Form.Item
            name="description"
            label={<span style={{ fontWeight: 500, color: semantic.textPrimary }}>{t('configuration.documents.description')}</span>}
          >
            <Input.TextArea rows={3} placeholder="Optional instructions or verification guidelines..." style={{ borderRadius: 8 }} />
          </Form.Item>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              marginTop: 24,
              paddingTop: 16,
              borderTop: `1px solid ${semantic.borderSubtle}`,
            }}
          >
            <Button
              onClick={() => setIsCreateModalOpen(false)}
              disabled={submitting}
              style={{ borderRadius: 8, height: 38 }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              style={{
                backgroundColor: brandTokens.navy,
                borderColor: brandTokens.navy,
                borderRadius: 8,
                height: 38,
                fontWeight: 500,
              }}
            >
              {t('common.save')}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: isDarkMode ? 'rgba(59, 130, 246, 0.16)' : 'rgba(30, 58, 138, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                color: brandTokens.navy,
              }}
            >
              <EditOutlined />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16, color: semantic.textPrimary, lineHeight: 1.3 }}>
                {t('configuration.documents.editTitle')}
              </div>
              <div style={{ fontSize: 12, color: semantic.textSecondary, fontWeight: 400 }}>
                {selectedDoc?.name || t('configuration.documents.editSubtitle', 'Modify document definition')}
              </div>
            </div>
          </div>
        }
        open={isEditModalOpen}
        onCancel={() => {
          setIsEditModalOpen(false);
          setSelectedDoc(null);
        }}
        footer={null}
        destroyOnHidden
        styles={{
          content: {
            borderRadius: 14,
            border: `1px solid ${semantic.borderDefault}`,
            background: semantic.bgCard,
            padding: 0,
            overflow: 'hidden',
          },
          header: {
            background: semantic.bgCard,
            borderBottom: `1px solid ${semantic.borderSubtle}`,
            padding: '18px 24px',
            margin: 0,
          },
          body: {
            padding: '20px 24px',
          },
        }}
      >
        <Form form={editForm} layout="vertical" onFinish={handleEdit}>
          <Form.Item
            name="name"
            label={<span style={{ fontWeight: 500, color: semantic.textPrimary }}>{t('configuration.documents.name')}</span>}
            rules={[{ required: true, message: 'Document name is required' }]}
          >
            <Input style={{ borderRadius: 8, height: 38 }} />
          </Form.Item>

          <Form.Item
            name="code"
            label={<span style={{ fontWeight: 500, color: semantic.textPrimary }}>{t('configuration.documents.code')}</span>}
          >
            <Input style={{ textTransform: 'uppercase', borderRadius: 8, height: 38 }} />
          </Form.Item>

          <Form.Item
            name="isRequired"
            label={<span style={{ fontWeight: 500, color: semantic.textPrimary }}>{t('configuration.documents.isRequired')}</span>}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="acceptedFileTypes"
            label={<span style={{ fontWeight: 500, color: semantic.textPrimary }}>{t('configuration.documents.acceptedFileTypes')}</span>}
            rules={[{ required: true, message: 'At least one file type is required' }]}
          >
            <Select mode="tags" style={{ minHeight: 38 }}>
              {COMMON_FILE_TYPES.map((t) => (
                <Select.Option key={t} value={t}>
                  {t}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="maxFileSizeMb"
            label={<span style={{ fontWeight: 500, color: semantic.textPrimary }}>{t('configuration.documents.maxFileSize')}</span>}
            rules={[{ required: true, message: 'File size limit is required' }]}
          >
            <Space.Compact style={{ width: '100%' }}>
              <InputNumber min={1} max={100} style={{ width: '100%', height: 38, borderRadius: '8px 0 0 8px' }} />
              <Button disabled style={{ pointerEvents: 'none', color: '#8c8c8c', height: 38, borderRadius: '0 8px 8px 0' }}>MB</Button>
            </Space.Compact>
          </Form.Item>

          <Form.Item
            name="description"
            label={<span style={{ fontWeight: 500, color: semantic.textPrimary }}>{t('configuration.documents.description')}</span>}
          >
            <Input.TextArea rows={3} style={{ borderRadius: 8 }} />
          </Form.Item>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              marginTop: 24,
              paddingTop: 16,
              borderTop: `1px solid ${semantic.borderSubtle}`,
            }}
          >
            <Button
              onClick={() => {
                setIsEditModalOpen(false);
                setSelectedDoc(null);
              }}
              disabled={submitting}
              style={{ borderRadius: 8, height: 38 }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              style={{
                backgroundColor: brandTokens.navy,
                borderColor: brandTokens.navy,
                borderRadius: 8,
                height: 38,
                fontWeight: 500,
              }}
            >
              {t('common.save')}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* View Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: isDarkMode ? 'rgba(59, 130, 246, 0.16)' : 'rgba(30, 58, 138, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                color: brandTokens.navy,
              }}
            >
              <EyeOutlined />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16, color: semantic.textPrimary, lineHeight: 1.3 }}>
                {selectedDoc?.name || t('configuration.documents.viewTitle', 'Document Details')}
              </div>
              <div style={{ fontSize: 12, color: semantic.textSecondary, fontWeight: 400 }}>
                {t('configuration.documents.viewSubtitle', 'Document compliance rules and allowed formats')}
              </div>
            </div>
          </div>
        }
        open={isViewModalOpen}
        onCancel={() => {
          setIsViewModalOpen(false);
          setSelectedDoc(null);
        }}
        styles={{
          content: {
            borderRadius: 14,
            border: `1px solid ${semantic.borderDefault}`,
            background: semantic.bgCard,
            padding: 0,
            overflow: 'hidden',
          },
          header: {
            background: semantic.bgCard,
            borderBottom: `1px solid ${semantic.borderSubtle}`,
            padding: '18px 24px',
            margin: 0,
          },
          body: {
            padding: '20px 24px',
          },
          footer: {
            borderTop: `1px solid ${semantic.borderSubtle}`,
            padding: '14px 24px',
            margin: 0,
          },
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setIsViewModalOpen(false);
              setSelectedDoc(null);
            }}
            style={{ borderRadius: 8, height: 38 }}
          >
            {t('common.back')}
          </Button>,
        ]}
      >
        {selectedDoc && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 12,
                padding: 16,
                borderRadius: 10,
                background: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                border: `1px solid ${semantic.borderSubtle}`,
              }}
            >
              <div>
                <div style={{ fontSize: 12, color: semantic.textSecondary, marginBottom: 4 }}>
                  {t('configuration.documents.name')}
                </div>
                <Text strong style={{ fontSize: 14, color: semantic.textPrimary }}>
                  {selectedDoc.name}
                </Text>
              </div>

              <div>
                <div style={{ fontSize: 12, color: semantic.textSecondary, marginBottom: 4 }}>
                  {t('configuration.documents.code')}
                </div>
                <div>
                  {selectedDoc.code ? (
                    <Tag color="blue" style={{ borderRadius: 6, fontWeight: 500, margin: 0 }}>
                      {selectedDoc.code}
                    </Tag>
                  ) : (
                    <span style={{ color: semantic.textSecondary }}>—</span>
                  )}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: semantic.textSecondary, marginBottom: 4 }}>
                  {t('configuration.documents.isRequired')}
                </div>
                <div>
                  <Tag
                    color={selectedDoc.isRequired ? 'error' : 'default'}
                    style={{ borderRadius: 6, margin: 0 }}
                  >
                    {selectedDoc.isRequired
                      ? t('configuration.documents.requiredTag')
                      : t('configuration.documents.optionalTag')}
                  </Tag>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: semantic.textSecondary, marginBottom: 4 }}>
                  {t('configuration.documents.maxFileSize')}
                </div>
                <div style={{ fontWeight: 600, color: semantic.textPrimary }}>
                  {selectedDoc.maxFileSizeMb} MB
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: semantic.textSecondary, marginBottom: 4 }}>
                  {t('common.status')}
                </div>
                <div>
                  <StatusBadge status={selectedDoc.status} />
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: semantic.textSecondary, marginBottom: 4 }}>
                  {t('configuration.documents.acceptedFileTypes')}
                </div>
                <Space wrap size={4}>
                  {(selectedDoc.acceptedFileTypes || []).map((type) => (
                    <Tag key={type} color="cyan" style={{ borderRadius: 6, margin: 0 }}>
                      {type}
                    </Tag>
                  ))}
                </Space>
              </div>
            </div>

            {selectedDoc.description && (
              <div>
                <div style={{ fontSize: 12, color: semantic.textSecondary, marginBottom: 6 }}>
                  {t('configuration.documents.description')}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: semantic.textPrimary,
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                    border: `1px solid ${semantic.borderSubtle}`,
                    lineHeight: 1.5,
                  }}
                >
                  {selectedDoc.description}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={isDeleteModalOpen}
        recordTitle={selectedDoc?.name}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setSelectedDoc(null);
        }}
        onConfirm={handleDeleteConfirm}
        loading={submitting}
      />
    </div>
  );
}
