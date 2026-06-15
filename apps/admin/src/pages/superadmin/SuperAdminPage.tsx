import { App, Button, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Typography } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiErrorMessage } from '../../api/client';
import { adminApi, type AdminOrg } from '../../api/endpoints';
import { QueryBoundary } from '../../components/common/QueryBoundary';

const stateTag: Record<string, { color: string; label: string }> = {
  active: { color: 'green', label: 'Faol' },
  grace: { color: 'orange', label: 'Grace (3 kun)' },
  expired: { color: 'red', label: 'Muddati tugagan' },
};

export default function SuperAdminPage() {
  const qc = useQueryClient();
  const { message } = App.useApp();
  const orgsQ = useQuery({ queryKey: ['admin-orgs'], queryFn: adminApi.organizations });
  const [createOpen, setCreateOpen] = useState(false);
  const [subOrg, setSubOrg] = useState<AdminOrg | null>(null);
  const [createForm] = Form.useForm();
  const [subForm] = Form.useForm();

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-orgs'] });

  const createBiz = useMutation({
    mutationFn: adminApi.createBusiness,
    onSuccess: () => { void invalidate(); setCreateOpen(false); createForm.resetFields(); message.success('Biznes yaratildi'); },
    onError: (e) => message.error(apiErrorMessage(e)),
  });
  const setSub = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { plan?: string; price?: number; addDays?: number } }) => adminApi.setSubscription(id, body),
    onSuccess: () => { void invalidate(); setSubOrg(null); subForm.resetFields(); message.success('Obuna yangilandi'); },
    onError: (e) => message.error(apiErrorMessage(e)),
  });
  const toggle = useMutation({
    mutationFn: (id: string) => adminApi.toggle(id),
    onSuccess: () => { void invalidate(); message.success('Holat o‘zgartirildi'); },
    onError: (e) => message.error(apiErrorMessage(e)),
  });

  const columns = [
    { title: 'Biznes', dataIndex: 'name' },
    { title: 'Turi', dataIndex: 'businessType', render: (v: string) => <Tag>{v === 'DOKON' ? 'Do‘kon' : 'Restoran'}</Tag> },
    { title: 'Tarif', dataIndex: 'plan' },
    { title: 'Narx', dataIndex: 'subscriptionPrice', render: (v: string) => `${Number(v).toLocaleString()} so‘m` },
    {
      title: 'Obuna',
      render: (_: unknown, r: AdminOrg) => {
        const m = stateTag[r.subscription.state];
        const days = r.subscription.daysLeft;
        return (
          <Space direction="vertical" size={0}>
            <Tag color={m.color}>{m.label}</Tag>
            {days !== null && <span style={{ fontSize: 12 }}>{days >= 0 ? `${days} kun qoldi` : `${-days} kun o‘tdi`}</span>}
          </Space>
        );
      },
    },
    { title: 'Filial/Hodim', render: (_: unknown, r: AdminOrg) => `${r._count.branches} / ${r._count.staff}` },
    { title: 'Savdo', render: (_: unknown, r: AdminOrg) => r._count.sales },
    {
      title: '',
      render: (_: unknown, r: AdminOrg) => (
        <Space>
          <Button size="small" type="primary" onClick={() => { setSubOrg(r); subForm.setFieldsValue({ plan: r.plan, price: Number(r.subscriptionPrice), addDays: 30 }); }}>Obuna</Button>
          <Button size="small" danger={r.active} onClick={() => toggle.mutate(r.id)}>{r.active ? 'Bloklash' : 'Faollashtirish'}</Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }}>
        <Typography.Title level={3} style={{ margin: 0 }}>Bizneslar (Platforma boshqaruvi)</Typography.Title>
        <Button type="primary" onClick={() => setCreateOpen(true)}>+ Yangi biznes</Button>
      </Space>

      <QueryBoundary isLoading={orgsQ.isLoading} error={orgsQ.error} data={orgsQ.data} isEmpty={(d) => d.length === 0}>
        {(rows) => <Table rowKey="id" dataSource={rows} columns={columns} pagination={false} scroll={{ x: 900 }} />}
      </QueryBoundary>

      {/* Create business */}
      <Modal title="Yangi biznes yaratish" open={createOpen} onOk={() => createForm.submit()} onCancel={() => setCreateOpen(false)} confirmLoading={createBiz.isPending}>
        <Form form={createForm} layout="vertical" onFinish={(v) => createBiz.mutate(v)} initialValues={{ businessType: 'DOKON', plan: 'Standart', days: 30 }}>
          <Form.Item name="name" label="Biznes nomi" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="businessType" label="Turi" rules={[{ required: true }]}>
            <Select options={[{ value: 'DOKON', label: 'Do‘kon' }, { value: 'RESTORAN', label: 'Restoran' }]} />
          </Form.Item>
          <Form.Item name="ownerFish" label="Egasi F.I.Sh." rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="ownerPhone" label="Egasi telefoni (login)" rules={[{ required: true }]}><Input placeholder="+998..." /></Form.Item>
          <Form.Item name="ownerPassword" label="Egasi paroli" rules={[{ required: true, min: 6 }]}><Input.Password /></Form.Item>
          <Space>
            <Form.Item name="plan" label="Tarif"><Input /></Form.Item>
            <Form.Item name="price" label="Oylik narx"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="days" label="Muddat (kun)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          </Space>
        </Form>
      </Modal>

      {/* Subscription */}
      <Modal title={`Obuna — ${subOrg?.name ?? ''}`} open={Boolean(subOrg)} onOk={() => subForm.submit()} onCancel={() => setSubOrg(null)} confirmLoading={setSub.isPending}>
        <Form form={subForm} layout="vertical" onFinish={(v) => subOrg && setSub.mutate({ id: subOrg.id, body: v })}>
          <Form.Item name="plan" label="Tarif nomi"><Input /></Form.Item>
          <Form.Item name="price" label="Oylik narx (so‘m)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="addDays" label="Muddatni uzaytirish (kun qo‘shish)" extra="Joriy tugash sanasidan qo‘shiladi">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
