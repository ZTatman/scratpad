import { ParsedCommand, SmsWebhookPayload } from '../types.js';

export type InboundAction = {
  id: string;
  from: string;
  body: string;
  parsed: ParsedCommand;
  receivedAt: string;
};

export class InboundActionStore {
  private readonly actionsByPhone = new Map<string, InboundAction[]>();
  private readonly ids = new Set<string>();

  enqueue(payload: SmsWebhookPayload, parsed: ParsedCommand): string {
    const id = payload.messageSid || this.makeId(payload.from, payload.receivedAt, payload.body);
    if (this.ids.has(id)) return id;

    const action: InboundAction = {
      id,
      from: payload.from,
      body: payload.body,
      parsed,
      receivedAt: payload.receivedAt
    };

    const list = this.actionsByPhone.get(payload.from) || [];
    list.push(action);
    this.actionsByPhone.set(payload.from, list);
    this.ids.add(id);
    return id;
  }

  list(from: string, limit = 20): InboundAction[] {
    const list = this.actionsByPhone.get(from) || [];
    return list.slice(0, Math.max(1, limit));
  }

  ack(from: string, id: string): boolean {
    const list = this.actionsByPhone.get(from);
    if (!list || list.length === 0) return false;

    const next = list.filter((item) => item.id !== id);
    if (next.length === list.length) return false;

    if (next.length === 0) {
      this.actionsByPhone.delete(from);
    } else {
      this.actionsByPhone.set(from, next);
    }

    this.ids.delete(id);
    return true;
  }

  private makeId(from: string, receivedAt: string, body: string): string {
    const safeBody = body.trim().replace(/\s+/g, '_').slice(0, 24);
    return `${from}-${receivedAt}-${safeBody}`;
  }
}
