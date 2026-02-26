# ScratPad

ScratPad is an Expo + React Native app for task reminders with an SMS accountability engine.

## Tech Stack

- Expo SDK 54
- React Native + TypeScript
- Expo Router
- Zustand + AsyncStorage
- Node/Express SMS backend (Twilio)

## Features

- Today dashboard with pending/done task flow
- Rollover with undo
- Add task with date/time + repeat (`None`, `Daily`, `Weekly`)
- Past wins archive ("The Nut Stash")
- Settings guardrails (quiet hours, spacing, caps)
- SMS commands (`1 DONE`, `2 ROLLOVER`, `3 SNOOZE`, `4 DONE ALL`, breakdown flow)

## Prerequisites

- Node.js 20+
- `pnpm`
- Expo Go app (or dev build)
- For Android mirroring/screenshot scripts: `adb` + optional `scrcpy`

## Quick Start

### 1) Install dependencies

```bash
cd /Users/zachtatman/Projects/scratpad
pnpm install
```

### 2) Configure backend env

```bash
cp server/.env.example server/.env
```

Set values in `server/.env`:

- `INTERNAL_API_TOKEN`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`
- optional callback fields if needed

### 3) Configure app env

Create `/Users/zachtatman/Projects/scratpad/.env`:

```bash
EXPO_PUBLIC_API_BASE_URL=http://<your-local-ip>:4000
EXPO_PUBLIC_API_TOKEN=<same-as-INTERNAL_API_TOKEN>
EXPO_PUBLIC_USER_PHONE_NUMBER=+15555550123
EXPO_PUBLIC_USE_MOCK_SMS=0
```

Use `EXPO_PUBLIC_USE_MOCK_SMS=1` to run without real SMS sending.

### 4) Start backend

```bash
pnpm run server:dev
```

### 5) Start Expo app

```bash
pnpm start
```

Then scan the QR with Expo Go.

## Platform Commands

```bash
pnpm android
pnpm ios
pnpm web
```

## Android Feedback / Screenshot Utilities

```bash
pnpm run android:mirror
pnpm run android:shot
pnpm run android:session
```

Scripts are in `/Users/zachtatman/Projects/scratpad/scripts/android-feedback.sh`.

## Testing & Checks

```bash
pnpm run typecheck
pnpm test
pnpm run server:typecheck
```

Dependency health:

```bash
npx expo-doctor --verbose
```

## Important Notes

- `expo-notifications` has limitations in Expo Go (especially Android push behavior). Use a development build for full notifications behavior.
- Keep `.expo/` uncommitted (already ignored).

## Backend API

See `/Users/zachtatman/Projects/scratpad/docs/sms-backend-contract.md` for:

- `GET /health`
- `POST /sms/send`
- `POST /sms/webhook/inbound`

