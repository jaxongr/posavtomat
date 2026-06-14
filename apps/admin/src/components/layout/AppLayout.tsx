import {
  AppstoreOutlined,
  DashboardOutlined,
  InboxOutlined,
  LogoutOutlined,
  ShoppingOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { Layout, Menu, Typography } from 'antd';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';

const { Header, Sider, Content } = Layout;

const items = [
  { key: '/', icon: <DashboardOutlined />, label: <Link to="/">Boshqaruv paneli</Link> },
  { key: '/products', icon: <AppstoreOutlined />, label: <Link to="/products">Katalog</Link> },
  { key: '/inventory', icon: <InboxOutlined />, label: <Link to="/inventory">Ombor</Link> },
  { key: '/sales', icon: <ShoppingOutlined />, label: <Link to="/sales">Savdo</Link> },
  { key: '/shifts', icon: <WalletOutlined />, label: <Link to="/shifts">Smena</Link> },
];

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, clear } = useAuthStore();

  const logout = () => {
    clear();
    navigate('/login');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth="0">
        <div style={{ color: '#fff', padding: 16, fontWeight: 700, fontSize: 18 }}>SAVDO-POS</div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={[...items, { key: 'logout', icon: <LogoutOutlined />, label: 'Chiqish', onClick: logout }]}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', paddingInline: 24 }}>
          <Typography.Text type="secondary">{user?.fish} — {user?.role}</Typography.Text>
        </Header>
        <Content style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
