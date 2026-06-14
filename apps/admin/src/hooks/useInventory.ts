import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { apiErrorMessage } from '../api/client';
import { inventoryApi } from '../api/endpoints';

export const useStock = (lowOnly = false) =>
  useQuery({
    queryKey: ['stock', { lowOnly }],
    queryFn: () => inventoryApi.getStock({ limit: 100, lowOnly: lowOnly ? 'true' : undefined }),
  });

export const useAdjustStock = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: inventoryApi.adjust,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['stock'] });
      message.success('Qoldiq yangilandi');
    },
    onError: (e) => message.error(apiErrorMessage(e)),
  });
};
