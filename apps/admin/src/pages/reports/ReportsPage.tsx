import { Card, Col, DatePicker, Row, Statistic, Table, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useState } from 'react';
import { QueryBoundary } from '../../components/common/QueryBoundary';
import { useKitchenReport, useProfit, useStaffReport } from '../../hooks/useMarketing';
import { useOrganization } from '../../hooks/useRestaurant';
import { ROLE_LABELS, type Role } from '../../types';

const { RangePicker } = DatePicker;

export default function ReportsPage() {
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(30, 'day'), dayjs()]);
  const query = useProfit(range[0].toISOString(), range[1].toISOString());
  const staffQ = useStaffReport(range[0].toISOString(), range[1].toISOString());
  const isRestaurant = useOrganization().data?.businessType === 'RESTORAN';
  const kitchenQ = useKitchenReport(range[0].toISOString(), range[1].toISOString());

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

      <Card title="Hodimlar bo‘yicha savdo" style={{ marginTop: 16 }}>
        <QueryBoundary isLoading={staffQ.isLoading} error={staffQ.error} data={staffQ.data} isEmpty={(d) => d.length === 0}>
          {(rows) => (
            <Table
              rowKey="staffId"
              dataSource={rows}
              pagination={false}
              columns={[
                { title: 'Hodim', dataIndex: 'fish' },
                { title: 'Rol', dataIndex: 'role', render: (v: Role | null) => (v ? (ROLE_LABELS[v] ?? v) : '—') },
                { title: 'Cheklar', dataIndex: 'salesCount' },
                { title: 'Savdo summasi', dataIndex: 'total', render: (v: string) => `${Number(v).toLocaleString()} so‘m` },
                { title: 'O‘rtacha chek', dataIndex: 'avgCheck', render: (v: string) => `${Number(v).toLocaleString()} so‘m` },
              ]}
            />
          )}
        </QueryBoundary>
      </Card>

      {isRestaurant && (
        <Card title="Oshxona — tayyorlash vaqti" style={{ marginTop: 16 }}>
          <QueryBoundary isLoading={kitchenQ.isLoading} error={kitchenQ.error} data={kitchenQ.data}>
            {(k) => (
              <>
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col xs={12} sm={8}><Card><Statistic title="O‘rtacha tayyorlash" value={k.avgPrepMinutes} suffix="daq" /></Card></Col>
                  <Col xs={12} sm={8}><Card><Statistic title="Tayyorlangan buyurtmalar" value={k.count} /></Card></Col>
                </Row>
                <Table
                  rowKey="id"
                  dataSource={k.orders}
                  pagination={{ pageSize: 10 }}
                  columns={[
                    { title: 'Stol', dataIndex: 'table' },
                    { title: 'Ofitsiant', dataIndex: 'waiter' },
                    { title: 'Taomlar', dataIndex: 'items', ellipsis: true },
                    {
                      title: 'Tayyorlash vaqti',
                      dataIndex: 'prepMinutes',
                      sorter: (a, b) => a.prepMinutes - b.prepMinutes,
                      render: (v: number) => `${v} daq`,
                    },
                  ]}
                />
              </>
            )}
          </QueryBoundary>
        </Card>
      )}
    </>
  );
}
