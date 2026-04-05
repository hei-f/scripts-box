/**
 * 加载脚本列表 Hook
 *
 * 负责从后端加载脚本配置列表，提供加载状态和脚本数据
 */

import { useState, useEffect } from 'react';
import { message } from 'antd';

import type { ScriptConfig } from '../../../types';
import { listScriptConfigs, writeDebugLog } from '../../../services/tauri';

/** useLoadScripts 返回值 */
export interface UseLoadScriptsResult {
  /** 脚本配置列表 */
  scriptConfigs: ScriptConfig[];
  /** 是否正在加载 */
  loading: boolean;
}

/**
 * 调试日志
 */
const debugLog = (tag: string, data: Record<string, unknown>) => {
  writeDebugLog(tag, data).match(
    () => {},
    (err) => console.error('写入调试日志失败:', err)
  );
};

/**
 * 加载脚本列表 Hook
 *
 * @returns 脚本配置列表和加载状态
 */
export function useLoadScripts(): UseLoadScriptsResult {
  const [scriptConfigs, setScriptConfigs] = useState<ScriptConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadScripts = async () => {
      debugLog('loadScripts:start', { loadingScripts: true });
      setLoading(true);
      const result = await listScriptConfigs();
      result.match(
        (configs) => {
          debugLog('loadScripts:success', { configCount: configs.length });

          // 记录每个脚本的详细信息
          if (configs.length === 0) {
            debugLog('loadScripts:warning', { message: '脚本配置列表为空' });
          } else {
            configs.forEach((config) => {
              debugLog('loadScripts:scriptConfig', {
                id: config.id,
                name: config.name,
                paramsLength: config.params?.length ?? 0,
                outputsLength: config.outputs?.length ?? 0,
                params: config.params,
                outputs: config.outputs,
              });
            });
          }

          // 同步更新状态，避免时序问题
          setScriptConfigs(configs);
          setLoading(false);
          debugLog('loadScripts:end', { loadingScripts: false });
        },
        (error) => {
          debugLog('loadScripts:error', { error });
          setLoading(false);
          message.error(`加载脚本列表失败: ${error}`);
        }
      );
    };

    loadScripts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { scriptConfigs, loading };
}
