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
import { ReactReduxContext } from 'react-redux';
import { DataTable, StatusBadge } from '../../components/common/DataTable.jsx';
import { DeleteConfirmationModal } from '../../components/common/DeleteConfirmationModal.jsx';
import { configurationApi, formatConfigurationError } from '../../services/configurationApi.js';
import { brandTokens, lightSemanticTokens, darkSemanticTokens } from '../../theme/tokens.js';

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
              <ProjectOutlined />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16, color: semantic.textPrimary, lineHeight: 1.3 }}>
                {t('configuration.stages.createTitle')}
              </div>
              <div style={{ fontSize: 12, color: semantic.textSecondary, fontWeight: 400 }}>
                {t('configuration.stages.createSubtitle', 'Configure a new stage in the recruitment hiring funnel')}
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
            label={<span style={{ fontWeight: 500, color: semantic.textPrimary }}>{t('configuration.stages.name')}</span>}
            rules={[
              { required: true, message: 'Stage name is required' },
              { min: 2, message: 'Minimum 2 characters' },
            ]}
          >
            <Input placeholder="e.g. Technical Interview" style={{ borderRadius: 8, height: 38 }} />
          </Form.Item>

          <Form.Item
            name="category"
            label={<span style={{ fontWeight: 500, color: semantic.textPrimary }}>{t('configuration.stages.category')}</span>}
            rules={[{ required: true, message: 'Category is required' }]}
          >
            <Select style={{ height: 38 }}>
              {Object.keys(CATEGORY_COLORS).map((cat) => (
                <Option key={cat} value={cat}>
                  {cat}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label={<span style={{ fontWeight: 500, color: semantic.textPrimary }}>{t('configuration.stages.description')}</span>}
          >
            <Input.TextArea rows={3} placeholder="Stage workflow description and guidelines..." style={{ borderRadius: 8 }} />
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

      {/* Edit Stage Modal */}
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
                {t('configuration.stages.editTitle')}
              </div>
              <div style={{ fontSize: 12, color: semantic.textSecondary, fontWeight: 400 }}>
                {selectedStage?.name || t('configuration.stages.editSubtitle', 'Modify recruitment workflow stage')}
              </div>
            </div>
          </div>
        }
        open={isEditModalOpen}
        onCancel={() => {
          setIsEditModalOpen(false);
          setSelectedStage(null);
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
            label={<span style={{ fontWeight: 500, color: semantic.textPrimary }}>{t('configuration.stages.name')}</span>}
            rules={[{ required: true, message: 'Stage name is required' }]}
          >
            <Input style={{ borderRadius: 8, height: 38 }} />
          </Form.Item>

          <Form.Item
            name="category"
            label={<span style={{ fontWeight: 500, color: semantic.textPrimary }}>{t('configuration.stages.category')}</span>}
            rules={[{ required: true, message: 'Category is required' }]}
          >
            <Select style={{ height: 38 }}>
              {Object.keys(CATEGORY_COLORS).map((cat) => (
                <Option key={cat} value={cat}>
                  {cat}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label={<span style={{ fontWeight: 500, color: semantic.textPrimary }}>{t('configuration.stages.description')}</span>}
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
                setSelectedStage(null);
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

      {/* View Stage Modal */}
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
                {selectedStage?.name || t('configuration.stages.viewTitle', 'Stage Details')}
              </div>
              <div style={{ fontSize: 12, color: semantic.textSecondary, fontWeight: 400 }}>
                {t('configuration.stages.viewSubtitle', 'Hiring pipeline stage configuration')}
              </div>
            </div>
          </div>
        }
        open={isViewModalOpen}
        onCancel={() => {
          setIsViewModalOpen(false);
          setSelectedStage(null);
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
              setSelectedStage(null);
            }}
            style={{ borderRadius: 8, height: 38 }}
          >
            {t('common.back')}
          </Button>,
        ]}
      >
        {selectedStage && (
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
                  {t('configuration.stages.name')}
                </div>
                <Text strong style={{ fontSize: 14, color: semantic.textPrimary }}>
                  {selectedStage.name}
                </Text>
              </div>

              <div>
                <div style={{ fontSize: 12, color: semantic.textSecondary, marginBottom: 4 }}>
                  {t('configuration.stages.category')}
                </div>
                <div>
                  <Tag color={CATEGORY_COLORS[selectedStage.category]} style={{ borderRadius: 6, margin: 0 }}>
                    {selectedStage.category}
                  </Tag>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: semantic.textSecondary, marginBottom: 4 }}>
                  {t('configuration.stages.order')}
                </div>
                <div style={{ fontWeight: 600, color: semantic.textPrimary }}>
                  #{selectedStage.order + 1}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: semantic.textSecondary, marginBottom: 4 }}>
                  {t('common.status')}
                </div>
                <div>
                  <StatusBadge status={selectedStage.status} />
                </div>
              </div>
            </div>

            {selectedStage.description && (
              <div>
                <div style={{ fontSize: 12, color: semantic.textSecondary, marginBottom: 6 }}>
                  {t('configuration.stages.description')}
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
                  {selectedStage.description}
                </div>
              </div>
            )}
          </div>
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
