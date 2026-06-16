import { Empty, Space, Table, Tag, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { QueryBoundary } from '../../components/common/QueryBoundary';
import { useActiveOrders } from '../../hooks/useRestaurant';
import type { ActiveOrder } from '../../api/endpoints';

// Overall kitchen status of an order, derived from its tickets (KOTs).
function orderStatus(kots: ActiveOrder['kots']): { label: string; color: string } {
  const active = kots.filter((k) => k.status !== 'SERVED');
  if (kots.length === 0) return { label: 'Yangi', color: 'default' };
  if (active.length === 0) return { label: 'Berildi', color: 'default' };
  if (active.some((k) => k.status === 'NEW')) return { label: 'Oshxonaga tushdi', color: 'orange' };
  if (active.some((k) => k.status === 'COOKING')) return { label: 'Tayyorlanmoqda', color: 'gold' };
  return { label: '🔔 Tayyor', color: 'green' };
}

function minutesAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

export default function OrdersPage() {
  const query = useActiveOrders();
  const navigate = useNavigate();

  const columns = [
    {
      title: 'Stol',
      render: (_: unknown, r: ActiveOrder) => <strong>{r.table?.name ?? 'Olib ketish'}</strong>,
    },
    {
      title: 'Ofitsiant',
      render: (_: unknown, r: ActiveOrder) => r.staff?.fish ?? '—',
    },
    {
      title: 'Taomlar',
      render: (_: unknown, r: ActiveOrder) => (
        <Typography.Text type="secondary">
          {r.items.map((it) => `${it.product.name}×${Number(it.qty)}`).join(', ')}
        </Typography.Text>
      ),
    },
    {
      title: 'Holat',
      render: (_: unknown, r: ActiveOrder) => {
        const s = orderStatus(r.kots);
        return <Tag color={s.color}>{s.label}</Tag>;
      },
    },
    {
      title: 'Jami',
      align: 'right' as const,
      render: (_: unknown, r: ActiveOrder) => `${Number(r.total).toLocaleString()} so‘m`,
    },
    {
      title: 'Vaqt',
      render: (_: unknown, r: ActiveOrder) => {
        const m = minutesAgo(r.createdAt);
        return <Tag color={m >= 20 ? 'red' : 'default'}>{m} daq</Tag>;
      },
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }}>
        <Typography.Title level={3} style={{ margin: 0 }}>Buyurtmalar (jonli)</Typography.Title>
      </Space>
      <QueryBoundary isLoading={query.isLoading} error={query.error} data={query.data}>
        {(orders: ActiveOrder[]) =>
          orders.length === 0 ? (
            <Empty description="Faol buyurtma yo‘q" />
          ) : (
            <Table
              rowKey="id"
              dataSource={orders}
              columns={columns}
              pagination={false}
              onRow={(r) => ({
                style: { cursor: r.tableId ? 'pointer' : 'default' },
                onClick: () =>
                  r.tableId && navigate(`/order/${r.tableId}?name=${encodeURIComponent(r.table?.name ?? 'Stol')}`),
              })}
            />
          )
        }
      </QueryBoundary>
    </>
  );
}
