import { Button, Card, Divider, Form, Input, List, Select, Space, Switch, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { printReceipt } from '../../utils/receipt';
import { useOrganization, useUpdateOrg } from '../../hooks/useRestaurant';
import { useBranches, useCreateBranch } from '../../hooks/useStaff';
import { useAuthStore } from '../../store/auth.store';
import { useSettings } from '../../store/settings.store';

export default function SettingsPage() {
  const org = useOrganization();
  const update = useUpdateOrg();
  const autoPrint = useSettings((s) => s.autoPrint);
  const setAutoPrint = useSettings((s) => s.setAutoPrint);
  const isOwner = useAuthStore((s) => s.user?.role) === 'OWNER';
  const branches = useBranches();
  const createBranch = useCreateBranch();
  const [newBranch, setNewBranch] = useState('');
  const [form] = Form.useForm();

  const addBranch = async () => {
    if (!newBranch.trim()) return;
    await createBranch.mutateAsync({ name: newBranch.trim() });
    setNewBranch('');
  };

  const receipt = org.data?.settings?.receipt;

  useEffect(() => {
    form.setFieldsValue({
      shopName: receipt?.shopName ?? org.data?.name,
      address: receipt?.address,
      phone: receipt?.phone,
      footer: receipt?.footer ?? 'Xaridingiz uchun rahmat!',
      width: receipt?.width ?? '80',
      showCashier: receipt?.showCashier ?? true,
    });
  }, [receipt, org.data?.name, form]);

  const onSave = async () => {
    const v = await form.validateFields();
    await update.mutateAsync({ receipt: v });
  };

  const testPrint = () => {
    const v = form.getFieldsValue();
    printReceipt({
      shopName: v.shopName || 'SAVDO-POS',
      address: v.address,
      phone: v.phone,
      footer: v.footer,
      width: v.width,
      receiptNo: 'TEST',
      lines: [
        { name: 'Namuna tovar A', qty: 2, price: 12000 },
        { name: 'Namuna tovar B', qty: 1, price: 8000 },
      ],
      subtotal: 32000,
      discount: 0,
      total: 32000,
      provider: 'CASH',
      paid: 50000,
      change: 18000,
      cashier: v.showCashier ? 'Test Kassir' : undefined,
      dateTime: new Date().toLocaleString(),
    });
  };

  return (
    <>
      <Typography.Title level={3}>Sozlamalar</Typography.Title>
      <Card title="Chek sozlamalari" style={{ maxWidth: 560 }}>
        <Form form={form} layout="vertical">
          <Form.Item name="shopName" label="Do‘kon / muassasa nomi" rules={[{ required: true }]}>
            <Input placeholder="Mening Do‘konim" />
          </Form.Item>
          <Form.Item name="address" label="Manzil">
            <Input placeholder="Toshkent sh., ..." />
          </Form.Item>
          <Form.Item name="phone" label="Telefon">
            <Input placeholder="+998 ..." />
          </Form.Item>
          <Form.Item name="footer" label="Pastki matn (chek oxiri)">
            <Input placeholder="Xaridingiz uchun rahmat!" />
          </Form.Item>
          <Form.Item name="width" label="Qog‘oz eni">
            <Select
              options={[
                { value: '80', label: '80 mm (standart)' },
                { value: '58', label: '58 mm (kichik)' },
              ]}
            />
          </Form.Item>
          <Form.Item name="showCashier" label="Kassir ismini chekda ko‘rsatish" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Space>
            <Button type="primary" loading={update.isPending} onClick={onSave}>Saqlash</Button>
            <Button onClick={testPrint}>Namuna chekni chop etish</Button>
          </Space>
        </Form>

        <Divider />
        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
          <div>
            <Typography.Text strong>Chekni avtomatik chop etish</Typography.Text>
            <br />
            <Typography.Text type="secondary">Yoqilsa, har savdodan keyin so‘ramay chop etadi (shu qurilmada)</Typography.Text>
          </div>
          <Switch checked={autoPrint} onChange={setAutoPrint} />
        </Space>
      </Card>

      {isOwner && (
        <Card title="Filiallar" style={{ maxWidth: 560, marginTop: 16 }}>
          <List
            size="small"
            dataSource={branches.data ?? []}
            locale={{ emptyText: 'Filial yo‘q' }}
            renderItem={(b) => <List.Item>{b.name}{b.address ? ` — ${b.address}` : ''}</List.Item>}
          />
          <Space style={{ marginTop: 12, width: '100%' }}>
            <Input placeholder="Yangi filial nomi" value={newBranch} onChange={(e) => setNewBranch(e.target.value)} />
            <Button type="primary" loading={createBranch.isPending} onClick={addBranch}>Qo‘shish</Button>
          </Space>
        </Card>
      )}
    </>
  );
}
