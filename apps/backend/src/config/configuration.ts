// Centralized typed configuration loaded from environment.
export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  databaseUrl: string;
  redisUrl: string;
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessTtl: string;
    refreshTtl: string;
  };
  encryptionKey: string;
  defaultCurrency: string;
  printerGatewayUrl: string;
  logLevel: string;
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  apiPrefix: process.env.API_PREFIX ?? 'api/v1',
  databaseUrl: process.env.DATABASE_URL ?? '',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? '',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
  },
  encryptionKey: process.env.ENCRYPTION_KEY ?? '',
  defaultCurrency: process.env.DEFAULT_CURRENCY ?? 'UZS',
  printerGatewayUrl: process.env.PRINTER_GATEWAY_URL ?? '',
  logLevel: process.env.LOG_LEVEL ?? 'info',
});
