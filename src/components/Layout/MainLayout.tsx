/**
 * 主布局组件
 *
 * 使用 Ant Design Layout 组件构建页面布局，包含顶部导航和侧边菜单
 */

import React from 'react';
import { Layout, Menu, Typography } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppstoreOutlined,
  HistoryOutlined,
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

/**
 * MainLayout 组件
 *
 * 提供统一的应用布局结构：
 * - 顶部：应用标题
 * - 侧边：导航菜单
 * - 内容区：子路由渲染区域
 */
const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // 菜单项配置
  const menuItems = [
    {
      key: '/',
      icon: <AppstoreOutlined />,
      label: '脚本列表',
    },
    {
      key: '/history',
      icon: <HistoryOutlined />,
      label: '执行历史',
    },
  ];

  // 获取当前选中的菜单项
  const getSelectedKey = () => {
    // 如果是脚本详情页，选中首页
    if (location.pathname.startsWith('/scripts/')) {
      return '/';
    }
    return location.pathname;
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 侧边栏 */}
      <Sider
        collapsible
        breakpoint="lg"
        theme="light"
        style={{
          boxShadow: '2px 0 8px rgba(0, 0, 0, 0.05)',
        }}
      >
        {/* 应用标题 */}
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
            工具箱
          </Title>
        </div>

        {/* 导航菜单 */}
        <Menu
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0 }}
        />
      </Sider>

      {/* 右侧布局 */}
      <Layout>
        {/* 顶部栏 */}
        <Header
          style={{
            padding: '0 24px',
            background: '#fff',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Title level={4} style={{ margin: 0 }}>
            脚本工具箱
          </Title>
        </Header>

        {/* 内容区域 */}
        <Content
          style={{
            margin: 24,
            padding: 24,
            background: '#fff',
            borderRadius: 8,
            minHeight: 280,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
