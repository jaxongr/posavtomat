import { App, Button, Card, Col, Form, Input, InputNumber, Modal, Row, Select, Space, Table, Typography } from 'antd';
import { useState } from 'react';
import { useProducts } from '../../hooks/useCatalog';
import { useCreateSupplier, useReceivePurchase, useSuppliers } from '../../hooks/useSuppliers';

interface Line {
  productId: string;
  qty: number;
  cost: number;
}

export default function PurchasePage() {
  const products = useProducts({});
  const suppliers = useSuppliers();
  const receive = useReceivePurchase();
  const createSupplier = useCreateSupplier();
  const { message } = App.useApp();

  const [supplierId, setSupplierId] = useState<string>();
  const [lines, setLines] = useState<Line[]>([]);
  const [supOpen, setSupOpen] = useState(false);
  const [supForm] = Form.useForm();

  const productOptions = (products.data?.data ?? []).map((p) => ({ value: p.id, label: p.name }));

  const addLine = () => setLines((l) => [...l, { productId: '', qty: 1, cost: 0 }]);
  const setLine = (i: number, patch: Partial<Line>) =>
    setLines((l) => l.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const removeLine = (i: number) => setLines((l) => l.filter((_, idx) => idx !== i));

  const submit = async () => {
    const valid = lines.filter((l) => l.productId && l.qty > 0);
    if (!valid.length) {
      message.warning('Kamida bitta mahsulot qo‘shing');
      return;
    }
    await receive.mutateAsync({ supplierId, items: valid });
    setLines([]);
    setSupplierId(undefined);
  };

  const onCreateSupplier = async () => {
    const v = await supForm.validateFields();
    await createSupplier.mutateAsync(v);
    setSupOpen(false);
    supForm.resetFields();
  };

  const total = lines.reduce((s, l) => s + l.qty * l.cost, 0);

  const columns = [
    {
      title: 'Mahsulot',
      render: (_: unknown, _r: Line, i: number) => (
        <Select
          showSearch
          optionFilterProp="label"
          style={{ width: 220 }}
          placeholder="Tanlang"
          value={lines[i].productId || undefined}
          options={productOptions}
          onChange={(v) => setLine(i, { productId: v })}
        />
      ),
    },
    {
      title: 'Miqdor',
      render: (_: unknown, _r: Line, i: number) => (
        <InputNumber min={0.001} value={lines[i].qty} onChange={(v) => setLine(i, { qty: Number(v) })} />
      ),
    },
    {
      title: 'Tannarx',
      render: (_: unknown, _r: Line, i: number) => (
        <InputNumber min={0} value={lines[i].cost} onChange={(v) => setLine(i, { cost: Number(v) })} />
      ),
    },
    {
      title: 'Summa',
      render: (_: unknown, _r: Line, i: number) => `${(lines[i].qty * lines[i].cost).toLocaleString()} so‘m`,
    },
    {
      title: '',
      render: (_: unknown, _r: Line, i: number) => (
        <Button danger size="small" onClick={() => removeLine(i)}>O‘chirish</Button>
      ),
    },
  ];

  return (
    <>
      <Typography.Title level={3}>Kirim (xarid)</Typography.Title>
      <Card>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col>
            <Space>
              <Select
                allowClear
                placeholder="Yetkazib beruvchi"
                style={{ width: 240 }}
                loading={suppliers.isLoading}
                value={supplierId}
                onChange={setSupplierId}
                options={(suppliers.data ?? []).map((s) => ({ value: s.id, label: s.name }))}
              />
              <Button onClick={() => setSupOpen(true)}>+ Yangi yetkazib beruvchi</Button>
            </Space>
          </Col>
        </Row>

        <Table rowKey={(_, i) => String(i)} dataSource={lines} columns={columns} pagination={false} />

        <Space style={{ marginTop: 16, justifyContent: 'space-between', width: '100%' }}>
          <Button onClick={addLine}>+ Qator qo‘shish</Button>
          <Space>
            <Typography.Text strong>Jami: {total.toLocaleString()} so‘m</Typography.Text>
            <Button type="primary" loading={receive.isPending} disabled={!lines.length} onClick={submit}>
              Kirimni qabul qilish
            </Button>
          </Space>
        </Space>
      </Card>

      <Modal title="Yangi yetkazib beruvchi" open={supOpen} onOk={onCreateSupplier} onCancel={() => setSupOpen(false)} confirmLoading={createSupplier.isPending}>
        <Form form={supForm} layout="vertical">
          <Form.Item name="name" label="Nomi" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Telefon">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
