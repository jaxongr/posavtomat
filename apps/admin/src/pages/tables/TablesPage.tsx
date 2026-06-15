import { Button, Card, Col, Form, Input, InputNumber, Modal, Row, Space, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QueryBoundary } from '../../components/common/QueryBoundary';
import { useCreateTable, useSetTableStatus, useTables } from '../../hooks/useRestaurant';
import type { DiningTable } from '../../api/endpoints';

const statusMeta: Record<string, { color: string; label: string }> = {
  FREE: { color: '#16A34A', label: 'Bo‘sh' },
  OCCUPIED: { color: '#F59E0B', label: 'Band' },
  BILL: { color: '#0EA5E9', label: 'Hisob' },
};

export default function TablesPage() {
  const query = useTables();
  const create = useCreateTable();
  const setStatus = useSetTableStatus();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const onCreate = async () => {
    const v = await form.validateFields();
    await create.mutateAsync(v);
    setOpen(false);
    form.resetFields();
  };

  const onTableClick = (t: DiningTable) => {
    if (t.status === 'FREE') {
      navigate(`/kassa?table=${t.id}&tableName=${encodeURIComponent(t.name)}`);
    } else {
      setStatus.mutate({ id: t.id, status: 'FREE' });
    }
  };

  return (
    <>
      <Space style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }}>
        <Typography.Title level={3} style={{ margin: 0 }}>Zal / Stollar</Typography.Title>
        <Button type="primary" onClick={() => setOpen(true)}>Stol qo‘shish</Button>
      </Space>

      <QueryBoundary isLoading={query.isLoading} error={query.error} data={query.data} isEmpty={(d) => d.length === 0}>
        {(tables) => (
          <Row gutter={[16, 16]}>
            {tables.map((t) => {
              const m = statusMeta[t.status];
              return (
                <Col xs={12} sm={8} md={6} lg={4} key={t.id}>
                  <Card
                    hoverable
                    onClick={() => onTableClick(t)}
                    styles={{ body: { padding: 16, textAlign: 'center', borderTop: `4px solid ${m.color}` } }}
                  >
                    <Typography.Title level={4} style={{ margin: 0 }}>{t.name}</Typography.Title>
                    <Typography.Text type="secondary">{t.zone ?? '—'} · {t.seats} o‘rin</Typography.Text>
                    <div style={{ marginTop: 8 }}><Tag color={m.color}>{m.label}</Tag></div>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {t.status === 'FREE' ? 'Buyurtma uchun bosing' : 'Bo‘shatish uchun bosing'}
                    </Typography.Text>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </QueryBoundary>

      <Modal title="Yangi stol" open={open} onOk={onCreate} onCancel={() => setOpen(false)} confirmLoading={create.isPending}>
        <Form form={form} layout="vertical" initialValues={{ seats: 4 }}>
          <Form.Item name="name" label="Nomi" rules={[{ required: true }]}><Input placeholder="Stol 1" /></Form.Item>
          <Form.Item name="zone" label="Zona"><Input placeholder="Zal / Terassa" /></Form.Item>
          <Form.Item name="seats" label="O‘rinlar soni"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>
    </>
  );
}
