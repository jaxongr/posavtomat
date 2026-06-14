import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async setex(key: string, ttlSeconds: number, value: unknown): Promise<void> {
    await this.client.setex(key, ttlSeconds, JSON.stringify(value));
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /** Delete by pattern (cache invalidation: catalog:org:branch:*). */
  async delPattern(pattern: string): Promise<void> {
    const stream = this.client.scanStream({ match: pattern, count: 100 });
    const pipeline = this.client.pipeline();
    let hasKeys = false;
    for await (const keys of stream) {
      for (const key of keys as string[]) {
        pipeline.del(key);
        hasKeys = true;
      }
    }
    if (hasKeys) {
      await pipeline.exec();
    }
  }

  onModuleDestroy(): void {
    this.client.disconnect();
    this.logger.log('Redis disconnected');
  }
}
