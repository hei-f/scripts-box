# 内置脚本

存放内置脚本实现，每个脚本实现 `Script` trait。

## 脚本列表

| 文件 | ID | 功能 |
|------|-----|------|
| `add_numbers.rs` | `add_numbers` | 计算两个数字的和 |
| `file_rename.rs` | `file_rename` | 批量重命名文件 |

## 添加新脚本

1. 创建新文件 `xxx.rs`
2. 实现 `Script` trait
3. 在 `mod.rs` 中注册

```rust
// mod.rs
mod xxx;
pub use xxx::XxxScript;

pub fn register_builtin_scripts(registry: &mut ScriptRegistry) {
    registry.register(XxxScript::new());
}
```

## Script trait

```rust
pub trait Script: Send + Sync {
    fn id(&self) -> &str;                              // 唯一标识
    fn name(&self) -> &str;                            // 显示名称
    fn description(&self) -> &str;                     // 描述
    fn params_schema(&self) -> Vec<ParamDefinition>;   // 参数定义
    fn execute(&self, params: Value, ctx: &ScriptContext) -> Result<ScriptResult, AppError>;
}
```