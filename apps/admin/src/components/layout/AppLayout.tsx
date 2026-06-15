import {
  AppstoreOutlined,
  BarChartOutlined,
  CoffeeOutlined,
  DashboardOutlined,
  DownloadOutlined,
  FireOutlined,
  GiftOutlined,
  InboxOutlined,
  LogoutOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  SmileOutlined,
  TeamOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { Layout, Menu, Select, Space, Spin, Typography } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useBranches } from '../../hooks/useStaff';
import { useOrganization } from '../../hooks/useRestaurant';
import { useAuthStore } from '../../store/auth.store';
import { ROLE_LABELS, type AuthUser } from '../../types';

const { Header, Sider, Content } = Layout;

interface NavItem {
  key: string;
  icon: ReactNode;
  label: string;
  roles: AuthUser['role'][];
  restaurantOnly?: boolean;
}

const NAV: NavItem[] = [
  { key: '/', icon: <DashboardOutlined />, label: 'Boshqaruv', roles: ['OWNER', 'MANAGER'] },
  { key: '/tables', icon: <CoffeeOutlined />, label: 'Zal', roles: ['OWNER', 'MANAGER', 'WAITER'], restaurantOnly: true },
  { key: '/kds', icon: <FireOutlined />, label: 'Oshxona', roles: ['OWNER', 'MANAGER', 'COOK', 'WAITER'], restaurantOnly: true },
  { key: '/kassa', icon: <ShoppingCartOutlined />, label: 'Kassa', roles: ['OWNER', 'MANAGER', 'CASHIER', 'SELLER', 'WAITER'] },
  { key: '/products', icon: <AppstoreOutlined />, label: 'Katalog', roles: ['OWNER', 'MANAGER', 'STOCKKEEPER'] },
  { key: '/inventory', icon: <InboxOutlined />, label: 'Ombor', roles: ['OWNER', 'MANAGER', 'STOCKKEEPER'] },
  { key: '/purchase', icon: <DownloadOutlined />, label: 'Kirim', roles: ['OWNER', 'MANAGER', 'STOCKKEEPER'] },
  { key: '/sales', icon: <ShoppingOutlined />, label: 'Savdo tarixi', roles: ['OWNER', 'MANAGER', 'CASHIER', 'SELLER', 'WAITER', 'COOK'] },
  { key: '/reports', icon: <BarChartOutlined />, label: 'Hisobotlar', roles: ['OWNER', 'MANAGER'] },
  { key: '/discounts', icon: <GiftOutlined />, label: 'Chegirmalar', roles: ['OWNER', 'MANAGER'] },
  { key: '/customers', icon: <SmileOutlined />, label: 'Mijozlar', roles: ['OWNER', 'MANAGER', 'CASHIER', 'SELLER', 'WAITER'] },
  { key: '/staff', icon: <TeamOutlined />, label: 'Hodimlar', roles: ['OWNER', 'MANAGER'] },
  { key: '/shifts', icon: <WalletOutlined />, label: 'Smena', roles: ['OWNER', 'MANAGER', 'CASHIER', 'WAITER'] },
];

// Home routing ignores restaurant-only pages (business type unknown at login).
export function allowedRoutes(role: AuthUser['role']): string[] {
  return NAV.filter((n) => !n.restaurantOnly && n.roles.includes(role)).map((n) => n.key);
}

function BranchSelector() {
  const { user, branchId, setBranch } = useAuthStore();
  // Only multi-branch users (no fixed branch, e.g. OWNER) pick a branch.
  const needsPicker = !user?.branchId;
  const branches = useBranches();

  useEffect(() => {
    if (!needsPicker || !branches.data?.length) return;
    // Pick the first branch if none chosen OR the persisted one belongs to
    // another organization (stale after switching accounts).
    const valid = branches.data.some((b) => b.id === branchId);
    if (!valid) {
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
  const { user, branchId, clear } = useAuthStore();
  const qc = useQueryClient();

  // Tenant-scoped queries send x-branch-id; refetch everything when it changes.
  useEffect(() => {
    void qc.invalidateQueries();
  }, [branchId, qc]);

  const logout = () => {
    clear();
    qc.clear();
    navigate('/login');
  };

  // Block content until a branch is chosen (OWNER picks; others fixed at login),
  // otherwise tenant-scoped requests would fail with E3001.
  const branchReady = Boolean(user?.branchId) || Boolean(branchId);

  const org = useOrganization();
  const isRestaurant = org.data?.businessType === 'RESTORAN';
  const items = NAV.filter(
    (n) => (user ? n.roles.includes(user.role) : false) && (!n.restaurantOnly || isRestaurant),
  ).map((n) => ({
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
            <Typography.Text type="secondary">{user?.fish} — {user ? ROLE_LABELS[user.role] : ''}</Typography.Text>
          </Space>
        </Header>
        <Content style={{ margin: 24 }}>
          {branchReady ? (
            <Outlet />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, paddingTop: 80 }}>
              <Spin size="large" />
              <Typography.Text type="secondary">Filial tanlanmoqda…</Typography.Text>
            </div>
          )}
        </Content>
      </Layout>
    </Layout>
  );
}
