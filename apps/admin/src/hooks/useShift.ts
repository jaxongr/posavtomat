import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { apiErrorMessage } from '../api/client';
import { shiftsApi } from '../api/endpoints';

export const useCurrentShift = () =>
  useQuery({ queryKey: ['shift', 'current'], queryFn: shiftsApi.current });

export const useOpenShift = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (openCash: number) => shiftsApi.open(openCash),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['shift'] });
      message.success('Smena ochildi');
    },
    onError: (e) => message.error(apiErrorMessage(e)),
  });
};

export const useCloseShift = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (closeCash: number) => shiftsApi.close(closeCash),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['shift'] });
      message.success('Smena yopildi (Z-hisobot)');
    },
    onError: (e) => message.error(apiErrorMessage(e)),
  });
};
