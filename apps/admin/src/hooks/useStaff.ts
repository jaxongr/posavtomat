import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { apiErrorMessage } from '../api/client';
import { orgApi, staffApi } from '../api/endpoints';
import { useAuthStore } from '../store/auth.store';

export const useStaff = () => useQuery({ queryKey: ['staff'], queryFn: staffApi.list });

// Scoped by org so switching accounts refetches the correct branches.
export const useBranches = () => {
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useQuery({ queryKey: ['branches', orgId], queryFn: orgApi.branches, enabled: Boolean(orgId) });
};

export const useCreateBranch = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: orgApi.createBranch,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['branches'] });
      message.success('Filial qo‘shildi');
    },
    onError: (e) => message.error(apiErrorMessage(e)),
  });
};

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
