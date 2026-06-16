import { Button, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Typography } from 'antd';
import { useState } from 'react';
import { QueryBoundary } from '../../components/common/QueryBoundary';
import { useCreateProduct, useDeleteProduct, useProducts } from '../../hooks/useCatalog';
import type { Product } from '../../types';
import { foodIcon } from '../../utils/foodIcon';
import RecipeEditor from './RecipeEditor';

const TYPE_LABELS: Record<string, string> = {
  GOODS: 'Mahsulot',
  DISH: 'Taom',
  INGREDIENT: 'Xom ashyo',
};

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [recipeFor, setRecipeFor] = useState<Product | null>(null);
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

  // Live type value so the "initial stock" field hides for dishes (no stock).
  const typeValue = Form.useWatch('type', form) as Product['type'] | undefined;

  const columns = [
    {
      title: 'Nomi',
      dataIndex: 'name',
      render: (v: string, r: Product) => (
        <span>
          <span style={{ fontSize: 18, marginRight: 8 }}>{foodIcon(v, r.type)}</span>
          {v}
        </span>
      ),
    },
    { title: 'Barkod', dataIndex: 'barcode', render: (v: string | null) => v ?? '—' },
    { title: 'Narx', dataIndex: 'price', render: (v: string) => `${Number(v).toLocaleString()} so‘m` },
    {
      title: 'Qoldiq',
      render: (_: unknown, r: Product) => r.stocks?.[0]?.quantity ?? '0',
    },
    {
      title: 'Tur',
      dataIndex: 'type',
      render: (v: string) => <Tag color={v === 'DISH' ? 'volcano' : v === 'INGREDIENT' ? 'gold' : 'default'}>{TYPE_LABELS[v] ?? v}</Tag>,
    },
    {
      title: '',
      render: (_: unknown, r: Product) => (
        <Space>
          {r.type === 'DISH' && (
            <Button size="small" onClick={() => setRecipeFor(r)}>Texkarta</Button>
          )}
          <Button danger size="small" onClick={() => deleteProduct.mutate(r.id)}>O‘chirish</Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }}>
        <Typography.Title level={3} style={{ margin: 0 }}>Katalog / Menyu</Typography.Title>
        <Space>
          <Input.Search placeholder="Qidirish" allowClear onSearch={setSearch} style={{ width: 240 }} />
          <Button type="primary" onClick={() => setOpen(true)}>Qo‘shish</Button>
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

      <Modal title="Yangi mahsulot / taom" open={open} onOk={onCreate} onCancel={() => setOpen(false)} confirmLoading={createProduct.isPending}>
        <Form form={form} layout="vertical" initialValues={{ unit: 'DONA', type: 'GOODS' }}>
          <Form.Item name="name" label="Nomi" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="Turi" rules={[{ required: true }]} extra="Taom = restoran menyusi (texkarta bilan), Xom ashyo = ingredient">
            <Select
              options={[
                { value: 'GOODS', label: 'Mahsulot (do‘kon)' },
                { value: 'DISH', label: 'Taom (menyu)' },
                { value: 'INGREDIENT', label: 'Xom ashyo (ingredient)' },
              ]}
            />
          </Form.Item>
          <Form.Item name="barcode" label="Barkod">
            <Input />
          </Form.Item>
          <Form.Item name="unit" label="Birlik">
            <Select options={[{ value: 'DONA' }, { value: 'KG' }, { value: 'PORSIYA' }, { value: 'LITR' }]} />
          </Form.Item>
          <Form.Item name="price" label="Narx (sotish)" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="cost" label="Tannarx">
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          {typeValue !== 'DISH' && (
            <Form.Item
              name="initialStock"
              label="Boshlang‘ich qoldiq (nechta bor)"
              extra="Hozir omborda bor miqdor. Bo‘sh qoldirilsa — 0."
            >
              <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
            </Form.Item>
          )}
          <Form.Item name="imageUrl" label="Rasm URL (ixtiyoriy)">
            <Input placeholder="https://..." />
          </Form.Item>
        </Form>
      </Modal>

      {recipeFor && (
        <RecipeEditor
          dishProductId={recipeFor.id}
          dishName={recipeFor.name}
          open={Boolean(recipeFor)}
          onClose={() => setRecipeFor(null)}
        />
      )}
    </>
  );
}
