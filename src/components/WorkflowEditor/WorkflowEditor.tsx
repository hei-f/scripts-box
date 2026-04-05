/**
 * 工作流编辑器主组件
 *
 * 提供可视化工作流编辑功能，包含：
 * - ReactFlow 画布：用于拖拽、连接节点
 * - 节点面板：可拖拽的脚本列表
 * - 工具栏：保存、执行、撤销、重做等操作
 * - 属性面板：选中节点时显示详细配置
 */

import React, { useCallback, useMemo, useState, startTransition, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
  NodeTypes,
  MarkerType,
  BackgroundVariant,
  ReactFlowProvider,
  ReactFlowInstance,
  NodeChange,
  EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Layout,
  Button,
  Tooltip,
  Typography,
  Space,
  message,
  theme,
  Empty,
  Divider,
  Input,
  Spin,
  Select,
  Form,
} from 'antd';
import {
  SaveOutlined,
  PlayCircleOutlined,
  UndoOutlined,
  RedoOutlined,
  DeleteOutlined,
  BugOutlined,
} from '@ant-design/icons';

import ScriptNode, { ScriptNodeData } from './components/nodes/ScriptNode';
import InputNode, { InputNodeData } from './components/nodes/InputNode';
import OutputNode, { OutputNodeData } from './components/nodes/OutputNode';
import type {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  ParamSource,
  ScriptConfig,
  ParamDefinition,
} from '../../types';
import { listScriptConfigs, createWorkflow, updateWorkflow, executeWorkflow, writeDebugLog, openDevtoolsWindow } from '../../services/tauri';

const { Sider, Content } = Layout;
const { Text, Title } = Typography;

// ==================== 常量定义 ====================

/** 参数来源类型常量 */
const PARAM_SOURCE_TYPE = {
  STATIC: 'static',
  FROM_INPUT: 'fromInput',
  FROM_NODE_OUTPUT: 'fromNodeOutput',
} as const;

/** 参数来源类型选项 */
const PARAM_SOURCE_OPTIONS = [
  { value: PARAM_SOURCE_TYPE.STATIC, label: '静态值' },
  { value: PARAM_SOURCE_TYPE.FROM_INPUT, label: '来自工作流输入' },
  { value: PARAM_SOURCE_TYPE.FROM_NODE_OUTPUT, label: '来自节点输出' },
];

// ==================== 类型定义 ====================

/**
 * 工作流元数据
 */
interface WorkflowMeta {
  name: string;
  description: string;
}

/**
 * 属性面板数据
 */
interface PropertyPanelData {
  nodeId: string;
  nodeType: 'script' | 'input' | 'output';
  data: ScriptNodeData | InputNodeData | OutputNodeData;
  /** 脚本 ID（仅 Script 节点有） */
  scriptId?: string;
  /** 参数定义列表（仅 Script 节点有） */
  paramsSchema?: ParamDefinition[];
}

/**
 * WorkflowEditor 组件属性
 */
export interface WorkflowEditorProps {
  /** 初始工作流数据（编辑模式） */
  initialWorkflow?: Workflow;
  /** 保存成功回调 */
  onSave?: (workflow: Workflow) => void;
  /** 执行成功回调 */
  onExecute?: (result: unknown) => void;
  /** 取消编辑回调 */
  onCancel?: () => void;
}

// ==================== 节点类型注册 ====================

/**
 * 注册自定义节点类型
 */
const nodeTypes: NodeTypes = {
  script: ScriptNode,
  input: InputNode,
  output: OutputNode,
};

// ==================== 辅助函数 ====================

/**
 * 生成唯一 ID
 */
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * 推断工作流输入参数
 *
 * 遍历所有 Script 节点，检查每个节点的 paramsConfig 配置状态。
 * 对于未在 paramsConfig 中配置的必需参数，添加到 inputSchema 中。
 *
 * @param nodes - ReactFlow 节点列表
 * @param scriptConfigs - 脚本配置列表（用于获取 paramsSchema）
 * @returns 推断出的输入参数定义列表
 */
const inferInputSchema = (
  nodes: Node[],
  scriptConfigs: ScriptConfig[],
): ParamDefinition[] => {
  // 使用 Map 来去重，key 为参数名
  const inputParamsMap = new Map<string, ParamDefinition>();

  // 遍历所有 Script 节点
  nodes.forEach((node) => {
    // 只处理 Script 类型节点
    if (node.type !== 'script') {
      return;
    }

    const nodeData = node.data as ScriptNodeData;
    const scriptId = nodeData.scriptId;

    // 从 scriptConfigs 中找到对应的脚本配置
    const scriptConfig = scriptConfigs.find((config) => config.id === scriptId);
    if (!scriptConfig) {
      return;
    }

    // 获取脚本的参数定义
    const paramsSchema = scriptConfig.params || [];
    // 获取节点已配置的参数来源
    const paramsConfig: Record<string, ParamSource> = (nodeData.paramsConfig as Record<string, ParamSource>) || {};

    // 遍历脚本的参数定义，找出未配置的必需参数
    paramsSchema.forEach((param) => {
      // 只处理必需参数
      if (!param.required) {
        return;
      }

      // 检查参数是否已在 paramsConfig 中配置
      const isConfigured = param.name in paramsConfig;

      // 如果未配置，添加到输入参数列表
      if (!isConfigured) {
        // 使用参数名作为 key，避免重复
        if (!inputParamsMap.has(param.name)) {
          inputParamsMap.set(param.name, param);
        }
      }
    });
  });

  // 将 Map 转换为数组
  return Array.from(inputParamsMap.values());
};

/**
 * 检查是否为有效连接
 * - 禁止自连接
 * - 禁止重复连接
 */
const isValidConnection = (connection: Connection, edges: Edge[]): boolean => {
  // 禁止自连接
  if (connection.source === connection.target) {
    return false;
  }

  // 禁止重复连接
  const isDuplicate = edges.some(
    (edge) =>
      edge.source === connection.source &&
      edge.target === connection.target &&
      edge.sourceHandle === connection.sourceHandle &&
      edge.targetHandle === connection.targetHandle
  );

  return !isDuplicate;
};

/**
 * 将工作流节点转换为 ReactFlow 节点
 *
 * @param node - 工作流节点
 * @param inputSchema - 工作流输入参数定义（用于 Input 节点）
 * @param outputSchema - 工作流输出定义（用于 Output 节点）
 * @param scriptConfigs - 脚本配置列表（用于 Script 节点）
 */
const workflowNodeToReactFlowNode = (
  node: WorkflowNode,
  inputSchema?: Workflow['inputSchema'],
  outputSchema?: Workflow['outputSchema'],
  scriptConfigs?: ScriptConfig[],
): Node => {
  const baseData = {
    scriptId: node.scriptId,
    paramsConfig: node.paramsConfig,
  };

  // 将 position 从数组格式 [x, y] 转换为对象格式 {x, y}
  // Rust 端使用元组 (f64, f64)，序列化为 JSON 数组
  const position = Array.isArray(node.position)
    ? { x: node.position[0], y: node.position[1] }
    : node.position;

  // 根据节点类型补充特定数据
  if (node.nodeType === 'input') {
    return {
      id: node.id,
      type: node.nodeType,
      position,
      data: {
        ...baseData,
        name: '工作流输入',
        inputSchema: inputSchema || [],
      },
    };
  }

  if (node.nodeType === 'output') {
    return {
      id: node.id,
      type: node.nodeType,
      position,
      data: {
        ...baseData,
        name: '工作流输出',
        outputSchema: outputSchema || [],
      },
    };
  }

  // Script 节点：从 scriptConfigs 中获取脚本的参数和输出定义
  if (node.nodeType === 'script' && node.scriptId && scriptConfigs) {
    const scriptConfig = scriptConfigs.find((s) => s.id === node.scriptId);
    return {
      id: node.id,
      type: node.nodeType,
      position,
      data: {
        ...baseData,
        name: scriptConfig?.name || node.scriptId,
        description: scriptConfig?.description,
        paramsSchema: scriptConfig?.params || [],
        outputSchema: scriptConfig?.outputs || [],
      },
    };
  }

  return {
    id: node.id,
    type: node.nodeType,
    position,
    data: {
      ...baseData,
      name: node.scriptId || '未知脚本',
      paramsSchema: [],
      outputSchema: [],
    },
  };
};

/**
 * 将工作流边转换为 ReactFlow 边
 */
const workflowEdgeToReactFlowEdge = (edge: WorkflowEdge): Edge => {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    type: 'smoothstep',
    animated: true,
    markerEnd: {
      type: MarkerType.ArrowClosed,
    },
  };
};

/**
 * 从节点的 paramsConfig 生成边数据
 *
 * 当 edges 为空时，从 paramsConfig 中的 fromNodeOutput 配置推断边
 */
const generateEdgesFromParamsConfig = (nodes: WorkflowNode[]): Edge[] => {
  const edges: Edge[] = [];

  for (const node of nodes) {
    if (!node.paramsConfig) continue;

    for (const [paramName, paramSource] of Object.entries(node.paramsConfig)) {
      if (paramSource.type === 'fromNodeOutput') {
        const source = paramSource.nodeId;
        const outputField = paramSource.outputField;
        edges.push({
          id: `edge-${source}-${outputField}-${node.id}-${paramName}`,
          source,
          target: node.id,
          sourceHandle: `output-${outputField}`,
          targetHandle: `input-${paramName}`,
          type: 'smoothstep',
          animated: true,
          markerEnd: {
            type: MarkerType.ArrowClosed,
          },
        });
      }
    }
  }

  return edges;
};

// ==================== 主组件 ====================

/**
 * 工作流编辑器组件
 */
const WorkflowEditor: React.FC<WorkflowEditorProps> = ({
  initialWorkflow,
  onSave,
  onExecute,
  onCancel,
}) => {
  const { token } = theme.useToken();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // ==================== 状态管理 ====================

  // ReactFlow 实例
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  // 节点和边状态
  const [nodes, setNodes, onNodesChangeBase] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChangeBase] = useEdgesState<Edge>([]);

  // 选中的节点
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // 属性面板数据
  const [propertyPanel, setPropertyPanel] = useState<PropertyPanelData | null>(null);

  // 工作流元数据
  const [workflowMeta, setWorkflowMeta] = useState<WorkflowMeta>({
    name: initialWorkflow?.name || '新建工作流',
    description: initialWorkflow?.description || '',
  });

  // 脚本列表（用于节点面板）
  const [scriptConfigs, setScriptConfigs] = useState<ScriptConfig[]>([]);
  // 初始为 true，防止在脚本加载完成前初始化节点
  const [loadingScripts, setLoadingScripts] = useState(true);

  // 标记工作流初始化是否已完成，防止多次执行
  const isWorkflowInitialized = useRef(false);

  // DEBUG: 调试日志写入本地文件
  const debugLog = (tag: string, data: Record<string, unknown>) => {
    console.log('[WorkflowEditor DEBUG]', tag, data);
    writeDebugLog(tag, data).match(
      () => {},
      (err) => console.error('写入调试日志失败:', err)
    );
  };

  // 保存状态
  const [saving, setSaving] = useState(false);
  const [executing, setExecuting] = useState(false);

  // 历史记录（用于撤销/重做）
  // 注意：完整实现需要记录每次操作的历史状态

  // ==================== 初始化 ====================

  // 加载脚本列表
  React.useEffect(() => {
    const loadScripts = async () => {
      debugLog('loadScripts:start', { loadingScripts: true });
      setLoadingScripts(true);
      const result = await listScriptConfigs();
      result.match(
        (configs) => {
          debugLog('loadScripts:success', { configCount: configs.length });
          startTransition(() => {
            setScriptConfigs(configs);
          });
        },
        (error) => {
          debugLog('loadScripts:error', { error });
          message.error(`加载脚本列表失败: ${error}`);
        }
      );
      setLoadingScripts(false);
      debugLog('loadScripts:end', { loadingScripts: false });
    };

    loadScripts();
  }, []);

  // 初始化工作流数据
  React.useEffect(() => {
    debugLog('initEffect:trigger', {
      isInitialized: isWorkflowInitialized.current,
      hasInitialWorkflow: !!initialWorkflow,
      loadingScripts,
      scriptConfigsCount: scriptConfigs.length,
      nodesCount: nodes.length,
    });

    // 编辑模式：等待脚本列表加载完成后再初始化节点
    if (initialWorkflow) {
      // 如果是编辑模式且脚本列表还在加载中，等待加载完成
      if (loadingScripts) {
        debugLog('initEffect:edit-waiting-scripts', { loadingScripts });
        return;
      }

      // 防止重复初始化（在脚本列表加载完成后才检查）
      if (isWorkflowInitialized.current) {
        debugLog('initEffect:skip-already-initialized', {});
        return;
      }

      // 标记初始化已完成
      isWorkflowInitialized.current = true;
      debugLog('initEffect:edit-mode', {
        nodesCount: initialWorkflow.nodes.length,
        edgesCount: initialWorkflow.edges.length,
        scriptConfigsCount: scriptConfigs.length,
      });

      const rfNodes = initialWorkflow.nodes.map((node) =>
        workflowNodeToReactFlowNode(
          node,
          initialWorkflow.inputSchema,
          initialWorkflow.outputSchema,
          scriptConfigs,
        ),
      );
      
      // 优先使用 edges 数据，如果为空则从 paramsConfig 生成
      const rfEdges = initialWorkflow.edges.length > 0
        ? initialWorkflow.edges.map(workflowEdgeToReactFlowEdge)
        : generateEdgesFromParamsConfig(initialWorkflow.nodes);

      debugLog('initEffect:edit-setNodes', {
        rfNodesCount: rfNodes.length,
        rfEdgesCount: rfEdges.length,
        nodePositions: rfNodes.map(n => ({ id: n.id, position: n.position })),
        rfNodesData: rfNodes.map(n => ({
          id: n.id,
          paramsSchema: (n.data as ScriptNodeData)?.paramsSchema?.length,
          outputSchema: (n.data as ScriptNodeData)?.outputSchema?.length,
        })),
      });

      // 同步设置节点和边，确保 fitView 时 DOM 已渲染
      setNodes(rfNodes);
      setEdges(rfEdges);
      setWorkflowMeta({
        name: initialWorkflow.name,
        description: initialWorkflow.description || '',
      });
    } else {
      // 新建模式
      // 防止重复初始化
      if (isWorkflowInitialized.current) {
        debugLog('initEffect:skip-new-already-initialized', {});
        return;
      }
      
      isWorkflowInitialized.current = true;
      debugLog('initEffect:new-mode', {});

      // 新建工作流时，仅添加默认的输出节点（不再需要显式的 Input 节点）
      const defaultNodes: Node[] = [
        {
          id: 'output-node',
          type: 'output',
          position: { x: 800, y: 200 },
          data: {
            name: '工作流输出',
            outputSchema: [],
          } as OutputNodeData,
        },
      ];

      startTransition(() => {
        setNodes(defaultNodes);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialWorkflow, loadingScripts, scriptConfigs, setNodes, setEdges]);

  /** 标记初始 fitView 是否已执行，避免每次节点数量变化都重复触发 */
  const hasInitialFitView = useRef(false);

  // 当 reactFlowInstance 初始化完成且节点首次加载完成时，执行一次 fitView 适配视图
  React.useEffect(() => {
    debugLog('fitViewEffect:trigger', {
      hasInstance: !!reactFlowInstance,
      nodesLength: nodes.length,
      hasInitialFitView: hasInitialFitView.current,
      viewport: reactFlowInstance?.getViewport?.(),
    });

    if (reactFlowInstance && nodes.length > 0 && !hasInitialFitView.current) {
      hasInitialFitView.current = true;
      debugLog('fitViewEffect:executing', { viewport: reactFlowInstance.getViewport() });
      // 使用 setTimeout 给 DOM 充裕的渲染时间，确保节点已完成布局
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2 });
        debugLog('fitViewEffect:after-fitView', { viewport: reactFlowInstance.getViewport() });
      }, 50);
    }
  }, [reactFlowInstance, nodes.length]);

  // ==================== 事件处理 ====================

  /**
   * 处理节点变化（包装为 startTransition）
   */
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      startTransition(() => {
        onNodesChangeBase(changes);
      });
    },
    [onNodesChangeBase]
  );

  /**
   * 处理边变化
   *
   * 当边被删除时，检查是否有节点的 paramsConfig 引用了该连接，
   * 如果有则清理对应的 FromNodeOutput 配置。
   */
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      startTransition(() => {
        // 处理边的删除，清理相关的 paramsConfig
        changes.forEach((change) => {
          // 只处理删除操作
          if (change.type !== 'remove') {
            return;
          }

          // 查找被删除的边
          const deletedEdge = edges.find((edge) => edge.id === change.id);
          if (!deletedEdge) {
            return;
          }

          const { source, target, targetHandle } = deletedEdge;

          // 解析 targetHandle 获取参数名（格式：input-{paramName}）
          if (!targetHandle || !targetHandle.startsWith('input-')) {
            return;
          }

          const paramName = targetHandle.substring(6); // 移除 'input-' 前缀

          // 更新目标节点，清理对应的 paramsConfig
          setNodes((nds) =>
            nds.map((node) => {
              if (node.id !== target) {
                return node;
              }

              const nodeData = node.data as ScriptNodeData;
              const paramsConfig = nodeData.paramsConfig || {};

              // 检查该参数是否引用了被删除的边
              const paramSource = paramsConfig[paramName] as ParamSource | undefined;
              if (
                paramSource &&
                paramSource.type === 'fromNodeOutput' &&
                paramSource.nodeId === source
              ) {
                // 移除该参数的配置
                const { [paramName]: _, ...restParamsConfig } = paramsConfig;
                return {
                  ...node,
                  data: {
                    ...nodeData,
                    paramsConfig: restParamsConfig,
                  },
                };
              }

              return node;
            })
          );
        });

        // 应用边的变化
        onEdgesChangeBase(changes);
      });
    },
    [edges, onEdgesChangeBase, setNodes]
  );

  /**
   * 处理节点选择
   */
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      startTransition(() => {
        setSelectedNodeId(node.id);
        const nodeType = node.type as 'script' | 'input' | 'output';
        const nodeData = node.data as ScriptNodeData | InputNodeData | OutputNodeData;

        // 设置属性面板数据，包含 Script 节点的参数信息
        setPropertyPanel({
          nodeId: node.id,
          nodeType,
          data: nodeData,
          scriptId: nodeType === 'script' ? (nodeData as ScriptNodeData).scriptId : undefined,
          paramsSchema: nodeType === 'script' ? (nodeData as ScriptNodeData).paramsSchema : undefined,
        });
      });
    },
    []
  );

  /**
   * 处理画布点击（取消选择）
   */
  const onPaneClick = useCallback(() => {
    startTransition(() => {
      setSelectedNodeId(null);
      setPropertyPanel(null);
    });
  }, []);

  /**
   * 处理参数配置更新
   *
   * @param paramName - 参数名
   * @param sourceType - 参数来源类型
   * @param value - 静态值（当 sourceType 为 'static' 时）
   * @param inputParamName - 工作流输入参数名（当 sourceType 为 'fromInput' 时）
   * @param sourceNodeId - 来源节点 ID（当 sourceType 为 'fromNodeOutput' 时）
   * @param outputField - 输出字段名（当 sourceType 为 'fromNodeOutput' 时）
   */
  const handleParamConfigUpdate = useCallback(
    (
      paramName: string,
      sourceType: string,
      value?: unknown,
      inputParamName?: string,
      sourceNodeId?: string,
      outputField?: string,
    ) => {
      if (!propertyPanel || propertyPanel.nodeType !== 'script') {
        return;
      }

      const nodeId = propertyPanel.nodeId;
      let newParamSource: ParamSource;

      // 根据来源类型创建参数来源配置
      switch (sourceType) {
        case PARAM_SOURCE_TYPE.STATIC:
          newParamSource = { type: 'static', value };
          break;
        case PARAM_SOURCE_TYPE.FROM_INPUT:
          newParamSource = { type: 'fromInput', paramName: inputParamName || paramName };
          break;
        case PARAM_SOURCE_TYPE.FROM_NODE_OUTPUT:
          newParamSource = {
            type: 'fromNodeOutput',
            nodeId: sourceNodeId || '',
            outputField: outputField || '',
          };
          break;
        default:
          return;
      }

      startTransition(() => {
        setNodes((nds) =>
          nds.map((node) => {
            if (node.id !== nodeId) {
              return node;
            }

            const nodeData = node.data as ScriptNodeData;
            const updatedParamsConfig = {
              ...(nodeData.paramsConfig || {}),
              [paramName]: newParamSource,
            };

            return {
              ...node,
              data: {
                ...nodeData,
                paramsConfig: updatedParamsConfig,
              },
            };
          })
        );

        // 更新属性面板数据
        setPropertyPanel((prev) => {
          if (!prev || prev.nodeType !== 'script') {
            return prev;
          }

          const prevData = prev.data as ScriptNodeData;
          const updatedParamsConfig = {
            ...(prevData.paramsConfig || {}),
            [paramName]: newParamSource,
          };

          return {
            ...prev,
            data: {
              ...prevData,
              paramsConfig: updatedParamsConfig,
            },
          };
        });
      });

      message.success(`参数 "${paramName}" 配置已更新`);
    },
    [propertyPanel, setNodes]
  );

  /**
   * 处理连接创建
   *
   * 当连接成功时，自动更新目标节点的 paramsConfig：
   * 1. 解析 targetHandle 获取参数名（格式：input-{paramName}）
   * 2. 解析 sourceHandle 获取输出字段名（格式：output-{outputName}）
   * 3. 设置对应的 FromNodeOutput 来源
   */
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!isValidConnection(connection, edges)) {
        message.warning('无效的连接：不允许自连接或重复连接');
        return;
      }

      startTransition(() => {
        // 添加新的边
        setEdges((eds) => addEdge(connection, eds));

        // 如果目标节点是 Script 节点，自动更新 paramsConfig
        if (connection.targetHandle && connection.source) {
          // 解析 targetHandle 获取参数名（格式：input-{paramName}）
          const targetHandle = connection.targetHandle;
          if (targetHandle.startsWith('input-')) {
            const paramName = targetHandle.substring(6); // 移除 'input-' 前缀

            // 解析 sourceHandle 获取输出字段名（格式：output-{outputName}）
            let outputField = '';
            if (connection.sourceHandle && connection.sourceHandle.startsWith('output-')) {
              outputField = connection.sourceHandle.substring(7); // 移除 'output-' 前缀
            }

            // 创建 FromNodeOutput 参数来源
            const newParamSource: ParamSource = {
              type: 'fromNodeOutput',
              nodeId: connection.source,
              outputField,
            };

            // 更新目标节点的 paramsConfig
            setNodes((nds) =>
              nds.map((node) => {
                if (node.id !== connection.target) {
                  return node;
                }

                const nodeData = node.data as ScriptNodeData;
                const updatedParamsConfig = {
                  ...(nodeData.paramsConfig || {}),
                  [paramName]: newParamSource,
                };

                return {
                  ...node,
                  data: {
                    ...nodeData,
                    paramsConfig: updatedParamsConfig,
                  },
                };
              })
            );
          }
        }
      });
    },
    [edges, setEdges, setNodes]
  );

  /**
   * 处理拖拽经过
   */
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  /**
   * 处理拖拽放置
   */
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!reactFlowInstance || !reactFlowWrapper.current) {
        return;
      }

      // 获取拖拽的脚本配置
      const scriptConfigJson = event.dataTransfer.getData('application/json');
      if (!scriptConfigJson) {
        return;
      }

      const data = JSON.parse(scriptConfigJson);
      // 兼容两种数据格式：ScriptConfig 使用 params/outputs，ScriptDetail 使用 paramsSchema/outputSchema
      const params = data.params || data.paramsSchema || [];
      const outputs = data.outputs || data.outputSchema || [];
      const scriptId = data.id || data.scriptId;

      // 计算放置位置
      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      // 创建新节点
      const newNode: Node = {
        id: generateId(),
        type: 'script',
        position,
        data: {
          scriptId,
          name: data.name,
          description: data.description,
          paramsSchema: params,
          outputSchema: outputs,
        } as ScriptNodeData,
      };

      startTransition(() => {
        setNodes((nds) => [...nds, newNode]);
      });
    },
    [reactFlowInstance, setNodes]
  );

  /**
   * 处理脚本拖拽开始
   */
  const onScriptDragStart = useCallback(
    (event: React.DragEvent, scriptConfig: ScriptConfig) => {
      event.dataTransfer.setData('application/json', JSON.stringify(scriptConfig));
      event.dataTransfer.effectAllowed = 'move';
    },
    []
  );

  /**
   * 删除选中节点
   */
  const handleDeleteSelected = useCallback(() => {
    if (!selectedNodeId) {
      return;
    }

    startTransition(() => {
      setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
      setEdges((eds) =>
        eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId)
      );
      setSelectedNodeId(null);
      setPropertyPanel(null);
    });

    message.success('节点已删除');
  }, [selectedNodeId, setNodes, setEdges]);

  /**
   * 撤销
   * 注意：当前为简化实现，完整实现需要记录操作历史
   */
  const handleUndo = useCallback(() => {
    // TODO: 实现完整的撤销功能
    message.info('撤销功能开发中');
  }, []);

  /**
   * 重做
   * 注意：当前为简化实现，完整实现需要记录操作历史
   */
  const handleRedo = useCallback(() => {
    // TODO: 实现完整的重做功能
    message.info('重做功能开发中');
  }, []);

  /**
   * 保存工作流
   */
  const handleSave = useCallback(async () => {
    if (!workflowMeta.name.trim()) {
      message.error('请输入工作流名称');
      return;
    }

    setSaving(true);

    // 转换节点数据
    const workflowNodes: WorkflowNode[] = nodes.map((node) => ({
      id: node.id,
      nodeType: node.type as 'script' | 'input' | 'output',
      scriptId: (node.data as ScriptNodeData).scriptId,
      position: node.position,
      paramsConfig: ((node.data as ScriptNodeData).paramsConfig || {}) as Record<string, ParamSource>,
    }));

    // 转换边数据
    const workflowEdges: WorkflowEdge[] = edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle || '',
      targetHandle: edge.targetHandle || '',
    }));

    // 推断输入参数 schema
    const inputSchema = inferInputSchema(nodes, scriptConfigs);

    const workflow: Workflow = {
      id: initialWorkflow?.id || generateId(),
      name: workflowMeta.name,
      description: workflowMeta.description,
      nodes: workflowNodes,
      edges: workflowEdges,
      inputSchema,
      outputSchema: [],
    };

    // 判断是创建还是更新
    const result = initialWorkflow?.id
      ? await updateWorkflow(workflow)
      : await createWorkflow(workflow);

    result.match(
      () => {
        message.success('工作流保存成功');
        onSave?.(workflow);
      },
      (error) => {
        message.error(`保存失败: ${error}`);
      }
    );

    setSaving(false);
  }, [nodes, edges, workflowMeta, initialWorkflow, onSave, scriptConfigs]);

  /**
   * 执行工作流
   */
  const handleExecute = useCallback(async () => {
    if (!initialWorkflow?.id) {
      message.warning('请先保存工作流后再执行');
      return;
    }

    setExecuting(true);

    const result = await executeWorkflow(initialWorkflow.id, {});

    result.match(
      (data) => {
        message.success('工作流执行成功');
        onExecute?.(data);
      },
      (error) => {
        message.error(`执行失败: ${error}`);
      }
    );

    setExecuting(false);
  }, [initialWorkflow, onExecute]);

  // ==================== 渲染 ====================

  /**
   * 节点面板内容
   */
  const nodePanelContent = useMemo(
    () => (
      <div
        style={{
          padding: token.paddingSM,
          height: '100%',
          overflow: 'auto',
        }}
      >
        <Title level={5} style={{ marginBottom: token.marginSM }}>
          脚本列表
        </Title>
        <Divider style={{ margin: `${token.marginXS}px 0` }} />

        {loadingScripts ? (
          <div style={{ textAlign: 'center', padding: token.paddingLG }}>
            <Spin />
          </div>
        ) : scriptConfigs.length === 0 ? (
          <Empty description="暂无脚本" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            {scriptConfigs.map((config) => (
              <div
                key={config.id}
                draggable
                onDragStart={(e) => onScriptDragStart(e, config)}
                style={{
                  padding: token.paddingSM,
                  border: `1px solid ${token.colorBorder}`,
                  borderRadius: token.borderRadius,
                  cursor: 'grab',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = token.colorPrimary;
                  e.currentTarget.style.background = token.colorPrimaryBg;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = token.colorBorder;
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <Text strong style={{ display: 'block' }}>
                  {config.name}
                </Text>
                {config.description && (
                  <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                    {config.description}
                  </Text>
                )}
              </div>
            ))}
          </Space>
        )}
      </div>
    ),
    [scriptConfigs, loadingScripts, onScriptDragStart, token]
  );

  /**
   * 属性面板内容
   */
  const propertyPanelContent = useMemo(() => {
    if (!propertyPanel) {
      return (
        <Empty
          description="选择节点查看属性"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ marginTop: 40 }}
        />
      );
    }

    const { nodeId, nodeType, data, paramsSchema } = propertyPanel;
    const scriptNodeData = nodeType === 'script' ? (data as ScriptNodeData) : null;
    const paramsConfig = scriptNodeData?.paramsConfig || {};

    return (
      <div style={{ padding: token.paddingSM, height: '100%', overflow: 'auto' }}>
        <Title level={5}>节点属性</Title>
        <Divider style={{ margin: `${token.marginXS}px 0` }} />

        <div style={{ marginBottom: token.marginSM }}>
          <Text type="secondary">节点 ID：</Text>
          <Text code>{nodeId}</Text>
        </div>

        <div style={{ marginBottom: token.marginSM }}>
          <Text type="secondary">节点类型：</Text>
          <Text>{nodeType === 'script' ? '脚本节点' : nodeType === 'input' ? '输入节点' : '输出节点'}</Text>
        </div>

        {nodeType === 'script' && scriptNodeData && (
          <>
            <div style={{ marginBottom: token.marginSM }}>
              <Text type="secondary">脚本名称：</Text>
              <Text>{scriptNodeData.name}</Text>
            </div>
            {scriptNodeData.description && (
              <div style={{ marginBottom: token.marginSM }}>
                <Text type="secondary">描述：</Text>
                <Text>{scriptNodeData.description}</Text>
              </div>
            )}

            {/* 参数配置区域 */}
            {paramsSchema && paramsSchema.length > 0 && (
              <>
                <Divider style={{ margin: `${token.marginSM}px 0` }} />
                <Title level={5}>参数配置</Title>
                <Form layout="vertical" size="small">
                  {paramsSchema.map((param) => {
                    // 获取当前参数的配置
                    const currentConfig = paramsConfig[param.name];
                    const currentSourceType = currentConfig?.type || PARAM_SOURCE_TYPE.STATIC;
                    const currentValue = currentConfig?.type === 'static' ? currentConfig.value : undefined;

                    return (
                      <Form.Item
                        key={param.name}
                        label={
                          <span>
                            {param.label}
                            {param.required && <Text type="danger">*</Text>}
                          </span>
                        }
                        style={{ marginBottom: token.marginSM }}
                      >
                        {/* 参数来源选择 */}
                        <Select
                          value={currentSourceType}
                          onChange={(value) => {
                            if (value === PARAM_SOURCE_TYPE.STATIC) {
                              // 切换到静态值时，使用默认值
                              handleParamConfigUpdate(
                                param.name,
                                value,
                                param.default ?? ''
                              );
                            } else if (value === PARAM_SOURCE_TYPE.FROM_INPUT) {
                              // 切换到工作流输入时，使用参数名
                              handleParamConfigUpdate(
                                param.name,
                                value,
                                undefined,
                                param.name
                              );
                            } else {
                              // 切换到节点输出时，需要后续选择节点
                              handleParamConfigUpdate(
                                param.name,
                                value,
                                undefined,
                                undefined,
                                '',
                                ''
                              );
                            }
                          }}
                          options={PARAM_SOURCE_OPTIONS}
                          style={{ width: '100%', marginBottom: token.marginXXS }}
                        />

                        {/* 静态值输入框 */}
                        {currentSourceType === PARAM_SOURCE_TYPE.STATIC && (
                          <Input
                            placeholder="输入静态值"
                            value={currentValue as string}
                            onChange={(e) => {
                              handleParamConfigUpdate(
                                param.name,
                                PARAM_SOURCE_TYPE.STATIC,
                                e.target.value
                              );
                            }}
                          />
                        )}

                        {/* 工作流输入参数名 */}
                        {currentSourceType === PARAM_SOURCE_TYPE.FROM_INPUT && (
                          <Input
                            placeholder="工作流输入参数名"
                            value={(currentConfig as { type: 'fromInput'; paramName: string })?.paramName || param.name}
                            onChange={(e) => {
                              handleParamConfigUpdate(
                                param.name,
                                PARAM_SOURCE_TYPE.FROM_INPUT,
                                undefined,
                                e.target.value
                              );
                            }}
                          />
                        )}

                        {/* 节点输出选择 */}
                        {currentSourceType === PARAM_SOURCE_TYPE.FROM_NODE_OUTPUT && (
                          <Space direction="vertical" style={{ width: '100%' }} size="small">
                            <Select
                              placeholder="选择源节点"
                              value={(currentConfig as { type: 'fromNodeOutput'; nodeId: string })?.nodeId || undefined}
                              onChange={(value) => {
                                const existingConfig = currentConfig as { type: 'fromNodeOutput'; nodeId: string; outputField: string };
                                handleParamConfigUpdate(
                                  param.name,
                                  PARAM_SOURCE_TYPE.FROM_NODE_OUTPUT,
                                  undefined,
                                  undefined,
                                  value,
                                  existingConfig?.outputField || ''
                                );
                              }}
                              options={nodes
                                .filter((n) => n.id !== nodeId && n.type === 'script')
                                .map((n) => ({
                                  value: n.id,
                                  label: (n.data as ScriptNodeData).name || n.id,
                                }))}
                              style={{ width: '100%' }}
                            />
                            <Select
                              placeholder="选择输出字段"
                              value={(currentConfig as { type: 'fromNodeOutput'; outputField: string })?.outputField || undefined}
                              onChange={(value) => {
                                const existingConfig = currentConfig as { type: 'fromNodeOutput'; nodeId: string; outputField: string };
                                handleParamConfigUpdate(
                                  param.name,
                                  PARAM_SOURCE_TYPE.FROM_NODE_OUTPUT,
                                  undefined,
                                  undefined,
                                  existingConfig?.nodeId || '',
                                  value
                                );
                              }}
                              options={
                                (() => {
                                  const sourceNodeId = (currentConfig as { type: 'fromNodeOutput'; nodeId: string })?.nodeId;
                                  const sourceNode = nodes.find((n) => n.id === sourceNodeId);
                                  if (sourceNode) {
                                    const sourceOutputSchema = (sourceNode.data as ScriptNodeData).outputSchema || [];
                                    return sourceOutputSchema.map((output) => ({
                                      value: output.name,
                                      label: output.label,
                                    }));
                                  }
                                  return [];
                                })()
                              }
                              style={{ width: '100%' }}
                            />
                          </Space>
                        )}

                        {/* 参数描述 */}
                        {param.description && (
                          <Text type="secondary" style={{ fontSize: token.fontSizeSM - 2 }}>
                            {param.description}
                          </Text>
                        )}
                      </Form.Item>
                    );
                  })}
                </Form>
              </>
            )}
          </>
        )}

        <Button
          danger
          icon={<DeleteOutlined />}
          onClick={handleDeleteSelected}
          style={{ marginTop: token.marginMD }}
          block
        >
          删除节点
        </Button>
      </div>
    );
  }, [propertyPanel, handleDeleteSelected, token, handleParamConfigUpdate, nodes]);

  return (
    <Layout style={{ height: '100%', background: token.colorBgContainer }}>
      {/* 左侧节点面板 */}
      <Sider
        width={220}
        theme="light"
        style={{
          borderRight: `1px solid ${token.colorBorder}`,
          overflow: 'hidden',
        }}
      >
        {nodePanelContent}
      </Sider>

      {/* 中间画布区域 */}
      <Content style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        {/* 工具栏 */}
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
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={saving}
                onClick={handleSave}
              >
                保存
              </Button>
            </Tooltip>
            <Tooltip title="执行工作流">
              <Button
                icon={<PlayCircleOutlined />}
                loading={executing}
                onClick={handleExecute}
                disabled={!initialWorkflow?.id}
              >
                执行
              </Button>
            </Tooltip>
            <Divider type="vertical" />
            <Tooltip title="撤销">
              <Button
                icon={<UndoOutlined />}
                onClick={handleUndo}
                disabled
              />
            </Tooltip>
            <Tooltip title="重做">
              <Button
                icon={<RedoOutlined />}
                onClick={handleRedo}
                disabled
              />
            </Tooltip>
            <Divider type="vertical" />
            <Tooltip title="打开开发者工具">
              <Button
                icon={<BugOutlined />}
                onClick={() => openDevtoolsWindow()}
              />
            </Tooltip>
          </Space>

          <Space>
            <Input
              placeholder="工作流名称"
              value={workflowMeta.name}
              onChange={(e) =>
                startTransition(() => {
                  setWorkflowMeta((prev) => ({ ...prev, name: e.target.value }));
                })
              }
              style={{ width: 200 }}
            />
            {onCancel && (
              <Button onClick={onCancel}>取消</Button>
            )}
          </Space>
        </div>

        {/* ReactFlow 画布 */}
        <div
          ref={reactFlowWrapper}
          style={{ flex: 1, position: 'relative', minHeight: 0, width: '100%', height: '100%' }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={(connection) => isValidConnection(connection as Connection, edges)}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onInit={setReactFlowInstance}
            nodeTypes={nodeTypes}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            snapToGrid
            snapGrid={[15, 15]}
            connectionLineStyle={{ stroke: token.colorPrimary, strokeWidth: 2 }}
            defaultEdgeOptions={{
              type: 'smoothstep',
              animated: true,
              markerEnd: {
                type: MarkerType.ArrowClosed,
              },
            }}
          >
            <Controls />
            <MiniMap
              nodeColor={(node) => {
                if (node.type === 'input') return token.colorSuccess;
                if (node.type === 'output') return token.colorWarning;
                return token.colorPrimary;
              }}
              style={{
                background: token.colorBgContainer,
              }}
            />
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          </ReactFlow>
        </div>
      </Content>

      {/* 右侧属性面板 */}
      <Sider
        width={300}
        theme="light"
        style={{
          borderLeft: `1px solid ${token.colorBorder}`,
          overflow: 'auto',
        }}
      >
        <div style={{ height: '100%', overflow: 'auto' }}>
          {propertyPanelContent}
        </div>
      </Sider>
    </Layout>
  );
};

// 使用 ReactFlowProvider 包装组件
const WorkflowEditorWrapper: React.FC<WorkflowEditorProps> = (props) => {
  return (
    <ReactFlowProvider>
      <WorkflowEditor {...props} />
    </ReactFlowProvider>
  );
};

export default WorkflowEditorWrapper;
