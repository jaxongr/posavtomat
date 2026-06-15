import { Button, Card, Col, Empty, Row, Space, Tag, Typography } from 'antd';
import { QueryBoundary } from '../../components/common/QueryBoundary';
import { useKots, useSetKotStatus } from '../../hooks/useRestaurant';
import type { Kot } from '../../api/endpoints';

const next: Record<string, { to: string; label: string; color: string } | null> = {
  NEW: { to: 'COOKING', label: 'Tayyorlashni boshlash', color: '#F59E0B' },
  COOKING: { to: 'READY', label: 'Tayyor', color: '#16A34A' },
  READY: { to: 'SERVED', label: 'Berildi', color: '#0EA5E9' },
  SERVED: null,
};

function minutesAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

export default function KdsPage() {
  const query = useKots();
  const setStatus = useSetKotStatus();

  return (
    <>
      <Typography.Title level={3}>Oshxona ekrani (KDS)</Typography.Title>
      <QueryBoundary isLoading={query.isLoading} error={query.error} data={query.data}>
        {(kots: Kot[]) =>
          kots.length === 0 ? (
            <Empty description="Faol buyurtma yo‘q" />
          ) : (
            <Row gutter={[16, 16]}>
              {kots.map((k) => {
                const waited = minutesAgo(k.sentAt);
                const late = waited >= 15;
                const action = next[k.status];
                return (
                  <Col xs={24} sm={12} md={8} lg={6} key={k.id}>
                    <Card
                      title={
                        <Space>
                          <span>{k.sale.table?.name ?? 'Olib ketish'}</span>
                          <Tag color={late ? 'red' : 'default'}>{waited} daq</Tag>
                        </Space>
                      }
                      styles={{ header: { background: late ? '#FEF2F2' : undefined } }}
                      extra={<Tag color={k.status === 'READY' ? 'green' : 'blue'}>{k.status}</Tag>}
                    >
                      <ul style={{ paddingLeft: 18, margin: 0 }}>
                        {k.items.map((it, i) => (
                          <li key={i}>{it.name} × {it.qty}</li>
                        ))}
                      </ul>
                      {k.sale.staff && (
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          Ofitsiant: {k.sale.staff.fish}
                        </Typography.Text>
                      )}
                      {action && (
                        <Button
                          block
                          type="primary"
                          style={{ marginTop: 12, background: action.color }}
                          loading={setStatus.isPending}
                          onClick={() => setStatus.mutate({ id: k.id, status: action.to })}
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
    </>
  );
}
