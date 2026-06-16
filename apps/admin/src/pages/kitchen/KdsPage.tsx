import { Button, Card, Col, Divider, Empty, Modal, Row, Space, Tag, Typography } from 'antd';
import { useState } from 'react';
import { QueryBoundary } from '../../components/common/QueryBoundary';
import { useKots, useSetKotStatus } from '../../hooks/useRestaurant';
import type { Kot } from '../../api/endpoints';

const next: Record<string, { to: string; label: string; color: string } | null> = {
  NEW: { to: 'COOKING', label: 'Tayyorlashni boshlash', color: '#F59E0B' },
  COOKING: { to: 'READY', label: 'Tayyor', color: '#16A34A' },
  READY: { to: 'SERVED', label: 'Berildi', color: '#0EA5E9' },
  SERVED: null,
};

const statusLabel: Record<string, string> = {
  NEW: 'Yangi',
  COOKING: 'Tayyorlanmoqda',
  READY: 'Tayyor',
  SERVED: 'Berildi',
};

function minutesAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

export default function KdsPage() {
  const query = useKots();
  const setStatus = useSetKotStatus();
  const [selected, setSelected] = useState<Kot | null>(null);

  return (
    <>
      <Typography.Title level={3}>Oshxona ekrani (KDS)</Typography.Title>
      <QueryBoundary isLoading={query.isLoading} error={query.error} data={query.data}>
        {(kots: Kot[]) =>
          kots.length === 0 ? (
            <Empty description="Faol buyurtma yo‘q" />
          ) : (
            <Row gutter={[16, 16]}>
              {/* Backend returns oldest-first → render order IS the queue. */}
              {kots.map((k, i) => {
                const waited = minutesAgo(k.sentAt);
                const late = waited >= 15;
                const action = next[k.status];
                return (
                  <Col xs={24} sm={12} md={8} lg={6} key={k.id}>
                    <Card
                      hoverable
                      onClick={() => setSelected(k)}
                      title={
                        <Space>
                          <Tag color="blue">#{i + 1}</Tag>
                          <span>{k.sale.table?.name ?? 'Olib ketish'}</span>
                          <Tag color={late ? 'red' : 'default'}>{waited} daq</Tag>
                        </Space>
                      }
                      styles={{ header: { background: late ? '#FEF2F2' : undefined } }}
                      extra={<Tag color={k.status === 'READY' ? 'green' : k.status === 'COOKING' ? 'gold' : 'orange'}>{statusLabel[k.status] ?? k.status}</Tag>}
                    >
                      <ul style={{ paddingLeft: 18, margin: 0, maxHeight: 120, overflow: 'hidden' }}>
                        {k.items.slice(0, 4).map((it, idx) => (
                          <li key={idx}>{it.name} × {it.qty}</li>
                        ))}
                      </ul>
                      {k.items.length > 4 && (
                        <Typography.Link onClick={(e) => { e.stopPropagation(); setSelected(k); }}>
                          +{k.items.length - 4} ta yana — to‘liq ko‘rish
                        </Typography.Link>
                      )}
                      {k.sale.staff && (
                        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                          Ofitsiant: {k.sale.staff.fish}
                        </Typography.Text>
                      )}
                      {action && (
                        <Button
                          block
                          type="primary"
                          style={{ marginTop: 12, background: action.color }}
                          loading={setStatus.isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            setStatus.mutate({ id: k.id, status: action.to });
                          }}
                        >
                          {action.label}
                        </Button>
                      )}
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )
        }
      </QueryBoundary>

      {/* Full ticket details */}
      <Modal
        open={Boolean(selected)}
        onCancel={() => setSelected(null)}
        title={selected ? `${selected.sale.table?.name ?? 'Olib ketish'} — to‘liq buyurtma` : ''}
        footer={
          selected && next[selected.status]
            ? [
                <Button key="close" onClick={() => setSelected(null)}>Yopish</Button>,
                <Button
                  key="next"
                  type="primary"
                  style={{ background: next[selected.status]?.color }}
                  loading={setStatus.isPending}
                  onClick={() => {
                    const a = next[selected.status];
                    if (a) setStatus.mutate({ id: selected.id, status: a.to });
                    setSelected(null);
                  }}
                >
                  {next[selected.status]?.label}
                </Button>,
              ]
            : [<Button key="close" onClick={() => setSelected(null)}>Yopish</Button>]
        }
      >
        {selected && (
          <>
            <Space size="middle" wrap>
              <Tag color={selected.status === 'READY' ? 'green' : selected.status === 'COOKING' ? 'gold' : 'orange'}>
                {statusLabel[selected.status] ?? selected.status}
              </Tag>
              <Typography.Text type="secondary">Kutilyapti: {minutesAgo(selected.sentAt)} daq</Typography.Text>
              {selected.sale.staff && <Typography.Text type="secondary">Ofitsiant: {selected.sale.staff.fish}</Typography.Text>}
            </Space>
            <Divider style={{ margin: '12px 0' }} />
            <ul style={{ paddingLeft: 20, margin: 0, fontSize: 16 }}>
              {selected.items.map((it, idx) => (
                <li key={idx} style={{ marginBottom: 6 }}>
                  <strong>{it.name}</strong> × {it.qty}
                </li>
              ))}
            </ul>
          </>
        )}
      </Modal>
    </>
  );
}
