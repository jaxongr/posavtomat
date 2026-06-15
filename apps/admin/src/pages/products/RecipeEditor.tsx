import { App, Button, InputNumber, Modal, Select, Space, Table, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { apiErrorMessage } from '../../api/client';
import { recipesApi } from '../../api/endpoints';
import { useProducts } from '../../hooks/useCatalog';

interface Props {
  dishProductId: string;
  dishName: string;
  open: boolean;
  onClose: () => void;
}

interface Row {
  ingredientId: string;
  qty: number;
}

/** Texkarta (recipe) editor for a DISH: pick INGREDIENT products + qty per portion. */
export default function RecipeEditor({ dishProductId, dishName, open, onClose }: Props) {
  const products = useProducts({});
  const { message } = App.useApp();
  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);

  const ingredients = (products.data?.data ?? []).filter((p) => p.type === 'INGREDIENT');

  useEffect(() => {
    if (!open) return;
    recipesApi
      .get(dishProductId)
      .then((r) => setRows((r?.items ?? []).map((i) => ({ ingredientId: i.ingredientId, qty: Number(i.qty) }))))
      .catch(() => setRows([]));
  }, [open, dishProductId]);

  const save = async () => {
    const valid = rows.filter((r) => r.ingredientId && r.qty > 0);
    if (!valid.length) {
      message.warning('Kamida bitta ingredient qo‘shing');
      return;
    }
    setSaving(true);
    try {
      await recipesApi.set(dishProductId, valid);
      message.success('Texkarta saqlandi');
      onClose();
    } catch (e) {
      message.error(apiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: 'Ingredient',
      render: (_: unknown, _r: Row, i: number) => (
        <Select
          showSearch
          optionFilterProp="label"
          style={{ width: 240 }}
          placeholder="Xom ashyo tanlang"
          value={rows[i].ingredientId || undefined}
          options={ingredients.map((p) => ({ value: p.id, label: `${p.name} (${p.unit})` }))}
          onChange={(v) => setRows((rs) => rs.map((x, idx) => (idx === i ? { ...x, ingredientId: v } : x)))}
        />
      ),
    },
    {
      title: 'Miqdor (1 porsiya)',
      render: (_: unknown, _r: Row, i: number) => (
        <InputNumber
          min={0.001}
          step={0.05}
          value={rows[i].qty}
          onChange={(v) => setRows((rs) => rs.map((x, idx) => (idx === i ? { ...x, qty: Number(v) } : x)))}
        />
      ),
    },
    {
      title: '',
      render: (_: unknown, _r: Row, i: number) => (
        <Button danger size="small" onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}>
          O‘chirish
        </Button>
      ),
    },
  ];

  return (
    <Modal title={`Texkarta — ${dishName}`} open={open} onOk={save} onCancel={onClose} confirmLoading={saving} width={600}>
      {ingredients.length === 0 && (
        <Typography.Text type="warning">
          Avval &quot;Xom ashyo&quot; (INGREDIENT) turidagi mahsulot qo‘shing.
        </Typography.Text>
      )}
      <Table rowKey={(_, i) => String(i)} dataSource={rows} columns={columns} pagination={false} size="small" />
      <Button style={{ marginTop: 12 }} onClick={() => setRows((rs) => [...rs, { ingredientId: '', qty: 1 }])}>
        + Ingredient qo‘shish
      </Button>
    </Modal>
  );
}
