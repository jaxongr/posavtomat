import { Card, Col, Empty, Row, Statistic, Tag, Typography } from 'antd';
import { useCurrentShift } from '../../hooks/useInventory';

export default function ShiftsPage() {
  const { data: shift, isLoading } = useCurrentShift();

  if (isLoading) {
    return <Typography.Text>Yuklanmoqda…</Typography.Text>;
  }
  if (!shift) {
    return <Empty description="Ochiq smena yo‘q" />;
  }

  return (
    <>
      <Typography.Title level={3}>
        Joriy smena <Tag color={shift.status === 'OPEN' ? 'green' : 'default'}>{shift.status}</Tag>
      </Typography.Title>
      <Row gutter={16}>
        <Col span={6}><Card><Statistic title="Boshlang‘ich kassa" value={Number(shift.openCash)} suffix="so‘m" /></Card></Col>
        <Col span={6}><Card><Statistic title="Jami savdo" value={Number(shift.totalSales)} suffix="so‘m" /></Card></Col>
        <Col span={6}><Card><Statistic title="Naqd" value={Number(shift.cashSales)} suffix="so‘m" /></Card></Col>
        <Col span={6}><Card><Statistic title="Karta" value={Number(shift.cardSales)} suffix="so‘m" /></Card></Col>
      </Row>
    </>
  );
}
