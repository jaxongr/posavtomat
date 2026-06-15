import { App, Button, Card, Col, Divider, List, Modal, Radio, Row, Space, Statistic, Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { apiErrorMessage } from '../../api/client';
import { ordersApi } from '../../api/endpoints';
import { QueryBoundary } from '../../components/common/QueryBoundary';
import { useProducts } from '../../hooks/useCatalog';
import type { Product } from '../../types';

export default function OrderPage() {
  const { tableId = '' } = useParams();
  const [params] = useSearchParams();
  const tableName = params.get('name') ?? 'Stol';
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { message, modal } = App.useApp();

  const products = useProducts({});
  const orderQ = useQuery({ queryKey: ['order', tableId], queryFn: () => ordersApi.byTable(tableId), enabled: Boolean(tableId) });
  const order = orderQ.data;

  const [toSend, setToSend] = useState<{ product: Product; qty: number }[]>([]);
  const [sending, setSending] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [provider, setProvider] = useState<'CASH' | 'CARD'>('CASH');
  const [paying, setPaying] = useState(false);

  const sendTotal = useMemo(() => toSend.reduce((s, l) => s + Number(l.product.price) * l.qty, 0), [toSend]);

  const addToSend = (p: Product) =>
    setToSend((prev) => {
      const i = prev.findIndex((l) => l.product.id === p.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], qty: next[i].qty + 1 };
        return next;
      }
      return [...prev, { product: p, qty: 1 }];
    });

  const send = async () => {
    if (!toSend.length) return;
    setSending(true);
    try {
      const items = toSend.map((l) => ({ productId: l.product.id, qty: l.qty }));
      if (order) {
        await ordersApi.addItems(order.id, items);
      } else {
        await ordersApi.open({ tableId, items });
      }
      setToSend([]);
      message.success('Oshxonaga yuborildi');
      void qc.invalidateQueries({ queryKey: ['order', tableId] });
      void qc.invalidateQueries({ queryKey: ['tables'] });
      void qc.invalidateQueries({ queryKey: ['kots'] });
    } catch (e) {
      message.error(apiErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const pay = async () => {
    if (!order) return;
    setPaying(true);
    try {
      await ordersApi.pay(order.id, [{ provider, amount: Number(order.total) }]);
      message.success('Hisob yopildi — stol bo‘shadi');
      void qc.invalidateQueries({ queryKey: ['tables'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      navigate('/tables');
    } catch (e) {
      message.error(apiErrorMessage(e));
    } finally {
      setPaying(false);
      setPayOpen(false);
    }
  };

  const cancel = () =>
    order &&
    modal.confirm({
      title: 'Buyurtmani bekor qilish',
      content: 'Qoldiq qaytariladi, stol bo‘shaydi.',
      okText: 'Bekor qilish',
      cancelText: 'Yopish',
      onOk: async () => {
        try {
          await ordersApi.cancel(order.id);
          void qc.invalidateQueries({ queryKey: ['tables'] });
          navigate('/tables');
        } catch (e) {
          message.error(apiErrorMessage(e));
        }
      },
    });

  return (
    <>
      <Space style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {tableName} {order ? <Tag color="orange">Ochiq buyurtma</Tag> : <Tag color="green">Yangi</Tag>}
        </Typography.Title>
        <Button onClick={() => navigate('/tables')}>← Zalga qaytish</Button>
      </Space>

      <Row gutter={16}>
        {/* Menu */}
        <Col xs={24} md={14}>
          <Typography.Title level={5}>Menyu</Typography.Title>
          <QueryBoundary isLoading={products.isLoading} error={products.error} data={products.data} isEmpty={(d) => d.data.length === 0}>
            {(d) => (
              <Row gutter={[12, 12]}>
                {d.data.map((p) => (
                  <Col xs={12} sm={8} key={p.id}>
                    <Card hoverable onClick={() => addToSend(p)} styles={{ body: { padding: 12 } }}>
                      <div style={{ fontWeight: 600, minHeight: 40 }}>{p.name}</div>
                      <div style={{ color: '#0EA5E9', fontWeight: 700 }}>{Number(p.price).toLocaleString()} so‘m</div>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </QueryBoundary>
        </Col>

        {/* Order */}
        <Col xs={24} md={10}>
          <Card title="Yuboriladigan (yangi)" size="small" style={{ marginBottom: 16 }}>
            <List
              size="small"
              dataSource={toSend}
              locale={{ emptyText: 'Taom tanlang' }}
              renderItem={(l) => (
                <List.Item
                  actions={[
                    <Button key="x" size="small" type="text" danger onClick={() => setToSend((s) => s.filter((x) => x.product.id !== l.product.id))}>×</Button>,
                  ]}
                >
                  {l.product.name} × {l.qty} = {(Number(l.product.price) * l.qty).toLocaleString()}
                </List.Item>
              )}
            />
            <Button type="primary" block style={{ marginTop: 8 }} disabled={!toSend.length} loading={sending} onClick={send}>
              Oshxonaga yuborish ({sendTotal.toLocaleString()} so‘m)
            </Button>
          </Card>

          <Card title="Buyurtma (yuborilgan)">
            {order ? (
              <>
                <List
                  size="small"
                  dataSource={order.items}
                  renderItem={(it) => (
                    <List.Item>
                      {it.product.name} × {Number(it.qty)} ={' '}
                      {(Number(it.price) * Number(it.qty)).toLocaleString()} so‘m
                    </List.Item>
                  )}
                />
                <Divider style={{ margin: '12px 0' }} />
                <Statistic title="Jami hisob" value={Number(order.total)} suffix="so‘m" />
                <Space style={{ marginTop: 12, width: '100%' }} direction="vertical">
                  <Button type="primary" size="large" block style={{ background: '#16A34A' }} onClick={() => setPayOpen(true)}>
                    Hisob — to‘lov
                  </Button>
                  <Button danger block onClick={cancel}>Buyurtmani bekor qilish</Button>
                </Space>
              </>
            ) : (
              <Typography.Text type="secondary">Hali buyurtma ochilmagan. Taom tanlab &quot;Oshxonaga yuborish&quot;ni bosing.</Typography.Text>
            )}
          </Card>
        </Col>
      </Row>

      <Modal title="Hisobni yopish" open={payOpen} onOk={pay} onCancel={() => setPayOpen(false)} confirmLoading={paying} okText="To‘lashni tasdiqlash">
        {order && (
          <>
            <Statistic title="To‘lanadigan summa" value={Number(order.total)} suffix="so‘m" style={{ marginBottom: 16 }} />
            <Radio.Group value={provider} onChange={(e) => setProvider(e.target.value)}>
              <Radio.Button value="CASH">Naqd</Radio.Button>
              <Radio.Button value="CARD">Karta</Radio.Button>
            </Radio.Group>
          </>
        )}
      </Modal>
    </>
  );
}
