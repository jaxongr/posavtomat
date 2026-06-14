import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { apiErrorMessage } from '../api/client';
import { inventoryApi, suppliersApi } from '../api/endpoints';

export const useSuppliers = () => useQuery({ queryKey: ['suppliers'], queryFn: suppliersApi.list });

export const useCreateSupplier = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: suppliersApi.create,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['suppliers'] });
      message.success('Yetkazib beruvchi qo‘shildi');
    },
    onError: (e) => message.error(apiErrorMessage(e)),
  });
};

export const useReceivePurchase = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: inventoryApi.receive,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['stock'] });
      void qc.invalidateQueries({ queryKey: ['products'] });
      message.success('Kirim qabul qilindi — qoldiq oshdi');
    },
    onError: (e) => message.error(apiErrorMessage(e)),
  });
};
