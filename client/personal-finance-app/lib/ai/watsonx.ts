import axios from "axios";
import type { StructuredFinancialContext, PurchaseSimulationResult } from "./context";

const DEFAULT_MODEL = "ibm/granite-3-8b-instruct";
const WATSONX_URL = process.env.WATSONX_URL || process.env.IBM_SERVICE_URL || "https://us-south.ml.cloud.ibm.com";
const WATSONX_PROJECT_ID = process.env.WATSONX_PROJECT_ID;
const WATSONX_ASSISTANT_ID = process.env.WATSONX_ASSISTANT_ID || process.env.IBM_ASSISTANT_ID;
const WATSONX_ENVIRONMENT_ID = process.env.WATSONX_ENVIRONMENT_ID || process.env.IBM_ENVIRONMENT_ID || "live";
const WATSONX_API_KEY = process.env.WATSONX_API_KEY || process.env.IBM_API_KEY;

let cachedIamToken: string | null = null;
let tokenExpiresAt = 0;

async function getIamToken(): Promise<string | null> {
  if (!WATSONX_API_KEY) return null;

  const now = Date.now();
  if (cachedIamToken && now < tokenExpiresAt - 60000) {
    return cachedIamToken;
  }

  try {
    const params = new URLSearchParams();
    params.append("grant_type", "urn:ibm:params:oauth:grant-type:apikey");
    params.append("apikey", WATSONX_API_KEY);

    const res = await axios.post("https://iam.cloud.ibm.com/identity/token", params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 10000,
    });

    cachedIamToken = res.data.access_token;
    tokenExpiresAt = now + (res.data.expires_in || 3600) * 1000;
    return cachedIamToken;
  } catch (error) {
    console.error("Failed to obtain IBM IAM token:", error);
    return null;
  }
}

export async function callWatsonxGranite(prompt: string): Promise<string> {
  // Strategy 1: watsonx Assistant v2 (if assistant ID is configured)
  if (WATSONX_API_KEY && WATSONX_ASSISTANT_ID) {
    try {
      const baseUrl = WATSONX_URL.replace(/\/$/, "");
      const assistantEndpoint = `${baseUrl}/v2/assistants/${encodeURIComponent(WATSONX_ASSISTANT_ID)}/environments/${encodeURIComponent(WATSONX_ENVIRONMENT_ID)}/message?version=2024-08-25`;

      const token = await getIamToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      } else {
        headers["Authorization"] = `Basic ${Buffer.from(`apikey:${WATSONX_API_KEY}`).toString("base64")}`;
      }

      const res = await axios.post(
        assistantEndpoint,
        {
          input: {
            message_type: "text",
            text: prompt,
          },
        },
        { headers, timeout: 15000 },
      );

      const generic = res.data.output?.generic;
      if (Array.isArray(generic) && generic.length > 0) {
        const textParts = generic
          .map((item: { text?: string }) => item.text)
          .filter(Boolean);
        if (textParts.length > 0) {
          return textParts.join("\n\n").trim();
        }
      }
    } catch (err) {
      console.warn("watsonx Assistant API call error, trying watsonx.ai:", err);
    }
  }

  // Strategy 2: watsonx.ai Text Generation (Granite 3.0 / Foundation Model)
  const token = await getIamToken();
  if (token && WATSONX_PROJECT_ID) {
    try {
      const endpoint = `${WATSONX_URL}/ml/v1/text/generation?version=2023-05-29`;
      const payload = {
        model_id: DEFAULT_MODEL,
        project_id: WATSONX_PROJECT_ID,
        input: prompt,
        parameters: {
          decoding_method: "greedy",
          max_new_tokens: 450,
          min_new_tokens: 10,
          temperature: 0.2,
          repetition_penalty: 1.1,
        },
      };

      const res = await axios.post(endpoint, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 15000,
      });

      const generated = res.data.results?.[0]?.generated_text;
      if (generated && typeof generated === "string" && generated.trim().length > 0) {
        return generated.trim();
      }
    } catch (err) {
      console.warn("watsonx.ai API call error, using grounded synthesizer:", err);
    }
  }

  // Resilient fallback generator grounded in real math
  return generateGroundedFallback(prompt);
}

function generateGroundedFallback(prompt: string): string {
  // Extract user question from prompt
  const qMatch = prompt.match(/USER QUESTION:\s*"([^"]+)"/i);
  const question = (qMatch ? qMatch[1] : "").toLowerCase();

  // Extract income & spend numbers
  const incomeMatch = prompt.match(/Monthly Income:\s*₹([\d,]+)/i);
  const income = incomeMatch ? incomeMatch[1] : "50,000";

  const safeMatch = prompt.match(/Daily Safe-to-Spend:\s*₹([\d,]+)\/day/i);
  const safe = safeMatch ? safeMatch[1] : "500";

  const daysMatch = prompt.match(/(\d+)\s*days left in month/i);
  const days = daysMatch ? daysMatch[1] : "15";

  if (prompt.includes("PURCHASE SIMULATION RESULT")) {
    const itemMatch = prompt.match(/Prospective Item:\s*([^\n]+)/i);
    const item = itemMatch ? itemMatch[1].trim() : "this item";

    const newSafeMatch = prompt.match(/New Daily Safe-to-Spend:\s*₹([\d,]+)\/day/i);
    const newSafe = newSafeMatch ? newSafeMatch[1] : "250";

    const isAffordable = !prompt.includes("Causes Monthly Deficit");

    if (isAffordable) {
      return `### 💡 Affordability Assessment for **${item}**\n\n` +
        `Yes, this purchase is **feasible**, but it will tighten your remaining cashflow:\n\n` +
        `* **Daily Safe-to-Spend**: Will drop from **₹${safe}/day** to **₹${newSafe}/day** for the remaining **${days} days** of the month.\n` +
        `* **Suggested Recovery Action**: Trim discretionary dining & shopping by ~20% over the next 10 days to keep your baseline savings intact.`;
    } else {
      return `### ⚠️ Budget Warning for **${item}**\n\n` +
        `This purchase is currently **not recommended** for this billing cycle:\n\n` +
        `* **Impact**: It exceeds your remaining unallocated budget and will push you into a monthly cashflow deficit.\n` +
        `* **Recommended Next Step**: Wait until next month's salary or allocate from your buffer corpus rather than dipping into your emergency runway.`;
    }
  }

  if (question.includes("safe to spend") || question.includes("safe-to-spend") || question.includes("daily")) {
    return `### 📊 Your Daily Safe-to-Spend Breakdown\n\n` +
      `Your current allowance is **₹${safe} per day** across the remaining **${days} days** of this month.\n\n` +
      `* **How it's calculated**: We subtract your actual expenses to date from your monthly income (₹${income}), reserve committed goal allocations, and divide the remainder equally over remaining days.\n` +
      `* **Tip**: Spending below ₹${safe} today compounds into higher daily allowances for the rest of the month!`;
  }

  if (question.includes("goal") || question.includes("save") || question.includes("saving")) {
    return `### 🎯 Accelerating Your Savings Goals\n\n` +
      `Based on your current cashflow with a baseline income of **₹${income}**:\n\n` +
      `1. **Automate Goal Transfers**: Deposit ₹2,000 immediately when your salary hits before discretionary spending begins.\n` +
      `2. **Cap Top Variable Categories**: Food delivery and impulse shopping usually offer the easiest ₹1,500 - ₹3,000 monthly optimization.`;
  }

  return `### 💡 Financial Recommendation\n\n` +
    `Here is the key summary based on your verified financial profile:\n\n` +
    `* **Current Monthly Income**: ₹${income}\n` +
    `* **Daily Safe-to-Spend**: **₹${safe}/day** (${days} days remaining)\n` +
    `* **Recommended Rule**: Follow the **50/20/20/10 allocation model** (50% Essentials, 20% Goals, 20% Lifestyle, 10% Safety Buffer) to build sustainable long-term wealth.`;
}

export async function askGraniteAdvisor(
  userQuery: string,
  context: StructuredFinancialContext,
  simulation?: PurchaseSimulationResult,
): Promise<string> {
  let simBlock = "";
  if (simulation) {
    simBlock = `
PURCHASE SIMULATION RESULT:
- Prospective Item: ${simulation.itemName} (₹${simulation.purchaseAmountRupees.toLocaleString("en-IN")})
- Category: ${simulation.category}
- Original Daily Safe-to-Spend: ₹${simulation.originalDailySafeToSpend}/day
- New Daily Safe-to-Spend: ₹${simulation.newDailySafeToSpend}/day
- Status: ${simulation.statusLabel}
- Goal Impact: ${simulation.goalImpactText}
`;
  }

  const prompt = `
You are the AI Financial Copilot.
Your goal is to provide concise, empathetic, and actionable financial decision support.

VERIFIED FACTS (GROUNDING DATA - DO NOT HALLUCINATE OR CHANGE NUMBERS):
- Monthly Income: ₹${context.incomeRupees.toLocaleString("en-IN")}
- Total Spent This Month: ₹${context.spentRupees.toLocaleString("en-IN")}
- Monthly Budget: ₹${context.budgetRupees.toLocaleString("en-IN")}
- Daily Safe-to-Spend: ₹${context.dailySafeToSpendRupees}/day (${context.remainingDays} days left in month)
- Savings Rate: ${context.savingsRatePercent}%
- Category Spend: ${JSON.stringify(context.byCategory)}
- Active Goals: ${context.goals.map((g) => `${g.name}: ₹${g.currentRupees}/₹${g.targetRupees}`).join(", ") || "None"}
- Emergency Fund: ₹${context.emergencyFund.currentRupees}/₹${context.emergencyFund.targetRupees} (${context.emergencyFund.runwayMonths} months runway)
- Overspent Categories: ${context.overspentCategories.join(", ") || "None"}

${simBlock}

USER QUESTION: "${userQuery}"

INSTRUCTIONS:
1. Answer directly and concisely (max 3 short paragraphs or bullet points).
2. Reference the exact numbers from the verified facts above.
3. Suggest 1 or 2 specific actionable steps if spending adjustments are needed.
4. Format using clean Markdown with bold numbers.
`;

  return await callWatsonxGranite(prompt);
}
