import React, { useState, useMemo, useContext, useEffect } from 'react';
import {
  Table,
  Input,
  Button,
  Space,
  Tag,
  Tooltip,
  Dropdown,
  Card,
  Alert,
  Typography,
} from 'antd';
import {
  SearchOutlined,
  DownloadOutlined,
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { ReactReduxContext } from 'react-redux';
import { brandTokens, lightSemanticTokens, darkSemanticTokens } from '../../theme/tokens.js';
import { exportToCsv } from '../../utils/exportUtils.js';

const { Text } = Typography;

function useSafeDarkMode() {
  const reduxContext = useContext(ReactReduxContext);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return reduxContext?.store ? Boolean(reduxContext.store.getState()?.theme?.isDarkMode) : false;
  });

  useEffect(() => {
    if (!reduxContext?.store) return;
    const unsubscribe = reduxContext.store.subscribe(() => {
      const current = Boolean(reduxContext.store.getState()?.theme?.isDarkMode);
      setIsDarkMode(current);
    });
    return unsubscribe;
  }, [reduxContext]);

  return isDarkMode;
}

/**
 * Standard Status Tag Badge for Active/Inactive and boolean flags
 */
export function StatusBadge({ status, activeLabel, inactiveLabel }) {
  const { t } = useTranslation();
  const isActive = String(status).toUpperCase() === 'ACTIVE' || status === true;
  return (
    <Tag color={isActive ? 'success' : 'default'}>
      {isActive ? (activeLabel || t('common.active')) : (inactiveLabel || t('common.inactive'))}
    </Tag>
  );
}

/**
 * Reusable Standard DataTable Component
 *
 * Provides canonical patterns for upcoming entity management modules:
 * - Built-in search with real-time filtering
 * - Standardized Active/Inactive badge formatting
 * - Standardized Actions column (View, Edit, Delete)
 * - Built-in CSV export with OWASP formula-injection protection
 * - Standardized pagination, loading, and empty states
 */
export function DataTable({
  columns = [],
  dataSource = [],
  loading = false,
  error = null,
  title = null,
  subtitle = null,
  searchPlaceholder = null,
  searchable = true,
  exportable = true,
  exportFilename = 'records_export',
  onCreate = null,
  createButtonText = null,
  onView = null,
  onEdit = null,
  onDelete = null,
  onRefresh = null,
  pagination = { pageSize: 10 },
  rowKey = 'id',
  extraActions = null,
  rowSelection = null,
}) {
  const { t } = useTranslation();
  const isDarkMode = useSafeDarkMode();
  const semantic = isDarkMode ? darkSemanticTokens : lightSemanticTokens;
  const [searchText, setSearchText] = useState('');

  // Client-side quick search filtering across all string fields
  const filteredData = useMemo(() => {
    if (!searchText || !Array.isArray(dataSource)) return dataSource;
    const lower = searchText.toLowerCase().trim();
    return dataSource.filter((item) =>
      Object.entries(item).some(([key, val]) => {
        if (typeof val === 'string' || typeof val === 'number') {
          return String(val).toLowerCase().includes(lower);
        }
        if (typeof val === 'object' && val !== null) {
          return Object.values(val).some(
            (nested) =>
              (typeof nested === 'string' || typeof nested === 'number') &&
              String(nested).toLowerCase().includes(lower)
          );
        }
        return false;
      })
    );
  }, [dataSource, searchText]);

  // Construct table columns including standardized Actions column if action handlers are provided
  const computedColumns = useMemo(() => {
    const list = [...columns];

    // Format boolean or enum status column if present
    const statusColIndex = list.findIndex(
      (c) => c.dataIndex === 'status' || c.key === 'status'
    );
    if (statusColIndex !== -1 && !list[statusColIndex].render) {
      list[statusColIndex] = {
        ...list[statusColIndex],
        render: (status) => <StatusBadge status={status} />,
      };
    }

    // Attach actions column
    if (onView || onEdit || onDelete) {
      list.push({
        title: t('table.actions'),
        key: 'actions_column',
        fixed: 'right',
        width: 130,
        render: (_, record) => (
          <Space size={4}>
            {onView && (
              <Tooltip title={t('table.view')}>
                <Button
                  type="text"
                  size="small"
                  icon={<EyeOutlined style={{ color: isDarkMode ? brandTokens.teal : brandTokens.navy }} />}
                  onClick={() => onView(record)}
                />
              </Tooltip>
            )}
            {onEdit && (
              <Tooltip title={t('table.edit')}>
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined style={{ color: brandTokens.teal }} />}
                  onClick={() => onEdit(record)}
                />
              </Tooltip>
            )}
            {onDelete && (
              <Tooltip title={t('table.delete')}>
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => onDelete(record)}
                />
              </Tooltip>
            )}
          </Space>
        ),
      });
    }

    return list;
  }, [columns, onView, onEdit, onDelete, t, isDarkMode]);

  const handleExport = () => {
    const exportableCols = columns.map((col) => ({
      key: col.dataIndex || col.key,
      label: col.title || col.dataIndex || col.key,
      render: col.render,
    }));
    exportToCsv(exportFilename, exportableCols, filteredData);
  };

  return (
    <Card
      variant="outlined"
      style={{
        borderRadius: 12,
        border: `1px solid ${semantic.borderDefault}`,
        background: semantic.bgCard,
      }}
      styles={{ body: { padding: 20 } }}
    >
      {(title || subtitle || searchable || exportable || onCreate) && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div>
            {title && (
              <div style={{ fontSize: 18, fontWeight: 600, color: semantic.textPrimary }}>
                {title}
              </div>
            )}
            {subtitle && (
              <div style={{ fontSize: 13, color: semantic.textSecondary, marginTop: 2 }}>
                {subtitle}
              </div>
            )}
          </div>

          <Space wrap size={12}>
            {searchable && (
              <Input
                prefix={<SearchOutlined style={{ color: semantic.textDisabled }} />}
                placeholder={searchPlaceholder || t('table.search')}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                style={{ width: 220, borderRadius: 8 }}
              />
            )}

            {onRefresh && (
              <Button
                icon={<ReloadOutlined />}
                onClick={onRefresh}
                loading={loading}
              >
                {t('dashboard.refresh')}
              </Button>
            )}

            {exportable && (
              <Button
                icon={<DownloadOutlined />}
                onClick={handleExport}
                disabled={filteredData.length === 0}
              >
                {t('table.exportCsv')}
              </Button>
            )}

            {onCreate && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                style={{
                  backgroundColor: isDarkMode ? brandTokens.teal : brandTokens.navy,
                  borderColor: isDarkMode ? brandTokens.teal : brandTokens.navy,
                  fontWeight: 600,
                }}
                onClick={onCreate}
              >
                {createButtonText || t('common.submit')}
              </Button>
            )}

            {extraActions}
          </Space>
        </div>
      )}

      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          action={
            onRefresh && (
              <Button size="small" danger onClick={onRefresh}>
                {t('common.retry') || 'Retry'}
              </Button>
            )
          }
          style={{ marginBottom: 16, borderRadius: 6 }}
        />
      )}

      <Table
        rowKey={rowKey}
        columns={computedColumns}
        dataSource={filteredData}
        loading={loading}
        rowSelection={rowSelection}
        pagination={
          pagination === false
            ? false
            : {
                showSizeChanger: true,
                pageSizeOptions: ['10', '25', '50', '100'],
                showTotal: (total) => t('table.totalRecords', { total }),
                ...pagination,
              }
        }
        scroll={{ x: 'max-content' }}
        style={{ borderRadius: 8 }}
      />
    </Card>
  );
}
