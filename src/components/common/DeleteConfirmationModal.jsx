import React, { useState, useEffect, useContext } from 'react';
import { Modal, Radio, Space, Typography, Button, Alert } from 'antd';
import { DeleteOutlined, RestOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { ReactReduxContext } from 'react-redux';
import { brandTokens, lightSemanticTokens, darkSemanticTokens } from '../../theme/tokens.js';

const { Text, Paragraph } = Typography;

export function DeleteConfirmationModal({
  open,
  recordTitle,
  onCancel,
  onConfirm,
  loading = false,
  permanentOnly = false,
}) {
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
  const [mode, setMode] = useState(permanentOnly ? 'DELETE_PERMANENTLY' : 'MOVE_TO_TRASH');

  useEffect(() => {
    if (open) {
      setMode(permanentOnly ? 'DELETE_PERMANENTLY' : 'MOVE_TO_TRASH');
    }
  }, [open, permanentOnly]);

  const handleOk = () => {
    onConfirm(permanentOnly ? 'DELETE_PERMANENTLY' : mode);
  };

  const isPermanent = permanentOnly || mode === 'DELETE_PERMANENTLY';

  return (
    <Modal
      open={open}
      title={
        <Space size={10}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: isPermanent ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              color: isPermanent ? brandTokens.error : brandTokens.amber,
            }}
          >
            <ExclamationCircleOutlined />
          </div>
          <span style={{ fontWeight: 600, fontSize: 16, color: semantic.textPrimary }}>
            {permanentOnly ? t('trash.permanentDeleteTitle', 'Permanent Deletion') : t('trash.deleteTitle')}
          </span>
        </Space>
      }
      onCancel={onCancel}
      styles={{
        content: {
          borderRadius: 14,
          border: `1px solid ${semantic.borderDefault}`,
          background: semantic.bgCard,
        },
        header: {
          background: semantic.bgCard,
          borderBottom: `1px solid ${semantic.borderSubtle}`,
          paddingBottom: 14,
        },
        body: {
          paddingTop: 16,
          paddingBottom: 8,
        },
        footer: {
          borderTop: `1px solid ${semantic.borderSubtle}`,
          paddingTop: 14,
          marginTop: 16,
        },
      }}
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={loading} style={{ borderRadius: 8, height: 36 }}>
          {t('common.cancel')}
        </Button>,
        <Button
          key="confirm"
          type="primary"
          danger={isPermanent}
          style={
            !isPermanent
              ? { backgroundColor: brandTokens.navy, borderColor: brandTokens.navy, borderRadius: 8, height: 36, fontWeight: 600 }
              : { borderRadius: 8, height: 36, fontWeight: 600 }
          }
          loading={loading}
          onClick={handleOk}
        >
          {isPermanent ? t('trash.permanentDelete') : t('trash.moveToTrash')}
        </Button>,
      ]}
      destroyOnHidden
    >
      <div style={{ padding: '4px 0' }}>
        {permanentOnly ? (
          <div>
            <Paragraph style={{ color: semantic.textPrimary, fontSize: 14 }}>
              {t('trash.permanentDeleteConfirm', 'Are you sure you want to permanently delete')}{' '}
              {recordTitle ? <strong>"{recordTitle}"</strong> : ''}?
            </Paragraph>
            <Alert
              type="error"
              showIcon
              style={{ marginTop: 12, marginBottom: 8, borderRadius: 8 }}
              message={t(
                'trash.permanentDeleteWarning',
                'Warning: This action is permanent and cannot be undone. The company will be permanently removed from the database.'
              )}
            />
          </div>
        ) : (
          <>
            <Paragraph style={{ color: semantic.textPrimary, fontSize: 14 }}>
              {t('trash.deleteMessage')} {recordTitle ? <strong>"{recordTitle}"</strong> : ''}
            </Paragraph>

            <Radio.Group
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              style={{ width: '100%', marginTop: 8 }}
            >
              <Space direction="vertical" style={{ width: '100%', gap: 12 }}>
                <Radio
                  value="MOVE_TO_TRASH"
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    padding: '12px 16px',
                    border: `1px solid ${mode === 'MOVE_TO_TRASH' ? brandTokens.teal : semantic.borderDefault}`,
                    borderRadius: 10,
                    background: mode === 'MOVE_TO_TRASH'
                      ? (isDarkMode ? 'rgba(79, 168, 192, 0.1)' : brandTokens.tealBg)
                      : (isDarkMode ? 'rgba(255, 255, 255, 0.02)' : '#ffffff'),
                    transition: 'all 0.18s ease',
                  }}
                >
                  <div>
                    <Space size={8}>
                      <RestOutlined style={{ color: brandTokens.teal }} />
                      <Text strong style={{ color: semantic.textPrimary }}>{t('trash.moveToTrash')}</Text>
                    </Space>
                    <div style={{ fontSize: 12, color: semantic.textSecondary, marginTop: 4 }}>
                      {t('trash.moveToTrashDesc')}
                    </div>
                  </div>
                </Radio>

                <Radio
                  value="DELETE_PERMANENTLY"
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    padding: '12px 16px',
                    border: `1px solid ${mode === 'DELETE_PERMANENTLY' ? brandTokens.error : semantic.borderDefault}`,
                    borderRadius: 10,
                    background: mode === 'DELETE_PERMANENTLY'
                      ? (isDarkMode ? 'rgba(239, 68, 68, 0.1)' : brandTokens.errorLight)
                      : (isDarkMode ? 'rgba(255, 255, 255, 0.02)' : '#ffffff'),
                    transition: 'all 0.18s ease',
                  }}
                >
                  <div>
                    <Space size={8}>
                      <DeleteOutlined style={{ color: brandTokens.error }} />
                      <Text strong style={{ color: brandTokens.error }}>
                        {t('trash.permanentDelete')}
                      </Text>
                    </Space>
                    <div style={{ fontSize: 12, color: semantic.textSecondary, marginTop: 4 }}>
                      {t('trash.permanentDeleteDesc')}
                    </div>
                  </div>
                </Radio>
              </Space>
            </Radio.Group>

            {mode === 'DELETE_PERMANENTLY' && (
              <Alert
                type="warning"
                showIcon
                style={{ marginTop: 14, borderRadius: 8 }}
                message={t(
                  'trash.permanentDeleteWarning',
                  'Warning: This action is permanent and cannot be undone. The company will be permanently removed from the database.'
                )}
              />
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
