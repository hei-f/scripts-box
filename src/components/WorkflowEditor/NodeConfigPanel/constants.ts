/**
 * NodeConfigPanel 常量定义
 */

/**
 * 参数来源类型选项
 */
export const PARAM_SOURCE_OPTIONS = [
  { value: 'static', label: '静态值' },
  { value: 'fromInput', label: '来自输入参数' },
  { value: 'fromNodeOutput', label: '来自上游输出' },
];

/**
 * 参数类型选项
 */
export const PARAM_TYPE_OPTIONS = [
  { value: 'text', label: '文本' },
  { value: 'number', label: '数字' },
  { value: 'file_path', label: '文件路径' },
  { value: 'directory_path', label: '目录路径' },
];

/**
 * 输出类型选项
 */
export const OUTPUT_TYPE_OPTIONS = [
  { value: 'text', label: '文本' },
  { value: 'number', label: '数字' },
  { value: 'boolean', label: '布尔值' },
  { value: 'json', label: 'JSON' },
];