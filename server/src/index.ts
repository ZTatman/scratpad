import express, { Request, Response } from 'express';
import { parseInboundCommand } from './parsers/command-parser.js';
import { canSendReminderWithGuardrails } from './services/reminder-policy-service.js';
import { TaskActionService } from './services/task-action-service.js';
import { TwilioSmsProvider } from './sms-provider/twilio.js';
import { InboundActionStore } from './store/inbound-action-store.js';
import { IdempotencyStore } from './store/idempotency-store.js';
import { ReminderSettings, ReminderStats, SmsWebhookPayload } from './types.js';

const app = express();
const idempotency = new IdempotencyStore();
const inboundActions = new InboundActionStore();

const PORT = Number(process.env.PORT || 4000);
const INTERNAL_API_TOKEN = process.env.INTERNAL_API_TOKEN || '';
const APP_CALLBACK_URL = process.env.APP_CALLBACK_URL;
const APP_CALLBACK_TOKEN = process.env.APP_CALLBACK_TOKEN;

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER || '';

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
  console.warn('[scratpad-server] Twilio credentials are missing. /sms/send will fail until configured.');
}

const provider =
  TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM_NUMBER
    ? new TwilioSmsProvider(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER)
    : undefined;

const actionService = new TaskActionService(APP_CALLBACK_URL, APP_CALLBACK_TOKEN, inboundActions);

app.use('/sms/webhook/inbound', express.urlencoded({ extended: false }));
app.use(express.json());

function requireInternalAuth(req: Request, res: Response): boolean {
  if (!INTERNAL_API_TOKEN) return true;
  const auth = req.header('authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : '';
  if (token !== INTERNAL_API_TOKEN) {
    res.status(401).json({ ok: false, error: 'unauthorized' });
    return false;
  }
  return true;
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'scratpad-sms-server' });
});

app.post('/sms/send', async (req, res) => {
  if (!requireInternalAuth(req, res)) return;

  const { to, body, taskId, settings, stats, nowIso } = req.body as {
    to?: string;
    body?: string;
    taskId?: string;
    settings?: ReminderSettings;
    stats?: ReminderStats;
    nowIso?: string;
  };

  if (!to || !body) {
    res.status(400).json({ ok: false, error: 'to and body are required' });
    return;
  }

  if (taskId && settings && stats) {
    const check = canSendReminderWithGuardrails({
      now: nowIso ? new Date(nowIso) : new Date(),
      taskId,
      settings,
      stats
    });
    if (!check.allowed) {
      res.status(200).json({ ok: true, sent: false, suppressed: check.reason });
      return;
    }
  }

  if (!provider) {
    res.status(500).json({ ok: false, error: 'twilio_not_configured' });
    return;
  }

  try {
    const sid = await provider.sendMessage({ to, body });
    res.json({ ok: true, sent: true, sid });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error';
    res.status(500).json({ ok: false, error: message });
  }
});

app.get('/app/inbound-actions', (req, res) => {
  if (!requireInternalAuth(req, res)) return;
  const from = typeof req.query.from === 'string' ? req.query.from : '';
  const limitRaw = typeof req.query.limit === 'string' ? Number(req.query.limit) : 20;
  const limit = Number.isFinite(limitRaw) ? limitRaw : 20;

  if (!from) {
    res.status(400).json({ ok: false, error: 'from is required' });
    return;
  }

  const actions = inboundActions.list(from, limit);
  res.json({ ok: true, actions });
});

app.post('/app/inbound-actions/ack', (req, res) => {
  if (!requireInternalAuth(req, res)) return;
  const { from, id } = req.body as { from?: string; id?: string };
  if (!from || !id) {
    res.status(400).json({ ok: false, error: 'from and id are required' });
    return;
  }

  const acknowledged = inboundActions.ack(from, id);
  res.json({ ok: true, acknowledged });
});

app.post('/sms/webhook/inbound', async (req, res) => {
  const messageSid = (req.body.MessageSid || req.body.SmsSid || '') as string;
  const from = (req.body.From || '') as string;
  const body = (req.body.Body || '') as string;

  if (!from || !body) {
    res.status(400).send('missing from/body');
    return;
  }

  if (messageSid && idempotency.has(messageSid)) {
    res.status(200).send('ok');
    return;
  }

  if (provider && process.env.TWILIO_VALIDATE_SIGNATURE !== '0') {
    const signature = req.header('x-twilio-signature') || '';
    const host = req.header('x-forwarded-host') || req.header('host') || 'localhost';
    const protocol = req.header('x-forwarded-proto') || 'https';
    const webhookUrl = `${protocol}://${host}${req.originalUrl}`;

    const validated = provider.validateSignature(signature, webhookUrl, req.body as Record<string, string>);
    if (!validated) {
      res.status(401).send('invalid signature');
      return;
    }
  }

  if (messageSid) idempotency.add(messageSid);

  const payload: SmsWebhookPayload = {
    messageSid: messageSid || undefined,
    from,
    body,
    receivedAt: new Date().toISOString()
  };

  const parsed = parseInboundCommand(body);

  try {
    await actionService.handleInbound(payload, parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error';
    console.error('[scratpad-server] inbound action failed', message);
  }

  const ackMessage = parsed.type === 'UNKNOWN' ? 'ScratPad received your message.' : `ScratPad applied: ${parsed.type}`;
  if (provider) {
    res.type('text/xml').send(provider.twimlMessage(ackMessage));
    return;
  }

  res.status(200).send('ok');
});

app.listen(PORT, () => {
  console.log(`[scratpad-server] listening on :${PORT}`);
});
