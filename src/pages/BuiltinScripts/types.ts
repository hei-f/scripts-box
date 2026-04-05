/**
 * BuiltinScripts 页面类型定义
 */

import type { ScriptInfo, ParamDefinition, ScriptResult, DisplayCondition } from '../../types';

/**
 * 脚本详情弹窗属性
 */
export interface ScriptDetailModalProps {
  visible: boolean;
  script: ScriptInfo | null;
  scriptParams: ParamDefinition[];
  loading: boolean;
  onClose: () => void;
}

/**
 * 执行脚本弹窗属性
 */
export interface ExecuteScriptModalProps {
  visible: boolean;
  script: ScriptInfo | null;
  scriptParams: ParamDefinition[];
  loading: boolean;
  executing: boolean;
  result: ScriptResult | null;
  onClose: () => void;
  onExecute: () => void;
}

// 重新导出依赖的类型
export type { ScriptInfo, ParamDefinition, ScriptResult, DisplayCondition };
