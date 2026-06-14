import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { apiErrorMessage } from '../api/client';
import { orgApi, staffApi } from '../api/endpoints';

export const useStaff = () => useQuery({ queryKey: ['staff'], queryFn: staffApi.list });

export const useBranches = () => useQuery({ queryKey: ['branches'], queryFn: orgApi.branches });

export const useCreateStaff = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: staffApi.create,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['staff'] });
      message.success('Hodim qo‘shildi');
    },
    onError: (e) => message.error(apiErrorMessage(e)),
  });
};

export const useDeactivateStaff = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (id: string) => staffApi.deactivate(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['staff'] });
      message.success('Hodim o‘chirildi');
    },
    onError: (e) => message.error(apiErrorMessage(e)),
  });
};
