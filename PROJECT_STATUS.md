# Project Status — Personal Finance App

Last updated: 2026-08-24

## Overview

Next.js 16 personal finance app that replaces mock data with authenticated
backend APIs (Auth.js + Drizzle + Supabase Postgres) and pulls real bank
transactions through Setu Account Aggregator (AA). All money is stored as
integer paise (1 INR = 100 paise); the UI divides by 100 before formatting.

---

## Implemented and Working

### Authentication & Database
- Google OAuth sign-in via Auth.js v5 with the Drizzle adapter.
- Auth.js tables in Supabase: `user`, `account`, `session`, `verificationToken`.
- Direct `drizzle({ client, schema })` instance in `lib/db/index.ts` (no proxy).
- Real Google profile images shown via `UserAvatar` / `ProfileAvatar` and `/profile`.

### Finance APIs (all Axios client-side, no mock fallback)
- `GET /api/dashboard` — safe-to-spend, month spent/budget, allocations, top goal.
- `GET /api/spending` — monthly spending by category.
- `GET /api/transactions/recent` — latest transactions.
- `GET /api/plans/current`, `POST /api/plans/update` — monthly plan + allocation editing.
- `GET /api/goals`, `POST /api/goals` — user-created goals (no seeding).
- `GET /api/insights` — spending trend, savings rate, stored insights.
- `GET /api/financial-profile`, update — income entry (paise conversion fixed).
- Pages converted to client components with loading/error/empty states:
  home, money, plan, goals, insights, profile.

### Setu AA Integration
- `lib/setu/auth.ts` — client-credentials token with 55-min cache; sends
  `client: bridge` and `x-product-instance-id` headers.
- `lib/setu/client.ts` — authenticated Axios client for all Setu calls.
- `lib/setu/consent.ts` — consent payload: purpose `102`, `PERIODIC` fetch,
  `STORE` mode, `MONTH x 30` frequency, `DEPOSIT` FI type, empty tags/context.
- `POST /api/setu/connect` — creates consent, stores handle in `setu_consents`.
- `GET /api/setu/callback` — updates consent status, redirects to
  `/money?connected=true|false`. Resolves base URL from
  `NEXT_PUBLIC_APP_URL` → `AUTH_URL` → forwarded headers (localhost bug fixed).
- `POST /api/setu/webhook` — idempotent (dedupes by `eventId`); on
  `CONSENT APPROVED` creates a data session; on session `COMPLETED/PARTIAL`
  fetches FI data.
- `lib/setu/data-session.ts` — `createDataSession`, `fetchFIData`.
- `lib/setu/normalizer.ts` — FI data → transactions (merchant extraction,
  keyword category classification, paise conversion, `setuTransactionId`
  dedupe).
- DB tables: `connected_financial_accounts`, `setu_consents`,
  `setu_data_sessions`, `setu_webhook_events`.

### Verified working end-to-end
- Local: Setu auth + consent creation succeeds.
- Production: consent approval flow works; user is redirected back to
  `/money` on the correct domain.

---

## Remaining / Broken

### High priority — data pipeline after consent
1. **No insights/transactions showing after consent.** Consent redirects to
   `/money`, but no FI data appears. Likely causes to verify, in order:
   - Webhook URL not reachable / not configured in Setu Bridge
     (must be `https://<domain>/api/setu/webhook`, not `/home`).
   - Webhook payload shape doesn't match parsing (`event.type`,
     `event.data.consentId`, `combinedStatus`) — log raw payloads.
   - Data session created but `fetchFIData` not triggered, or FI fetch
     returns non-COMPLETED status.
   - `normalizeFIData` finds no `transactions` arrays in the actual Setu
     response shape (response nesting may differ in sandbox).
   - Transactions skipped in `saveTransactions` when `setuTransactionId`
     is null (currently rows without an ID are dropped).
2. **Sandbox data range:** consent requests last 6 months; sandbox FIPs may
   only return limited dummy data.
3. **Insights content:** `/api/insights` computes trend/savings rate from
   transactions but the `insights` table is never populated — no generator
   exists yet. `items` will stay empty until one is written.

### Security — must do
4. **Rotate the Setu client secret immediately.** It was exposed in PM2 logs
   and shell history (fixed logging no longer prints request bodies).
5. Remove any remaining hardcoded secrets from `tets/.env`, `cf-worker/`
   comments, and docs; confirm secrets exist only as env vars.

### Infra / deployment
6. Azure VM outbound IP was blocked by Setu (`awselb 403`). Current prod
   path works, but document the working egress (proxy/Vercel) so it doesn't
   regress. Azure VM remains unusable for Setu calls unless Setu allowlists
   its IP.
7. Cloudflare Worker relay (`cf-worker/`) is unused — either delete it and
   its lint warning, or document why it stays.
8. Setu Bridge config to confirm:
   - Redirect URL → `https://<domain>/api/setu/callback`
   - Test + Production callback URL → `https://<domain>/api/setu/webhook`

### Features not built yet
9. Insight generation engine (rule-based from transactions/plans →
   `insights` table).
10. Goal contributions UI (table exists; only goal creation is wired).
11. Limits & notifications wiring (tables exist; no UI/emitters).
12. Consent revoke/renew flow (`revokeConsent` exists, no UI).
13. `connected_financial_accounts` population from FIP discovery.
14. Manual transaction entry UI (source `MANUAL` supported in schema).
15. Emergency fund tracking UI.

---

## Environment Variables (production)

| Variable | Value / notes |
|---|---|
| `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Auth.js |
| `AUTH_URL` | `https://<domain>` |
| `NEXT_PUBLIC_APP_URL` | `https://<domain>` — used by Setu callback redirect |
| `DATABASE_URL_POOLED` | Supabase pooler (port 6543) |
| `SETU_ENV` | `sandbox` |
| `SETU_BASE_URL` | `https://orgservice-prod.setu.co` (direct; no Worker) |
| `SETU_AUTH_URL` | `https://orgservice-prod.setu.co` |
| `SETU_CLIENT_ID` / `SETU_CLIENT_SECRET` | From Setu Bridge — **rotate** |
| `SETU_PRODUCT_INSTANCE_ID` | Sent as `x-product-instance-id` header |
| `SETU_CONNECT_REDIRECT_URL` | `https://<domain>/api/setu/callback` |
| `SETU_WEBHOOK_URL` | `https://<domain>/api/setu/webhook` |

## Next Debugging Step

Watch production logs while approving a fresh consent and confirm, in order:
webhook POST received → `setu_webhook_events` row inserted → data session
created (`setu_data_sessions`) → FI fetch returns `COMPLETED` → rows inserted
into `transactions`. The first step that doesn't happen is the bug.
