import { App, Button, Card, Col, Empty, InputNumber, Row, Space, Statistic, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useCloseShift, useCurrentShift, useOpenShift } from '../../hooks/useShift';

export default function ShiftsPage() {
  const { data: shift, isLoading } = useCurrentShift();
  const openShift = useOpenShift();
  const closeShift = useCloseShift();
  const { modal } = App.useApp();
  const [openCash, setOpenCash] = useState(0);

  if (isLoading) {
    return <Typography.Text>Yuklanmoqda…</Typography.Text>;
  }

  if (!shift) {
    return (
      <>
        <Typography.Title level={3}>Smena</Typography.Title>
        <Card style={{ maxWidth: 420 }}>
          <Empty description="Ochiq smena yo‘q" />
          <Space style={{ marginTop: 16, width: '100%', justifyContent: 'center' }}>
            <InputNumber
              min={0}
              value={openCash}
              onChange={(v) => setOpenCash(Number(v))}
              addonBefore="Boshlang‘ich kassa"
              style={{ width: 260 }}
            />
            <Button type="primary" loading={openShift.isPending} onClick={() => openShift.mutate(openCash)}>
              Smena ochish
            </Button>
          </Space>
        </Card>
      </>
    );
  }

  const confirmClose = () =>
    modal.confirm({
      title: 'Smenani yopish',
      content: `Naqd savdo: ${Number(shift.cashSales).toLocaleString()} so‘m. Z-hisobot tuziladi.`,
      okText: 'Yopish',
      cancelText: 'Bekor',
      onOk: () => closeShift.mutate(Number(shift.cashSales) + Number(shift.openCash)),
    });

  return (
    <>
      <Typography.Title level={3}>
        Joriy smena <Tag color="green">{shift.status}</Tag>
      </Typography.Title>
      <Row gutter={16}>
        <Col span={6}><Card><Statistic title="Boshlang‘ich kassa" value={Number(shift.openCash)} suffix="so‘m" /></Card></Col>
        <Col span={6}><Card><Statistic title="Jami savdo" value={Number(shift.totalSales)} suffix="so‘m" /></Card></Col>
        <Col span={6}><Card><Statistic title="Naqd" value={Number(shift.cashSales)} suffix="so‘m" /></Card></Col>
        <Col span={6}><Card><Statistic title="Karta" value={Number(shift.cardSales)} suffix="so‘m" /></Card></Col>
      </Row>
      <Button danger style={{ marginTop: 16 }} loading={closeShift.isPending} onClick={confirmClose}>
        Smenani yopish (Z-hisobot)
      </Button>
    </>
  );
}
