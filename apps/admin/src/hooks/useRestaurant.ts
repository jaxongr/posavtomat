import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { apiErrorMessage } from '../api/client';
import { kitchenApi, ordersApi, orgApi, tablesApi } from '../api/endpoints';

export const useOrganization = () =>
  useQuery({ queryKey: ['organization'], queryFn: orgApi.organization, staleTime: 10 * 60 * 1000 });

export const useUpdateOrg = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: orgApi.update,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['organization'] });
      message.success('Sozlamalar saqlandi');
    },
    onError: (e) => message.error(apiErrorMessage(e)),
  });
};

export const useTables = () =>
  useQuery({ queryKey: ['tables'], queryFn: tablesApi.list, refetchInterval: 5000 });

export const useCreateTable = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: tablesApi.create,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tables'] });
      message.success('Stol qo‘shildi');
    },
    onError: (e) => message.error(apiErrorMessage(e)),
  });
};

export const useSetTableStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => tablesApi.setStatus(id, status),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['tables'] }),
  });
};

export const useKots = () =>
  useQuery({ queryKey: ['kots'], queryFn: kitchenApi.kots, refetchInterval: 4000 });

export const useActiveOrders = () =>
  useQuery({ queryKey: ['active-orders'], queryFn: ordersApi.active, refetchInterval: 5000 });

export const useSetKotStatus = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => kitchenApi.setStatus(id, status),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['kots'] });
      message.success('Holat yangilandi');
    },
    onError: (e) => message.error(apiErrorMessage(e)),
  });
};
