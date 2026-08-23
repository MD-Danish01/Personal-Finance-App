/**
 * Cloudflare Worker: Setu Auth Relay
 * Forwards POST /v1/users/login to Setu with credentials from environment.
 * Deploy to Cloudflare Workers (static egress IPs) and set SETU_AUTH_URL to the Worker URL.
 */

export default {
  async fetch(request, env) {
    // Only allow POST
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    try {
      const body = await request.json();

      // Validate required fields
      if (!body.clientID || !body.secret || body.grant_type !== "client_credentials") {
        return new Response(JSON.stringify({ error: "Invalid request body" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Forward to Setu auth endpoint
      const setuRes = await fetch("https://orgservice-prod.setu.co/v1/users/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "client": "bridge",
        },
        body: JSON.stringify({
          clientID: env.SETU_CLIENT_ID,
          grant_type: "client_credentials",
          secret: env.SETU_CLIENT_SECRET,
        }),
      });

      const data = await setuRes.text();

      return new Response(data, {
        status: setuRes.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (err) {
      console.error("Worker error:", err);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};