# CLI 工具

独立的命令行工具，用于测试和调试。

## 文件

| 文件 | 说明 |
|------|------|
| `test_script.rs` | 脚本测试工具，用于命令行测试内置脚本 |

## 使用

```bash
# 列出所有脚本
cargo run --bin test_script -- list

# 执行脚本
cargo run --bin test_script -- execute add_numbers --params '{"a":10,"b":20}'
```

## 注意

这些工具依赖 Tauri 库，需要在图形界面环境下运行。
