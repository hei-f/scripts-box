/**
 * NodeConfigPanel 常量定义
 */

// 从 config/constants.ts 重新导出 PARAM_SOURCE_OPTIONS
export { PARAM_SOURCE_OPTIONS } from '../config/constants';

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
