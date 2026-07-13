# MotionLab × RunningHub research prototype

This repository serves the existing React/Vite interface and a participant-isolated Express API from one origin. RunningHub credentials are read only by Node; they are never compiled into the browser bundle.

## What is implemented

- HTTP-only participant sessions backed by SQLite
- one default project per participant, with owner checks on every asset, job, version, and media query
- validated uploads (30 MB by default) stored under `data/uploads/`
- idempotent job submission, one active job per participant, a concurrency-limited local worker, cancellation, and browser polling
- RunningHub upload/create/status/outputs/cancel client
- fast, secret-protected webhook handling plus polling reconciliation after missed callbacks or restarts
- local result downloads under `data/outputs/` and authenticated result playback
- persistent version ancestry and HCI interaction events
- production hosting of the Vite build through Express

## Install and configure

Requirements: Node.js 20+ and a RunningHub workflow that has already completed successfully at least once.

```bash
npm install
cp .env.example .env
npm run db:init
```

Set a long random `SESSION_SECRET`, `RUNNINGHUB_API_KEY`, `RUNNINGHUB_WORKFLOW_ID`, and a random `RUNNINGHUB_WEBHOOK_SECRET` in `.env`. Do not add a `VITE_RUNNINGHUB_API_KEY`; every `VITE_` variable can enter the browser bundle.

`PUBLIC_BASE_URL` should be the current HTTPS tunnel origin, for example `https://example.trycloudflare.com`. When omitted, the server uses the public host of the request that created the job. In that mode, submit the first task through the tunnel URL rather than through localhost.

## Inspect and map the RunningHub workflow

In RunningHub, open the workflow, run it successfully, and save/export its API JSON. After the API key and workflow ID are in `.env`, run:

```bash
npm run rh:inspect
```

The script prints node IDs, titles/classes, input field names, types, and current values without printing the key. Copy only verified node IDs and field names into [`server/config/runninghub-nodes.ts`](server/config/runninghub-nodes.ts). Leave unavailable inputs as `null`; never guess IDs. The server warns at startup while any `REPLACE_ME` mapping remains and fails jobs with a readable error instead of sending invalid overrides.

At minimum, map the positive prompt and whichever reference/edit nodes the workflow actually uses. If one text node accepts the entire prompt, `motionInstruction` may be `null`. The builder automatically omits null, placeholder, empty, and undefined overrides.

## Development

```bash
npm run dev
```

Vite runs with `/api` and `/media` proxied to Express on port 3000. Open the Vite URL shown in the terminal.

## Research / public deployment

Build and start the same-origin production server:

```bash
npm run build
npm run start
```

Open `http://localhost:3000` for a local check. For access from computers and phones, install and start Cloudflare Tunnel in another terminal:

```bash
brew install cloudflared
cloudflared tunnel --url http://localhost:3000
```

Copy the resulting `https://…trycloudflare.com` origin into `PUBLIC_BASE_URL`, restart Node, and use that public URL on every device. Quick Tunnel URLs change after restart and do not support SSE; this app intentionally uses ordinary HTTP polling. Keep Node, cloudflared, the network connection, and the host computer awake during a study.

For a stable domain, configure a Cloudflare Named Tunnel and point it to the same local port. No frontend CORS configuration is needed because Express serves both UI and API.

## Webhook troubleshooting

1. Confirm `GET /api/health` reports `runningHubConfigured: true`.
2. Confirm `PUBLIC_BASE_URL` is HTTPS and currently reachable from outside the study computer.
3. Confirm the workflow node mapping has no `REPLACE_ME` entries that are required for the task.
4. Check the server log for the job ID and safe error code. Secrets and API keys are not logged.
5. A missed webhook is not fatal: the reconciler checks RunningHub every `JOB_POLL_INTERVAL_MS` and uses the same idempotent result finalizer.
6. A repeated `TASK_END` callback cannot create a second version because `versions.source_job_id` is unique.

## Data and reset

Study state is in `data/app.db`; private inputs and outputs are under `data/uploads/` and `data/outputs/`. Stop the server before clearing a study:

```bash
rm -rf data
npm run db:init
```

This is destructive and should only be run between studies after preserving any required research data. `data/` and `.env` are ignored by Git.

## Useful configuration

- `JOB_CONCURRENCY=1` serializes RunningHub submissions globally.
- `MAX_JOBS_PER_PARTICIPANT=30` limits study cost.
- `MAX_UPLOAD_SIZE_MB=30` matches the prototype's RunningHub upload ceiling.
- `JOB_POLL_INTERVAL_MS=10000` controls server reconciliation.
- The browser polls an active local job every 3 seconds.

## Security check

After building, search the browser bundle and DevTools network/storage views for the RunningHub API key, workflow webhook secret, and session secret. They must not appear. Participant IDs sent by a client are ignored; ownership always comes from the HTTP-only session cookie.
