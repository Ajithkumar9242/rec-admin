import React, { useState } from 'react';
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
}) {
  const { t } = useTranslation();
  const [mode, setMode] = useState('MOVE_TO_TRASH');

  const handleOk = () => {
    onConfirm(mode);
  };

  return (
    <Modal
      open={open}
      title={
        <Space>
          <ExclamationCircleOutlined style={{ color: brandTokens.amber }} />
          <span>{t('trash.deleteTitle')}</span>
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
          danger={mode === 'DELETE_PERMANENTLY'}
          style={
            mode === 'MOVE_TO_TRASH'
              ? { backgroundColor: brandTokens.navy, borderColor: brandTokens.navy }
              : undefined
          }
          loading={loading}
          onClick={handleOk}
        >
          {mode === 'MOVE_TO_TRASH' ? t('trash.moveToTrash') : t('trash.permanentDelete')}
        </Button>,
      ]}
      destroyOnClose
    >
      <div style={{ padding: '8px 0' }}>
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
      </div>
    </Modal>
  );
}
