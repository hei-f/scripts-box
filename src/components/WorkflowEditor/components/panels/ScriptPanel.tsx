/**
 * 脚本选择面板组件
 *
 * 用于在工作流编辑器中显示可用脚本列表，支持：
 * - 从后端获取脚本列表
 * - 搜索过滤功能
 * - 拖拽脚本到画布
 * - 显示脚本的输入/输出参数信息
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import { List, Input, Tag, Typography, Empty, Spin, message, theme } from 'antd';
import {
  SearchOutlined,
  PlayCircleOutlined,
  DragOutlined,
} from '@ant-design/icons';
import type { ScriptInfo, ParamDefinition } from '../../../../types';
import type { OutputDefinition } from '../../../../types/workflow';
import { listScripts, getScriptOutputSchema, getScriptParams } from '../../../../services/tauri';

const { Text } = Typography;

/**
 * 脚本详细信息（包含输入输出参数）
 */
interface ScriptDetail extends ScriptInfo {
  /** 输入参数定义 */
  paramsSchema: ParamDefinition[];
  /** 输出定义 */
  outputSchema: OutputDefinition[];
}

/**
 * 脚本选择面板组件属性
 */
export interface ScriptPanelProps {
  /** 拖拽开始时的回调 */
  onDragStart?: (event: React.DragEvent, script: ScriptDetail) => void;
}

/**
 * 获取参数类型的显示颜色
 */
const getParamTypeColor = (type: string): string => {
  const colorMap: Record<string, string> = {
    text: '#1890ff',
    number: '#52c41a',
    file_path: '#fa8c16',
    directory_path: '#fa8c16',
    select: '#722ed1',
    multi_select: '#722ed1',
  };
  return colorMap[type] || '#8c8c8c';
};

/**
 * 获取输出类型的显示颜色
 */
const getOutputTypeColor = (type: string): string => {
  const colorMap: Record<string, string> = {
    text: '#1890ff',
    number: '#52c41a',
    boolean: '#eb2f96',
    json: '#722ed1',
  };
  return colorMap[type] || '#8c8c8c';
};

/**
 * 参数类型转换为显示字符串
 */
const paramTypeToString = (type: ParamDefinition['type']): string => {
  if (typeof type === 'string') {
    return type;
  }
  if ('select' in type) {
    return 'select';
  }
  if ('multi_select' in type) {
    return 'multi_select';
  }
  return 'unknown';
};

/**
 * 脚本选择面板组件
 */
const ScriptPanel: React.FC<ScriptPanelProps> = ({ onDragStart }) => {
  const { token } = theme.useToken();

  // 脚本列表状态
  const [scripts, setScripts] = useState<ScriptDetail[]>([]);
  // 过滤后的脚本列表
  const [filteredScripts, setFilteredScripts] = useState<ScriptDetail[]>([]);
  // 搜索关键字
  const [searchText, setSearchText] = useState('');
  // 加载状态
  const [loading, setLoading] = useState(true);
  // 错误状态
  const [error, setError] = useState<string | null>(null);

  /**
   * 加载脚本列表及其详细信息
   */
  const loadScripts = useCallback(async () => {
    setLoading(true);
    setError(null);

    // 获取脚本列表
    const scriptsResult = await listScripts();

    if (scriptsResult.isErr()) {
      setError(scriptsResult.error);
      setLoading(false);
      message.error(`加载脚本列表失败: ${scriptsResult.error}`);
      return;
    }

    const scriptList = scriptsResult.value;

    // 获取每个脚本的参数和输出定义
    const scriptDetails: ScriptDetail[] = [];

    for (const script of scriptList) {
      // 并行获取参数和输出定义
      const [paramsResult, outputResult] = await Promise.all([
        getScriptParams(script.id),
        getScriptOutputSchema(script.id),
      ]);

      scriptDetails.push({
        ...script,
        paramsSchema: paramsResult.isOk() ? paramsResult.value : [],
        outputSchema: outputResult.isOk() ? outputResult.value : [],
      });
    }

    setScripts(scriptDetails);
    setFilteredScripts(scriptDetails);
    setLoading(false);
  }, []);

  /**
   * 初始化加载脚本列表
   */
  useEffect(() => {
    loadScripts();
  }, [loadScripts]);

  /**
   * 搜索过滤
   */
  useEffect(() => {
    if (!searchText.trim()) {
      setFilteredScripts(scripts);
      return;
    }

    const lowerSearch = searchText.toLowerCase();
    const filtered = scripts.filter(
      (script) =>
        script.name.toLowerCase().includes(lowerSearch) ||
        script.description?.toLowerCase().includes(lowerSearch) ||
        script.id.toLowerCase().includes(lowerSearch)
    );
    setFilteredScripts(filtered);
  }, [searchText, scripts]);

  /**
   * 处理拖拽开始
   */
  const handleDragStart = useCallback(
    (event: React.DragEvent, script: ScriptDetail) => {
      // 设置拖拽数据
      event.dataTransfer.setData(
        'application/json',
        JSON.stringify({
          type: 'script',
          scriptId: script.id,
          name: script.name,
          description: script.description,
          paramsSchema: script.paramsSchema,
          outputSchema: script.outputSchema,
        })
      );
      // 设置拖拽效果
      event.dataTransfer.effectAllowed = 'copy';

      // 调用外部回调
      onDragStart?.(event, script);
    },
    [onDragStart]
  );

  /**
   * 渲染脚本项
   */
  const renderScriptItem = (script: ScriptDetail) => (
    <div
      draggable
      onDragStart={(e) => handleDragStart(e, script)}
      style={{
        padding: token.paddingSM,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        cursor: 'grab',
        transition: 'background-color 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = token.colorBgTextHover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      {/* 脚本标题行 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: token.marginXXS,
          marginBottom: token.marginXS,
        }}
      >
        <DragOutlined style={{ color: token.colorTextSecondary, fontSize: token.fontSizeSM }} />
        <PlayCircleOutlined style={{ color: token.colorPrimary }} />
        <Text strong style={{ flex: 1 }} ellipsis>
          {script.name}
        </Text>
      </div>

      {/* 脚本描述 */}
      {script.description && (
        <Text
          type="secondary"
          style={{
            fontSize: token.fontSizeSM,
            display: 'block',
            marginBottom: token.marginXS,
          }}
          ellipsis
        >
          {script.description}
        </Text>
      )}

      {/* 输入参数标签 */}
      {script.paramsSchema.length > 0 && (
        <div style={{ marginBottom: token.marginXXS }}>
          <Text type="secondary" style={{ fontSize: token.fontSizeSM - 2, marginRight: token.marginXS }}>
            输入:
          </Text>
          {script.paramsSchema.slice(0, 3).map((param) => (
            <Tag
              key={param.name}
              style={{
                fontSize: token.fontSizeSM - 2,
                margin: '2px',
                color: getParamTypeColor(paramTypeToString(param.type)),
                borderColor: getParamTypeColor(paramTypeToString(param.type)),
                background: 'transparent',
              }}
            >
              {param.label}
            </Tag>
          ))}
          {script.paramsSchema.length > 3 && (
            <Tag
              style={{
                fontSize: token.fontSizeSM - 2,
                margin: '2px',
                color: token.colorTextSecondary,
                borderColor: token.colorBorder,
                background: 'transparent',
              }}
            >
              +{script.paramsSchema.length - 3}
            </Tag>
          )}
        </div>
      )}

      {/* 输出参数标签 */}
      {script.outputSchema.length > 0 && (
        <div>
          <Text type="secondary" style={{ fontSize: token.fontSizeSM - 2, marginRight: token.marginXS }}>
            输出:
          </Text>
          {script.outputSchema.slice(0, 3).map((output) => (
            <Tag
              key={output.name}
              style={{
                fontSize: token.fontSizeSM - 2,
                margin: '2px',
                color: getOutputTypeColor(output.outputType),
                borderColor: getOutputTypeColor(output.outputType),
                background: 'transparent',
              }}
            >
              {output.label}
            </Tag>
          ))}
          {script.outputSchema.length > 3 && (
            <Tag
              style={{
                fontSize: token.fontSizeSM - 2,
                margin: '2px',
                color: token.colorTextSecondary,
                borderColor: token.colorBorder,
                background: 'transparent',
              }}
            >
              +{script.outputSchema.length - 3}
            </Tag>
          )}
        </div>
      )}
    </div>
  );

  // 加载状态
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: 200,
        }}
      >
        <Spin tip="加载脚本列表..." />
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div style={{ padding: token.padding }}>
        <Empty
          description={`加载失败: ${error}`}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 搜索框 */}
      <div style={{ padding: token.paddingSM }}>
        <Input
          placeholder="搜索脚本..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
        />
      </div>

      {/* 脚本列表 */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {filteredScripts.length === 0 ? (
          <div style={{ padding: token.padding }}>
            <Empty
              description={searchText ? '未找到匹配的脚本' : '暂无可用脚本'}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        ) : (
          <List
            dataSource={filteredScripts}
            renderItem={renderScriptItem}
            split={false}
          />
        )}
      </div>

      {/* 底部统计 */}
      <div
        style={{
          padding: token.paddingXS,
          borderTop: `1px solid ${token.colorBorderSecondary}`,
          textAlign: 'center',
        }}
      >
        <Text type="secondary" style={{ fontSize: token.fontSizeSM - 2 }}>
          共 {scripts.length} 个脚本
          {searchText && `，当前显示 ${filteredScripts.length} 个`}
        </Text>
      </div>
    </div>
  );
};

export default memo(ScriptPanel);