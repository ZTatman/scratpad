import { SmsSendRequest } from '@/types/models';

export type SmsTransport = {
  sendMessage: (to: string, body: string, type: SmsSendRequest['type']) => Promise<void>;
};

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || '';
const API_TOKEN = process.env.EXPO_PUBLIC_API_TOKEN || '';

export class BackendSmsTransport implements SmsTransport {
  async sendMessage(to: string, body: string, type: SmsSendRequest['type']): Promise<void> {
    if (!API_BASE) {
      throw new Error('EXPO_PUBLIC_API_BASE_URL is not configured.');
    }

    const response = await fetch(`${API_BASE}/sms/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_TOKEN}`
      },
      body: JSON.stringify({ to, body, type })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`SMS send failed: ${response.status} ${text}`);
    }
  }
}

export class MockSmsTransport implements SmsTransport {
  async sendMessage(to: string, body: string, type: SmsSendRequest['type']): Promise<void> {
    // Intentionally explicit for development traceability.
    console.log('[MockSmsTransport]', { to, type, body });
  }
}
