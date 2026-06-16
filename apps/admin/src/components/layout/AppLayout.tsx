import {
  AppstoreOutlined,
  BankOutlined,
  BarChartOutlined,
  CoffeeOutlined,
  DashboardOutlined,
  DownloadOutlined,
  FireOutlined,
  GiftOutlined,
  InboxOutlined,
  LogoutOutlined,
  ProfileOutlined,
  RollbackOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  SmileOutlined,
  TeamOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { Alert, Button, Layout, Menu, Select, Space, Spin, Typography } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useBranches } from '../../hooks/useStaff';
import { useOrganization } from '../../hooks/useRestaurant';
import { useKotNotifier } from '../../hooks/useKotNotifier';
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
  { key: '/superadmin', icon: <BankOutlined />, label: 'Bizneslar', roles: ['SUPERADMIN'] },
  { key: '/', icon: <DashboardOutlined />, label: 'Boshqaruv', roles: ['OWNER', 'MANAGER'] },
  { key: '/tables', icon: <CoffeeOutlined />, label: 'Zal', roles: ['OWNER', 'MANAGER', 'WAITER'], restaurantOnly: true },
  { key: '/orders', icon: <ProfileOutlined />, label: 'Buyurtmalar', roles: ['OWNER', 'MANAGER', 'WAITER'], restaurantOnly: true },
  { key: '/kds', icon: <FireOutlined />, label: 'Oshxona', roles: ['OWNER', 'MANAGER', 'COOK'], restaurantOnly: true },
  { key: '/kassa', icon: <ShoppingCartOutlined />, label: 'Kassa', roles: ['OWNER', 'MANAGER', 'CASHIER', 'SELLER', 'WAITER'] },
  { key: '/products', icon: <AppstoreOutlined />, label: 'Katalog', roles: ['OWNER', 'MANAGER', 'STOCKKEEPER'] },
  { key: '/inventory', icon: <InboxOutlined />, label: 'Ombor', roles: ['OWNER', 'MANAGER', 'STOCKKEEPER'] },
  { key: '/purchase', icon: <DownloadOutlined />, label: 'Kirim', roles: ['OWNER', 'MANAGER', 'STOCKKEEPER'] },
  { key: '/sales', icon: <ShoppingOutlined />, label: 'Savdo tarixi', roles: ['OWNER', 'MANAGER', 'CASHIER', 'SELLER', 'WAITER', 'COOK'] },
  { key: '/reports', icon: <BarChartOutlined />, label: 'Hisobotlar', roles: ['OWNER', 'MANAGER'] },
  { key: '/discounts', icon: <GiftOutlined />, label: 'Chegirmalar', roles: ['OWNER', 'MANAGER'] },
  { key: '/customers', icon: <SmileOutlined />, label: 'Mijozlar', roles: ['OWNER', 'MANAGER', 'CASHIER', 'SELLER', 'WAITER'] },
  { key: '/staff', icon: <TeamOutlined />, label: 'Hodimlar', roles: ['OWNER', 'MANAGER'] },
  { key: '/settings', icon: <SettingOutlined />, label: 'Sozlamalar', roles: ['OWNER', 'MANAGER'] },
  { key: '/shifts', icon: <WalletOutlined />, label: 'Smena', roles: ['OWNER', 'MANAGER', 'CASHIER', 'WAITER'] },
];

// Home routing ignores restaurant-only pages (business type unknown at login).
export function allowedRoutes(role: AuthUser['role']): string[] {
  return NAV.filter((n) => !n.restaurantOnly && n.roles.includes(role)).map((n) => n.key);
}

function BranchSelector() {
  const { user, branchId, setBranch } = useAuthStore();
  // Only multi-branch business users (no fixed branch, e.g. OWNER) pick a branch.
  // Super-admin operates globally and needs no branch.
  const needsPicker = !user?.branchId && user?.role !== 'SUPERADMIN';
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
  const { user, branchId, clear, stash, exitBusiness } = useAuthStore();
  const qc = useQueryClient();

  const backToAdmin = () => {
    exitBusiness();
    qc.clear();
    navigate('/superadmin');
  };

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
  // otherwise tenant-scoped requests would fail with E3001. Super-admin needs none.
  const branchReady = user?.role === 'SUPERADMIN' || Boolean(user?.branchId) || Boolean(branchId);

  const org = useOrganization();
  const isRestaurant = org.data?.businessType === 'RESTORAN';
  const sub = org.data?.subscription;

  // Role-aware kitchen sound: cook hears new orders, waiter hears "ready".
  useKotNotifier();
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 16px' }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#818CF8,#4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 18 }}>S</div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 17, letterSpacing: 0.3 }}>SAVDO-POS</span>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={[
            ...(stash ? [{ key: '__back', icon: <RollbackOutlined />, label: 'Boshqaruvga qaytish', onClick: backToAdmin }] : []),
            ...items,
            { key: 'logout', icon: <LogoutOutlined />, label: 'Chiqish', onClick: logout },
          ]}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingInline: 24 }}>
          <BranchSelector />
          <Space>
            <Typography.Text type="secondary">{user?.fish} — {user ? ROLE_LABELS[user.role] : ''}</Typography.Text>
          </Space>
        </Header>
        {stash && (
          <Alert
            banner
            type="info"
            showIcon
            message="Siz super-admin sifatida biznes egasi ko‘rinishidasiz"
            action={<Button size="small" onClick={backToAdmin}>← Boshqaruvga qaytish</Button>}
          />
        )}
        {sub && sub.state !== 'active' && user?.role !== 'SUPERADMIN' && (
          <Alert
            banner
            type={sub.state === 'expired' ? 'error' : 'warning'}
            showIcon
            message={
              sub.state === 'expired'
                ? 'Obuna muddati tugagan — savdo to‘xtatildi. Iltimos, obunani yangilang.'
                : `Obuna muddati tugayapti${sub.daysLeft !== null ? ` (${sub.daysLeft} kun)` : ''} — iltimos, yangilang.`
            }
          />
        )}
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
