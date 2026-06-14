import { Button, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Typography } from 'antd';
import { useState } from 'react';
import { QueryBoundary } from '../../components/common/QueryBoundary';
import { useCreateProduct, useDeleteProduct, useProducts } from '../../hooks/useCatalog';
import type { Product } from '../../types';

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const query = useProducts({ search: search || undefined });
  const createProduct = useCreateProduct();
  const deleteProduct = useDeleteProduct();
  const [form] = Form.useForm();

  const onCreate = async () => {
    const values = await form.validateFields();
    await createProduct.mutateAsync(values);
    setOpen(false);
    form.resetFields();
  };

  const columns = [
    { title: 'Nomi', dataIndex: 'name' },
    { title: 'Barkod', dataIndex: 'barcode', render: (v: string | null) => v ?? '—' },
    { title: 'Narx', dataIndex: 'price', render: (v: string) => `${Number(v).toLocaleString()} so‘m` },
    {
      title: 'Qoldiq',
      render: (_: unknown, r: Product) => r.stocks?.[0]?.quantity ?? '0',
    },
    { title: 'Tur', dataIndex: 'type', render: (v: string) => <Tag>{v}</Tag> },
    {
      title: '',
      render: (_: unknown, r: Product) => (
        <Button danger size="small" onClick={() => deleteProduct.mutate(r.id)}>
          O‘chirish
        </Button>
      ),
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }}>
        <Typography.Title level={3} style={{ margin: 0 }}>Katalog</Typography.Title>
        <Space>
          <Input.Search placeholder="Qidirish" allowClear onSearch={setSearch} style={{ width: 240 }} />
          <Button type="primary" onClick={() => setOpen(true)}>Mahsulot qo‘shish</Button>
        </Space>
      </Space>

      <QueryBoundary
        isLoading={query.isLoading}
        error={query.error}
        data={query.data}
        isEmpty={(d) => d.data.length === 0}
      >
        {(d) => <Table rowKey="id" dataSource={d.data} columns={columns} pagination={false} />}
      </QueryBoundary>

      <Modal title="Yangi mahsulot" open={open} onOk={onCreate} onCancel={() => setOpen(false)} confirmLoading={createProduct.isPending}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Nomi" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="barcode" label="Barkod">
            <Input />
          </Form.Item>
          <Form.Item name="unit" label="Birlik" initialValue="DONA">
            <Select options={[{ value: 'DONA' }, { value: 'KG' }, { value: 'PORSIYA' }, { value: 'LITR' }]} />
          </Form.Item>
          <Form.Item name="price" label="Narx" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="cost" label="Tannarx">
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
