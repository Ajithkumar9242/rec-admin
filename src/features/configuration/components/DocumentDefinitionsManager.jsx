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
import { DataTable, StatusBadge } from '../../../components/common/DataTable.jsx';
import { DeleteConfirmationModal } from '../../../components/common/DeleteConfirmationModal.jsx';
import { configurationApi, formatConfigurationError } from '../../../services/configurationApi.js';
import { brandTokens } from '../../../theme/tokens.js';

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
        title={t('configuration.documents.createTitle')}
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreate} style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label={t('configuration.documents.name')}
            rules={[
              { required: true, message: 'Document name is required' },
              { min: 2, message: 'Minimum 2 characters' },
            ]}
          >
            <Input placeholder={isCompany ? 'e.g. Commercial Register Extract' : 'e.g. Resume / CV'} />
          </Form.Item>

          <Form.Item name="code" label={t('configuration.documents.code')}>
            <Input placeholder="e.g. HANDELSREGISTER, CV" style={{ textTransform: 'uppercase' }} />
          </Form.Item>

          <Form.Item
            name="isRequired"
            label={t('configuration.documents.isRequired')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="acceptedFileTypes"
            label={t('configuration.documents.acceptedFileTypes')}
            extra={t('configuration.documents.acceptedFileTypesHelp')}
            rules={[{ required: true, message: 'At least one file type is required' }]}
          >
            <Select mode="tags" placeholder="Select or type file extensions/MIME types">
              {COMMON_FILE_TYPES.map((t) => (
                <Select.Option key={t} value={t}>
                  {t}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="maxFileSizeMb"
            label={t('configuration.documents.maxFileSize')}
            rules={[{ required: true, message: 'File size limit is required' }]}
          >
            <Space.Compact style={{ width: '100%' }}>
              <InputNumber min={1} max={100} style={{ width: '100%' }} />
              <Button disabled style={{ pointerEvents: 'none', color: '#8c8c8c' }}>MB</Button>
            </Space.Compact>
          </Form.Item>

          <Form.Item name="description" label={t('configuration.documents.description')}>
            <Input.TextArea rows={3} placeholder="Optional instructions or verification guidelines..." />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
            <Button onClick={() => setIsCreateModalOpen(false)}>{t('common.cancel')}</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              style={{ backgroundColor: brandTokens.navy, borderColor: brandTokens.navy }}
            >
              {t('common.save')}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title={t('configuration.documents.editTitle')}
        open={isEditModalOpen}
        onCancel={() => {
          setIsEditModalOpen(false);
          setSelectedDoc(null);
        }}
        footer={null}
        destroyOnHidden
      >
        <Form form={editForm} layout="vertical" onFinish={handleEdit} style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label={t('configuration.documents.name')}
            rules={[{ required: true, message: 'Document name is required' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="code" label={t('configuration.documents.code')}>
            <Input style={{ textTransform: 'uppercase' }} />
          </Form.Item>

          <Form.Item
            name="isRequired"
            label={t('configuration.documents.isRequired')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="acceptedFileTypes"
            label={t('configuration.documents.acceptedFileTypes')}
            rules={[{ required: true, message: 'At least one file type is required' }]}
          >
            <Select mode="tags">
              {COMMON_FILE_TYPES.map((t) => (
                <Select.Option key={t} value={t}>
                  {t}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="maxFileSizeMb"
            label={t('configuration.documents.maxFileSize')}
            rules={[{ required: true, message: 'File size limit is required' }]}
          >
            <Space.Compact style={{ width: '100%' }}>
              <InputNumber min={1} max={100} style={{ width: '100%' }} />
              <Button disabled style={{ pointerEvents: 'none', color: '#8c8c8c' }}>MB</Button>
            </Space.Compact>
          </Form.Item>

          <Form.Item name="description" label={t('configuration.documents.description')}>
            <Input.TextArea rows={3} />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
            <Button
              onClick={() => {
                setIsEditModalOpen(false);
                setSelectedDoc(null);
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              style={{ backgroundColor: brandTokens.navy, borderColor: brandTokens.navy }}
            >
              {t('common.save')}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* View Modal */}
      <Modal
        title={selectedDoc?.name}
        open={isViewModalOpen}
        onCancel={() => {
          setIsViewModalOpen(false);
          setSelectedDoc(null);
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setIsViewModalOpen(false);
              setSelectedDoc(null);
            }}
          >
            {t('common.back')}
          </Button>,
        ]}
      >
        {selectedDoc && (
          <Descriptions column={1} bordered size="small" style={{ marginTop: 16 }}>
            <Descriptions.Item label={t('configuration.documents.name')}>
              <Text strong>{selectedDoc.name}</Text>
            </Descriptions.Item>
            <Descriptions.Item label={t('configuration.documents.code')}>
              {selectedDoc.code ? <Tag color="blue">{selectedDoc.code}</Tag> : '—'}
            </Descriptions.Item>
            <Descriptions.Item label={t('configuration.documents.isRequired')}>
              <Tag color={selectedDoc.isRequired ? 'error' : 'default'}>
                {selectedDoc.isRequired
                  ? t('configuration.documents.requiredTag')
                  : t('configuration.documents.optionalTag')}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t('configuration.documents.acceptedFileTypes')}>
              <Space wrap size={4}>
                {(selectedDoc.acceptedFileTypes || []).map((type) => (
                  <Tag key={type} color="cyan">
                    {type}
                  </Tag>
                ))}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label={t('configuration.documents.maxFileSize')}>
              {selectedDoc.maxFileSizeMb} MB
            </Descriptions.Item>
            <Descriptions.Item label={t('common.status')}>
              <StatusBadge status={selectedDoc.status} />
            </Descriptions.Item>
            <Descriptions.Item label={t('configuration.documents.description')}>
              {selectedDoc.description || '—'}
            </Descriptions.Item>
          </Descriptions>
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
