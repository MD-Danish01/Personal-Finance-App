# Personal Finance App — Project Plan
### IBM SkillsBuild Hackathon Submission

---

## 1. Project Objective

A **Personal Financial Decision Assistant** — not just an expense tracker.

Core loop:

Plan the user's money → track reality → detect deviations → explain consequences → help the user recover and adjust


Product philosophy:

Clarity → Choice → Consequence → Correction → Growth


The app recommends; the user decides. Financial calculations are deterministic
application logic — AI explains and suggests, it never controls balances or
decides what a user is "allowed" to do.

---

## 2. Tech Stack (Decided)

| Layer | Choice | Notes |
|---|---|---|
| Frontend framework | **Next.js** | Full SSR/API routes usable — not statically exported |
| Mobile packaging | **Capacitor** | Remote-URL mode: WebView points at the live hosted deployment rather than a bundled static build. Confirmed working pattern from a separate prior project — dynamic routes and Next.js API routes function correctly in this mode. |
| Frontend hosting | **Vercel** | |
| Backend | **Express.js** | Separate service; owns all business logic and the financial engine |
| Database | **PostgreSQL via Supabase** | Hosted Postgres only — not using Supabase's PostgREST/client for business queries |
| ORM | **Drizzle** | Schema-as-code + migrations |
| Auth | **Supabase Auth** | JWT-based; verified in Express via JWKS, not via Supabase SDK calls per request |
| Bank data | **Setu AA Gateway v2** | Sandbox first; see Section 8 |

### Why these choices (for the record)

- **Supabase Auth over Clerk/custom OAuth:** same project as the DB, native UUID
  identity, one less vendor to integrate under hackathon time pressure. Clerk has
  nicer polish but adds a second identity system to sync.
- **Drizzle over raw SQL/other ORMs:** schema-as-code migrations keep the DB
  reproducible, which matters since `auth.users` (Supabase-managed) must stay
  untouched by our migrations — we only ever reference it by UUID foreign key.
- **Capacitor remote-URL mode over static export:** preserves full Next.js SSR
  and API routes. Trade-off: the app has no offline capability and needs a live
  network connection at all times — plan demo-day connectivity accordingly.

---

## 3. High-Level Architecture
                Next.js (Vercel, SSR)
                       │
            (Capacitor WebView loads
             the live hosted URL —
             not a bundled build)
                       │
                       ▼
                Express REST API
                       │
    ┌──────────────────┼──────────────────┐
    │                  │                  │
    ▼                  ▼                  ▼

Supabase Auth Finance Services AI / Insights
(JWT verify only) │
┌───────┼───────┐
▼ ▼ ▼
Plan Transaction Goals
Engine Service Service
│ │ │
└───────┼────────┘
▼
Financial Engine
(Safe-to-Spend, Plan vs
Actual, Warnings, Recovery,
Simulation — all deterministic)
│
▼
Postgres (Supabase) via Drizzle


### Architectural separation (non-negotiable)

CRUD / Data Layer + Financial Business Logic + AI Explanation Layer


- **Data layer:** users (via Supabase), plans, transactions, goals, limits,
  emergency fund, notifications, insights.
- **Financial engine:** plan allocations, plan vs actual, safe-to-spend, goal
  progress, emergency progress, savings shortfall, recovery, purchase impact —
  all deterministic app code, unit-testable independent of any AI call.
- **AI layer:** Find → Explain → Suggest. Never mutates balances, never
  invents transaction data, never replaces the deterministic engine.

---

## 4. Mobile Packaging (Capacitor)

- WebView loads the live hosted deployment directly (remote-URL mode) —
  dynamic routes and Next.js API routes work exactly as on web, confirmed
  working in a prior test project.
- **App store review risk:** a pure URL-wrapper app can be flagged under
  Apple's Minimum Functionality guideline. Plan to add at least a few real
  Capacitor native plugins (push notifications, biometric app-lock, receipt
  camera capture, haptics) if a real store listing is targeted — not required
  for a sideloaded hackathon-demo APK.
- **No offline mode** — every screen requires live connectivity. Have a
  demo-day network fallback (hotspot) ready.
- Setu's AA consent redirect can point to a normal in-app route
  (`/accounts/setu/callback`) since the WebView is just the live domain — no
  custom URL scheme needed. Open the Setu consent screen itself via
  Capacitor's in-app `Browser` plugin rather than the main WebView, so the
  user isn't disoriented mid-consent.

---

## 5. Auth (Supabase Auth)

- Supabase manages `auth.users` — our schema never redefines or migrates it,
  only references its UUID as a foreign key.
- Express verifies JWTs locally via JWKS (or the shared HS256 secret,
  depending on project signing config) — no per-request call to Supabase's
  Auth API.
- `payload.sub` (the Supabase user UUID) becomes `req.userId` for all
  downstream queries.

```typescript
import { jwtVerify, createRemoteJWKSet } from 'jose';

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
);

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const { payload } = await jwtVerify(token, JWKS);
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

---

## 6. Database (Supabase Postgres + Drizzle)

Two connection strings, used for different purposes:

```env
DATABASE_URL=postgres://...:5432/postgres                        # direct — Drizzle Kit migrations
DATABASE_URL_POOLED=postgres://...:6543/postgres?pgbouncer=true  # pooled — Express runtime queries
```

Core tables (full modeling is the next step in this project):

financial_profiles, plans, plan_allocations, transactions, goals,
goal_contributions, limits, emergency_funds, notifications, insights,
connected_financial_accounts, setu_consents, setu_data_sessions,
setu_webhook_events


`user_id` columns reference the Supabase `auth.users` UUID directly — no
local `users` table duplicating Supabase's.

---

## 7. MVP Scope

### In scope
1. Auth (Supabase)
2. Financial profile / income setup
3. Essential expenses, savings target, enjoyment budget, emergency fund, buffer
4. Personalized plan generation (recommend → user edits → active)
5. Manual transaction entry
6. Safe-to-Spend calculation
7. Plan vs Actual
8. Spending limits & warnings
9. Savings recovery options
10. Goals with progress tracking
11. Basic charts
12. "Why this number" explanations
13. Basic AI-generated insights

### Deferred (not first MVP)
- Stock trading / investment execution
- Loan or insurance marketplace
- Complex AI chatbot
- Social feed, family mode, heavy gamification
- Setu Auto-Fetch, multi-AA routing, non-DEPOSIT FI types

---

## 8. Bank Data Integration (Setu AA Gateway v2)

- Setu is a **data provider**, not the business-logic engine — all financial
  calculations remain deterministic app code regardless of transaction source.
- MVP FI type: `DEPOSIT` only. `fetchType: ONETIME`.
- Internal abstraction: a `FinancialDataProvider` interface, with
  `SetuFinancialDataProvider` as one implementation — keeps the finance engine
  decoupled from Setu specifically.
- Full flow: Create Consent → user approves in Setu's hosted consent screen →
  consent webhook → Create Data Session → FI-data-ready webhook → fetch FI
  data → normalize → store transactions → recalculate financial state.
- Webhook handling must be idempotent (dedupe table:
  `setu_webhook_events`) — duplicate notifications must never create
  duplicate transactions, sessions, or account connections.
- Secrets (`SETU_CLIENT_SECRET`, etc.) are server-side only, never exposed to
  Next.js browser code or Capacitor's WebView context.
- **Hackathon demo strategy:** build the manual-transaction path as the
  reliable core demo. Build Setu through Create Consent (visually provable,
  opens the real sandbox consent screen). Consider mocking the data
  session/fetch response with realistic sandbox-shaped JSON so Plan vs
  Actual / Safe-to-Spend / Goals visibly update live — this proves the
  provider-agnostic architecture without depending on a live webhook + tunnel
  round-trip during the demo itself (a real flake risk on venue wifi).

---

## 9. Key Business Rules

1. **User owns the final plan** — a recommended plan is never a forced plan.
2. **Enjoyment spending is allowed** — the app doesn't treat all discretionary
   spending as a failure.
3. **Essential expenses are protected** — recovery plans never sacrifice
   essentials to hit a savings target.
4. **Warnings must be meaningful** — no notification spam for small deviations.
5. **Financial math is deterministic** — normal app logic, not AI, computes
   money.
6. **AI explains, it does not control** — never the source of truth for
   balances or calculations.

---

## 10. Open Decisions

- [ ] Final project name / domain
- [ ] Exact Setu consent field values (`purpose.code`, `dataRange`,
      `consentDuration`, etc.) — to be finalized against actual Setu product
      config, not invented
- [ ] Whether an IBM watsonx/Granite model is used for the AI Insights layer
      (relevant for SkillsBuild judging criteria)
- [ ] Scope cut line for hackathon deadline vs. full MVP checklist (Section 7)

Want me to also add a "Definition of Done for Hackathon Demo" section (a trimmed subset of the full MVP checklist scoped to what's realistically buildable in your remaining time), or move straight to database schema/data modeling next?

write documentation in markdown file

Thought for 8s
markdown
# Personal Finance App — Project Plan
### IBM SkillsBuild Hackathon Submission

---

## 1. Project Objective

A **Personal Financial Decision Assistant** — not just an expense tracker.

Core loop:

Plan the user's money → track reality → detect deviations → explain consequences → help the user recover and adjust


Product philosophy:

Clarity → Choice → Consequence → Correction → Growth


The app recommends; the user decides. Financial calculations are deterministic
application logic — AI explains and suggests, it never controls balances or
decides what a user is "allowed" to do.

---

## 2. Tech Stack (Decided)

| Layer | Choice | Notes |
|---|---|---|
| Frontend framework | **Next.js** | Full SSR/API routes usable — not statically exported |
| Mobile packaging | **Capacitor** | Remote-URL mode: WebView points at the live hosted deployment rather than a bundled static build. Confirmed working pattern from a separate prior project — dynamic routes and Next.js API routes function correctly in this mode. |
| Frontend hosting | **Vercel** | |
| Backend | **Express.js** | Separate service; owns all business logic and the financial engine |
| Database | **PostgreSQL via Supabase** | Hosted Postgres only — not using Supabase's PostgREST/client for business queries |
| ORM | **Drizzle** | Schema-as-code + migrations |
| Auth | **Supabase Auth** | JWT-based; verified in Express via JWKS, not via Supabase SDK calls per request |
| Bank data | **Setu AA Gateway v2** | Sandbox first; see Section 8 |

### Why these choices (for the record)

- **Supabase Auth over Clerk/custom OAuth:** same project as the DB, native UUID
  identity, one less vendor to integrate under hackathon time pressure. Clerk has
  nicer polish but adds a second identity system to sync.
- **Drizzle over raw SQL/other ORMs:** schema-as-code migrations keep the DB
  reproducible, which matters since `auth.users` (Supabase-managed) must stay
  untouched by our migrations — we only ever reference it by UUID foreign key.
- **Capacitor remote-URL mode over static export:** preserves full Next.js SSR
  and API routes. Trade-off: the app has no offline capability and needs a live
  network connection at all times — plan demo-day connectivity accordingly.

---

## 3. High-Level Architecture
                Next.js (Vercel, SSR)
                       │
            (Capacitor WebView loads
             the live hosted URL —
             not a bundled build)
                       │
                       ▼
                Express REST API
                       │
    ┌──────────────────┼──────────────────┐
    │                  │                  │
    ▼                  ▼                  ▼

Supabase Auth Finance Services AI / Insights
(JWT verify only) │
┌───────┼───────┐
▼ ▼ ▼
Plan Transaction Goals
Engine Service Service
│ │ │
└───────┼────────┘
▼
Financial Engine
(Safe-to-Spend, Plan vs
Actual, Warnings, Recovery,
Simulation — all deterministic)
│
▼
Postgres (Supabase) via Drizzle


### Architectural separation (non-negotiable)

CRUD / Data Layer + Financial Business Logic + AI Explanation Layer


- **Data layer:** users (via Supabase), plans, transactions, goals, limits,
  emergency fund, notifications, insights.
- **Financial engine:** plan allocations, plan vs actual, safe-to-spend, goal
  progress, emergency progress, savings shortfall, recovery, purchase impact —
  all deterministic app code, unit-testable independent of any AI call.
- **AI layer:** Find → Explain → Suggest. Never mutates balances, never
  invents transaction data, never replaces the deterministic engine.

---

## 4. Mobile Packaging (Capacitor)

- WebView loads the live hosted deployment directly (remote-URL mode) —
  dynamic routes and Next.js API routes work exactly as on web, confirmed
  working in a prior test project.
- **App store review risk:** a pure URL-wrapper app can be flagged under
  Apple's Minimum Functionality guideline. Plan to add at least a few real
  Capacitor native plugins (push notifications, biometric app-lock, receipt
  camera capture, haptics) if a real store listing is targeted — not required
  for a sideloaded hackathon-demo APK.
- **No offline mode** — every screen requires live connectivity. Have a
  demo-day network fallback (hotspot) ready.
- Setu's AA consent redirect can point to a normal in-app route
  (`/accounts/setu/callback`) since the WebView is just the live domain — no
  custom URL scheme needed. Open the Setu consent screen itself via
  Capacitor's in-app `Browser` plugin rather than the main WebView, so the
  user isn't disoriented mid-consent.

---

## 5. Auth (Supabase Auth)

- Supabase manages `auth.users` — our schema never redefines or migrates it,
  only references its UUID as a foreign key.
- Express verifies JWTs locally via JWKS (or the shared HS256 secret,
  depending on project signing config) — no per-request call to Supabase's
  Auth API.
- `payload.sub` (the Supabase user UUID) becomes `req.userId` for all
  downstream queries.

```typescript
import { jwtVerify, createRemoteJWKSet } from 'jose';

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
);

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const { payload } = await jwtVerify(token, JWKS);
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

---

## 6. Database (Supabase Postgres + Drizzle)

Two connection strings, used for different purposes:

```env
DATABASE_URL=postgres://...:5432/postgres                        # direct — Drizzle Kit migrations
DATABASE_URL_POOLED=postgres://...:6543/postgres?pgbouncer=true  # pooled — Express runtime queries
```

Core tables (full modeling is the next step in this project):

financial_profiles, plans, plan_allocations, transactions, goals,
goal_contributions, limits, emergency_funds, notifications, insights,
connected_financial_accounts, setu_consents, setu_data_sessions,
setu_webhook_events


`user_id` columns reference the Supabase `auth.users` UUID directly — no
local `users` table duplicating Supabase's.

---

## 7. MVP Scope

### In scope
1. Auth (Supabase)
2. Financial profile / income setup
3. Essential expenses, savings target, enjoyment budget, emergency fund, buffer
4. Personalized plan generation (recommend → user edits → active)
5. Manual transaction entry
6. Safe-to-Spend calculation
7. Plan vs Actual
8. Spending limits & warnings
9. Savings recovery options
10. Goals with progress tracking
11. Basic charts
12. "Why this number" explanations
13. Basic AI-generated insights

### Deferred (not first MVP)
- Stock trading / investment execution
- Loan or insurance marketplace
- Complex AI chatbot
- Social feed, family mode, heavy gamification
- Setu Auto-Fetch, multi-AA routing, non-DEPOSIT FI types

---

## 8. Bank Data Integration (Setu AA Gateway v2)

- Setu is a **data provider**, not the business-logic engine — all financial
  calculations remain deterministic app code regardless of transaction source.
- MVP FI type: `DEPOSIT` only. `fetchType: ONETIME`.
- Internal abstraction: a `FinancialDataProvider` interface, with
  `SetuFinancialDataProvider` as one implementation — keeps the finance engine
  decoupled from Setu specifically.
- Full flow: Create Consent → user approves in Setu's hosted consent screen →
  consent webhook → Create Data Session → FI-data-ready webhook → fetch FI
  data → normalize → store transactions → recalculate financial state.
- Webhook handling must be idempotent (dedupe table: `setu_webhook_events`) —
  duplicate notifications must never create duplicate transactions, sessions,
  or account connections.
- Secrets (`SETU_CLIENT_SECRET`, etc.) are server-side only, never exposed to
  Next.js browser code or Capacitor's WebView context.
- **Hackathon demo strategy:** build the manual-transaction path as the
  reliable core demo. Build Setu through Create Consent (visually provable,
  opens the real sandbox consent screen). Consider mocking the data
  session/fetch response with realistic sandbox-shaped JSON so Plan vs
  Actual / Safe-to-Spend / Goals visibly update live — this proves the
  provider-agnostic architecture without depending on a live webhook + tunnel
  round-trip during the demo itself (a real flake risk on venue wifi).

---

## 9. Key Business Rules

1. **User owns the final plan** — a recommended plan is never a forced plan.
2. **Enjoyment spending is allowed** — the app doesn't treat all discretionary
   spending as a failure.
3. **Essential expenses are protected** — recovery plans never sacrifice
   essentials to hit a savings target.
4. **Warnings must be meaningful** — no notification spam for small deviations.
5. **Financial math is deterministic** — normal app logic, not AI, computes
   money.
6. **AI explains, it does not control** — never the source of truth for
   balances or calculations.

---

## 10. Open Decisions

- [ ] Final project name / domain
- [ ] Exact Setu consent field values (`purpose.code`, `dataRange`,
      `consentDuration`, etc.) — to be finalized against actual Setu product
      config, not invented
- [ ] Whether an IBM watsonx/Granite model is used for the AI Insights layer
      (relevant for SkillsBuild judging criteria)
- [ ] Scope cut line for hackathon deadline vs. full MVP checklist (Section 7)