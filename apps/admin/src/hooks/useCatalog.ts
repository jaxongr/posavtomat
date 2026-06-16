import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { apiErrorMessage } from '../api/client';
import { catalogApi, type CreateProductBody } from '../api/endpoints';

export const useProducts = (params: { search?: string; categoryId?: string }) =>
  useQuery({
    queryKey: ['products', params],
    queryFn: () => catalogApi.getProducts({ ...params, limit: 50 }),
    staleTime: 5 * 60 * 1000,
  });

export const useCategories = () =>
  useQuery({ queryKey: ['categories'], queryFn: catalogApi.getCategories, staleTime: 10 * 60 * 1000 });

export const useCreateProduct = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (body: CreateProductBody) => catalogApi.createProduct(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['products'] });
      message.success('Mahsulot qo‘shildi');
    },
    onError: (e) => message.error(apiErrorMessage(e)),
  });
};

export const useDeleteProduct = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (id: string) => catalogApi.deleteProduct(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['products'] });
      message.success('Mahsulot o‘chirildi');
    },
    onError: (e) => message.error(apiErrorMessage(e)),
  });
};
