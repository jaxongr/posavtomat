import {
  AppstoreOutlined,
  DashboardOutlined,
  DownloadOutlined,
  InboxOutlined,
  LogoutOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  TeamOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { Layout, Menu, Select, Space, Typography } from 'antd';
import { useEffect, type ReactNode } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useBranches } from '../../hooks/useStaff';
import { useAuthStore } from '../../store/auth.store';
import type { AuthUser } from '../../types';

const { Header, Sider, Content } = Layout;

interface NavItem {
  key: string;
  icon: ReactNode;
  label: string;
  roles: AuthUser['role'][];
}

const NAV: NavItem[] = [
  { key: '/', icon: <DashboardOutlined />, label: 'Boshqaruv', roles: ['OWNER', 'MANAGER'] },
  { key: '/kassa', icon: <ShoppingCartOutlined />, label: 'Kassa', roles: ['OWNER', 'MANAGER', 'CASHIER', 'WAITER'] },
  { key: '/products', icon: <AppstoreOutlined />, label: 'Katalog', roles: ['OWNER', 'MANAGER', 'STOCKKEEPER'] },
  { key: '/inventory', icon: <InboxOutlined />, label: 'Ombor', roles: ['OWNER', 'MANAGER', 'STOCKKEEPER'] },
  { key: '/purchase', icon: <DownloadOutlined />, label: 'Kirim', roles: ['OWNER', 'MANAGER', 'STOCKKEEPER'] },
  { key: '/sales', icon: <ShoppingOutlined />, label: 'Savdo tarixi', roles: ['OWNER', 'MANAGER', 'CASHIER', 'WAITER', 'COOK'] },
  { key: '/staff', icon: <TeamOutlined />, label: 'Hodimlar', roles: ['OWNER', 'MANAGER'] },
  { key: '/shifts', icon: <WalletOutlined />, label: 'Smena', roles: ['OWNER', 'MANAGER', 'CASHIER', 'WAITER'] },
];

export function allowedRoutes(role: AuthUser['role']): string[] {
  return NAV.filter((n) => n.roles.includes(role)).map((n) => n.key);
}

function BranchSelector() {
  const { user, branchId, setBranch } = useAuthStore();
  // Only multi-branch users (no fixed branch, e.g. OWNER) pick a branch.
  const needsPicker = !user?.branchId;
  const branches = useBranches();

  useEffect(() => {
    if (needsPicker && !branchId && branches.data?.length) {
      setBranch(branches.data[0].id);
    }
  }, [needsPicker, branchId, branches.data, setBranch]);

  if (!needsPicker) return null;

  return (
    <Select
      value={branchId ?? undefined}
      onChange={setBranch}
      loading={branches.isLoading}
      style={{ width: 200 }}
      placeholder="Filial tanlang"
      options={(branches.data ?? []).map((b) => ({ value: b.id, label: b.name }))}
    />
  );
}

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, clear } = useAuthStore();

  const logout = () => {
    clear();
    navigate('/login');
  };

  const items = NAV.filter((n) => (user ? n.roles.includes(user.role) : false)).map((n) => ({
    key: n.key,
    icon: n.icon,
    label: <Link to={n.key}>{n.label}</Link>,
  }));

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
        <Header style={{ background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingInline: 24 }}>
          <BranchSelector />
          <Space>
            <Typography.Text type="secondary">{user?.fish} — {user?.role}</Typography.Text>
          </Space>
        </Header>
        <Content style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
