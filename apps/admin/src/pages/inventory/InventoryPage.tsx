import { Button, InputNumber, Space, Switch, Table, Tag, Typography } from 'antd';
import { useState } from 'react';
import { QueryBoundary } from '../../components/common/QueryBoundary';
import { useAdjustStock, useStock } from '../../hooks/useInventory';
import type { StockRow } from '../../types';

export default function InventoryPage() {
  const [lowOnly, setLowOnly] = useState(false);
  const [editing, setEditing] = useState<Record<string, number>>({});
  const query = useStock(lowOnly);
  const adjust = useAdjustStock();

  const columns = [
    { title: 'Mahsulot', render: (_: unknown, r: StockRow) => r.product.name },
    { title: 'Birlik', render: (_: unknown, r: StockRow) => r.product.unit },
    {
      title: 'Qoldiq',
      render: (_: unknown, r: StockRow) => {
        const low = Number(r.quantity) <= Number(r.minQuantity);
        return <Tag color={low ? 'red' : 'green'}>{r.quantity}</Tag>;
      },
    },
    { title: 'Min', dataIndex: 'minQuantity' },
    {
      title: 'Inventarizatsiya',
      render: (_: unknown, r: StockRow) => (
        <Space>
          <InputNumber
            min={0}
            placeholder="Sanab chiqilgan"
            onChange={(v) => setEditing((s) => ({ ...s, [r.product.id]: Number(v) }))}
          />
          <Button
            size="small"
            disabled={editing[r.product.id] === undefined}
            onClick={() =>
              adjust.mutate({ productId: r.product.id, countedQty: editing[r.product.id] })
            }
          >
            Saqlash
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }}>
        <Typography.Title level={3} style={{ margin: 0 }}>Ombor</Typography.Title>
        <Space>
          Faqat kam qolganlar <Switch checked={lowOnly} onChange={setLowOnly} />
        </Space>
      </Space>
      <QueryBoundary
        isLoading={query.isLoading}
        error={query.error}
        data={query.data}
        isEmpty={(d) => d.data.length === 0}
      >
        {(d) => <Table rowKey="id" dataSource={d.data} columns={columns} pagination={false} />}
      </QueryBoundary>
    </>
  );
}
