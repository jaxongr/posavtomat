import { App, Button, Card, Descriptions, Input, Tag, Typography } from 'antd';
import { useState } from 'react';
import { apiErrorMessage } from '../../api/client';
import { salesApi } from '../../api/endpoints';
import type { Sale } from '../../types';

export default function SalesPage() {
  const { message } = App.useApp();
  const [id, setId] = useState('');
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(false);

  const lookup = async (value: string) => {
    setLoading(true);
    try {
      setSale(await salesApi.getOne(value));
    } catch (e) {
      message.error(apiErrorMessage(e));
      setSale(null);
    } finally {
      setLoading(false);
    }
  };

  const refund = async () => {
    if (!sale) return;
    try {
      setSale(await salesApi.refund(sale.id));
      message.success('Savdo qaytarildi');
    } catch (e) {
      message.error(apiErrorMessage(e));
    }
  };

  return (
    <>
      <Typography.Title level={3}>Savdo / Chek</Typography.Title>
      <Input.Search
        placeholder="Savdo ID (chek raqami)"
        enterButton="Topish"
        loading={loading}
        onSearch={lookup}
        value={id}
        onChange={(e) => setId(e.target.value)}
        style={{ maxWidth: 480, marginBottom: 16 }}
      />
      {sale && (
        <Card
          title={`Chek ${sale.id.slice(0, 8)}`}
          extra={
            sale.status === 'COMPLETED' ? (
              <Button danger onClick={refund}>Qaytarish (vozvrat)</Button>
            ) : (
              <Tag color="red">{sale.status}</Tag>
            )
          }
        >
          <Descriptions column={2}>
            <Descriptions.Item label="Turi">{sale.type}</Descriptions.Item>
            <Descriptions.Item label="Holat">{sale.status}</Descriptions.Item>
            <Descriptions.Item label="Oraliq summa">{Number(sale.subtotal).toLocaleString()} so‘m</Descriptions.Item>
            <Descriptions.Item label="Chegirma">{Number(sale.discount).toLocaleString()} so‘m</Descriptions.Item>
            <Descriptions.Item label="Jami">{Number(sale.total).toLocaleString()} so‘m</Descriptions.Item>
            <Descriptions.Item label="Sana">{new Date(sale.createdAt).toLocaleString()}</Descriptions.Item>
          </Descriptions>
        </Card>
      )}
    </>
  );
}
