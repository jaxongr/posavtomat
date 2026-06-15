import { Button, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Typography } from 'antd';
import { useState } from 'react';
import { QueryBoundary } from '../../components/common/QueryBoundary';
import { useCreateDiscount, useDeleteDiscount, useDiscounts } from '../../hooks/useMarketing';
import type { Discount } from '../../api/endpoints';

export default function DiscountsPage() {
  const query = useDiscounts();
  const create = useCreateDiscount();
  const remove = useDeleteDiscount();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const onCreate = async () => {
    const v = await form.validateFields();
    await create.mutateAsync(v);
    setOpen(false);
    form.resetFields();
  };

  const columns = [
    { title: 'Nomi', dataIndex: 'name' },
    { title: 'Turi', dataIndex: 'type', render: (v: string) => <Tag>{v === 'PERCENT' ? 'Foiz' : 'Summa'}</Tag> },
    { title: 'Qiymat', dataIndex: 'value', render: (v: string, r: Discount) => (r.type === 'PERCENT' ? `${Number(v)}%` : `${Number(v).toLocaleString()} so‘m`) },
    { title: 'Promokod', dataIndex: 'promoCode', render: (v: string | null) => v ?? '—' },
    { title: 'Holat', dataIndex: 'active', render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Faol' : 'Nofaol'}</Tag> },
    { title: '', render: (_: unknown, r: Discount) => <Button danger size="small" onClick={() => remove.mutate(r.id)}>O‘chirish</Button> },
  ];

  return (
    <>
      <Space style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }}>
        <Typography.Title level={3} style={{ margin: 0 }}>Chegirmalar</Typography.Title>
        <Button type="primary" onClick={() => setOpen(true)}>Chegirma qo‘shish</Button>
      </Space>
      <QueryBoundary isLoading={query.isLoading} error={query.error} data={query.data} isEmpty={(d) => d.length === 0}>
        {(d) => <Table rowKey="id" dataSource={d} columns={columns} pagination={false} />}
      </QueryBoundary>

      <Modal title="Yangi chegirma" open={open} onOk={onCreate} onCancel={() => setOpen(false)} confirmLoading={create.isPending}>
        <Form form={form} layout="vertical" initialValues={{ type: 'PERCENT' }}>
          <Form.Item name="name" label="Nomi" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="type" label="Turi" rules={[{ required: true }]}>
            <Select options={[{ value: 'PERCENT', label: 'Foiz (%)' }, { value: 'FIXED', label: 'Summa (so‘m)' }]} />
          </Form.Item>
          <Form.Item name="value" label="Qiymat" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="promoCode" label="Promokod (ixtiyoriy)"><Input /></Form.Item>
          <Form.Item name="minTotal" label="Minimal chek summasi (ixtiyoriy)">
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
