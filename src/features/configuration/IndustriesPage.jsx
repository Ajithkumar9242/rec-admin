import React, { useState, useEffect, useCallback, useMemo, useContext } from 'react';
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
import { ReactReduxContext } from 'react-redux';
import { DataTable, StatusBadge } from '../../components/common/DataTable.jsx';
import { DeleteConfirmationModal } from '../../components/common/DeleteConfirmationModal.jsx';
import { configurationApi, formatConfigurationError } from '../../services/configurationApi.js';
import { brandTokens, lightSemanticTokens, darkSemanticTokens } from '../../theme/tokens.js';

const { Text, Paragraph } = Typography;
const { Option } = Select;

export function IndustriesPage() {
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
              <ApartmentOutlined />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16, color: semantic.textPrimary, lineHeight: 1.3 }}>
                {t('configuration.industries.createTitle')}
              </div>
              <div style={{ fontSize: 12, color: semantic.textSecondary, fontWeight: 400 }}>
                {t('configuration.industries.createSubtitle', 'Define a new industry taxonomy or sector')}
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
            label={<span style={{ fontWeight: 500, color: semantic.textPrimary }}>{t('configuration.industries.name')}</span>}
            rules={[
              { required: true, message: 'Industry name is required' },
              { min: 2, message: 'Minimum 2 characters' },
            ]}
          >
            <Input placeholder="e.g. Information Technology" style={{ borderRadius: 8, height: 38 }} />
          </Form.Item>

          <Form.Item
            name="code"
            label={<span style={{ fontWeight: 500, color: semantic.textPrimary }}>{t('configuration.industries.code')}</span>}
          >
            <Input placeholder="e.g. IT, HEALTH, AUTO" style={{ textTransform: 'uppercase', borderRadius: 8, height: 38 }} />
          </Form.Item>

          <Form.Item
            name="parentId"
            label={<span style={{ fontWeight: 500, color: semantic.textPrimary }}>{t('configuration.industries.parent')}</span>}
            extra={<span style={{ fontSize: 12, color: semantic.textSecondary }}>{t('configuration.industries.parentHelp')}</span>}
          >
            <Select
              allowClear
              showSearch
              placeholder={t('configuration.industries.rootLevel')}
              optionFilterProp="children"
              style={{ height: 38 }}
            >
              {rootIndustryOptions.map((ind) => (
                <Option key={ind.id} value={ind.id}>
                  {ind.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label={<span style={{ fontWeight: 500, color: semantic.textPrimary }}>{t('configuration.industries.description')}</span>}
          >
            <Input.TextArea rows={3} placeholder="Optional operational description..." style={{ borderRadius: 8 }} />
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

      {/* Edit Industry Modal */}
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
                {t('configuration.industries.editTitle')}
              </div>
              <div style={{ fontSize: 12, color: semantic.textSecondary, fontWeight: 400 }}>
                {selectedIndustry?.name || t('configuration.industries.editSubtitle', 'Modify industry taxonomy')}
              </div>
            </div>
          </div>
        }
        open={isEditModalOpen}
        onCancel={() => {
          setIsEditModalOpen(false);
          setSelectedIndustry(null);
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
            label={<span style={{ fontWeight: 500, color: semantic.textPrimary }}>{t('configuration.industries.name')}</span>}
            rules={[{ required: true, message: 'Industry name is required' }]}
          >
            <Input style={{ borderRadius: 8, height: 38 }} />
          </Form.Item>

          <Form.Item
            name="code"
            label={<span style={{ fontWeight: 500, color: semantic.textPrimary }}>{t('configuration.industries.code')}</span>}
          >
            <Input style={{ textTransform: 'uppercase', borderRadius: 8, height: 38 }} />
          </Form.Item>

          <Form.Item
            name="parentId"
            label={<span style={{ fontWeight: 500, color: semantic.textPrimary }}>{t('configuration.industries.parent')}</span>}
            extra={<span style={{ fontSize: 12, color: semantic.textSecondary }}>{t('configuration.industries.parentHelp')}</span>}
          >
            <Select allowClear showSearch optionFilterProp="children" style={{ height: 38 }}>
              {rootIndustryOptions
                .filter((ind) => ind.id !== selectedIndustry?.id)
                .map((ind) => (
                  <Option key={ind.id} value={ind.id}>
                    {ind.name}
                  </Option>
                ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label={<span style={{ fontWeight: 500, color: semantic.textPrimary }}>{t('configuration.industries.description')}</span>}
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
                setSelectedIndustry(null);
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

      {/* View Industry Modal */}
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
                {selectedIndustry?.name || t('configuration.industries.viewTitle')}
              </div>
              <div style={{ fontSize: 12, color: semantic.textSecondary, fontWeight: 400 }}>
                {t('configuration.industries.viewSubtitle', 'Industry taxonomy and sector configuration details')}
              </div>
            </div>
          </div>
        }
        open={isViewModalOpen}
        onCancel={() => {
          setIsViewModalOpen(false);
          setSelectedIndustry(null);
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
              setSelectedIndustry(null);
            }}
            style={{ borderRadius: 8, height: 38 }}
          >
            {t('common.back')}
          </Button>,
        ]}
      >
        {selectedIndustry && (
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
                  {t('configuration.industries.name')}
                </div>
                <Text strong style={{ fontSize: 14, color: semantic.textPrimary }}>
                  {selectedIndustry.name}
                </Text>
              </div>

              <div>
                <div style={{ fontSize: 12, color: semantic.textSecondary, marginBottom: 4 }}>
                  {t('configuration.industries.code')}
                </div>
                <div>
                  {selectedIndustry.code ? (
                    <Tag color="blue" style={{ borderRadius: 6, fontWeight: 500, margin: 0 }}>
                      {selectedIndustry.code}
                    </Tag>
                  ) : (
                    <span style={{ color: semantic.textSecondary }}>—</span>
                  )}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: semantic.textSecondary, marginBottom: 4 }}>
                  {t('configuration.industries.parent')}
                </div>
                <div>
                  {selectedIndustry.parent ? (
                    <Tag color="cyan" style={{ borderRadius: 6, margin: 0 }}>
                      {selectedIndustry.parent.name}
                    </Tag>
                  ) : (
                    <Tag color="default" style={{ borderRadius: 6, margin: 0 }}>
                      {t('configuration.industries.rootLevel')}
                    </Tag>
                  )}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: semantic.textSecondary, marginBottom: 4 }}>
                  {t('common.status')}
                </div>
                <div>
                  <StatusBadge status={selectedIndustry.status} />
                </div>
              </div>
            </div>

            {selectedIndustry.description && (
              <div>
                <div style={{ fontSize: 12, color: semantic.textSecondary, marginBottom: 6 }}>
                  {t('configuration.industries.description')}
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
                  {selectedIndustry.description}
                </div>
              </div>
            )}

            {selectedIndustry.children && selectedIndustry.children.length > 0 && (
              <div>
                <div style={{ fontSize: 12, color: semantic.textSecondary, marginBottom: 6 }}>
                  {t('configuration.industries.subIndustries')} ({selectedIndustry.children.length})
                </div>
                <Space wrap size={6}>
                  {selectedIndustry.children.map((child) => (
                    <Tag
                      key={child.id}
                      color="purple"
                      style={{ borderRadius: 6, padding: '2px 8px', fontSize: 12 }}
                    >
                      {child.name}
                    </Tag>
                  ))}
                </Space>
              </div>
            )}
          </div>
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
