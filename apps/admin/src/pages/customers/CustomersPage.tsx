import { App, Button, Form, Input, InputNumber, Modal, Space, Table, Tag, Typography } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiErrorMessage } from '../../api/client';
import { customersApi, type Customer } from '../../api/endpoints';
import { QueryBoundary } from '../../components/common/QueryBoundary';
import { useCreateCustomer, useCustomers } from '../../hooks/useMarketing';

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const query = useCustomers(search || undefined);
  const create = useCreateCustomer();
  const qc = useQueryClient();
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [repayCust, setRepayCust] = useState<Customer | null>(null);
  const [repayAmount, setRepayAmount] = useState(0);
  const [form] = Form.useForm();

  const repay = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) => customersApi.repay(id, amount),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['customers'] });
      message.success('Qarz to‘landi');
      setRepayCust(null);
      setRepayAmount(0);
    },
    onError: (e) => message.error(apiErrorMessage(e)),
  });

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
    {
      title: 'Qarz (nasiya)',
      dataIndex: 'debt',
      render: (v: string) => {
        const d = Number(v);
        return d > 0 ? <Tag color="red">{d.toLocaleString()} so‘m</Tag> : <Tag color="green">Yo‘q</Tag>;
      },
    },
    {
      title: '',
      render: (_: unknown, r: Customer) =>
        Number(r.debt) > 0 && (
          <Button size="small" onClick={() => { setRepayCust(r); setRepayAmount(Number(r.debt)); }}>Qarz to‘lash</Button>
        ),
    },
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

      <Modal
        title={`Qarz to‘lash — ${repayCust?.fish ?? ''}`}
        open={Boolean(repayCust)}
        onOk={() => repayCust && repay.mutate({ id: repayCust.id, amount: repayAmount })}
        onCancel={() => setRepayCust(null)}
        confirmLoading={repay.isPending}
        okText="To‘lash"
      >
        <Typography.Paragraph>Joriy qarz: <strong>{Number(repayCust?.debt ?? 0).toLocaleString()} so‘m</strong></Typography.Paragraph>
        <InputNumber
          style={{ width: '100%' }}
          min={0}
          max={Number(repayCust?.debt ?? 0)}
          value={repayAmount}
          onChange={(v) => setRepayAmount(Number(v))}
          addonBefore="Summa"
        />
      </Modal>
    </>
  );
}
