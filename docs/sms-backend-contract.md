# ScratPad SMS Backend Contract

## Environment Variables

Required for live SMS:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`

Optional:

- `PORT` (default `4000`)
- `INTERNAL_API_TOKEN` (Bearer auth for `/sms/send`)
- `APP_CALLBACK_URL` (forward inbound parsed command to app sync endpoint)
- `APP_CALLBACK_TOKEN` (Bearer auth for callback)
- `TWILIO_VALIDATE_SIGNATURE` (`0` disables webhook signature checks)

## Endpoints

### `GET /health`
Returns backend health.

Response:

```json
{ "ok": true, "service": "scratpad-sms-server" }
```

### `POST /sms/send`
Sends outbound SMS via Twilio.

Auth:

- If `INTERNAL_API_TOKEN` is set, include `Authorization: Bearer <token>`

Request body:

```json
{
  "to": "+15551234567",
  "body": "Acorn check...",
  "taskId": "task-123",
  "settings": {
    "dailyBriefingEnabled": true,
    "dailyBriefingTime": "08:00",
    "quietHoursStart": "22:00",
    "quietHoursEnd": "08:00",
    "maxDailyReminders": 15,
    "maxRemindersPerTask": 3,
    "minSpacingMinutes": 10
  },
  "stats": {
    "dateKey": "2026-02-19",
    "totalSentToday": 5,
    "perTaskSentToday": { "task-123": 1 },
    "lastSentAtMs": 1771502400000
  },
  "nowIso": "2026-02-19T12:00:00.000Z"
}
```

Behavior:

- If `taskId`, `settings`, and `stats` are supplied, server guardrails are checked before send.
- If blocked by guardrails, returns success with suppression reason.

Success response:

```json
{ "ok": true, "sent": true, "sid": "SMxxxxxxxx" }
```

Suppressed response:

```json
{ "ok": true, "sent": false, "suppressed": "min_spacing" }
```

### `POST /sms/webhook/inbound`
Twilio inbound webhook endpoint.

Input:

- `application/x-www-form-urlencoded` Twilio payload (`From`, `Body`, `MessageSid`)

Behavior:

- Optional Twilio signature verification
- Message SID idempotency dedupe
- Command parsing: `1`, `2`, `3`, `4`, `DONE`, `ROLLOVER`, `SNOOZE`, comma breakdown
- Optional forward to `APP_CALLBACK_URL` with parsed payload

Returns TwiML ack when Twilio provider is configured.

### `GET /app/inbound-actions`
Returns queued inbound SMS actions for a specific phone number.

Auth:

- If `INTERNAL_API_TOKEN` is set, include `Authorization: Bearer <token>`

Query params:

- `from` (required): E.164 phone number
- `limit` (optional): max number of actions to return, default `20`

Response:

```json
{
  "ok": true,
  "actions": [
    {
      "id": "SMxxxx",
      "from": "+15551234567",
      "body": "1",
      "receivedAt": "2026-02-19T12:00:00.000Z",
      "parsed": { "type": "DONE" }
    }
  ]
}
```

### `POST /app/inbound-actions/ack`
Acknowledges and removes a queued inbound action after the app processes it.

Auth:

- If `INTERNAL_API_TOKEN` is set, include `Authorization: Bearer <token>`

Request body:

```json
{
  "from": "+15551234567",
  "id": "SMxxxx"
}
```

## App Callback Payload (when enabled)

```json
{
  "from": "+15551234567",
  "body": "1",
  "receivedAt": "2026-02-19T12:00:00.000Z",
  "parsed": { "type": "DONE" }
}
```
