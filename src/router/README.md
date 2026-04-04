# 路由配置

使用 React Router 7 配置应用路由。

## 路由表

| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | BuiltinScriptsPage | 内置脚本列表 |
| `/history` | HistoryPage | 执行历史 |

## 使用

```tsx
import AppRouter from '@/router';

function App() {
  return <AppRouter />;
}
```

## 布局结构

所有页面使用 `MainLayout` 包裹，包含侧边栏导航和顶部栏。