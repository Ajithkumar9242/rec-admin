import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Tag,
  Space,
  Button,
  message,
  Typography,
  Descriptions,
  Badge,
  Tooltip,
  Switch,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  ApartmentOutlined,
  TableOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { DataTable, StatusBadge } from '../../components/common/DataTable.jsx';
import { DeleteConfirmationModal } from '../../components/common/DeleteConfirmationModal.jsx';
import { configurationApi, formatConfigurationError } from '../../services/configurationApi.js';
import { brandTokens } from '../../theme/tokens.js';

const { Text, Paragraph } = Typography;
const { Option } = Select;

export function IndustriesPage() {
  const { t } = useTranslation();
  const [industries, setIndustries] = useState([]);
  const [hierarchyData, setHierarchyData] = useState([]);
  const [isHierarchyView, setIsHierarchyView] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const fetchIndustries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [listRes, hierRes] = await Promise.all([
        configurationApi.getIndustries({ limit: 100, sortBy: 'name', sortOrder: 'asc' }),
        configurationApi.getIndustries({ hierarchy: 'true' }),
      ]);

      if (listRes.success) {
        setIndustries(listRes.data || []);
      }
      if (hierRes.success) {
        setHierarchyData(hierRes.data || []);
      }
    } catch (err) {
      setError(formatConfigurationError(err, 'Failed to fetch industries.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIndustries();
  }, [fetchIndustries]);

  // List of active root industries for parent selectors
  const rootIndustryOptions = useMemo(() => {
    return industries.filter((ind) => !ind.parentId && ind.status === 'ACTIVE');
  }, [industries]);

  const handleCreate = async (values) => {
    try {
      setSubmitting(true);
      await configurationApi.createIndustry({
        ...values,
        parentId: values.parentId || null,
      });
      message.success(t('configuration.industries.createSuccess'));
      setIsCreateModalOpen(false);
      createForm.resetFields();
      await fetchIndustries();
    } catch (err) {
      message.error(formatConfigurationError(err, 'Failed to create industry.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (values) => {
    if (!selectedIndustry) return;
    try {
      setSubmitting(true);
      await configurationApi.updateIndustry(selectedIndustry.id, {
        ...values,
        parentId: values.parentId || null,
      });
      message.success(t('configuration.industries.updateSuccess'));
      setIsEditModalOpen(false);
      setSelectedIndustry(null);
      editForm.resetFields();
      await fetchIndustries();
    } catch (err) {
      message.error(formatConfigurationError(err, 'Failed to update industry.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (record) => {
    const newStatus = record.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await configurationApi.toggleIndustryStatus(record.id, newStatus);
      message.success(t('configuration.industries.toggleSuccess'));
      await fetchIndustries();
    } catch (err) {
      message.error(formatConfigurationError(err, 'Failed to update industry status.'));
    }
  };

  const handleDeleteConfirm = async (mode) => {
    if (!selectedIndustry) return;
    try {
      setSubmitting(true);
      await configurationApi.deleteIndustry(selectedIndustry.id, mode);
      message.success(
        mode === 'DELETE_PERMANENTLY'
          ? 'Industry permanently deleted.'
          : 'Industry moved to Trash.'
      );
      setIsDeleteModalOpen(false);
      setSelectedIndustry(null);
      await fetchIndustries();
    } catch (err) {
      message.error(formatConfigurationError(err, 'Failed to delete industry.'));
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (record) => {
    setSelectedIndustry(record);
    editForm.setFieldsValue({
      name: record.name,
      code: record.code,
      description: record.description,
      parentId: record.parentId || undefined,
    });
    setIsEditModalOpen(true);
  };

  const openViewModal = (record) => {
    setSelectedIndustry(record);
    setIsViewModalOpen(true);
  };

  const openDeleteModal = (record) => {
    setSelectedIndustry(record);
    setIsDeleteModalOpen(true);
  };

  const columns = [
    {
      title: t('configuration.industries.name'),
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <Space>
          <ApartmentOutlined style={{ color: record.parentId ? brandTokens.teal : brandTokens.navy }} />
          <Text strong style={{ color: record.parentId ? undefined : brandTokens.navy }}>
            {name}
          </Text>
        </Space>
      ),
    },
    {
      title: t('configuration.industries.code'),
      dataIndex: 'code',
      key: 'code',
      render: (code) => (code ? <Tag color="blue">{code}</Tag> : <Text type="secondary">—</Text>),
    },
    {
      title: t('configuration.industries.parent'),
      key: 'parent',
      render: (_, record) => {
        if (record.parent) {
          return <Tag color="cyan">{record.parent.name}</Tag>;
        }
        return <Tag color="default">{t('configuration.industries.rootLevel')}</Tag>;
      },
    },
    {
      title: t('configuration.industries.subIndustries'),
      key: 'subIndustries',
      render: (_, record) => {
        const count = record._count?.children || record.children?.length || 0;
        return (
          <Badge
            count={count}
            showZero
            style={{
              backgroundColor: count > 0 ? brandTokens.navy : '#b0c4cc',
              color: '#ffffff',
            }}
          />
        );
      },
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
        title={t('configuration.industries.title')}
        subtitle={t('configuration.industries.subtitle')}
        columns={columns}
        dataSource={isHierarchyView ? hierarchyData : industries}
        loading={loading}
        error={error}
        onRefresh={fetchIndustries}
        onCreate={() => {
          createForm.resetFields();
          setIsCreateModalOpen(true);
        }}
        createButtonText={t('configuration.industries.create')}
        onView={openViewModal}
        onEdit={openEditModal}
        onDelete={openDeleteModal}
        exportFilename="industries_sectors_export"
        extraActions={
          <Button
            icon={isHierarchyView ? <TableOutlined /> : <ApartmentOutlined />}
            onClick={() => setIsHierarchyView(!isHierarchyView)}
          >
            {isHierarchyView
              ? t('configuration.industries.tableView')
              : t('configuration.industries.hierarchyView')}
          </Button>
        }
      />

      {/* Create Industry Modal */}
      <Modal
        title={t('configuration.industries.createTitle')}
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreate} style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label={t('configuration.industries.name')}
            rules={[
              { required: true, message: 'Industry name is required' },
              { min: 2, message: 'Minimum 2 characters' },
            ]}
          >
            <Input placeholder="e.g. Information Technology" />
          </Form.Item>

          <Form.Item name="code" label={t('configuration.industries.code')}>
            <Input placeholder="e.g. IT, HEALTH, AUTO" style={{ textTransform: 'uppercase' }} />
          </Form.Item>

          <Form.Item
            name="parentId"
            label={t('configuration.industries.parent')}
            extra={t('configuration.industries.parentHelp')}
          >
            <Select
              allowClear
              showSearch
              placeholder={t('configuration.industries.rootLevel')}
              optionFilterProp="children"
            >
              {rootIndustryOptions.map((ind) => (
                <Option key={ind.id} value={ind.id}>
                  {ind.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="description" label={t('configuration.industries.description')}>
            <Input.TextArea rows={3} placeholder="Optional operational description..." />
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

      {/* Edit Industry Modal */}
      <Modal
        title={t('configuration.industries.editTitle')}
        open={isEditModalOpen}
        onCancel={() => {
          setIsEditModalOpen(false);
          setSelectedIndustry(null);
        }}
        footer={null}
        destroyOnHidden
      >
        <Form form={editForm} layout="vertical" onFinish={handleEdit} style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label={t('configuration.industries.name')}
            rules={[{ required: true, message: 'Industry name is required' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="code" label={t('configuration.industries.code')}>
            <Input style={{ textTransform: 'uppercase' }} />
          </Form.Item>

          <Form.Item
            name="parentId"
            label={t('configuration.industries.parent')}
            extra={t('configuration.industries.parentHelp')}
          >
            <Select allowClear showSearch optionFilterProp="children">
              {rootIndustryOptions
                .filter((ind) => ind.id !== selectedIndustry?.id)
                .map((ind) => (
                  <Option key={ind.id} value={ind.id}>
                    {ind.name}
                  </Option>
                ))}
            </Select>
          </Form.Item>

          <Form.Item name="description" label={t('configuration.industries.description')}>
            <Input.TextArea rows={3} />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
            <Button
              onClick={() => {
                setIsEditModalOpen(false);
                setSelectedIndustry(null);
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

      {/* View Industry Modal */}
      <Modal
        title={t('configuration.industries.viewTitle')}
        open={isViewModalOpen}
        onCancel={() => {
          setIsViewModalOpen(false);
          setSelectedIndustry(null);
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setIsViewModalOpen(false);
              setSelectedIndustry(null);
            }}
          >
            {t('common.back')}
          </Button>,
        ]}
      >
        {selectedIndustry && (
          <Descriptions column={1} bordered size="small" style={{ marginTop: 16 }}>
            <Descriptions.Item label={t('configuration.industries.name')}>
              <Text strong>{selectedIndustry.name}</Text>
            </Descriptions.Item>
            <Descriptions.Item label={t('configuration.industries.code')}>
              {selectedIndustry.code ? <Tag color="blue">{selectedIndustry.code}</Tag> : '—'}
            </Descriptions.Item>
            <Descriptions.Item label={t('configuration.industries.parent')}>
              {selectedIndustry.parent ? (
                <Tag color="cyan">{selectedIndustry.parent.name}</Tag>
              ) : (
                <Tag color="default">{t('configuration.industries.rootLevel')}</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label={t('common.status')}>
              <StatusBadge status={selectedIndustry.status} />
            </Descriptions.Item>
            <Descriptions.Item label={t('configuration.industries.description')}>
              {selectedIndustry.description || '—'}
            </Descriptions.Item>
            {selectedIndustry.children && selectedIndustry.children.length > 0 && (
              <Descriptions.Item label={t('configuration.industries.subIndustries')}>
                <Space wrap size={6}>
                  {selectedIndustry.children.map((child) => (
                    <Tag key={child.id} color="purple">
                      {child.name}
                    </Tag>
                  ))}
                </Space>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      {/* Delete / Trash Confirmation Modal */}
      <DeleteConfirmationModal
        open={isDeleteModalOpen}
        recordTitle={selectedIndustry?.name}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setSelectedIndustry(null);
        }}
        onConfirm={handleDeleteConfirm}
        loading={submitting}
      />
    </div>
  );
}
