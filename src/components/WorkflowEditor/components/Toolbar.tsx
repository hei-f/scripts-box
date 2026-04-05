/**
 * 工具栏组件
 *
 * 提供保存、执行、撤销、重做等操作按钮
 */

import React from 'react';
import { Button, Tooltip, Space, Divider, Input, theme } from 'antd';
import {
  SaveOutlined,
  PlayCircleOutlined,
  UndoOutlined,
  RedoOutlined,
  BugOutlined,
} from '@ant-design/icons';
import { openDevtoolsWindow } from '../../../services/tauri';

interface ToolbarProps {
  /** 工作流名称 */
  workflowName: string;
  /** 名称变更回调 */
  onNameChange: (name: string) => void;
  /** 是否正在保存 */
  saving: boolean;
  /** 是否正在执行 */
  executing: boolean;
  /** 是否可以执行（已保存的工作流） */
  canExecute: boolean;
  /** 保存回调 */
  onSave: () => void;
  /** 执行回调 */
  onExecute: () => void;
  /** 撤销回调 */
  onUndo: () => void;
  /** 重做回调 */
  onRedo: () => void;
  /** 取消回调 */
  onCancel?: () => void;
}

/**
 * 工具栏组件
 */
const Toolbar: React.FC<ToolbarProps> = ({
  workflowName,
  onNameChange,
  saving,
  executing,
  canExecute,
  onSave,
  onExecute,
  onUndo,
  onRedo,
  onCancel,
}) => {
  const { token } = theme.useToken();

  return (
    <div
      style={{
        padding: `${token.paddingXS}px ${token.paddingSM}px`,
        borderBottom: `1px solid ${token.colorBorder}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: token.colorBgContainer,
      }}
    >
      <Space>
        <Tooltip title="保存工作流">
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={onSave}>
            保存
          </Button>
        </Tooltip>
        <Tooltip title="执行工作流">
          <Button
            icon={<PlayCircleOutlined />}
            loading={executing}
            onClick={onExecute}
            disabled={!canExecute}
          >
            执行
          </Button>
        </Tooltip>
        <Divider type="vertical" />
        <Tooltip title="撤销">
          <Button icon={<UndoOutlined />} onClick={onUndo} disabled />
        </Tooltip>
        <Tooltip title="重做">
          <Button icon={<RedoOutlined />} onClick={onRedo} disabled />
        </Tooltip>
        <Divider type="vertical" />
        <Tooltip title="打开开发者工具">
          <Button icon={<BugOutlined />} onClick={() => openDevtoolsWindow()} />
        </Tooltip>
      </Space>

      <Space>
        <Input
          placeholder="工作流名称"
          value={workflowName}
          onChange={(e) => onNameChange(e.target.value)}
          style={{ width: 200 }}
        />
        {onCancel && <Button onClick={onCancel}>取消</Button>}
      </Space>
    </div>
  );
};

export default Toolbar;
