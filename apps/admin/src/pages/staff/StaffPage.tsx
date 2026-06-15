import { Button, Form, Input, Modal, Select, Space, Table, Tag, Typography } from 'antd';
import { useState } from 'react';
import { QueryBoundary } from '../../components/common/QueryBoundary';
import { useBranches, useCreateStaff, useDeactivateStaff, useStaff } from '../../hooks/useStaff';
import { ROLE_LABELS, type Role, type Staff } from '../../types';

const ROLE_OPTIONS = (Object.keys(ROLE_LABELS) as Role[])
  .filter((r) => r !== 'SUPERADMIN')
  .map((r) => ({ value: r, label: ROLE_LABELS[r] }));

export default function StaffPage() {
  const staff = useStaff();
  const branches = useBranches();
  const createStaff = useCreateStaff();
  const deactivate = useDeactivateStaff();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const onCreate = async () => {
    const values = await form.validateFields();
    await createStaff.mutateAsync(values);
    setOpen(false);
    form.resetFields();
  };

  const columns = [
    { title: 'F.I.Sh.', dataIndex: 'fish' },
    { title: 'Telefon', dataIndex: 'phone', render: (v: string | null) => v ?? '—' },
    { title: 'Rol', dataIndex: 'role', render: (v: Role) => <Tag color="blue">{ROLE_LABELS[v] ?? v}</Tag> },
    {
      title: 'Holat',
      dataIndex: 'active',
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Faol' : 'Nofaol'}</Tag>,
    },
    {
      title: '',
      render: (_: unknown, r: Staff) =>
        r.active && <Button danger size="small" onClick={() => deactivate.mutate(r.id)}>O‘chirish</Button>,
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }}>
        <Typography.Title level={3} style={{ margin: 0 }}>Hodimlar</Typography.Title>
        <Button type="primary" onClick={() => setOpen(true)}>Hodim qo‘shish</Button>
      </Space>

      <QueryBoundary isLoading={staff.isLoading} error={staff.error} data={staff.data} isEmpty={(d) => d.length === 0}>
        {(d) => <Table rowKey="id" dataSource={d} columns={columns} pagination={false} />}
      </QueryBoundary>

      <Modal title="Yangi hodim" open={open} onOk={onCreate} onCancel={() => setOpen(false)} confirmLoading={createStaff.isPending}>
        <Form form={form} layout="vertical">
          <Form.Item name="fish" label="F.I.Sh." rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Telefon">
            <Input placeholder="+998..." />
          </Form.Item>
          <Form.Item name="role" label="Rol" rules={[{ required: true }]}>
            <Select options={ROLE_OPTIONS} />
          </Form.Item>
          <Form.Item name="branchId" label="Filial">
            <Select
              allowClear
              loading={branches.isLoading}
              options={(branches.data ?? []).map((b) => ({ value: b.id, label: b.name }))}
            />
          </Form.Item>
          <Form.Item name="password" label="Parol (panel kirishi)" extra="OWNER/MANAGER uchun, kamida 6 belgi">
            <Input.Password />
          </Form.Item>
          <Form.Item name="pin" label="PIN (kassir)" extra="4-6 raqam">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
