/**
 * 前端类型定义模块
 *
 * 定义与后端对应的 TypeScript 类型，确保前后端类型一致性
 * Tauri 会自动处理 camelCase 和 snake_case 的转换
 */

// 导出应用配置相关类型
export type {
  AppConfig,
  CloseBehavior,
  ShortcutConfig,
  TrayConfig,
  WindowConfig,
} from './appConfig';

// 先导出工作流相关类型，因为 ScriptConfig 依赖 OutputDefinition
export type {
  NodeType,
  OutputType,
  ParamSource,
  WorkflowNode,
  WorkflowEdge,
  OutputDefinition,
  Workflow,
  WorkflowInfo,
  NodeResult,
  WorkflowResult,
} from './workflow';

/**
 * 选择项定义
 */
export interface SelectOption {
  /** 选项值 */
  value: string;
  /** 选项显示标签 */
  label: string;
}

/**
 * 参数类型枚举
 *
 * 后端序列化格式：
 * - 简单类型：字符串 "text"、"number"、"file_path"、"directory_path"
 * - 复杂类型：对象 { "select": { "options": [...] } } 或 { "multi_select": { "options": [...] } }
 */
export type ParamType =
  | 'text'
  | 'number'
  | 'file_path'
  | 'directory_path'
  | { select: { options: SelectOption[] } }
  | { multi_select: { options: SelectOption[] } };

/**
 * 参数显示条件
 *
 * 定义参数何时显示，用于实现条件表单
 */
export interface DisplayCondition {
  /** 依赖的参数名称 */
  param: string;
  /** 匹配的值列表（任一匹配即显示） */
  values: string[];
}

/**
 * 参数定义结构体
 *
 * 定义脚本参数的元信息，用于前端生成动态表单
 */
export interface ParamDefinition {
  /** 参数名称（用于作为 JSON 字段的 key） */
  name: string;
  /** 参数显示标签（用于表单显示） */
  label: string;
  /** 参数类型（后端字段名为 "type"） */
  type: ParamType;
  /** 是否必填 */
  required: boolean;
  /** 默认值 */
  default?: unknown;
  /** 参数描述 */
  description?: string;
  /** 显示条件（可选，当条件满足时才显示此参数） */
  showWhen?: DisplayCondition;
}

/**
 * 脚本执行结果
 *
 * 封装脚本执行的输出信息
 */
export interface ScriptResult {
  /** 执行是否成功 */
  success: boolean;
  /** 输出内容 */
  output: string;
  /** 错误信息（执行失败时） */
  error?: string;
}

/**
 * 脚本元信息
 *
 * 用于在前端展示脚本的基本信息（ID、名称、描述）
 */
export interface ScriptInfo {
  /** 脚本唯一标识 */
  id: string;
  /** 脚本显示名称 */
  name: string;
  /** 脚本描述 */
  description: string;
}

/**
 * 脚本配置结构体
 *
 * 定义脚本的所有配置信息，用于配置文件持久化和前端展示
 */
export interface ScriptConfig {
  /** 脚本唯一标识 */
  id: string;
  /** 脚本显示名称 */
  name: string;
  /** 脚本描述 */
  description?: string;
  /** 参数定义列表 */
  params: ParamDefinition[];
  /** 是否启用 */
  enabled: boolean;
  /** 命令类型 */
  commandType: string;
  /** 输出定义列表 */
  outputs: import('./workflow').OutputDefinition[];
}

/**
 * 执行历史记录
 *
 * 存储脚本的执行历史，包括参数、输出、错误信息等
 */
export interface ExecutionRecord {
  /** 记录 ID（数据库自动生成） */
  id?: number;
  /** 脚本 ID */
  scriptId: string;
  /** 执行参数（JSON 序列化） */
  params: string;
  /** 执行状态：success / failure */
  status: string;
  /** 输出内容 */
  output?: string;
  /** 错误信息 */
  error?: string;
  /** 执行时间（Unix 时间戳，毫秒） */
  executedAt: number;
  /** 执行时长（毫秒） */
  durationMs?: number;
}

// 工作流类型已在文件开头导出
