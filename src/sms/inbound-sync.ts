const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || '';
const API_TOKEN = process.env.EXPO_PUBLIC_API_TOKEN || '';

export type InboundAction = {
  id: string;
  from: string;
  body: string;
  receivedAt: string;
};

function authHeaders(): Record<string, string> {
  return API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {};
}

export async function fetchInboundActions(from: string): Promise<InboundAction[]> {
  if (!API_BASE || !from) return [];

  const url = `${API_BASE}/app/inbound-actions?from=${encodeURIComponent(from)}&limit=25`;
  const response = await fetch(url, { headers: authHeaders() });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`inbound_fetch_failed:${response.status}:${text}`);
  }

  const payload = (await response.json()) as { ok: boolean; actions?: InboundAction[] };
  return payload.actions || [];
}

export async function ackInboundAction(from: string, id: string): Promise<void> {
  if (!API_BASE || !from || !id) return;

  const response = await fetch(`${API_BASE}/app/inbound-actions/ack`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify({ from, id })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`inbound_ack_failed:${response.status}:${text}`);
  }
}
