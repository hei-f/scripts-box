# Tauri IPC 命令

前端调用的入口，封装后端功能为可调用命令。

## 命令分类

### 脚本执行

| 命令 | 功能 |
|------|------|
| `list_scripts` | 获取内置脚本列表 |
| `get_script_params` | 获取脚本参数定义 |
| `execute_script` | 执行脚本 |

### 执行历史

| 命令 | 功能 |
|------|------|
| `list_execution_history` | 查询执行历史 |
| `delete_execution_history` | 删除历史记录 |
| `clear_execution_history` | 清空历史 |

### 脚本配置（预留）

| 命令 | 功能 |
|------|------|
| `list_script_configs` | 获取配置列表 |
| `get_script_config` | 获取单个配置 |
| `create_script_config` | 创建配置 |
| `update_script_config` | 更新配置 |
| `delete_script_config` | 删除配置 |

## 状态注入

命令通过 `State<'_, Mutex<T>>` 获取共享状态：

```rust
#[tauri::command]
pub fn my_command(
    registry: State<'_, Mutex<ScriptRegistry>>,
) -> Result<(), AppError> {
    let guard = registry.lock().map_err(|e| AppError::DatabaseError(e.to_string()))?;
    // ...
}
```