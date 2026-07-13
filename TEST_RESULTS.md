# Verification results

Verified locally on 2026-07-13 (Asia/Shanghai):

- **Build and type checks — pass.** `npm run build` compiled the React client and strict server TypeScript and produced `dist/` plus `server-dist/`.
- **Database initialization — pass.** The production server created the SQLite schema and upload/output directories in an isolated temporary data path.
- **Health endpoint — pass.** `GET /api/health` returned HTTP 200 with `database: connected`; `runningHubConfigured: false` correctly reflected intentionally absent credentials.
- **Participant session — pass.** P01 and P02 received separate HTTP-only session cookies and separate default projects.
- **Upload validation — pass.** An unsupported MIME type returned 415; an allowed test upload returned 201 and an owner-scoped asset ID.
- **Job persistence and safe missing-config failure — pass.** A submitted job returned 202/PENDING, then became FAILED with a readable configuration error without exposing a secret.
- **Idempotency — pass.** Reposting the same `clientRequestId` returned the original job ID instead of inserting or charging for another task.
- **Cross-participant isolation — pass.** P02 requesting P01's exact job ID received 404.
- **Unit tests — pass.** Node override tests cover placeholder/undefined filtering and gesture preservation in prompt composition.

Pending environment-dependent acceptance checks:

- A real PENDING → RUNNING → SUCCEEDED generation, output download, and version playback requires the researcher's RunningHub key, workflow ID, and verified node mapping.
- Public phone/computer access and inbound webhook delivery require starting cloudflared and setting its current HTTPS origin as `PUBLIC_BASE_URL`.
- Missed-webhook recovery and restart-during-generation should be exercised with a live, billable RunningHub task before the study session.
