/**
 * WorkflowEditor 颜色常量
 *
 * 统一管理工作流编辑器中使用的颜色值，包括：
 * - 参数类型颜色
 * - 输出类型颜色
 */

// ==================== 参数类型颜色 ====================

/**
 * 参数类型对应的颜色值
 */
export const PARAM_TYPE_COLORS: Record<string, string> = {
  text: '#1890ff',
  number: '#52c41a',
  file_path: '#fa8c16',
  directory_path: '#fa8c16',
  select: '#722ed1',
  multi_select: '#722ed1',
};

/**
 * 默认颜色（未知类型时使用）
 */
export const DEFAULT_COLOR = '#8c8c8c';

// ==================== 输出类型颜色 ====================

/**
 * 输出类型对应的颜色值
 */
export const OUTPUT_TYPE_COLORS: Record<string, string> = {
  text: '#1890ff',
  number: '#52c41a',
  boolean: '#eb2f96',
  json: '#722ed1',
};

// ==================== 工具函数 ====================

/**
 * 获取参数类型的显示颜色
 *
 * @param type - 参数类型字符串
 * @returns 对应的颜色值
 */
export const getParamTypeColor = (type: string): string => {
  return PARAM_TYPE_COLORS[type] || DEFAULT_COLOR;
};

/**
 * 获取输出类型的显示颜色
 *
 * @param type - 输出类型字符串
 * @returns 对应的颜色值
 */
export const getOutputTypeColor = (type: string): string => {
  return OUTPUT_TYPE_COLORS[type] || DEFAULT_COLOR;
};
