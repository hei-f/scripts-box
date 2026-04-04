# 配置管理

配置文件的加载、保存和管理。

## 文件

| 文件 | 说明 |
|------|------|
| `mod.rs` | 模块导出 |
| `script_config.rs` | 配置数据结构定义 |
| `manager.rs` | 配置管理器实现 |

## 配置文件

配置存储在 `~/.config/scripts-box/scripts.json`：

```json
{
  "version": "1.0",
  "scripts": [
    {
      "id": "xxx",
      "name": "脚本名称",
      "params": [],
      "enabled": true,
      "command_type": "builtin"
    }
  ]
}
```

## 备份机制

- 保存时自动创建备份
- 备份文件名：`scripts.backup.{timestamp}.json`
- 保留最近 5 个备份

## 注意

`from_config` 方法预留但未实现，当前脚本通过 Rust 代码硬编码注册。