import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb);
const KEY_LEN = 64;

/**
 * Password/PIN hashing using scrypt (no native deps). Format: <saltHex>:<hashHex>.
 * Constant-time comparison on verify.
 */
export async function hashSecret(plain: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scrypt(plain, salt, KEY_LEN)) as Buffer;
  return `${salt}:${derived.toString('hex')}`;
}

export async function verifySecret(plain: string, stored: string): Promise<boolean> {
  const [salt, hashHex] = stored.split(':');
  if (!salt || !hashHex) {
    return false;
  }
  const derived = (await scrypt(plain, salt, KEY_LEN)) as Buffer;
  const storedBuffer = Buffer.from(hashHex, 'hex');
  if (storedBuffer.length !== derived.length) {
    return false;
  }
  return timingSafeEqual(storedBuffer, derived);
}
