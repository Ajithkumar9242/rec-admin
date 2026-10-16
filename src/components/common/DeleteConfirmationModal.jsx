import React, { useState, useEffect } from 'react';
import { Modal, Radio, Space, Typography, Button, Alert } from 'antd';
import { DeleteOutlined, RestOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { brandTokens } from '../../theme/tokens.js';

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
        <Space>
          <ExclamationCircleOutlined style={{ color: isPermanent ? brandTokens.error : brandTokens.amber }} />
          <span>{permanentOnly ? t('trash.permanentDeleteTitle', 'Permanent Deletion') : t('trash.deleteTitle')}</span>
        </Space>
      }
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={loading}>
          {t('common.cancel')}
        </Button>,
        <Button
          key="confirm"
          type="primary"
          danger={isPermanent}
          style={
            !isPermanent
              ? { backgroundColor: brandTokens.navy, borderColor: brandTokens.navy }
              : undefined
          }
          loading={loading}
          onClick={handleOk}
        >
          {isPermanent ? t('trash.permanentDelete') : t('trash.moveToTrash')}
        </Button>,
      ]}
      destroyOnHidden
    >
      <div style={{ padding: '8px 0' }}>
        {permanentOnly ? (
          <div>
            <Paragraph>
              {t('trash.permanentDeleteConfirm', 'Are you sure you want to permanently delete')}{' '}
              {recordTitle ? <strong>"{recordTitle}"</strong> : ''}?
            </Paragraph>
            <Alert
              type="error"
              showIcon
              style={{ marginTop: 12, marginBottom: 8 }}
              message={t(
                'trash.permanentDeleteWarning',
                'Warning: This action is permanent and cannot be undone. The company will be permanently removed from the database.'
              )}
            />
          </div>
        ) : (
          <>
            <Paragraph>
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
                    border: `1px solid ${mode === 'MOVE_TO_TRASH' ? brandTokens.teal : '#e4edf0'}`,
                    borderRadius: 8,
                    background: mode === 'MOVE_TO_TRASH' ? brandTokens.tealBg : 'transparent',
                  }}
                >
                  <div>
                    <Space>
                      <RestOutlined style={{ color: brandTokens.teal }} />
                      <Text strong>{t('trash.moveToTrash')}</Text>
                    </Space>
                    <div style={{ fontSize: 12, color: '#5c7480', marginTop: 4 }}>
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
                    border: `1px solid ${mode === 'DELETE_PERMANENTLY' ? brandTokens.error : '#e4edf0'}`,
                    borderRadius: 8,
                    background: mode === 'DELETE_PERMANENTLY' ? brandTokens.errorLight : 'transparent',
                  }}
                >
                  <div>
                    <Space>
                      <DeleteOutlined style={{ color: brandTokens.error }} />
                      <Text strong style={{ color: brandTokens.error }}>
                        {t('trash.permanentDelete')}
                      </Text>
                    </Space>
                    <div style={{ fontSize: 12, color: '#5c7480', marginTop: 4 }}>
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
                style={{ marginTop: 14 }}
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
