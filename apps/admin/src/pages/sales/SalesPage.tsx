import { App, Button, Space, Table, Tag, Typography } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage } from '../../api/client';
import { salesApi } from '../../api/endpoints';
import { QueryBoundary } from '../../components/common/QueryBoundary';
import { useSalesHistory } from '../../hooks/useReports';
import type { SaleListRow } from '../../types';

const statusColor: Record<string, string> = {
  COMPLETED: 'green',
  REFUNDED: 'red',
  CANCELLED: 'default',
  DRAFT: 'orange',
  OPEN: 'blue',
};

export default function SalesPage() {
  const query = useSalesHistory();
  const qc = useQueryClient();
  const { message, modal } = App.useApp();

  const refund = (id: string) =>
    modal.confirm({
      title: 'Savdoni qaytarish',
      content: 'Qoldiq qaytariladi. Davom etilsinmi?',
      okText: 'Qaytarish',
      cancelText: 'Bekor',
      onOk: async () => {
        try {
          await salesApi.refund(id);
          message.success('Savdo qaytarildi');
          void qc.invalidateQueries({ queryKey: ['sales-history'] });
        } catch (e) {
          message.error(apiErrorMessage(e));
        }
      },
    });

  const columns = [
    { title: 'Chek', dataIndex: 'id', render: (v: string) => v.slice(0, 8) },
    { title: 'Sana', dataIndex: 'createdAt', render: (v: string) => new Date(v).toLocaleString() },
    { title: 'Kassir', render: (_: unknown, r: SaleListRow) => r.staff?.fish ?? '—' },
    { title: 'Tur', dataIndex: 'type', render: (v: string) => <Tag>{v}</Tag> },
    { title: 'Jami', dataIndex: 'total', render: (v: string) => `${Number(v).toLocaleString()} so‘m` },
    { title: 'Holat', dataIndex: 'status', render: (v: string) => <Tag color={statusColor[v]}>{v}</Tag> },
    {
      title: '',
      render: (_: unknown, r: SaleListRow) =>
        r.status === 'COMPLETED' && (
          <Button danger size="small" onClick={() => refund(r.id)}>Qaytarish</Button>
        ),
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>Savdo tarixi</Typography.Title>
      </Space>
      <QueryBoundary isLoading={query.isLoading} error={query.error} data={query.data} isEmpty={(d) => d.data.length === 0}>
        {(d) => <Table rowKey="id" dataSource={d.data} columns={columns} pagination={{ pageSize: 20 }} />}
      </QueryBoundary>
    </>
  );
}
