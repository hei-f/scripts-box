# Rust 后端源码

Tauri 后端核心功能实现。

## 模块

| 模块 | 说明 |
|------|------|
| `builtin/` | 内置脚本实现 |
| `commands/` | Tauri IPC 命令 |
| `config/` | 配置文件管理 |
| `script_api/` | Script trait 和类型定义 |
| `db.rs` | SQLite 数据库操作 |
| `registry.rs` | 脚本注册中心 |
| `error.rs` | 统一错误类型 |

## 数据流

```
前端 invoke()
      ↓
commands/ 获取 State
      ↓
Registry.get(id) → Script 实例
      ↓
Script.execute() → ScriptResult
      ↓
db.insert_history() → 持久化
```

## 状态管理

使用 `Mutex<T>` 包装共享状态：

- `Mutex<ScriptRegistry>` - 脚本注册中心
- `Mutex<ScriptConfigManager>` - 配置管理器
- `Mutex<Database>` - 数据库连接