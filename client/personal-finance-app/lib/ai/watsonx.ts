import axios from "axios";
import OpenAI from "openai";
import type { StructuredFinancialContext, PurchaseSimulationResult } from "./context";

const DEFAULT_MODEL = "ibm/granite-3-8b-instruct";
const WATSONX_URL = process.env.WATSONX_URL || process.env.IBM_SERVICE_URL || "https://us-south.ml.cloud.ibm.com";
const WATSONX_PROJECT_ID = process.env.WATSONX_PROJECT_ID;
const WATSONX_ASSISTANT_ID = process.env.WATSONX_ASSISTANT_ID || process.env.IBM_ASSISTANT_ID;
const WATSONX_ENVIRONMENT_ID = process.env.WATSONX_ENVIRONMENT_ID || process.env.IBM_ENVIRONMENT_ID || "live";
const WATSONX_API_KEY = process.env.WATSONX_API_KEY || process.env.IBM_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const groqClient = GROQ_API_KEY
  ? new OpenAI({
      apiKey: GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    })
  : null;
let cachedIamToken: string | null = null;
let tokenExpiresAt = 0;
async function callGroq(prompt: string): Promise<string | null> {
  if (!groqClient) {
    console.warn("Groq client is not configured");
    return null;
  }

  try {
    console.log("AI STRATEGY 3: Groq");

    const response = await groqClient.responses.create({
      model: "openai/gpt-oss-20b",
      instructions: `
You are an AI Financial Copilot.

Answer the user's actual question using the verified
financial context provided in the input.

Rules:
- Answer the user's question directly.
- Use exact numbers from the verified context.
- Never invent financial information.
- Do not give a generic financial summary unless requested.
- If information is missing, clearly say so.
- Give practical and actionable advice.
- Maximum 3 short paragraphs or 5 bullet points.
- Use clean Markdown.
      `.trim(),
      input: prompt,
    });

    const result = response.output_text?.trim();

    if (!result) {
      console.warn("Groq returned an empty response");
      return null;
    }

    return result;
  } catch (error) {
    console.error("Groq API error:", error);
    return null;
  }
}
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
  // Strategy 1: watsonx Assistant v2
  if (WATSONX_API_KEY && WATSONX_ASSISTANT_ID) {
    try {
      const baseUrl = WATSONX_URL.replace(/\/$/, "");
      const assistantEndpoint = `${baseUrl}/v2/assistants/${encodeURIComponent(
        WATSONX_ASSISTANT_ID
      )}/environments/${encodeURIComponent(
        WATSONX_ENVIRONMENT_ID
      )}/message?version=2024-08-25`;

      const token = await getIamToken();

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      } else {
        headers["Authorization"] = `Basic ${Buffer.from(
          `apikey:${WATSONX_API_KEY}`
        ).toString("base64")}`;
      }

      const res = await axios.post(
        assistantEndpoint,
        {
          input: {
            message_type: "text",
            text: prompt,
          },
        },
        { headers, timeout: 15000 }
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
      console.warn(
        "watsonx Assistant API call error, trying watsonx.ai:",
        err
      );
    }
  }

  // Strategy 2: watsonx.ai Granite
  const token = await getIamToken();

  if (token && WATSONX_PROJECT_ID) {
    try {
      const endpoint =
        `${WATSONX_URL}/ml/v1/text/generation?version=2023-05-29`;

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

      if (
        generated &&
        typeof generated === "string" &&
        generated.trim().length > 0
      ) {
        return generated.trim();
      }
    } catch (err) {
      console.warn(
        "watsonx.ai API call error, trying Groq:",
        err
      );
    }
  }

  // Strategy 3: Groq
  const groqResponse = await callGroq(prompt);

  if (groqResponse) {
    console.log("Successfully received response from Groq");
    return groqResponse;
  }

  console.warn("Groq failed, using grounded fallback");

  // Strategy 4: Local fallback
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
    const itemMatch = prompt.match(/Prospective Item:\s*([^\n(]+)/i);
    const item = itemMatch ? itemMatch[1].trim() : "this item";

    const newSafeMatch = prompt.match(/New Daily Safe-to-Spend:\s*₹([\d,]+)\/day/i);
    const newSafe = newSafeMatch ? newSafeMatch[1] : "250";

    const spentTodayMatch = prompt.match(/Spent Today:\s*₹([\d,]+)/i);
    const spentToday = spentTodayMatch ? spentTodayMatch[1] : "0";

    const designatedMatch = prompt.match(/Today's Designated Budget:\s*₹([\d,]+)\/day/i);
    const designated = designatedMatch ? designatedMatch[1] : safe;

    const isAlreadyOverspent = prompt.includes("Already Overspent Today: YES") || prompt.includes("Exceeds Today's Budget");
    const willExceedToday = prompt.includes("Will Exceed Today's Quota: YES") || prompt.includes("Exceeds Today's Allowance");
    const isMonthlyDeficit = prompt.includes("Causes Monthly Deficit");

    if (isMonthlyDeficit) {
      return `### ⚠️ Budget Warning for **${item}**\n\n` +
        `This purchase is currently **not recommended**:\n\n` +
        `* **Monthly Impact**: It exceeds your remaining total monthly budget and will push you into a cashflow deficit.\n` +
        `* **Recommended Action**: Defer this purchase to next month or allocate from your emergency buffer corpus only if strictly essential.`;
    }

    if (isAlreadyOverspent) {
      return `### ⚠️ Daily Budget Exhausted for **${item}**\n\n` +
        `You have **already spent your designated money for today** (₹${spentToday} spent out of your ₹${designated}/day safe quota).\n\n` +
        `* **Same-Day Impact**: Buying **${item}** today borrows directly from tomorrow, lowering your future safe allowance from **₹${safe}/day** to **₹${newSafe}/day** for the remaining **${days} days**.\n` +
        `* **Recommended Action**: **Wait until tomorrow** to make this purchase so it is funded by tomorrow's fresh daily allowance instead of running an overdraft today.`;
    }

    if (willExceedToday) {
      return `### ⚠️ Exceeds Today's Safe Quota for **${item}**\n\n` +
        `This purchase is feasible within your monthly envelope, but **exceeds today's remaining allowance**:\n\n` +
        `* **Daily Impact**: Making this purchase today forces future days down to **₹${newSafe}/day** (down from ₹${safe}/day).\n` +
        `* **Recommended Action**: Consider postponing until tomorrow, or if urgent, plan to trim ₹${Math.round(parseInt(safe.replace(/,/g, ""), 10) * 0.3)} from dining & shopping over the next few days.`;
    }

    return `### 💡 Affordability Assessment for **${item}**\n\n` +
      `Yes, this purchase is **safe and affordable**:\n\n` +
      `* **Daily Safe-to-Spend**: Drops comfortably from **₹${safe}/day** to **₹${newSafe}/day** across the remaining **${days} days**.\n` +
      `* **Recommendation**: You can safely buy this without disrupting your monthly savings goals or emergency reserves.`;
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
- Today's Budget Status: Spent ₹${simulation.todaySpentRupees} of ₹${simulation.todayDesignatedRupees}/day limit
- Already Overspent Today: ${simulation.isTodayAlreadyOverspent ? "YES" : "NO"}
- Will Exceed Today's Quota: ${simulation.willExceedTodayBudget ? `YES (by ₹${simulation.todayOverspentDelta})` : "NO"}
- Today's Impact Note: ${simulation.todayImpactNote}
- Goal Impact: ${simulation.goalImpactText}
`;
  }

  const prompt = `
You are the AI Financial Copilot.
Your goal is to provide concise, empathetic, and actionable financial decision support.

VERIFIED FACTS (GROUNDING DATA - DO NOT HALLUCINATE OR CHANGE NUMBERS):
- Monthly Income: ₹${context.incomeRupees.toLocaleString("en-IN")}
- Protected Committed Goals: ₹${context.committedGoalsMonthlyRupees.toLocaleString("en-IN")}/mo (Locked & Auto-Allocated)
- Net Discretionary Budget: ₹${context.discretionaryPoolRupees.toLocaleString("en-IN")}
- Total Spent This Month: ₹${context.spentRupees.toLocaleString("en-IN")}
- Daily Safe-to-Spend: ₹${context.dailySafeToSpendRupees}/day (${context.remainingDays} days left in month)
- Today's Designated Budget: ₹${context.todayDesignatedRupees}/day
- Spent Today: ₹${context.todaySpentRupees}
- Today's Remaining Quota: ₹${context.todayRemainingRupees}
- Already Overspent Today: ${context.isTodayOverspent ? "YES" : "NO"}
- Savings Rate: ${context.savingsRatePercent}%
- Category Spend: ${JSON.stringify(context.byCategory)}
- Active Goals: ${context.goals.map((g) => `${g.name}: ₹${g.currentRupees}/₹${g.targetRupees}`).join(", ") || "None"}
- Emergency Fund: ₹${context.emergencyFund.currentRupees}/₹${context.emergencyFund.targetRupees} (${context.emergencyFund.runwayMonths} months runway)
- Overspent Categories: ${context.overspentCategories.join(", ") || "None"}

${simBlock}

USER QUESTION: "${userQuery}"

INSTRUCTIONS:
1. Answer directly and concisely (max 3 short paragraphs or bullet points).
2. If the user has already spent today's designated money or this purchase exceeds today's quota, explicitly explain that buying today borrows directly from future days or runs an overdraft, and suggest waiting until tomorrow.
3. Reference the exact numbers from the verified facts above.
4. Format using clean Markdown with bold numbers.
`;

  return await callWatsonxGranite(prompt);
}