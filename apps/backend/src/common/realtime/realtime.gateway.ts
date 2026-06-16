import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtPayload } from '../types/auth.types';

/**
 * Realtime push over Socket.IO. Clients authenticate with their access token on
 * connect and are placed into a per-branch room. Mutations call `notify(...)`
 * which emits a `changed` event so the admin can refetch instantly (instead of
 * waiting for the polling interval). Tenant-scoped: a client only ever joins
 * rooms for its own organization/branch.
 */
@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer() private server!: Server;
  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const auth = client.handshake.auth ?? {};
      const query = client.handshake.query ?? {};
      const token = (auth.token as string) || (query.token as string);
      if (!token) {
        client.disconnect();
        return;
      }
      const secret = this.config.get<string>('jwt.accessSecret') ?? '';
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, { secret });
      const orgId = payload.organizationId;
      const branchId =
        payload.branchId ?? (auth.branchId as string) ?? (query.branchId as string) ?? null;
      if (!orgId || !branchId) {
        client.disconnect();
        return;
      }
      // Tenant room — only this org's branch receives the events.
      client.join(`b:${orgId}:${branchId}`);
    } catch {
      client.disconnect();
    }
  }

  /** Emit a `changed` event with affected topics to a branch room. */
  notify(orgId: string, branchId: string, topics: string[]): void {
    this.server?.to(`b:${orgId}:${branchId}`).emit('changed', { topics });
  }
}
