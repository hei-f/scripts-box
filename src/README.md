# 前端源码

React + TypeScript 前端，使用 Ant Design 6 构建用户界面。

## 目录结构

```
src/
├── components/     # 通用组件
├── pages/          # 页面组件
├── services/       # Tauri 服务层
├── types/          # TypeScript 类型定义
├── router/         # 路由配置
├── hooks/          # 自定义 Hooks
├── assets/         # 静态资源
├── App.tsx         # 根组件
└── main.tsx        # 入口文件
```

## 技术栈

- React 19 + TypeScript
- Ant Design 6
- React Router 7
- neverthrow（错误处理）

## 数据流

```
用户操作 → services/tauri.ts → Tauri invoke → Rust 后端
                                                    ↓
前端渲染 ← Result.match() ← 返回结果 ← Rust 处理完成
```

## 开发命令

```bash
bun run dev          # 开发模式
bunx tsc --noEmit    # 类型检查
bun run build        # 构建生产版本
```

## 注意事项

- 使用 bun 而非 npm
- Ant Design 6 的 API 与 v5 有差异