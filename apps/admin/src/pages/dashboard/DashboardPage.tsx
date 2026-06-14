import { Card, Col, Row, Statistic, Typography } from 'antd';
import { useStock, useCurrentShift } from '../../hooks/useInventory';

export default function DashboardPage() {
  const stock = useStock(true);
  const shift = useCurrentShift();

  const lowCount = stock.data?.data.length ?? 0;
  const current = shift.data;

  return (
    <>
      <Typography.Title level={3}>Boshqaruv paneli</Typography.Title>
      <Row gutter={16}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="Joriy smena savdosi" value={current ? Number(current.totalSales) : 0} suffix="so‘m" />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="Naqd" value={current ? Number(current.cashSales) : 0} suffix="so‘m" />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="Karta" value={current ? Number(current.cardSales) : 0} suffix="so‘m" />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="Kam qolgan tovar" value={lowCount} valueStyle={{ color: lowCount ? '#EF4444' : undefined }} />
          </Card>
        </Col>
      </Row>
    </>
  );
}
