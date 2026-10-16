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
  Tooltip,
} from 'antd';
import {
  ProjectOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { DataTable, StatusBadge } from '../../components/common/DataTable.jsx';
import { DeleteConfirmationModal } from '../../components/common/DeleteConfirmationModal.jsx';
import { configurationApi, formatConfigurationError } from '../../services/configurationApi.js';
import { brandTokens } from '../../theme/tokens.js';

const { Text } = Typography;
const { Option } = Select;

const CATEGORY_COLORS = {
  SOURCING: 'default',
  SCREENING: 'processing',
  INTERVIEW: 'purple',
  EVALUATION: 'cyan',
  OFFER: 'warning',
  HIRED: 'success',
  REJECTED: 'error',
  OTHER: 'default',
};

export function RecruitmentStagesPage() {
  const { t } = useTranslation();
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [error, setError] = useState(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const fetchStages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await configurationApi.getRecruitmentStages();
      if (res.success) {
        setStages(res.data || []);
      }
    } catch (err) {
      setError(formatConfigurationError(err, 'Failed to fetch recruitment stages.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStages();
  }, [fetchStages]);

  const handleCreate = async (values) => {
    try {
      setSubmitting(true);
      await configurationApi.createRecruitmentStage(values);
      message.success(t('configuration.stages.createSuccess'));
      setIsCreateModalOpen(false);
      createForm.resetFields();
      await fetchStages();
    } catch (err) {
      message.error(formatConfigurationError(err, 'Failed to create recruitment stage.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (values) => {
    if (!selectedStage) return;
    try {
      setSubmitting(true);
      await configurationApi.updateRecruitmentStage(selectedStage.id, values);
      message.success(t('configuration.stages.updateSuccess'));
      setIsEditModalOpen(false);
      setSelectedStage(null);
      editForm.resetFields();
      await fetchStages();
    } catch (err) {
      message.error(formatConfigurationError(err, 'Failed to update recruitment stage.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleMove = async (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stages.length) return;

    const newStages = [...stages];
    const temp = newStages[index];
    newStages[index] = newStages[targetIndex];
    newStages[targetIndex] = temp;

    // Create normalized order array: 0, 1, 2, ...
    const reorderPayload = newStages.map((s, idx) => ({
      id: s.id,
      order: idx,
    }));

    try {
      setReordering(true);
      await configurationApi.reorderRecruitmentStages(reorderPayload);
      message.success(t('configuration.stages.reorderSuccess'));
      await fetchStages();
    } catch (err) {
      message.error(formatConfigurationError(err, 'Failed to persist recruitment stage order.'));
    } finally {
      setReordering(false);
    }
  };

  const handleToggleStatus = async (record) => {
    const newStatus = record.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await configurationApi.toggleStageStatus(record.id, newStatus);
      message.success(t('configuration.stages.toggleSuccess'));
      await fetchStages();
    } catch (err) {
      message.error(formatConfigurationError(err, 'Failed to update stage status.'));
    }
  };

  const handleDeleteConfirm = async (mode) => {
    if (!selectedStage) return;
    try {
      setSubmitting(true);
      await configurationApi.deleteRecruitmentStage(selectedStage.id, mode);
      message.success(
        mode === 'DELETE_PERMANENTLY'
          ? 'Recruitment stage permanently deleted.'
          : 'Recruitment stage moved to Trash.'
      );
      setIsDeleteModalOpen(false);
      setSelectedStage(null);
      await fetchStages();
    } catch (err) {
      message.error(formatConfigurationError(err, 'Failed to delete recruitment stage.'));
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (record) => {
    setSelectedStage(record);
    editForm.setFieldsValue({
      name: record.name,
      category: record.category,
      description: record.description,
      order: record.order,
    });
    setIsEditModalOpen(true);
  };

  const openViewModal = (record) => {
    setSelectedStage(record);
    setIsViewModalOpen(true);
  };

  const openDeleteModal = (record) => {
    setSelectedStage(record);
    setIsDeleteModalOpen(true);
  };

  const columns = [
    {
      title: t('configuration.stages.order'),
      dataIndex: 'order',
      key: 'order',
      width: 80,
      render: (order) => <Tag color="geekblue">#{order + 1}</Tag>,
    },
    {
      title: t('configuration.stages.name'),
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <Space>
          <ProjectOutlined style={{ color: brandTokens.navy }} />
          <Text strong style={{ color: brandTokens.navy }}>
            {name}
          </Text>
          {record.isSystem && (
            <Tooltip title={t('configuration.stages.systemStage')}>
              <Tag icon={<SafetyCertificateOutlined />} color="gold">
                System
              </Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: t('configuration.stages.category'),
      dataIndex: 'category',
      key: 'category',
      render: (category) => (
        <Tag color={CATEGORY_COLORS[category] || 'default'}>
          {category}
        </Tag>
      ),
    },
    {
      title: t('configuration.stages.description'),
      dataIndex: 'description',
      key: 'description',
      render: (desc) => (desc ? <Text type="secondary">{desc}</Text> : '—'),
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
    {
      title: 'Reorder',
      key: 'reorder',
      width: 110,
      render: (_, record, index) => (
        <Space size={4}>
          <Tooltip title={t('configuration.stages.moveUp')}>
            <Button
              size="small"
              icon={<ArrowUpOutlined />}
              disabled={index === 0 || reordering}
              onClick={() => handleMove(index, 'up')}
            />
          </Tooltip>
          <Tooltip title={t('configuration.stages.moveDown')}>
            <Button
              size="small"
              icon={<ArrowDownOutlined />}
              disabled={index === stages.length - 1 || reordering}
              onClick={() => handleMove(index, 'down')}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <DataTable
        title={t('configuration.stages.title')}
        subtitle={t('configuration.stages.subtitle')}
        columns={columns}
        dataSource={stages}
        loading={loading || reordering}
        error={error}
        onRefresh={fetchStages}
        onCreate={() => {
          createForm.resetFields();
          createForm.setFieldsValue({ category: 'SCREENING' });
          setIsCreateModalOpen(true);
        }}
        createButtonText={t('configuration.stages.create')}
        onView={openViewModal}
        onEdit={openEditModal}
        onDelete={openDeleteModal}
        exportFilename="recruitment_stages_export"
      />

      {/* Create Stage Modal */}
      <Modal
        title={t('configuration.stages.createTitle')}
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreate} style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label={t('configuration.stages.name')}
            rules={[
              { required: true, message: 'Stage name is required' },
              { min: 2, message: 'Minimum 2 characters' },
            ]}
          >
            <Input placeholder="e.g. Technical Interview" />
          </Form.Item>

          <Form.Item
            name="category"
            label={t('configuration.stages.category')}
            rules={[{ required: true, message: 'Category is required' }]}
          >
            <Select>
              {Object.keys(CATEGORY_COLORS).map((cat) => (
                <Option key={cat} value={cat}>
                  {cat}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="description" label={t('configuration.stages.description')}>
            <Input.TextArea rows={3} placeholder="Stage workflow description and guidelines..." />
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

      {/* Edit Stage Modal */}
      <Modal
        title={t('configuration.stages.editTitle')}
        open={isEditModalOpen}
        onCancel={() => {
          setIsEditModalOpen(false);
          setSelectedStage(null);
        }}
        footer={null}
        destroyOnHidden
      >
        <Form form={editForm} layout="vertical" onFinish={handleEdit} style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label={t('configuration.stages.name')}
            rules={[{ required: true, message: 'Stage name is required' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="category"
            label={t('configuration.stages.category')}
            rules={[{ required: true, message: 'Category is required' }]}
          >
            <Select>
              {Object.keys(CATEGORY_COLORS).map((cat) => (
                <Option key={cat} value={cat}>
                  {cat}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="description" label={t('configuration.stages.description')}>
            <Input.TextArea rows={3} />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
            <Button
              onClick={() => {
                setIsEditModalOpen(false);
                setSelectedStage(null);
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

      {/* View Stage Modal */}
      <Modal
        title={selectedStage?.name}
        open={isViewModalOpen}
        onCancel={() => {
          setIsViewModalOpen(false);
          setSelectedStage(null);
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setIsViewModalOpen(false);
              setSelectedStage(null);
            }}
          >
            {t('common.back')}
          </Button>,
        ]}
      >
        {selectedStage && (
          <Descriptions column={1} bordered size="small" style={{ marginTop: 16 }}>
            <Descriptions.Item label={t('configuration.stages.name')}>
              <Text strong>{selectedStage.name}</Text>
            </Descriptions.Item>
            <Descriptions.Item label={t('configuration.stages.category')}>
              <Tag color={CATEGORY_COLORS[selectedStage.category]}>
                {selectedStage.category}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t('configuration.stages.order')}>
              #{selectedStage.order + 1}
            </Descriptions.Item>
            <Descriptions.Item label={t('common.status')}>
              <StatusBadge status={selectedStage.status} />
            </Descriptions.Item>
            <Descriptions.Item label={t('configuration.stages.description')}>
              {selectedStage.description || '—'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Delete / Trash Confirmation Modal */}
      <DeleteConfirmationModal
        open={isDeleteModalOpen}
        recordTitle={selectedStage?.name}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setSelectedStage(null);
        }}
        onConfirm={handleDeleteConfirm}
        loading={submitting}
      />
    </div>
  );
}
