/**
 * 应用入口组件
 *
 * 配置 Ant Design 主题和全局 Provider，集成前端路由
 */

import React from 'react';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';

// 路由
import AppRouter from './router';

/**
 * 主题配置
 *
 * 使用 token 方式配置主题，符合 Ant Design 设计规范
 */
const themeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    // 主色调
    colorPrimary: '#1890ff',
    // 圆角
    borderRadius: 6,
    // 字体
    fontSize: 14,
  },
};

/**
 * App 组件
 *
 * 作为应用的根组件，负责：
 * - 配置 Ant Design 的 ConfigProvider（中文语言包、主题 tokens）
 * - 提供全局上下文
 * - 渲染路由
 */
const App: React.FC = () => {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={themeConfig}
    >
      <AppRouter />
    </ConfigProvider>
  );
};

export default App;
