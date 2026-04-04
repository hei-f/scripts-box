/**
 * 路由配置模块
 *
 * 使用 react-router-dom 配置应用路由
 */

import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

// 布局组件
import { MainLayout } from '../components/Layout';

// 页面组件
import BuiltinScriptsPage from '../pages/BuiltinScripts';
import HistoryPage from '../pages/History';

/**
 * 路由配置
 *
 * - `/` - 首页（内置脚本列表）
 * - `/history` - 执行历史页面
 */
const router = createBrowserRouter([
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
    ],
  },
]);

/**
 * AppRouter 组件
 *
 * 提供路由配置的封装组件
 */
const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter;
