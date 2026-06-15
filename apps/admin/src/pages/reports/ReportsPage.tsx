import { Card, Col, DatePicker, Row, Statistic, Table, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useState } from 'react';
import { QueryBoundary } from '../../components/common/QueryBoundary';
import { useProfit } from '../../hooks/useMarketing';

const { RangePicker } = DatePicker;

export default function ReportsPage() {
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(30, 'day'), dayjs()]);
  const query = useProfit(range[0].toISOString(), range[1].toISOString());

  const columns = [
    { title: 'Mahsulot', dataIndex: 'name' },
    { title: 'Soni', dataIndex: 'qty' },
    { title: 'Tushum', dataIndex: 'revenue', render: (v: string) => `${Number(v).toLocaleString()} so‘m` },
    { title: 'Foyda', dataIndex: 'profit', render: (v: string) => `${Number(v).toLocaleString()} so‘m` },
  ];

  return (
    <>
      <Typography.Title level={3}>Foyda hisoboti</Typography.Title>
      <RangePicker
        value={range}
        onChange={(v) => v && v[0] && v[1] && setRange([v[0], v[1]])}
        style={{ marginBottom: 16 }}
        allowClear={false}
      />
      <QueryBoundary isLoading={query.isLoading} error={query.error} data={query.data}>
        {(d) => (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col xs={24} sm={8}><Card><Statistic title="Tushum" value={Number(d.revenue)} suffix="so‘m" /></Card></Col>
              <Col xs={24} sm={8}><Card><Statistic title="Tannarx" value={Number(d.cost)} suffix="so‘m" /></Card></Col>
              <Col xs={24} sm={8}>
                <Card>
                  <Statistic title="Foyda" value={Number(d.profit)} suffix="so‘m" valueStyle={{ color: '#16A34A' }} />
                </Card>
              </Col>
            </Row>
            <Card title="Eng foydali mahsulotlar">
              <Table rowKey="productId" dataSource={d.topByProfit} columns={columns} pagination={false} />
            </Card>
          </>
        )}
      </QueryBoundary>
    </>
  );
}
