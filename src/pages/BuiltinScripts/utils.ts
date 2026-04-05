/**
 * BuiltinScripts 页面辅助函数
 */

import type { ParamDefinition, DisplayCondition } from './types';

/**
 * 检查参数是否应该显示
 */
export function shouldShowParam(
  param: ParamDefinition,
  formValues: Record<string, unknown>
): boolean {
  // 兼容两种字段名：showWhen (camelCase) 和 show_when (snake_case)
  const showWhen = param.showWhen || (param as unknown as { show_when?: DisplayCondition }).show_when;

  if (!showWhen) {
    return true;
  }

  const { param: dependParam, values } = showWhen;
  const dependValue = formValues[dependParam];

  if (dependValue === undefined || dependValue === null) {
    return false;
  }

  return values.includes(String(dependValue));
}

/**
 * 获取 Select 类型的选项列表
 */
export function getSelectOptions(paramType: ParamDefinition['type']): { label: string; value: string }[] {
  if (typeof paramType === 'object' && paramType !== null && 'select' in paramType) {
    return paramType.select.options;
  }
  if (typeof paramType === 'object' && paramType !== null && 'multi_select' in paramType) {
    return paramType.multi_select.options;
  }
  return [];
}
