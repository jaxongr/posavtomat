import type { ThemeConfig } from 'antd';

// Premium, eye-friendly defaults. White-label: tenant overrides primary later.
export const theme: ThemeConfig = {
  token: {
    colorPrimary: '#4F46E5', // indigo — modern SaaS premium
    colorSuccess: '#16A34A',
    colorError: '#EF4444',
    colorWarning: '#F59E0B',
    colorInfo: '#4F46E5',
    colorBgLayout: '#F5F6FA',
    borderRadius: 10,
    fontFamily: "'Outfit', -apple-system, Segoe UI, Roboto, sans-serif",
    fontSize: 14,
    controlHeight: 38,
    wireframe: false,
  },
  components: {
    Button: { controlHeight: 38, fontWeight: 600, primaryShadow: '0 4px 12px rgba(79,70,229,0.25)' },
    Card: { borderRadiusLG: 16, paddingLG: 20 },
    Table: { borderRadiusLG: 14, headerBg: '#F8FAFC' },
    Menu: { darkItemSelectedBg: 'rgba(255,255,255,0.14)' },
    Modal: { borderRadiusLG: 16 },
    Input: { controlHeight: 38 },
    Select: { controlHeight: 38 },
    Statistic: { contentFontSize: 26 },
    Layout: { headerBg: '#FFFFFF', bodyBg: '#F5F6FA', siderBg: '#1E1B4B' },
  },
};
