import { Empty, Result, Skeleton } from 'antd';
import type { ReactNode } from 'react';
import { apiErrorMessage } from '../../api/client';

interface Props<T> {
  isLoading: boolean;
  error: unknown;
  data: T | undefined;
  isEmpty?: (data: T) => boolean;
  children: (data: T) => ReactNode;
}

/** Standard loading / error / empty handling for queries. */
export function QueryBoundary<T>({ isLoading, error, data, isEmpty, children }: Props<T>) {
  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 6 }} />;
  }
  if (error) {
    return <Result status="error" title="Xato" subTitle={apiErrorMessage(error)} />;
  }
  if (data === undefined || (isEmpty && isEmpty(data))) {
    return <Empty description="Ma‘lumot topilmadi" />;
  }
  return <>{children(data)}</>;
}
