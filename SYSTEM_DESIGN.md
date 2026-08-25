# System Design & Architecture Document
## Personal Finance Assistant (IBM SkillsBuild Hackathon Project)

---

## 1. Executive Summary & Core Philosophy

Traditional financial apps are either **passive expense trackers** (forcing tedious manual bookkeeping) or **black-box bots** that give generic advice without deterministic guarantees. 

Our application is built as an **Intelligent Financial Decision Engine** powered by:
1. **India's Account Aggregator (AA) Ecosystem** via Setu Gateway for automated, consent-driven bank & UPI data fetching.
2. **Deterministic Financial Calculation Engine** ensuring that money arithmetic, budget allocations, safe-to-spend limits, and emergency runways are 100% mathematically accurate and verifiable.
3. **IBM Watsonx.ai (Granite 3.0 / 3.1)** cognitive intelligence layer that translates mathematical deviations into empathetic, actionable human recommendations without ever hallucinating financial numbers.

---

## 2. High-Level Architecture Diagram

```mermaid
graph TD
    User([User Device / Mobile WebView / Web App])
    
    subgraph Frontend_Layer [Next.js 16 Client & UI]
        UI_Home[Home / Safe-to-Spend]
        UI_Money[Money / Cashflow & Donut]
        UI_Plan[Plan / Allocations & Limits]
        UI_Goals[Goals & Contributions]
        UI_Insights[AI Financial Insights]
        UI_Profile[Profile & Dynamic Themes]
    end

    subgraph Backend_Gateway [Next.js Route Handlers & Auth]
        Auth[Auth.js / Google OAuth 2.0]
        API_Dash[/api/dashboard]
        API_Tx[/api/transactions]
        API_Plan[/api/plans]
        API_Setu[/api/setu/*]
        API_AI[/api/insights]
    end

    subgraph Deterministic_Financial_Engine [Deterministic Core Logic]
        Engine_Safe[Safe-to-Spend Calculator]
        Engine_Alloc[50/20/20/10 Budget Allocator]
        Engine_Limits[Category Limit & Overspend Detector]
        Engine_Emergency[Emergency Runway Analyzer]
        Engine_Goal[Goal Velocity & Rebalancer]
    end

    subgraph Data_Aggregator_Layer [Account Aggregator Pipeline]
        Setu_Consent[Consent Manager & FIP Router]
        Setu_Session[Data Session & Statement Fetcher]
        Normalizer[Merchant Classifier & UPI Normalizer]
    end

    subgraph Cognitive_AI_Layer [IBM Watsonx.ai Integration]
        Granite_Engine[IBM Granite 3.0 / 3.1 Instruct]
        Prompt_Builder[Financial Context & Anomaly Prompt]
        Insight_Synthesizer[Actionable Advice & Plan Recovery]
    end

    subgraph Storage_Layer [Supabase PostgreSQL DB]
        DB_Users[(auth_users)]
        DB_Profiles[(financial_profiles)]
        DB_Plans[(plans & plan_allocations)]
        DB_Tx[(transactions & limits)]
        DB_Goals[(goals & goal_contributions)]
        DB_AA[(connected_accounts & setu_consents)]
        DB_Insights[(insights)]
    end

    User --> Frontend_Layer
    Frontend_Layer --> Backend_Gateway
    Backend_Gateway --> Auth
    Backend_Gateway --> Deterministic_Financial_Engine
    Backend_Gateway --> Data_Aggregator_Layer
    Backend_Gateway --> Cognitive_AI_Layer

    Deterministic_Financial_Engine --> Storage_Layer
    Data_Aggregator_Layer --> Storage_Layer
    Cognitive_AI_Layer --> Storage_Layer

    Setu_Consent -.->|RBI AA Protocol| External_Banks[(Banks & FIPs via Setu)]
    Cognitive_AI_Layer -.->|REST API / SDK| IBM_Watsonx[(IBM Cloud Watsonx.ai)]
```

---

## 3. Account Aggregator (Setu AA) Data Sync Workflow

### How Bank & UPI Transactions Sync:
1. **Consent Initialization (`/api/setu/connect`)**:
   - When user clicks **Connect Bank** on `/plan` or `/money`, the app requests a standard `DEPOSIT` financial information consent from Setu.
   - Setu returns a secure hosted Consent Webview URL.
2. **User Consent Approval**:
   - User authenticates via OTP with their Account Aggregator handle (e.g. Onemoney, Anumati, Setu AA).
   - User selects the bank accounts (SBI, HDFC, ICICI, etc.) to link and approves consent.
3. **Redirect & Webhook Handling (`/api/setu/callback` & `/api/setu/webhook`)**:
   - Setu redirects user to `/money?connected=true`.
   - Simultaneously, Setu sends an asynchronous webhook event `CONSENT_STATUS_UPDATE (APPROVED)`.
   - Our system creates a `Data Session` (`/v2/sessions`) for the authorized date range.
4. **Data Ingestion & Normalization (`lib/setu/normalizer.ts`)**:
   - When the statement data is prepared (`FI_DATA_READY`), the app fetches the encrypted payload.
   - Raw bank statement line items are parsed:
     - Amounts are converted to integer **paise** (1 INR = 100 paise).
     - UPI / IMPS narrations (`UPI/4123/Swiggy Bangalore...`) are categorized (`Food`, `Transport`, `Bills`, `Shopping`, `Entertainment`) using intelligent keyword heuristics.
     - Transactions are deduplicated using `setuTransactionId` and saved in the `transactions` table.
5. **Where the User Sees Their Data**:
   - **`/money`**: Total monthly expenditure, interactive SVG Spending Donut by category, and full transaction history list with date/merchant badges.
   - **`/home`**: Live **Safe-to-Spend Daily Allowance** (automatically recalculated from income minus real bank expenses) and allocation progress bars.
   - **`/plan`**: Real-time spending against defined category limits and emergency runway progress.

---

## 4. High-Level Pseudocode

### A. Setu AA Webhook & Data Session Ingestion

```typescript
// Algorithm: Setu Account Aggregator Asynchronous Ingestion Pipeline
async function handleSetuWebhook(event: SetuWebhookEvent) {
  // 1. Idempotency Check
  const existing = await db.findWebhookEvent(event.eventId);
  if (existing) return { status: 200, message: "Duplicate event acknowledged" };
  await db.recordWebhookEvent(event);

  // 2. Consent Approval Handling
  if (event.type === "CONSENT_STATUS_UPDATE" && event.status === "APPROVED") {
    const consent = await db.getConsent(event.consentId);
    // Trigger asynchronous data session for historical 90-day statements
    const session = await setuClient.createSession({
      consentId: consent.consentId,
      dataRange: { from: consent.dataRangeFrom, to: consent.dataRangeTo },
      format: "json"
    });
    await db.saveDataSession({ consentId: consent.consentId, sessionId: session.id, status: "PENDING" });
  }

  // 3. Financial Information (FI) Data Processing
  if (event.type === "FI_DATA_READY" && event.status === "COMPLETED") {
    const rawFIData = await setuClient.fetchSessionData(event.sessionId);
    
    // Extract Linked Bank Accounts
    const discoveredAccounts = extractAccounts(rawFIData, event.userId);
    await db.saveDiscoveredAccounts(discoveredAccounts);

    // Extract & Normalize Transactions
    const normalizedTransactions = [];
    for (const rawTx of rawFIData.transactions) {
      const isDebit = rawTx.type === "DEBIT" || rawTx.amount < 0;
      const paise = Math.round(Math.abs(rawTx.amount) * 100);
      const category = classifyMerchantKeywords(rawTx.narration);
      const merchant = extractMerchantName(rawTx.narration);

      normalizedTransactions.push({
        userId: event.userId,
        amount: paise,
        type: isDebit ? "expense" : "income",
        category,
        merchant,
        description: rawTx.narration,
        transactionDate: rawTx.transactionDate,
        source: "ACCOUNT_AGGREGATOR",
        setuTransactionId: rawTx.transactionId
      });
    }

    // Deduplicated batch insert
    await db.insertTransactionsDeduplicated(normalizedTransactions);
    
    // Trigger deterministic re-calculation
    await recalculateFinancialSnapshot(event.userId);
  }
}
```

---

### B. Deterministic Financial Engine (Safe-to-Spend & Budget Allocation)

```typescript
// Algorithm: Deterministic Daily Safe-to-Spend & Cashflow Balancer
function calculateSafeToSpendToday(userProfile, activePlan, currentMonthTransactions) {
  const totalIncomePaise = activePlan.monthlyIncome || userProfile.monthlyIncome;
  
  // Total actual expense sum in current billing cycle (in paise)
  const totalSpentPaise = currentMonthTransactions
    .filter(tx => tx.type === "expense")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = now.getDate();
  const remainingDays = Math.max(1, daysInMonth - currentDay + 1);

  // Available discretionary balance after committed allocations
  const remainingBudgetPaise = Math.max(0, totalIncomePaise - totalSpentPaise);
  
  // Daily allowance in Rupees
  const safeToSpendDailyRupees = Math.round((remainingBudgetPaise / remainingDays) / 100);
  
  return {
    safeToSpendDailyRupees,
    monthSpentRupees: Math.round(totalSpentPaise / 100),
    monthBudgetRupees: Math.round(totalIncomePaise / 100),
    remainingDays,
    isOverspent: totalSpentPaise > totalIncomePaise
  };
}
```

---

### C. IBM Watsonx (Granite 3.0) Cognitive Insight Engine

```typescript
// Algorithm: IBM Watsonx Granite Insight Generation & Plan Recovery
async function generateGraniteFinancialInsights(userId: string) {
  // 1. Fetch Deterministic State (Zero AI Hallucination for math)
  const profile = await db.getProfile(userId);
  const plan = await db.getActivePlan(userId);
  const txSummary = await db.getMonthlyCategorySpend(userId);
  const goals = await db.getUserGoals(userId);

  // 2. Build Structured Prompt for IBM Granite
  const prompt = `
You are an expert financial advisor powered by IBM watsonx.ai.
Analyze the user's financial metrics and generate concise, actionable recommendations.

USER METRICS:
- Monthly Income: ₹${profile.monthlyIncome / 100}
- Current Month Total Spend: ₹${txSummary.totalSpent / 100}
- Savings Rate: ${txSummary.savingsRate}%
- Category Spend Breakdown: ${JSON.stringify(txSummary.byCategory)}
- Active Goals: ${goals.map(g => `${g.name} (${g.current / 100}/${g.target / 100})`).join(", ")}

RULES:
1. Be concise, positive, and direct.
2. If spending in discretionary categories is high (>30%), suggest specific reallocation.
3. Recommend 1 recovery step if any category limit is exceeded.
4. Output in structured JSON format with title, description, and tone ('positive' | 'warning' | 'info').
`;

  // 3. Call IBM Watsonx.ai Granite 3.0 Instruct
  const response = await ibmWatsonxClient.generateText({
    modelId: "ibm/granite-3-8b-instruct",
    projectId: process.env.WATSONX_PROJECT_ID,
    input: prompt,
    parameters: {
      temperature: 0.2, // Low temperature for factual consistency
      max_new_tokens: 300
    }
  });

  const parsedInsights = JSON.parse(response.results[0].generated_text);
  
  // 4. Persist to DB for instant mobile retrieval
  await db.saveInsights(userId, parsedInsights);
  return parsedInsights;
}
```

---

## 5. Strategic Ideas to Win the IBM Hackathon 🏆

To make this project stand out against typical hackathon projects, focus on these 4 pillars:

### Pillar 1: Deep IBM Technology Alignment
* **Integrate IBM Watsonx.ai (Granite 3.0 / 3.1 Instruct)**: Highlight that while financial mathematics is kept deterministic for trust and compliance, IBM Granite powers the **Contextual Decision Explanations**, **Spending Anomaly Summaries**, and **Interactive Plan Recovery Simulators**.
* **Enterprise-grade Governance (watsonx.governance concept)**: Emphasize that the AI is bounded by strict system guardrails—it never hallucinates account balances or invents transaction records.

### Pillar 2: Leveraging India's Digital Public Infrastructure (DPI)
* **Real Account Aggregator (RBI Regulated)**: Most hackathon projects use dummy hardcoded mock data. Demonstrating live or sandbox consent approval through Setu AA showcasing multi-bank discovery (SBI + HDFC + ICICI) proves real-world viability.
* **Consent Lifecycle Management**: Include consent transparency (View Linked Banks, Revoke Consent anytime) which satisfies RBI AA guidelines and DPDP Act (Data Protection) standards.

### Pillar 3: "What-If" Financial Simulation (Interactive Feature)
* Add a **"Can I Afford This?"** purchase simulator:
  - User enters a prospective purchase (e.g. ₹15,000 for a new smartphone).
  - The deterministic engine calculates how this purchase impacts:
    1. Safe-to-Spend for the rest of the month (drops from ₹600/day to ₹200/day).
    2. Goal delay (Goa trip delayed by 14 days).
  - IBM Granite explains the trade-off in plain, empowering language.

### Pillar 4: Exceptional UI/UX & Dynamic Theming
* **Polished FinTech Aesthetics**: Segmented controls, smooth progress bars, masked bank account badges, dark/light theme switching, and custom primary palettes (Emerald, Indigo, Ocean Blue, Violet, Amber, Rose) stored in PostgreSQL.
* **Zero Jitter / Zero Calculation Discrepancies**: All currency values adhere to standard paise math, avoiding the common floating-point rounding errors seen in rushed apps.

---

## 6. Implementation Roadmap to Hackathon Submission

| Phase | Milestone | Deliverables |
| :--- | :--- | :--- |
| **Phase 1 (Completed)** | **Core MVP Business Logic & UI** | Full dashboard, manual transaction logging, Setu AA cards, category limits, emergency fund runway, database-backed theming. |
| **Phase 2 (Completed)** | **Financial Integrity & Multiplier Fixes** | Unified paise/rupee math, timezone-safe date bounding, instant income baseline synchronization. |
| **Phase 3 (Next)** | **IBM Watsonx.ai Integration** | Connect `@ibm-cloud/watsonx-ai`, create Granite prompt pipeline for `/api/insights`, and build the AI Advisor chat assistant. |
| **Phase 4** | **Demo Video & Presentation Deck** | End-to-end recorded walkthrough (Profile -> AA Consent -> Live Transaction -> Safe-to-Spend -> IBM Granite Advice). |
