import { TaskActionService } from '../../server/src/services/task-action-service';
import { InboundActionStore } from '../../server/src/store/inbound-action-store';
import { ParsedCommand, SmsWebhookPayload } from '../../server/src/types';

describe('inbound action sync', () => {
  const payload: SmsWebhookPayload = {
    messageSid: 'SM123',
    from: '+15550001111',
    body: '1',
    receivedAt: '2026-02-19T12:00:00.000Z'
  };

  const parsed: ParsedCommand = { type: 'DONE' };

  it('stores, lists, and acknowledges inbound actions', () => {
    const store = new InboundActionStore();
    store.enqueue(payload, parsed);

    const actions = store.list(payload.from);
    expect(actions).toHaveLength(1);
    expect(actions[0]?.id).toBe('SM123');
    expect(actions[0]?.parsed.type).toBe('DONE');

    expect(store.ack(payload.from, 'SM123')).toBe(true);
    expect(store.list(payload.from)).toHaveLength(0);
  });

  it('queues inbound actions when callback URL is not configured', async () => {
    const store = new InboundActionStore();
    const service = new TaskActionService(undefined, undefined, store);

    const result = await service.handleInbound(payload, parsed);
    const queued = store.list(payload.from);

    expect(result.accepted).toBe(true);
    expect(result.forwarded).toBe(false);
    expect(queued).toHaveLength(1);
  });

  it('forwards inbound actions when callback URL is configured', async () => {
    const store = new InboundActionStore();
    const service = new TaskActionService('https://example.test/callback', 'token-123', store);

    const fetchMock = jest.fn(async () => ({
      ok: true,
      text: async () => ''
    })) as unknown as typeof fetch;
    (globalThis as { fetch: typeof fetch }).fetch = fetchMock;

    const result = await service.handleInbound(payload, parsed);

    expect(result.accepted).toBe(true);
    expect(result.forwarded).toBe(true);
    expect(store.list(payload.from)).toHaveLength(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
