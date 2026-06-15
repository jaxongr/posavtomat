import { Button, Card, Form, Input, Typography, App } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage } from '../../api/client';
import { authApi } from '../../api/endpoints';
import { allowedRoutes } from '../../components/layout/AppLayout';
import { useAuthStore } from '../../store/auth.store';

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const qc = useQueryClient();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: { login: string; password: string }) => {
    setLoading(true);
    try {
      const tokens = await authApi.login(values.login, values.password);
      qc.clear(); // drop any cached data from a previous account/org
      setAuth(tokens);
      const home = allowedRoutes(tokens.user.role)[0] ?? '/';
      navigate(home);
    } catch (e) {
      message.error(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
      <Card style={{ width: 380 }}>
        <Typography.Title level={3} style={{ textAlign: 'center' }}>SAVDO-POS</Typography.Title>
        <Typography.Paragraph type="secondary" style={{ textAlign: 'center' }}>
          Boshqaruv paneliga kirish
        </Typography.Paragraph>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item name="login" label="Telefon / login" rules={[{ required: true, message: 'Login kiriting' }]}>
            <Input placeholder="+998901112233" autoComplete="username" />
          </Form.Item>
          <Form.Item name="password" label="Parol" rules={[{ required: true, message: 'Parol kiriting' }]}>
            <Input.Password placeholder="••••••" autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            Kirish
          </Button>
        </Form>
      </Card>
    </div>
  );
}
