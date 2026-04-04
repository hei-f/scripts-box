# 内置脚本页面

展示和执行内置脚本。

## 功能

- 查看所有内置脚本列表
- 查看脚本详情（ID、名称、描述）
- 执行脚本并显示结果
- 动态表单根据参数类型渲染不同控件

## 动态表单

根据 `ParamDefinition` 渲染表单控件：

| 参数类型 | 控件 |
|----------|------|
| `text` | Input |
| `number` | InputNumber |
| `file_path` | 文件选择器 |
| `directory_path` | 目录选择器 |
| `select` | Select |
| `multi_select` | Select (多选) |

## 条件显示

支持 `showWhen` 条件显示，根据其他参数值动态显示/隐藏表单项。

## 与后端交互

```
listScripts()      → 获取脚本列表
getScriptParams()  → 获取脚本参数定义
executeScript()    → 执行脚本
```