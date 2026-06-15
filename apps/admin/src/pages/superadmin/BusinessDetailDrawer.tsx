import { Card, Col, Drawer, Row, Statistic, Table, Tag, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api/endpoints';
import { QueryBoundary } from '../../components/common/QueryBoundary';
import { ROLE_LABELS, type Role } from '../../types';

interface Props {
  orgId: string | null;
  onClose: () => void;
}

export default function BusinessDetailDrawer({ orgId, onClose }: Props) {
  const detailQ = useQuery({
    queryKey: ['admin-org-detail', orgId],
    queryFn: () => adminApi.detail(orgId as string),
    enabled: Boolean(orgId),
  });

  return (
    <Drawer title="Biznes tafsiloti" placement="right" width={680} open={Boolean(orgId)} onClose={onClose}>
      <QueryBoundary isLoading={detailQ.isLoading} error={detailQ.error} data={detailQ.data}>
        {(d) => (
          <>
            <Typography.Title level={4} style={{ marginTop: 0 }}>
              {d.org.name} <Tag>{d.org.businessType === 'DOKON' ? 'Do‘kon' : 'Restoran'}</Tag>
              <Tag color={d.org.active ? 'green' : 'red'}>{d.org.active ? 'Faol' : 'Bloklangan'}</Tag>
            </Typography.Title>

            <Row gutter={12} style={{ marginBottom: 16 }}>
              <Col span={6}><Card size="small"><Statistic title="Bugun" value={Number(d.stats.todaySales)} suffix="so‘m" /></Card></Col>
              <Col span={6}><Card size="small"><Statistic title="Jami aylanma" value={Number(d.stats.revenueTotal)} suffix="so‘m" /></Card></Col>
              <Col span={6}><Card size="small"><Statistic title="Cheklar" value={d.stats.salesCount} /></Card></Col>
              <Col span={6}><Card size="small"><Statistic title="Mahsulot" value={d.stats.productCount} /></Card></Col>
            </Row>

            <Typography.Title level={5}>Filiallar ({d.branches.length})</Typography.Title>
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={d.branches}
              columns={[
                { title: 'Nomi', dataIndex: 'name' },
                { title: 'Manzil', dataIndex: 'address', render: (v: string | null) => v ?? '—' },
                { title: 'Holat', dataIndex: 'active', render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Faol' : 'Nofaol'}</Tag> },
              ]}
              style={{ marginBottom: 16 }}
            />

            <Typography.Title level={5}>Hodimlar ({d.staff.length})</Typography.Title>
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={d.staff}
              columns={[
                { title: 'F.I.Sh.', dataIndex: 'fish' },
                { title: 'Rol', dataIndex: 'role', render: (v: Role) => <Tag color="blue">{ROLE_LABELS[v] ?? v}</Tag> },
                { title: 'Telefon', dataIndex: 'phone', render: (v: string | null) => v ?? '—' },
                { title: 'Holat', dataIndex: 'active', render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Faol' : 'Nofaol'}</Tag> },
              ]}
            />
          </>
        )}
      </QueryBoundary>
    </Drawer>
  );
}
