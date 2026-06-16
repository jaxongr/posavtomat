import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { apiErrorMessage } from '../api/client';
import { customersApi, discountsApi, reportsApi } from '../api/endpoints';

// ── Discounts ──
export const useDiscounts = () => useQuery({ queryKey: ['discounts'], queryFn: discountsApi.list });

export const useCreateDiscount = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: discountsApi.create,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['discounts'] });
      message.success('Chegirma saqlandi');
    },
    onError: (e) => message.error(apiErrorMessage(e)),
  });
};

export const useDeleteDiscount = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (id: string) => discountsApi.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['discounts'] });
      message.success('Chegirma o‘chirildi');
    },
    onError: (e) => message.error(apiErrorMessage(e)),
  });
};

// ── Customers ──
export const useCustomers = (search?: string) =>
  useQuery({ queryKey: ['customers', search], queryFn: () => customersApi.list(search) });

export const useCreateCustomer = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: customersApi.create,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['customers'] });
      message.success('Mijoz qo‘shildi');
    },
    onError: (e) => message.error(apiErrorMessage(e)),
  });
};

export const useUpdateCustomer = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; fish?: string; phone?: string; discountPercent?: number }) =>
      customersApi.update(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['customers'] });
      message.success('Mijoz yangilandi');
    },
    onError: (e) => message.error(apiErrorMessage(e)),
  });
};

// ── Reports ──
export const useProfit = (from?: string, to?: string) =>
  useQuery({ queryKey: ['profit', from, to], queryFn: () => reportsApi.profit(from, to) });

export const useStaffReport = (from?: string, to?: string) =>
  useQuery({ queryKey: ['staff-report', from, to], queryFn: () => reportsApi.staff(from, to) });
