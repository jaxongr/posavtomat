import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../api/endpoints';

export const useDashboard = () =>
  useQuery({ queryKey: ['dashboard'], queryFn: reportsApi.dashboard, refetchInterval: 30_000 });

export const useSalesHistory = () =>
  useQuery({ queryKey: ['sales-history'], queryFn: () => reportsApi.sales({ limit: 50 }) });
