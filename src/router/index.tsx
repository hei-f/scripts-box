/**
 * 路由配置模块
 *
 * 使用 react-router-dom 配置应用路由
 * 使用 createHashRouter 以支持 Tauri 的 file:// 协议
 */

import React from 'react';
import { createHashRouter, RouterProvider } from 'react-router-dom';

// 布局组件
import { MainLayout } from '../components/Layout';

// 页面组件
import BuiltinScriptsPage from '../pages/BuiltinScripts';
import HistoryPage from '../pages/History';
import SettingsPage from '../pages/Settings';
import QuickExecutionPage from '../pages/QuickExecution';

/**
 * 主窗口路由配置
 */
const mainRouter = createHashRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <BuiltinScriptsPage />,
      },
      {
        path: 'history',
        element: <HistoryPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },
]);

/**
 * 快速执行窗口路由配置
 */
const quickExecutionRouter = createHashRouter([
  {
    path: '/',
    element: <QuickExecutionPage />,
  },
]);

/**
 * AppRouter 组件
 *
 * 根据当前窗口标签选择对应的路由配置
 */
const AppRouter: React.FC = () => {
  // 检测当前窗口标签
  // HashRouter 的查询参数在 hash 后面，格式为 #/?window=quick-execution
  const isQuickExecution = typeof window !== 'undefined' &&
    (window.location.search.includes('window=quick-execution') ||
     window.location.hash.includes('window=quick-execution'));

  const router = isQuickExecution ? quickExecutionRouter : mainRouter;
  return <RouterProvider router={router} />;
};

export default AppRouter;
