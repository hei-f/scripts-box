# Script API

定义脚本系统的核心契约和数据结构。

## Script Trait

所有脚本必须实现的接口：

```rust
pub trait Script: Send + Sync {
    fn id(&self) -> &str;
    fn name(&self) -> &str;
    fn description(&self) -> &str;
    fn params_schema(&self) -> Vec<ParamDefinition>;
    fn execute(&self, params: Value, ctx: &ScriptContext) -> Result<ScriptResult, AppError>;
}
```

## 参数类型

| 类型 | 说明 | 前端组件 |
|------|------|----------|
| `Text` | 文本输入 | Input |
| `Number` | 数字输入 | InputNumber |
| `FilePath` | 文件路径 | 文件选择器 |
| `DirectoryPath` | 目录路径 | 目录选择器 |
| `Select` | 单选 | Select |
| `MultiSelect` | 多选 | Select (multiple) |

## 条件显示

`DisplayCondition` 定义参数何时显示：

```rust
pub struct DisplayCondition {
    pub param: String,        // 依赖的参数名
    pub values: Vec<String>,  // 匹配的值列表
}
```

## 执行结果

```rust
pub struct ScriptResult {
    pub success: bool,
    pub output: String,
    pub error: Option<String>,
}
```
