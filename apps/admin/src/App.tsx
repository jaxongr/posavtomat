import { lazy, Suspense, type ReactNode } from 'react';
import { Spin } from 'antd';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout, { allowedRoutes } from './components/layout/AppLayout';
import { useAuthStore } from './store/auth.store';

const LoginPage = lazy(() => import('./pages/login/LoginPage'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const KassaPage = lazy(() => import('./pages/kassa/KassaPage'));
const ProductsPage = lazy(() => import('./pages/products/ProductsPage'));
const InventoryPage = lazy(() => import('./pages/inventory/InventoryPage'));
const PurchasePage = lazy(() => import('./pages/purchase/PurchasePage'));
const SalesPage = lazy(() => import('./pages/sales/SalesPage'));
const StaffPage = lazy(() => import('./pages/staff/StaffPage'));
const ShiftsPage = lazy(() => import('./pages/shifts/ShiftsPage'));

function RequireAuth({ children }: { children: ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  return accessToken ? <>{children}</> : <Navigate to="/login" replace />;
}

/** Send each role to the first page it is allowed to see. */
function RoleHome() {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  const routes = allowedRoutes(user.role);
  return <Navigate to={routes[0] ?? '/login'} replace />;
}

const fallback = (
  <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
    <Spin size="large" />
  </div>
);

export default function App() {
  return (
    <Suspense fallback={fallback}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/kassa" element={<KassaPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/purchase" element={<PurchasePage />} />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/staff" element={<StaffPage />} />
          <Route path="/shifts" element={<ShiftsPage />} />
        </Route>
        <Route path="*" element={<RoleHome />} />
      </Routes>
    </Suspense>
  );
}
