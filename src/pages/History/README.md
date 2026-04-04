# 执行历史页面

展示脚本执行历史记录。

## 功能

- 查看所有执行历史
- 查看执行详情（参数、输出、错误信息）
- 删除单条记录
- 清空所有历史

## 数据来源

通过 Tauri 命令获取数据：

```
listExecutionHistory()      → 获取历史列表
deleteExecutionHistory()    → 删除单条记录
clearExecutionHistory()     → 清空所有历史
```

## 状态标识

- `success` - 执行成功（绿色 Tag）
- `failure` - 执行失败（红色 Tag）