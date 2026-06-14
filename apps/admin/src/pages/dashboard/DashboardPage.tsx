import { Card, Col, List, Row, Statistic, Typography } from 'antd';
import { QueryBoundary } from '../../components/common/QueryBoundary';
import { useDashboard } from '../../hooks/useReports';

export default function DashboardPage() {
  const query = useDashboard();

  return (
    <>
      <Typography.Title level={3}>Boshqaruv paneli</Typography.Title>
      <QueryBoundary isLoading={query.isLoading} error={query.error} data={query.data}>
        {(d) => (
          <>
            <Row gutter={16}>
              <Col xs={24} sm={8}>
                <Card>
                  <Statistic title="Bugungi savdo" value={Number(d.todaySalesTotal)} suffix="so‘m" />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card>
                  <Statistic title="Cheklar soni" value={d.todaySalesCount} />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card>
                  <Statistic
                    title="Kam qolgan tovar"
                    value={d.lowStockCount}
                    valueStyle={{ color: d.lowStockCount ? '#EF4444' : undefined }}
                  />
                </Card>
              </Col>
            </Row>
            <Card title="Top mahsulotlar (bugun)" style={{ marginTop: 16 }}>
              <List
                dataSource={d.topProducts}
                locale={{ emptyText: 'Bugun savdo yo‘q' }}
                renderItem={(p, i) => (
                  <List.Item>
                    <span>{i + 1}. {p.name}</span>
                    <strong>{Number(p.revenue).toLocaleString()} so‘m</strong>
                  </List.Item>
                )}
              />
            </Card>
          </>
        )}
      </QueryBoundary>
    </>
  );
}
