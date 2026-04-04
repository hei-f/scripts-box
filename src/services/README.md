# Tauri 服务层

封装 Tauri IPC 调用，提供类型安全的 API。

## 文件

| 文件 | 说明 |
|------|------|
| `tauri.ts` | Tauri 命令封装，使用 neverthrow 处理错误 |

## 使用方式

```typescript
import { listScripts, executeScript } from '@/services/tauri';

// 使用 neverthrow 的 Result 类型
listScripts()
  .match(
    (scripts) => console.log(scripts),
    (error) => console.error(error.message)
  );
```

## 封装的命令

| 函数 | Tauri 命令 | 说明 |
|------|-----------|------|
| `listScripts` | `list_scripts` | 获取内置脚本列表 |
| `getScriptParams` | `get_script_params` | 获取脚本参数定义 |
| `executeScript` | `execute_script` | 执行脚本 |
| `listExecutionHistory` | `list_execution_history` | 获取执行历史 |
| `deleteExecutionHistory` | `delete_execution_history` | 删除历史记录 |
| `clearExecutionHistory` | `clear_execution_history` | 清空历史 |

## 错误处理

使用 `neverthrow` 的 `Result` 类型，调用方必须显式处理成功和失败情况。