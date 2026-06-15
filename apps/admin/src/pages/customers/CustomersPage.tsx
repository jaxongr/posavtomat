import { Button, Form, Input, Modal, Space, Table, Tag, Typography } from 'antd';
import { useState } from 'react';
import { QueryBoundary } from '../../components/common/QueryBoundary';
import { useCreateCustomer, useCustomers } from '../../hooks/useMarketing';
import type { Customer } from '../../api/endpoints';

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const query = useCustomers(search || undefined);
  const create = useCreateCustomer();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const onCreate = async () => {
    const v = await form.validateFields();
    await create.mutateAsync(v);
    setOpen(false);
    form.resetFields();
  };

  const columns = [
    { title: 'F.I.Sh.', dataIndex: 'fish' },
    { title: 'Telefon', dataIndex: 'phone', render: (v: string | null) => v ?? '—' },
    { title: 'Sodiqlik balli', dataIndex: 'loyaltyPoints', render: (v: number) => <Tag color="gold">{v} ball</Tag> },
  ];

  return (
    <>
      <Space style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }}>
        <Typography.Title level={3} style={{ margin: 0 }}>Mijozlar</Typography.Title>
        <Space>
          <Input.Search placeholder="Qidirish" allowClear onSearch={setSearch} style={{ width: 240 }} />
          <Button type="primary" onClick={() => setOpen(true)}>Mijoz qo‘shish</Button>
        </Space>
      </Space>
      <QueryBoundary isLoading={query.isLoading} error={query.error} data={query.data} isEmpty={(d) => d.length === 0}>
        {(d: Customer[]) => <Table rowKey="id" dataSource={d} columns={columns} pagination={{ pageSize: 20 }} />}
      </QueryBoundary>

      <Modal title="Yangi mijoz" open={open} onOk={onCreate} onCancel={() => setOpen(false)} confirmLoading={create.isPending}>
        <Form form={form} layout="vertical">
          <Form.Item name="fish" label="F.I.Sh." rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="phone" label="Telefon"><Input placeholder="+998..." /></Form.Item>
          <Form.Item name="note" label="Izoh"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </>
  );
}
