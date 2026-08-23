# Setu Auth Relay — Cloudflare Worker

This Worker proxies `POST /v1/users/login` to Setu with your credentials, running on Cloudflare's network (static egress IPs).

---

## 1. Install Wrangler CLI

```bash
npm install -g wrangler
# or
npx wrangler@latest
```

## 2. Login to Cloudflare

```bash
wrangler login
```
Opens browser → authorize.

## 3. Configure secrets

```bash
cd cf-worker
wrangler secret put SETU_CLIENT_ID


wrangler secret put SETU_CLIENT_SECRET

```

## 4. Deploy

```bash
wrangler deploy
```

Output includes your Worker URL, e.g.:
```
https://setu-auth-relay.<your-subdomain>.workers.dev
```

## 5. Update Vercel env

In Vercel → Project → Settings → Environment Variables, add:

```
SETU_AUTH_URL=https://setu-auth-relay.<your-subdomain>.workers.dev
```

**Important:** Do NOT set `HTTPS_PROXY` — the Worker handles the relay.

## 6. Redeploy Vercel

Trigger a new deployment (push commit or click Redeploy).

---

## Test locally (optional)

```bash
wrangler dev
# Opens http://localhost:8787
# Test with curl:
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -d '{"clientID":"test","grant_type":"client_credentials","secret":"test"}'
```

---

## Verify

After redeploy, check Vercel logs for the Setu auth call — should return `200` + `access_token`.