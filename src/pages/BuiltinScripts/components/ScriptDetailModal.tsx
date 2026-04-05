/**
 * 脚本详情弹窗组件
 */

import React from 'react';
import { Modal, Button, Spin, Descriptions, Tag, Typography } from 'antd';
import type { ScriptDetailModalProps } from '../types';

const { Text } = Typography;

/**
 * 脚本详情弹窗
 */
const ScriptDetailModal: React.FC<ScriptDetailModalProps> = ({
  visible,
  script,
  scriptParams,
  loading,
  onClose,
}) => {
  return (
    <Modal
      title={`脚本详情: ${script?.name}`}
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
      ]}
      width={600}
    >
      {loading ? (
        <Spin />
      ) : (
        <Descriptions column={1} bordered>
          <Descriptions.Item label="ID">{script?.id}</Descriptions.Item>
          <Descriptions.Item label="名称">{script?.name}</Descriptions.Item>
          <Descriptions.Item label="描述">{script?.description}</Descriptions.Item>
          <Descriptions.Item label="参数数量">
            {scriptParams.length > 0 ? scriptParams.length : '无参数'}
          </Descriptions.Item>
          {scriptParams.length > 0 && (
            <Descriptions.Item label="参数定义">
              {scriptParams.map((param) => (
                <div key={param.name} style={{ marginBottom: 8 }}>
                  <Tag color="blue">{param.name}</Tag>
                  <Text>{param.label}</Text>
                  {param.required && <Tag color="red">必填</Tag>}
                  {param.description && (
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                      ({param.description})
                    </Text>
                  )}
                </div>
              ))}
            </Descriptions.Item>
          )}
        </Descriptions>
      )}
    </Modal>
  );
};

export default ScriptDetailModal;