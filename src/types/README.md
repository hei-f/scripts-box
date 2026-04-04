# TypeScript 类型定义

存放全局类型定义。

## 文件

| 文件 | 说明 |
|------|------|
| `index.ts` | 核心类型定义 |

## 核心类型

| 类型 | 说明 |
|------|------|
| `ScriptInfo` | 脚本基本信息（ID、名称、描述） |
| `ParamDefinition` | 参数定义（名称、类型、是否必填等） |
| `ParamType` | 参数类型（text、number、file_path 等） |
| `DisplayCondition` | 条件显示定义 |
| `ScriptResult` | 执行结果（成功/失败、输出、错误信息） |
| `ExecutionRecord` | 执行历史记录 |

## 与后端对应

这些类型与 Rust 后端 `script_api` 模块中的结构体对应，字段名使用 camelCase。