import { App, Button, Card, Col, Empty, Input, InputNumber, List, Radio, Row, Space, Statistic, Switch, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage } from '../../api/client';
import { salesApi } from '../../api/endpoints';
import { QueryBoundary } from '../../components/common/QueryBoundary';
import { useProducts } from '../../hooks/useCatalog';
import { useCurrentShift, useOpenShift } from '../../hooks/useShift';
import { useOrganization } from '../../hooks/useRestaurant';
import { useAuthStore } from '../../store/auth.store';
import { useSettings } from '../../store/settings.store';
import type { Product } from '../../types';
import { printReceipt } from '../../utils/receipt';
import { uuidv4 } from '../../utils/uuid';

interface Line {
  product: Product;
  qty: number;
}

export default function KassaPage() {
  const products = useProducts({});
  const { data: shift } = useCurrentShift();
  const openShift = useOpenShift();
  const qc = useQueryClient();
  const { message, modal } = App.useApp();
  const autoPrint = useSettings((s) => s.autoPrint);
  const setAutoPrint = useSettings((s) => s.setAutoPrint);
  const user = useAuthStore((s) => s.user);
  const rc = useOrganization().data?.settings?.receipt ?? {};

  const [params] = useSearchParams();
  const tableId = params.get('table') ?? undefined;
  const tableName = params.get('tableName') ?? undefined;

  const [lines, setLines] = useState<Line[]>([]);
  const [provider, setProvider] = useState<'CASH' | 'CARD'>('CASH');
  const [tendered, setTendered] = useState<number>(0); // naqd berildi
  const [paying, setPaying] = useState(false);

  const total = useMemo(() => lines.reduce((s, l) => s + Number(l.product.price) * l.qty, 0), [lines]);

  const add = (p: Product) =>
    setLines((prev) => {
      const i = prev.findIndex((l) => l.product.id === p.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], qty: next[i].qty + 1 };
        return next;
      }
      return [...prev, { product: p, qty: 1 }];
    });

  const setQty = (id: string, qty: number) =>
    setLines((prev) => (qty <= 0 ? prev.filter((l) => l.product.id !== id) : prev.map((l) => (l.product.id === id ? { ...l, qty } : l))));

  // Barcode scanner (keyboard-wedge): types the code + Enter → add the match.
  const onScan = (code: string) => {
    const value = code.trim();
    if (!value) return;
    const all = products.data?.data ?? [];
    const match = all.find((p) => p.barcode === value) ?? all.find((p) => p.name.toLowerCase().includes(value.toLowerCase()));
    if (match) {
      add(match);
    } else {
      message.warning(`Topilmadi: ${value}`);
    }
  };

  const checkout = async () => {
    if (!lines.length) return;
    setPaying(true);
    try {
      const sale = await salesApi.create({
        idempotencyKey: uuidv4(),
        type: tableId ? 'DINE_IN' : 'POS',
        ...(tableId ? { tableId } : {}),
        items: lines.map((l) => ({ productId: l.product.id, qty: l.qty })),
        payments: [{ provider, amount: total }],
      });
      const receipt = {
        shopName: rc.shopName || 'SAVDO-POS',
        address: rc.address,
        phone: rc.phone,
        footer: rc.footer,
        width: rc.width,
        receiptNo: sale.id.slice(0, 8),
        lines: lines.map((l) => ({ name: l.product.name, qty: l.qty, price: Number(l.product.price) })),
        subtotal: total,
        discount: 0,
        total,
        provider,
        paid: provider === 'CASH' && tendered ? tendered : total,
        change: provider === 'CASH' && tendered > total ? tendered - total : 0,
        cashier: rc.showCashier === false ? undefined : user?.fish,
        dateTime: new Date().toLocaleString(),
      };
      setLines([]);
      setTendered(0);
      message.success('Savdo yakunlandi');
      // Auto-print, or ask if disabled.
      if (autoPrint) {
        printReceipt(receipt);
      } else {
        modal.confirm({
          title: 'Chek chop etilsinmi?',
          okText: 'Ha, chop et',
          cancelText: 'Yo‘q',
          onOk: () => printReceipt(receipt),
        });
      }
      void qc.invalidateQueries({ queryKey: ['shift'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      void qc.invalidateQueries({ queryKey: ['products'] });
    } catch (e) {
      message.error(apiErrorMessage(e));
    } finally {
      setPaying(false);
    }
  };

  if (!shift) {
    return (
      <Card style={{ maxWidth: 420 }}>
        <Empty description="Savdo uchun smena oching" />
        <Button type="primary" block style={{ marginTop: 16 }} loading={openShift.isPending} onClick={() => openShift.mutate(0)}>
          Smena ochish
        </Button>
      </Card>
    );
  }

  return (
    <Row gutter={16}>
      <Col xs={24} md={15}>
        <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }}>
          <Typography.Title level={4} style={{ margin: 0 }}>Mahsulotlar</Typography.Title>
          <Input.Search
            placeholder="Barkod skan / qidirish"
            allowClear
            enterButton
            style={{ width: 280 }}
            onSearch={onScan}
          />
        </Space>
        <QueryBoundary isLoading={products.isLoading} error={products.error} data={products.data} isEmpty={(d) => d.data.length === 0}>
          {(d) => (
            <Row gutter={[12, 12]}>
              {d.data.map((p) => {
                const qtyLeft = p.stocks?.[0]?.quantity;
                const out = qtyLeft !== undefined && Number(qtyLeft) <= 0;
                return (
                  <Col xs={12} sm={8} key={p.id}>
                    <Card hoverable={!out} onClick={() => !out && add(p)} styles={{ body: { padding: 12 } }}>
                      <div style={{ fontWeight: 600, minHeight: 40 }}>{p.name}</div>
                      <div style={{ color: '#0EA5E9', fontWeight: 700 }}>{Number(p.price).toLocaleString()} so‘m</div>
                      {qtyLeft !== undefined && (
                        <div style={{ fontSize: 12, color: out ? '#EF4444' : '#6B7280' }}>Qoldiq: {qtyLeft}</div>
                      )}
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )}
        </QueryBoundary>
      </Col>

      <Col xs={24} md={9}>
        <Card title={tableName ? `Savat — ${tableName}` : 'Savat'} style={{ position: 'sticky', top: 16 }}>
          <List
            dataSource={lines}
            locale={{ emptyText: 'Savat bo‘sh' }}
            renderItem={(l) => (
              <List.Item
                actions={[
                  <InputNumber
                    key="q"
                    min={0}
                    value={l.qty}
                    onChange={(v) => setQty(l.product.id, Number(v))}
                    style={{ width: 70 }}
                  />,
                ]}
              >
                <List.Item.Meta title={l.product.name} description={`${Number(l.product.price).toLocaleString()} so‘m`} />
              </List.Item>
            )}
          />
          <Statistic title="Jami" value={total} suffix="so‘m" style={{ margin: '12px 0' }} />
          <Radio.Group value={provider} onChange={(e) => setProvider(e.target.value)} style={{ marginBottom: 12 }}>
            <Radio.Button value="CASH">Naqd</Radio.Button>
            <Radio.Button value="CARD">Karta</Radio.Button>
          </Radio.Group>

          {provider === 'CASH' && lines.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                addonBefore="Naqd berildi"
                value={tendered || undefined}
                onChange={(v) => setTendered(Number(v))}
              />
              <Space wrap style={{ marginTop: 8 }}>
                {[total, 50000, 100000, 200000].map((amt, i) => (
                  <Button key={i} size="small" onClick={() => setTendered(amt)}>
                    {amt.toLocaleString()}
                  </Button>
                ))}
              </Space>
              {tendered >= total && (
                <div style={{ marginTop: 8, fontSize: 16 }}>
                  Qaytim: <strong style={{ color: '#16A34A' }}>{(tendered - total).toLocaleString()} so‘m</strong>
                </div>
              )}
            </div>
          )}

          <Space direction="vertical" style={{ width: '100%' }}>
            <Button type="primary" block size="large" loading={paying} disabled={!lines.length} onClick={checkout}>
              Yakunlash — {total.toLocaleString()} so‘m
            </Button>
            <Button block disabled={!lines.length} onClick={() => setLines([])}>
              Tozalash
            </Button>
            <Space style={{ justifyContent: 'space-between', width: '100%' }}>
              <Typography.Text type="secondary">Chekni avto chop etish</Typography.Text>
              <Switch checked={autoPrint} onChange={setAutoPrint} />
            </Space>
          </Space>
        </Card>
      </Col>
    </Row>
  );
}
