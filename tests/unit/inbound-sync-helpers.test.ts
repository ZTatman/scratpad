import { pruneProcessedInboundActions, shouldSyncInboundActions } from '@/store/use-app-store';

describe('inbound sync helpers', () => {
  it('throttles sync until cooldown elapses', () => {
    const now = 1_000_000;
    expect(shouldSyncInboundActions(now, 0)).toBe(true);
    expect(shouldSyncInboundActions(now, now - 30_000)).toBe(false);
    expect(shouldSyncInboundActions(now, now - 3 * 60 * 1000)).toBe(true);
  });

  it('prunes expired and oversized processed-id maps', () => {
    const now = Date.now();
    const processed: Record<string, number> = {
      fresh: now - 1_000,
      stale: now - 2 * 24 * 60 * 60 * 1000
    };

    for (let i = 0; i < 250; i += 1) {
      processed[`id-${i}`] = now - i;
    }

    const pruned = pruneProcessedInboundActions(processed, now);
    expect(pruned.stale).toBeUndefined();
    expect(pruned['id-0']).toBeDefined();
    expect(Object.keys(pruned).length).toBeLessThanOrEqual(200);
  });
});
