import { ParsedCommand, SmsWebhookPayload } from '../types.js';
import { InboundActionStore } from '../store/inbound-action-store.js';

export type TaskActionResult = {
  accepted: boolean;
  action: ParsedCommand;
  forwarded: boolean;
};

export class TaskActionService {
  constructor(
    private readonly callbackUrl: string | undefined,
    private readonly callbackToken: string | undefined,
    private readonly actionStore: InboundActionStore
  ) {}

  async handleInbound(payload: SmsWebhookPayload, action: ParsedCommand): Promise<TaskActionResult> {
    if (!this.callbackUrl) {
      this.actionStore.enqueue(payload, action);
      return { accepted: action.type !== 'UNKNOWN', action, forwarded: false };
    }

    const response = await fetch(this.callbackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.callbackToken ? { Authorization: `Bearer ${this.callbackToken}` } : {})
      },
      body: JSON.stringify({ ...payload, parsed: action })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`App callback failed: ${response.status} ${text}`);
    }

    return { accepted: action.type !== 'UNKNOWN', action, forwarded: true };
  }
}
