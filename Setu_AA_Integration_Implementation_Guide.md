# Setu Account Aggregator (AA) Integration Guide
## Personal Finance App — Engineering Implementation Documentation

**Document purpose:** This document is the implementation guide for the development team integrating Setu's **AA Gateway v2** into the Personal Finance App.

**Primary goal:** Allow a user to connect supported financial accounts through the Account Aggregator ecosystem, provide explicit consent, fetch consented financial information, normalize bank transactions, and feed those transactions into the application's existing financial engine.

**Source of truth:** Setu AA Gateway v2 documentation reviewed on 18 August 2026.

> **Important:** This guide uses Setu's current AA Gateway v2 documentation. Do not copy endpoint names or payloads from old v1 tutorials unless explicitly marked as v1.

---

# 1. What We Are Building

The Personal Finance App needs transaction data to power:

- Expense tracking
- Spending category analysis
- Plan vs Actual
- Safe-to-Spend
- Goals
- Savings recovery
- Warnings
- Financial insights

The AA integration is therefore a **transaction-data ingestion layer**, not the financial engine itself.

```text
                    PERSONAL FINANCE APP

                        Frontend
                           |
                           v
                   Application Backend
                           |
             +-------------+-------------+
             |                           |
             v                           v
       Manual Expense               Setu AA Service
                                         |
                                         v
                                  Consent Flow
                                         |
                                         v
                                    User Approval
                                         |
                                         v
                                    Data Session
                                         |
                                         v
                                   Financial Data
                                         |
                                         v
                              Transaction Normalizer
                                         |
                                         v
                                   PostgreSQL
                                         |
                         +---------------+---------------+
                         |               |               |
                         v               v               v
                     Plan vs         Safe-to-        Insights
                      Actual           Spend
```

Setu describes AA integration in three broad flows: **Consent**, **Data Fetch**, and **Notifications**. Financial data should only be fetched after the customer has approved the consent.

Source: https://docs.setu.co/data/account-aggregator/api-integration

---

# 2. AA Terminology

| Term | Meaning in this project |
|---|---|
| AA | Account Aggregator. Licensed entity that presents financial-data consent requests to customers and manages approval/rejection. |
| FIU | Financial Information User. Our application/business requesting financial information. |
| FIP | Financial Information Provider. Bank or other institution holding financial information. |
| FI | Financial Information. The user's financial data being requested. |
| FI Type | Type of financial information, such as `DEPOSIT`, `MUTUAL_FUNDS`, etc. |
| Consent Object | The request describing what data we want, why we want it, how long it may be used, and related constraints. |
| Product Instance ID | Setu identifier for our configured FIU product. |
| VUA | Virtual User Address used in the AA ecosystem to identify the user's AA account. |
| Data Session | A request/session used to prepare and fetch financial data for an approved consent. |

Sources:
- https://docs.setu.co/data/account-aggregator/overview
- https://docs.setu.co/data/account-aggregator/quickstart

---

# 3. Scope of This Integration

## MVP

```text
Connect account
    ↓
Create consent
    ↓
Open Setu consent screen
    ↓
User approves/rejects
    ↓
Receive consent notification
    ↓
Create data session
    ↓
Receive FI data-ready notification
    ↓
Fetch FI data
    ↓
Parse transactions
    ↓
Normalize transactions
    ↓
Store transactions
    ↓
Recalculate financial state
```

## Not in the first integration

Do not start with:

- Investment data unless required by the product.
- Multiple FI types that the app does not use.
- Multi-AA routing unless explicitly enabled for the product.
- Auto-Fetch unless the product team decides to use it.
- Recurring consents before the one-time flow works correctly.

For the Personal Finance MVP, the first FI type should normally be:

```text
DEPOSIT
```

because the core use case is bank-account transaction data.

---

# 4. Setu Sandbox Setup

## 4.1 Create the FIU product

Create/configure the FIU product in Setu Bridge.

Setu's current quickstart says the product configuration includes:

- FIU details
- Consent configuration
- Branding/theme for Setu's consent screens
- Account discovery configuration
- Account selection conditions
- Notification endpoint
- Optional developer features such as Partial Fetch and Auto-Fetch

Once configured, sandbox credentials are available.

Source:
https://docs.setu.co/data/account-aggregator/quickstart

## 4.2 Credentials

The application will receive:

```text
SETU_CLIENT_ID
SETU_CLIENT_SECRET
SETU_PRODUCT_INSTANCE_ID
```

These are **server-side secrets/credentials**.

Never expose:

```text
SETU_CLIENT_SECRET
```

in browser JavaScript, React/Vue source, mobile client code, or public repositories.

---

# 5. Environment Configuration

Example:

```env
SETU_ENV=sandbox

SETU_BASE_URL=https://fiu-sandbox.setu.co
SETU_AUTH_URL=https://orgservice-prod.setu.co

SETU_CLIENT_ID=your_client_id
SETU_CLIENT_SECRET=your_client_secret
SETU_PRODUCT_INSTANCE_ID=your_product_instance_id

SETU_CONNECT_REDIRECT_URL=https://your-app.example.com/accounts/setu/callback
SETU_WEBHOOK_URL=https://your-api.example.com/api/v1/setu/webhook
```

Do not commit `.env`.

```gitignore
.env
.env.*
!.env.example
```

Create an `.env.example` containing only placeholders:

```env
SETU_ENV=sandbox
SETU_BASE_URL=
SETU_AUTH_URL=
SETU_CLIENT_ID=
SETU_CLIENT_SECRET=
SETU_PRODUCT_INSTANCE_ID=
SETU_CONNECT_REDIRECT_URL=
SETU_WEBHOOK_URL=
```

---

# 6. Authentication

## 6.1 Access token flow

The Setu AA API uses an access token for authenticated FIU API calls.

The supplied Setu API reference documents:

```http
POST https://orgservice-prod.setu.co/v1/users/login
```

Headers:

```http
client: bridge
Content-Type: application/json
```

Body:

```json
{
  "clientID": "<CLIENT_ID>",
  "grant_type": "client_credentials",
  "secret": "<CLIENT_SECRET>"
}
```

Response:

```json
{
  "access_token": "<ACCESS_TOKEN>",
  "refresh_token": ""
}
```

Source:
https://docs.setu.co/api/data/account-aggregator

## 6.2 Axios implementation

```js
import axios from "axios";

export async function getSetuAccessToken() {
  const response = await axios.post(
    `${process.env.SETU_AUTH_URL}/v1/users/login`,
    {
      clientID: process.env.SETU_CLIENT_ID,
      grant_type: "client_credentials",
      secret: process.env.SETU_CLIENT_SECRET
    },
    {
      headers: {
        client: "bridge",
        "Content-Type": "application/json"
      }
    }
  );

  if (!response.data?.access_token) {
    throw new Error("Setu access token was not returned");
  }

  return response.data.access_token;
}
```

## 6.3 Token caching

Do not request a new token for every business API call.

Create a token service:

```text
getAccessToken()
    |
    +-- cached token valid?
    |       |
    |       +-- yes -> return cached token
    |
    +-- no -> login API
               |
               +-- save token + expiry
               |
               +-- return token
```

Cache the token and re-authenticate when it expires.

---

# 7. Setu HTTP Client

All authenticated Setu AA Gateway APIs should use a shared HTTP client.

```js
import axios from "axios";
import { getSetuAccessToken } from "./setuAuth.js";

const setuClient = axios.create({
  baseURL: process.env.SETU_BASE_URL,
  timeout: 15000
});

setuClient.interceptors.request.use(async (config) => {
  const token = await getSetuAccessToken();

  config.headers.Authorization = `Bearer ${token}`;
  config.headers["x-product-instance-id"] =
    process.env.SETU_PRODUCT_INSTANCE_ID;

  return config;
});

export default setuClient;
```

Setu's consent and account-availability APIs require:

```http
Authorization: Bearer <access_token>
x-product-instance-id: <product_instance_id>
```

Source:
https://docs.setu.co/data/account-aggregator/api-integration

---

# 8. FIP Discovery

## Endpoint

```http
GET /v2/fips
```

Full sandbox URL:

```text
https://fiu-sandbox.setu.co/v2/fips
```

Setu describes this API as the current Active FIP List API. It can be used to discover active FIPs and their supported FI types. The response also contains performance metrics.

Source:
https://docs.setu.co/data/account-aggregator/api-integration/fip-apis

## Example

```js
export async function getActiveFips() {
  const response = await setuClient.get("/v2/fips", {
    params: {
      status: "ACTIVE"
    }
  });

  return response.data;
}
```

Example response:

```json
{
  "data": [
    {
      "name": "Axis Bank",
      "fipId": "AXIS001",
      "fiTypes": ["DEPOSIT"],
      "institutionType": "BANK",
      "status": "ACTIVE"
    }
  ]
}
```

## Important

Use the Active FIPs endpoint close to consent creation rather than maintaining a permanently hard-coded bank list.

Setu's current documentation says the Active FIP API dynamically activates/deactivates FIPs based on performance and can provide current status and health metrics.

---

# 9. Optional: Account Availability Check

Setu provides:

```http
POST /v2/account-availability
```

This can check whether accounts exist across available AAs using the customer's mobile number.

Example:

```json
{
  "mobileNumber": "9999999999"
}
```

Response can contain:

```json
{
  "accounts": [
    {
      "aa": "onemoney",
      "vua": "9999999999@onemoney",
      "status": true
    },
    {
      "aa": "setu-aa",
      "vua": "9999999999@setu",
      "status": false
    }
  ],
  "traceId": "..."
}
```

Source:
https://docs.setu.co/data/account-aggregator/api-integration/account-availability-apis

### Product decision

For the first MVP, this endpoint is optional. The main consent flow can be implemented first.

---

# 10. Consent Flow

```text
User clicks:
"Connect Bank Account"
        |
        v
Backend creates consent
        |
        v
Setu returns consent ID + URL
        |
        v
Frontend opens Setu URL
        |
        v
User logs in/registers with AA
        |
        v
User discovers/selects accounts
        |
        v
User reviews consent
        |
        +------> Reject
        |
        +------> Approve
                    |
                    v
              Setu notifies FIU
```

Setu's documentation states that the `url` from Create Consent is used to open the consent manager screens, which handle account linking and approval/rejection.

Source:
https://docs.setu.co/data/account-aggregator/embed-setu-aa

---

# 11. Create Consent API

## Endpoint

```http
POST /v2/consents
```

Sandbox:

```text
https://fiu-sandbox.setu.co/v2/consents
```

Headers:

```http
Authorization: Bearer <ACCESS_TOKEN>
x-product-instance-id: <PRODUCT_INSTANCE_ID>
Content-Type: application/json
```

Source:
https://docs.setu.co/api/data/account-aggregator

## Important Consent Fields

Important fields include:

```text
vua
consentDuration
fetchType
consentTypes
fiTypes
dataRange
consentMode
dataLife
purpose
redirectUrl
```

Additional fields include:

```text
frequency
dataFilter
context
additionalParams
enableAdditionalPhoneNumber
consentDateRange
```

Source:
https://docs.setu.co/data/account-aggregator/consent-object

---

# 12. Consent Recommendation for Personal Finance MVP

The initial use case is transaction tracking.

Recommended conceptual configuration:

```json
{
  "fetchType": "ONETIME",
  "consentTypes": [
    "PROFILE",
    "SUMMARY",
    "TRANSACTIONS"
  ],
  "fiTypes": [
    "DEPOSIT"
  ],
  "consentMode": "VIEW"
}
```

The exact values for:

```text
vua
purpose.code
purpose.text
dataRange
consentDuration
dataLife
consentDateRange
frequency
```

must be finalized against the Setu product configuration and current API validation rules.

Do not invent these values in production.

---

# 13. Consent Service

Create:

```text
services/setu/setuConsent.service.js
```

Example structure:

```js
import setuClient from "./setuClient.js";

export async function createConsent(payload) {
  const response = await setuClient.post(
    "/v2/consents",
    payload
  );

  return response.data;
}

export async function getConsent(requestId) {
  const response = await setuClient.get(
    `/v2/consents/${encodeURIComponent(requestId)}`
  );

  return response.data;
}

export async function revokeConsent(requestId) {
  const response = await setuClient.post(
    `/v2/consents/${encodeURIComponent(requestId)}/revoke`
  );

  return response.data;
}
```

---

# 14. Application API for Starting Connection

The frontend should **never call Setu directly with application secrets**.

Our API should expose:

```http
POST /api/v1/financial-accounts/connect
```

Flow:

```text
Frontend
   |
   | POST /financial-accounts/connect
   v
Backend
   |
   +-- Build consent object
   |
   +-- POST /v2/consents
   |
   v
Setu
   |
   v
consent response
   |
   +-- id
   +-- url
   +-- status
   |
   v
Backend
   |
   v
Frontend
```

Response:

```json
{
  "success": true,
  "consentId": "<SETU_CONSENT_ID>",
  "consentUrl": "<SETU_CONSENT_URL>",
  "status": "PENDING"
}
```

---

# 15. Redirect / Consent Completion

Setu returns a consent manager URL.

The URL can be redirected to or embedded in an appropriate web/mobile experience.

Setu's current embedding documentation says the Create Consent request accepts a `redirectUrl`, and after approval/rejection Setu redirects the user back to that application URL with query parameters including success information.

Source:
https://docs.setu.co/data/account-aggregator/embed-setu-aa

Example application callback:

```text
GET /api/v1/financial-accounts/setu/callback
```

The callback is for user-navigation UX. It should not be treated as the only source of truth for financial data availability. The authoritative state should also be maintained using Setu notifications and/or the consent status/data-session APIs.

---

# 16. Consent Status

Endpoint:

```http
GET /v2/consents/{request_id}
```

Headers:

```http
Authorization: Bearer <ACCESS_TOKEN>
x-product-instance-id: <PRODUCT_INSTANCE_ID>
```

Use this to query the current consent request state.

Source:
https://docs.setu.co/api/data/account-aggregator

### Recommended internal states

Map Setu status to our internal connection state:

```text
PENDING
APPROVED / READY
REJECTED
REVOKED
FAILED
```

Always map from the current Setu API response rather than assuming an old status vocabulary.

---

# 17. Notifications / Webhooks

A production-quality integration must implement a webhook endpoint.

Setu's documentation states that notifications cover:

1. Consent events — user actions such as approval/rejection.
2. FI events — updates from FIPs for a data session.

Source:
https://docs.setu.co/data/account-aggregator/api-integration/notifications

## Backend endpoint

```http
POST /api/v1/setu/webhook
```

Set this endpoint in the Setu Bridge product configuration.

---

# 18. Webhook Architecture

```text
Setu
  |
  | POST webhook
  v
/api/v1/setu/webhook
  |
  +-- Validate request
  |
  +-- Identify event type
  |
  +-- Persist event/idempotency information
  |
  +-- Update consent/data-session state
  |
  +-- Trigger data-fetch workflow if required
  |
  v
Application DB
```

## Important

Webhook processing must be **idempotent**.

The same logical notification must not result in:

```text
duplicate transaction import
duplicate data session
duplicate account connection
```

Create a webhook/event table:

```text
setu_webhook_events
- id
- event_id / trace identifier where available
- event_type
- payload
- received_at
- processed_at
- processing_status
```

---

# 19. Consent Notification Handling

The Setu notification documentation lists consent outcomes including:

```text
UserRejected
reject_not_want_to_share
reject_accounts_not_found
reject_other
NoFIPAccountsDiscovered
FIPDenied
```

Setu also notes that cancelling before login can leave the consent in `PENDING` and allow the same link to be reused.

Source:
https://docs.setu.co/data/account-aggregator/api-integration/notifications

### Handler

```pseudo
function handleConsentNotification(event):

    consentId = extractConsentId(event)

    if event indicates approval:
        mark consent APPROVED
        continue normal data-fetch flow

    if event indicates rejection:
        mark consent REJECTED
        notify application/user

    if event indicates no accounts:
        mark connection NO_ACCOUNTS
        ask user to retry or use another source

    if event indicates FIP denial:
        mark connection FIP_DENIED
```

---

# 20. Data Fetch Flow

Financial data should be fetched **only after an approved consent**.

Setu's current data-flow documentation specifies:

```text
APPROVED consent
      |
      v
Create Data Session
      |
      v
Setu/FIP prepares data
      |
      v
FI notification
      |
      v
When PARTIAL or COMPLETED
      |
      v
Fetch FI data
```

Source:
https://docs.setu.co/data/account-aggregator/api-integration/data-apis

---

# 21. Create Data Session

## Endpoint

```http
POST /v2/sessions
```

Body:

```json
{
  "consentId": "<APPROVED_CONSENT_ID>",
  "dataRange": {
    "from": "<START_DATETIME>",
    "to": "<END_DATETIME>"
  },
  "format": "json"
}
```

Setu requires the requested data range to match or remain within the FI data range allowed by the consent.

Source:
https://docs.setu.co/data/account-aggregator/api-integration/data-apis

## Response

Conceptually:

```json
{
  "format": "json",
  "fips": null,
  "dataRange": {
    "from": "...",
    "to": "..."
  },
  "id": "<DATA_SESSION_ID>",
  "status": "PENDING",
  "consentId": "<CONSENT_ID>",
  "traceId": "<TRACE_ID>"
}
```

---

# 22. Data Session Service

```js
import setuClient from "./setuClient.js";

export async function createDataSession({
  consentId,
  from,
  to,
  format = "json"
}) {
  const response = await setuClient.post(
    "/v2/sessions",
    {
      consentId,
      dataRange: {
        from,
        to
      },
      format
    }
  );

  return response.data;
}

export async function getDataSession(sessionId) {
  const response = await setuClient.get(
    `/v2/sessions/${encodeURIComponent(sessionId)}`
  );

  return response.data;
}
```

---

# 23. FI Data Notification

Setu sends an FI notification when the FIP has a status update for the data session.

Setu documents these individual-account statuses:

```text
PENDING
READY
DELIVERED
TIMEOUT
DENIED
```

and combined session statuses:

```text
PENDING
PARTIAL
COMPLETED
```

Source:
https://docs.setu.co/data/account-aggregator/api-integration/data-apis

### Application rule

```pseudo
if combinedStatus == "PENDING":
    wait

if combinedStatus == "PARTIAL":
    fetch currently READY data

if combinedStatus == "COMPLETED":
    fetch all available data

if accountStatus == "TIMEOUT":
    record failed account and continue where appropriate

if accountStatus == "DENIED":
    record denied account and do not treat as a successful fetch
```

---

# 24. Fetch FI Data

## Endpoint

```http
GET /v2/sessions/{session_id}
```

When data is available, the response contains the requested financial information.

Setu's data-flow documentation states that when the combined data-session status is `PARTIAL` or `COMPLETED`, FI data can be fetched.

Source:
https://docs.setu.co/data/account-aggregator/api-integration/data-apis

---

# 25. Data Parsing Strategy

Do not store the raw Setu response directly as the application's transaction table.

Use this pipeline:

```text
Setu FI Data
      |
      v
Raw Adapter
      |
      v
Financial Data Parser
      |
      v
Normalized Transaction
      |
      v
Transaction Validator
      |
      v
Database
```

---

# 26. Internal Transaction Model

Recommended model:

```text
transactions
-------------
id
user_id

amount
currency

type
category

merchant
description

transaction_date

source
source_provider
source_account_id
source_transaction_id

raw_reference

created_at
updated_at
```

Recommended values:

```text
source:
MANUAL
ACCOUNT_AGGREGATOR

source_provider:
SETU
```

Do not make the rest of the finance engine depend on Setu-specific fields.

---

# 27. Transaction Normalization

Example Setu/raw transaction:

```text
UPI-SWIGGY-...
DEBIT
320
2026-08-17
```

Normalize to:

```json
{
  "userId": "user_123",
  "amount": 320,
  "currency": "INR",
  "type": "EXPENSE",
  "merchant": "Swiggy",
  "category": "Food",
  "description": "UPI-SWIGGY",
  "transactionDate": "2026-08-17",
  "source": "ACCOUNT_AGGREGATOR",
  "sourceProvider": "SETU",
  "sourceTransactionId": "..."
}
```

---

# 28. Merchant Categorization

The first implementation should use deterministic rules.

```pseudo
function classifyMerchant(description):

    text = lowercase(description)

    if text contains "swiggy" or "zomato":
        return "Food"

    if text contains "uber" or "ola":
        return "Transport"

    if text contains "amazon" or "myntra":
        return "Shopping"

    if text contains "netflix" or "spotify":
        return "Entertainment"

    if text contains "airtel" or "electricity":
        return "Bills"

    return "Others"
```

Later:

```text
Unknown merchant
      |
      v
ML / LLM classifier
      |
      v
Human-confirmed mapping
      |
      v
Merchant category dictionary
```

AI is an enhancement, not the source of truth for money amounts.

---

# 29. Duplicate Prevention

Automatic bank syncing can encounter the same transaction more than once.

Use:

```text
source_provider
+
source_account_id
+
source_transaction_id
```

as a preferred idempotency key where available.

Fallback matching by amount/date/merchant should be used carefully because two legitimate transactions can share those values.

Recommended database constraint where the external transaction ID is stable:

```text
UNIQUE(
    source_provider,
    source_account_id,
    source_transaction_id
)
```

---

# 30. Financial Engine Integration

After transactions are normalized and saved:

```text
New transaction
      |
      v
Transaction Service
      |
      v
Financial State Recalculation
      |
      +--> Plan vs Actual
      |
      +--> Safe-to-Spend
      |
      +--> Goal Progress
      |
      +--> Savings Risk
      |
      +--> Warnings
      |
      +--> Insights
```

Example:

```pseudo
function processImportedTransactions(userId, rawFIData):

    normalized = normalizeFIData(rawFIData)

    valid = validateTransactions(normalized)

    inserted = saveNewTransactions(valid)

    if inserted.count > 0:
        recalculateFinancialState(userId)

    return inserted
```

---

# 31. Complete User Flow

```text
USER
 |
 | Click "Connect Bank Account"
 v
BACKEND
 |
 | Get/refresh Setu access token
 |
 | Build consent object
 |
 | POST /v2/consents
 v
SETU
 |
 | Return consent URL
 v
BACKEND
 |
 | Return consent URL
 v
FRONTEND
 |
 | Open Setu consent screen
 v
SETU CONSENT MANAGER
 |
 | User logs in
 | User discovers accounts
 | User selects accounts
 | User reviews consent
 | User approves/rejects
 v
SETU
 |
 +-------> Consent notification
 |             |
 |             v
 |         YOUR WEBHOOK
 |
 v
Approved consent
 |
 | POST /v2/sessions
 v
SETU
 |
 | Prepare data at linked FIPs
 |
 +-------> FI_DATA_READY webhook
 |
 v
YOUR BACKEND
 |
 | GET /v2/sessions/{id}
 v
SETU
 |
 v
FINANCIAL DATA
 |
 v
PARSER
 |
 v
NORMALIZER
 |
 v
TRANSACTIONS DB
 |
 v
FINANCIAL ENGINE
 |
 +--> Plan vs Actual
 +--> Safe-to-Spend
 +--> Goals
 +--> Warnings
 +--> Insights
 |
 v
FRONTEND
```

---

# 32. Backend Module Structure

Recommended Node.js architecture:

```text
src/
├── config/
│   └── env.js
│
├── modules/
│   ├── auth/
│   ├── users/
│   ├── transactions/
│   ├── financial-accounts/
│   ├── plans/
│   ├── goals/
│   └── insights/
│
├── integrations/
│   └── setu/
│       ├── setuClient.js
│       ├── setuAuth.js
│       ├── setuFips.js
│       ├── setuConsent.js
│       ├── setuDataSession.js
│       ├── setuWebhook.js
│       └── setuNormalizer.js
│
├── routes/
│   └── ...
│
└── app.js
```

Do not put all Setu logic in a single controller.

---

# 33. Application Endpoints

## Account Connection

```http
POST /api/v1/financial-accounts/connect
GET  /api/v1/financial-accounts
DELETE /api/v1/financial-accounts/:id
```

## Consent

```http
GET  /api/v1/financial-accounts/:id/consent
POST /api/v1/financial-accounts/:id/revoke
```

## Setu callback/webhook

```http
GET  /api/v1/setu/callback
POST /api/v1/setu/webhook
```

## Transactions

Existing application APIs:

```http
GET /api/v1/transactions
POST /api/v1/transactions
PUT /api/v1/transactions/:id
DELETE /api/v1/transactions/:id
```

The Setu integration should feed these same transaction services rather than creating a separate financial model.

---

# 34. Database Tables

## connected_financial_accounts

```text
id
user_id

provider
provider_account_id
fip_id

fi_type
masked_account_number
account_type

status

consent_id
last_sync_at

created_at
updated_at
```

## setu_consents

```text
id
user_id
financial_account_id

setu_consent_id
status

fetch_type
consent_mode

data_range_from
data_range_to

approved_at
revoked_at

created_at
updated_at
```

## setu_data_sessions

```text
id
user_id
financial_account_id

consent_id
setu_session_id

status
data_range_from
data_range_to

created_at
updated_at
completed_at
```

## setu_webhook_events

```text
id
event_type
consent_id
session_id

payload

processing_status
processed_at

created_at
```

The final schema can be adapted to the application's existing database conventions.

---

# 35. Error Handling

Every Setu request must handle:

```text
400
401
403
404
409
429
500
502/503
timeout
network failure
```

Application behavior:

```pseudo
if authentication failure:
    refresh/re-authenticate and retry once

if rate limited:
    return temporary error / retry with backoff

if validation error:
    return user-safe validation message

if consent rejected:
    mark connection rejected

if FIP denied:
    mark affected account as denied

if data timeout:
    mark account timeout
    do not mark entire user sync as successful

if upstream unavailable:
    log trace ID
    retry where safe
```

Do not blindly retry POST requests that can create duplicate consent/data sessions.

---

# 36. Observability

Log:

```text
request ID
Setu trace ID
internal user ID
consent ID
data session ID
FIP ID
event type
duration
status
error code
```

Never log:

```text
client secret
access token
raw sensitive financial data
full account numbers
PINs/passwords
```

Mask account information wherever possible.

---

# 37. Security Requirements

## Credentials

Keep:

```text
SETU_CLIENT_ID
SETU_CLIENT_SECRET
SETU_PRODUCT_INSTANCE_ID
```

server-side.

## Access Token

Keep access tokens server-side.

## Authorization

Every internal financial-account API must verify:

```text
authenticated user
+
resource belongs to user
```

Never allow an authenticated user to read another user's connected account by guessing an ID.

## Webhook

The webhook should be validated according to the authentication/signature mechanism supported by the Setu configuration/current documentation.

Do not rely only on an obscured URL.

---

# 38. Consent Security / UX

The app should clearly tell the user:

```text
What data is requested
Why the data is needed
What period is requested
How frequently it can be fetched
How long the data may be retained/used
```

The user must explicitly approve the AA consent.

Setu describes the consent object as the core contract defining these data-use parameters.

Source:
https://docs.setu.co/data/account-aggregator/consent-object

---

# 39. Sandbox Test Data

Setu provides a mock FIP in its AA sandbox.

The current documentation states that Setu's mock FIP provides data across FI types and that deposit mock data includes transaction information.

Source:
https://docs.setu.co/data/account-aggregator/fi-data-types

For the Personal Finance MVP:

```text
FI Type = DEPOSIT
Format  = JSON
```

The development team should use this sandbox before attempting real-bank integration.

---

# 40. Testing Plan

## Test 1 — Authentication

```text
client ID + secret
    ↓
access token
```

Expected: token returned.

## Test 2 — FIP Discovery

```text
GET /v2/fips
```

Expected:

```text
200
Active FIP list
```

## Test 3 — Consent Creation

```text
POST /v2/consents
```

Expected:

```text
201
consent ID
consent URL
PENDING
```

## Test 4 — Consent Approval

```text
Open consent URL
    ↓
Complete sandbox flow
    ↓
Approve
```

Expected: notification received and consent becomes approved.

## Test 5 — Consent Rejection

Expected:

```text
webhook
status = rejected
no data session created
```

## Test 6 — Data Session

```text
POST /v2/sessions
```

Expected:

```text
session created
status = PENDING
```

## Test 7 — FI Data Notification

Expected:

```text
FI_DATA_READY
PENDING / PARTIAL / COMPLETED
```

## Test 8 — Fetch FI Data

```text
GET /v2/sessions/:id
```

Expected: financial data returned.

## Test 9 — Normalization

Expected:

```text
raw FI data
    ↓
internal Transaction records
```

## Test 10 — Duplicate Import

Run the same data fetch twice.

Expected: no duplicate transactions.

## Test 11 — Financial Engine

After transaction import:

```text
Plan vs Actual updated
Safe-to-Spend updated
Goal status updated
Warnings evaluated
```

---

# 41. Local Webhook Development

Setu's quickstart recommends configuring a notification endpoint in Bridge and notes that a mock endpoint such as Beeceptor can be used to understand notifications before implementing your own server.

For local development, use a secure public tunnel such as:

```text
ngrok
Cloudflare Tunnel
```

Example:

```text
localhost:5000
     |
     v
tunnel
     |
     v
https://public-domain.example
     |
     v
Setu webhook
```

Set the public webhook URL in Setu Bridge.

Source:
https://docs.setu.co/data/account-aggregator/quickstart

---

# 42. Polling vs Notifications

Notifications should be the primary mechanism for asynchronous state changes.

```text
Webhook
   ↓
Update local state
```

Polling may be used as:

```text
fallback
+
manual refresh
+
recovery mechanism
```

Do not aggressively poll Setu from the frontend.

Setu provides APIs to query consent status, fetch status and data-session status, while notifications communicate important state changes.

---

# 43. Optional Auto-Fetch

Setu currently provides an Auto-Fetch feature.

With Auto-Fetch:

```text
Consent approved
     ↓
Setu creates data session
     ↓
Setu monitors data availability
     ↓
Setu fetches available data
     ↓
Setu sends data to FIU
```

Setu notes that Auto-Fetch can automatically fetch for approved consents and that successful fetches are charged.

Source:
https://docs.setu.co/data/account-aggregator/api-integration/data-apis

### Recommendation

Do not enable Auto-Fetch for the first MVP until:

```text
manual consent flow
+
manual data session
+
manual fetch
```

works correctly.

---

# 44. Recommended MVP Implementation

## Phase 1 — Sandbox foundation

```text
[ ] Setu Bridge product created
[ ] Sandbox credentials configured
[ ] Environment variables configured
[ ] Token service working
[ ] FIP discovery working
```

## Phase 2 — Consent

```text
[ ] Create consent service
[ ] Build consent payload
[ ] Create internal connect API
[ ] Open Setu consent URL
[ ] Implement callback
[ ] Implement consent webhook
[ ] Save consent state
```

## Phase 3 — Data

```text
[ ] Create data session
[ ] Implement FI webhook
[ ] Fetch FI data
[ ] Parse JSON FI data
[ ] Normalize transactions
[ ] Store transactions
[ ] Prevent duplicates
```

## Phase 4 — Product integration

```text
[ ] Update Money page
[ ] Update Plan vs Actual
[ ] Update Safe-to-Spend
[ ] Update Goals
[ ] Update Warnings
[ ] Update Insights
```

## Phase 5 — Hardening

```text
[ ] Error handling
[ ] Token caching
[ ] Idempotent webhooks
[ ] Security review
[ ] Logging / monitoring
[ ] Integration tests
```

---

# 45. Reference Service Interfaces

The rest of the application should depend on an internal abstraction rather than Setu directly.

```ts
interface FinancialDataProvider {
  createConnection(userId: string): Promise<ConnectionResult>;

  getConnectionStatus(
    connectionId: string
  ): Promise<ConnectionStatus>;

  revokeConnection(
    connectionId: string
  ): Promise<void>;

  syncTransactions(
    connectionId: string,
    dateRange: DateRange
  ): Promise<NormalizedTransaction[]>;
}
```

Setu implementation:

```text
SetuFinancialDataProvider
```

Later:

```text
ManualFinancialDataProvider
SetuFinancialDataProvider
AnotherAAProvider
```

This prevents the entire finance system from becoming coupled to Setu.

---

# 46. Recommended Transaction Import Pipeline

```text
SETU
 |
 v
FI Data
 |
 v
Schema Parser
 |
 v
Raw Transaction DTO
 |
 v
Validation
 |
 v
Merchant Extraction
 |
 v
Category Classification
 |
 v
Duplicate Detection
 |
 v
Database
 |
 v
Financial Engine
```

Pseudo code:

```pseudo
function syncAccount(connection):

    approvedConsent = getApprovedConsent(connection)

    session = createDataSession(
        approvedConsent.id
    )

    waitForDataReadyNotification(session.id)

    fiData = fetchFIData(session.id)

    transactions = parseFIData(fiData)

    normalized = transactions.map(normalizeTransaction)

    valid = normalized.filter(validateTransaction)

    inserted = insertIgnoringDuplicates(valid)

    recalculateFinancialState(
        connection.userId
    )

    return inserted
```

---

# 47. Definition of Done

The Setu integration is complete when:

```text
[ ] Backend can authenticate with Setu sandbox
[ ] Backend can retrieve active FIPs
[ ] User can start a bank connection
[ ] Consent URL is returned to frontend
[ ] User can complete Setu consent flow
[ ] Approval/rejection is reflected in our DB
[ ] Webhooks are received
[ ] Approved consent can create a data session
[ ] FI data-ready notification is handled
[ ] FI data can be fetched
[ ] Deposit data is parsed
[ ] Transactions are normalized
[ ] Duplicate imports are prevented
[ ] Connected account status is tracked
[ ] User can revoke connection/consent where supported
[ ] Transactions appear in Money
[ ] Plan vs Actual updates
[ ] Safe-to-Spend updates
[ ] Goal calculations update
[ ] Warnings/insights can consume imported transactions
[ ] Secrets are server-side only
[ ] Errors and Setu trace IDs are logged safely
```

---

# 48. Critical Engineering Rules

## Rule 1

**Setu is an external data provider, not our financial business-logic engine.**

## Rule 2

**Never put Setu client secrets in the frontend.**

## Rule 3

**Never trust AI for critical financial calculations.**

## Rule 4

**Never treat a consent URL redirect alone as proof that financial data has been successfully fetched.**

Use:

```text
consent state
+
webhooks
+
data-session state
```

## Rule 5

**Make webhook handling idempotent.**

## Rule 6

**Normalize Setu data into the application's own transaction schema.**

## Rule 7

**Use the current Active FIP endpoint before creating consent rather than maintaining an outdated hard-coded FIP list.**

## Rule 8

**Do not build production assumptions around sandbox behavior.**

---

# 49. Official Documentation Sources

1. AA Overview
   https://docs.setu.co/data/account-aggregator/overview

2. AA Quickstart
   https://docs.setu.co/data/account-aggregator/quickstart

3. API Integration Overview
   https://docs.setu.co/data/account-aggregator/api-integration

4. Consent Object
   https://docs.setu.co/data/account-aggregator/consent-object

5. Active FIPs
   https://docs.setu.co/data/account-aggregator/api-integration/fip-apis

6. Account Availability
   https://docs.setu.co/data/account-aggregator/api-integration/account-availability-apis

7. Notifications
   https://docs.setu.co/data/account-aggregator/api-integration/notifications

8. Data APIs / Data Flow
   https://docs.setu.co/data/account-aggregator/api-integration/data-apis

9. Embed Setu AA
   https://docs.setu.co/data/account-aggregator/embed-setu-aa

10. FI Data Types / Mock Data
    https://docs.setu.co/data/account-aggregator/fi-data-types

11. OpenAPI/API Reference
    https://docs.setu.co/api/data/account-aggregator

---

# 50. Final Implementation Flow

The engineering team should implement the integration in exactly this order:

```text
SETU BRIDGE
    |
    v
Credentials
    |
    v
Authentication
    |
    v
Active FIP discovery
    |
    v
Create Consent
    |
    v
Open Setu Consent UI
    |
    v
User Approves
    |
    v
Consent Webhook
    |
    v
Create Data Session
    |
    v
FI Data Webhook
    |
    v
Fetch FI Data
    |
    v
Parse Deposit Data
    |
    v
Normalize Transactions
    |
    v
Store Transactions
    |
    v
Financial Engine
    |
    +--> Plan vs Actual
    +--> Safe-to-Spend
    +--> Goals
    +--> Warnings
    +--> Insights
    |
    v
Personal Finance Dashboard
```

This is the implementation boundary the team should follow: **Setu handles consented financial-data access; our application owns user accounts, normalized transactions, financial calculations, planning, warnings, and product intelligence.**
