import { hashSecret, verifySecret } from './hash.util';

describe('hash.util', () => {
  it('verifies a correct secret', async () => {
    const hash = await hashSecret('1234');
    expect(await verifySecret('1234', hash)).toBe(true);
  });

  it('rejects a wrong secret', async () => {
    const hash = await hashSecret('1234');
    expect(await verifySecret('0000', hash)).toBe(false);
  });

  it('produces different hashes for the same input (salted)', async () => {
    const a = await hashSecret('same');
    const b = await hashSecret('same');
    expect(a).not.toBe(b);
  });

  it('rejects malformed stored value', async () => {
    expect(await verifySecret('x', 'garbage')).toBe(false);
  });
});
