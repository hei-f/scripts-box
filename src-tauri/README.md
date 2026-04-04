# Tauri 后端

Rust 后端，提供脚本管理、配置存储、执行历史等核心功能。

## 模块说明

| 模块 | 功能 |
|------|------|
| `builtin/` | 内置脚本实现，如文件批量重命名 |
| `commands/` | Tauri IPC 命令，前端调用的入口 |
| `config/` | 配置文件管理，JSON 配置的加载和保存 |
| `script_api/` | Script trait 和参数类型定义 |
| `db.rs` | SQLite 数据库操作，执行历史持久化 |
| `registry.rs` | 脚本注册中心，管理所有脚本实例 |
| `error.rs` | 统一错误类型定义 |

## 核心数据流

```
前端调用 Tauri Command
        ↓
Command 获取 State（Registry/ConfigManager/Database）
        ↓
Registry.get(id) → Script 实例
        ↓
Script.execute(params, ctx) → ScriptResult
        ↓
Database.insert_history(record) → 持久化
```

## 添加新脚本

1. 在 `src/builtin/` 创建新文件，如 `my_script.rs`
2. 实现 `Script` trait：

```rust
use crate::script_api::{Script, ScriptContext, ScriptResult, ParamDefinition, ParamType};
use crate::error::AppError;
use serde_json::Value;

pub struct MyScript;

impl Script for MyScript {
    fn id(&self) -> &str { "my_script" }
    fn name(&self) -> &str { "我的脚本" }
    fn description(&self) -> &str { "脚本描述" }
    
    fn params_schema(&self) -> Vec<ParamDefinition> {
        vec![
            ParamDefinition {
                name: "input".to_string(),
                label: "输入参数".to_string(),
                param_type: ParamType::Text,
                required: true,
                default: None,
                description: None,
            },
        ]
    }
    
    fn execute(&self, params: Value, _ctx: &ScriptContext) -> Result<ScriptResult, AppError> {
        let input = params["input"].as_str().unwrap_or("");
        Ok(ScriptResult::success(format!("处理完成: {}", input)))
    }
}
```

3. 在 `src/builtin/mod.rs` 注册：

```rust
mod my_script;
pub use my_script::MyScript;

pub fn register_builtin_scripts(registry: &mut ScriptRegistry) {
    registry.register(MyScript);
    // ...
}
```

## 参数类型

| 类型 | 前端组件 | 说明 |
|------|----------|------|
| `Text` | Input | 文本输入 |
| `Number` | InputNumber | 数字输入 |
| `FilePath` | 文件选择器 | 选择文件 |
| `DirectoryPath` | 目录选择器 | 选择目录 |
| `Select` | Select | 单选下拉 |
| `MultiSelect` | Select(mode=multiple) | 多选下拉 |

## 状态管理

使用 Tauri 的 `app.manage()` 注册共享状态：

```rust
// lib.rs
app.manage(Mutex::new(config_manager));  // 配置管理器
app.manage(Mutex::new(registry));        // 脚本注册中心
app.manage(Mutex::new(db));              // 数据库
```

Command 中通过 `State` 获取：

```rust
#[tauri::command]
pub fn my_command(
    registry: State<'_, Mutex<ScriptRegistry>>,
) -> Result<(), AppError> {
    let guard = registry.lock()?;
    // ...
}
```

## 数据库

执行历史存储在 SQLite 数据库中，表结构：

```sql
CREATE TABLE execution_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    script_id TEXT NOT NULL,
    params TEXT NOT NULL,
    status TEXT NOT NULL,      -- success / failure
    output TEXT,
    error TEXT,
    executed_at INTEGER NOT NULL,
    duration_ms INTEGER
);
```

## 构建命令

```bash
# 开发模式（热重载）
cargo tauri dev

# 检查编译
cargo check

# 运行测试
cargo test

# 构建发布版本
cargo tauri build
```
