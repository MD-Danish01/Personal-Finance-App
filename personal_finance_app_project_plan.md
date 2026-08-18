# Personal Finance App — Project Plan

## 1. Project Objective

### Primary Objective

Build a **Personal Financial Decision Assistant** that helps a user understand:

- How much money is coming in.
- How much should be allocated to essential expenses.
- How much can be spent for enjoyment.
- How much should go toward savings and goals.
- How much should be reserved for an emergency fund and buffer.
- Whether actual spending is still aligned with the user's plan.
- How today's spending decisions can affect future goals.

The application is **not only an expense tracker or budget app**. Its core purpose is:

> **Plan the user's money → track reality → detect deviations → explain consequences → help the user recover and adjust.**

### Product Philosophy

```text
Clarity
   ↓
Choice
   ↓
Consequence
   ↓
Correction
   ↓
Growth
```

The app recommends; the user decides.

---

# 2. MVP Scope

The first version should prove this core loop:

```text
Income
  ↓
Personalized Plan
  ↓
Safe-to-Spend
  ↓
Spending
  ↓
Warning
  ↓
Savings Recovery
```

### MVP Features

1. User authentication
2. Financial profile / income setup
3. Essential expense setup
4. Savings target
5. Enjoyment budget
6. Emergency fund setup
7. Buffer
8. Personalized money plan
9. Expense / transaction tracking
10. Safe-to-Spend calculation
11. Plan vs Actual
12. Spending limits and notifications
13. Savings recovery
14. Goals
15. Basic charts
16. Why-this-number explanations
17. Basic financial insights

### Deferred Features

Do not make these part of the first MVP:

- Stock trading
- Investment execution
- Loan marketplace
- Insurance marketplace
- Complex AI chatbot
- Social feed
- Family mode
- Heavy gamification

---

# 3. High-Level System Architecture

```text
                       ┌──────────────────────┐
                       │   Web / Mobile UI    │
                       │ Home / Money / Plan  │
                       │ Goals / Insights     │
                       └──────────┬───────────┘
                                  │
                                  ▼
                       ┌──────────────────────┐
                       │      REST API        │
                       │  Node.js / Express   │
                       └──────────┬───────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
 ┌───────────────┐       ┌──────────────────┐      ┌────────────────┐
 │ Auth & Users  │       │ Finance Services │      │ AI / Insights  │
 └───────────────┘       └────────┬─────────┘      └───────┬────────┘
                                  │                         │
                 ┌────────────────┼────────────────┐        │
                 │                │                │        │
                 ▼                ▼                ▼        │
          ┌────────────┐   ┌──────────────┐  ┌──────────┐  │
          │ Plan       │   │ Transactions │  │ Goals    │  │
          │ Engine     │   │ Service      │  │ Service  │  │
          └─────┬──────┘   └──────┬───────┘  └────┬─────┘  │
                │                 │               │        │
                └─────────────────┼───────────────┘        │
                                  ▼                        │
                        ┌───────────────────┐              │
                        │ Financial Engine  │◄─────────────┘
                        │ Safe Spend        │
                        │ Plan vs Actual    │
                        │ Warnings          │
                        │ Recovery         │
                        │ Simulation       │
                        └─────────┬─────────┘
                                  │
                                  ▼
                           ┌──────────────┐
                           │ PostgreSQL   │
                           └──────────────┘
```

---

# 4. Core Architectural Principle

Separate the system into:

```text
CRUD / Data Layer
       +
Financial Business Logic
       +
AI Explanation Layer
```

### Data Layer

Stores:

- Users
- Plans
- Transactions
- Goals
- Limits
- Emergency fund
- Notifications
- Insights

### Financial Engine

Calculates:

- Plan allocations
- Plan vs Actual
- Safe-to-Spend
- Goal progress
- Emergency fund progress
- Savings shortfall
- Recovery options
- Purchase impact
- Warning conditions

### AI Layer

AI should primarily:

```text
Find
 ↓
Explain
 ↓
Suggest
```

Critical financial calculations should be deterministic in application code, not delegated entirely to the LLM.

---

# 5. Main Application Modules

## 5.1 Authentication & User Module

### Responsibilities

- Registration
- Login
- Logout
- Session/JWT handling
- User profile
- Financial profile

### Main Data

```text
User
- id
- name
- email
- password_hash
- created_at

FinancialProfile
- id
- user_id
- monthly_income
- currency
- created_at
- updated_at
```

---

# 5.2 Financial Setup Module

Collect the user's basic financial situation.

### Inputs

```text
Monthly income
Essential expenses
Savings target
Enjoyment budget
Emergency fund target
Buffer
Existing savings / emergency fund
```

### Flow

```text
User
 ↓
Enter income
 ↓
Enter essential expenses
 ↓
Enter saving target
 ↓
Enter enjoyment budget
 ↓
Configure emergency fund
 ↓
Configure buffer
 ↓
Generate plan
```

---

# 5.3 Plan Module

The Plan module represents what the user intends to do with their income.

### Example

```text
Income              ₹30,000

Essentials          ₹16,000
Enjoyment            ₹3,000
Emergency            ₹2,000
Future Savings       ₹3,000
Long-term Wealth     ₹2,000
Buffer               ₹4,000

Total               ₹30,000
```

### Plan States

```text
Draft
 ↓
Recommended
 ↓
User Edited
 ↓
Active
 ↓
Adjusted
```

### Important Rule

The recommendation is not the final truth.

```text
App recommends
      ↓
User edits / accepts
      ↓
Final plan
```

---

# 5.4 Plan Generation Engine

### Purpose

Generate a recommended allocation based on the user's situation.

### Inputs

```text
income
essential_expenses
saving_target
enjoyment_target
emergency_status
buffer_target
goals
```

### Output

```text
recommended_plan
```

### Pseudocode

```pseudo
function generatePlan(profile):

    income = profile.monthly_income
    essentials = profile.essential_expenses
    savings = profile.savings_target
    enjoyment = profile.enjoyment_target

    remaining = income
                - essentials
                - savings
                - enjoyment

    emergency = calculateEmergencyContribution(profile, remaining)

    remaining = remaining - emergency

    wealth = calculateLongTermWealthContribution(profile, remaining)

    remaining = remaining - wealth

    buffer = max(remaining, 0)

    return {
        essentials: essentials,
        enjoyment: enjoyment,
        emergency: emergency,
        future_savings: savings,
        long_term_wealth: wealth,
        buffer: buffer
    }
```

The exact recommendation rules should be refined and validated later.

---

# 5.5 Transaction / Money Module

The Money screen manages actual financial activity.

### Transaction

```text
Transaction
- id
- user_id
- amount
- type
- category
- merchant
- description
- transaction_date
- source
- source_transaction_id
- created_at
```

### Sources

The architecture should support:

```text
Manual
Account Aggregator
SMS / other supported source
```

The financial engine should not care where the transaction came from.

---

# 5.6 Transaction Ingestion Architecture

```text
                    Transaction Sources
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
       Manual             AA              SMS
          │                │                │
          └────────────────┼────────────────┘
                           ▼
                 Transaction Normalizer
                           │
                           ▼
                 Merchant / Category
                    Classification
                           │
                           ▼
                      Database
```

### Provider Abstraction

```pseudo
interface TransactionProvider:

    connect(user)
    getAccounts(user)
    getTransactions(user, dateRange)
    disconnect(user)
```

Implementations:

```text
ManualTransactionProvider
AATransactionProvider
SMSTransactionProvider
```

This keeps the finance engine independent from external providers.

---

# 5.7 Account Aggregator Integration Module

## Goal

Allow the user to connect supported financial accounts and import consent-based financial data.

### Important Architectural Rule

Do not expose AA credentials in the frontend.

```text
Frontend
   ↓
Your Backend
   ↓
AA Provider
```

### High-Level AA Flow

```text
User
 ↓
Click "Connect Account"
 ↓
Backend creates consent request
 ↓
User completes consent flow
 ↓
Consent approved
 ↓
Financial data request
 ↓
Provider/FIP prepares data
 ↓
Callback / notification
 ↓
Backend fetches data
 ↓
Decrypt / parse
 ↓
Normalize transactions
 ↓
Store transactions
 ↓
Run financial calculations
```

### Pseudocode

```pseudo
function connectFinancialAccount(user):

    consent = AA.createConsentRequest(
        user=user,
        purpose="Personal Financial Management",
        requestedData=["transactions", "account information"]
    )

    return consent.redirectOrSessionInfo
```

```pseudo
function handleAAConsentCallback(event):

    if event.status != "APPROVED":
        return

    consentId = event.consentId

    dataRequest = AA.requestFinancialData(
        consentId=consentId
    )

    saveDataRequest(userId, dataRequest.id)
```

```pseudo
function handleAADataReady(event):

    if event.status != "READY":
        return

    encryptedData = AA.fetchFinancialData(
        requestId=event.requestId
    )

    financialData = decryptAndParse(encryptedData)

    transactions = normalizeTransactions(financialData)

    saveTransactions(transactions)

    recalculateFinancialState(transactions.userId)
```

## Sandbox First

The first implementation should use a provider sandbox and test financial data.

Production AA integration should be treated as a later deployment/compliance step.

---

# 5.8 Transaction Normalization Module

Different providers can return different structures.

Normalize everything into one internal format.

### Example

```json
{
  "userId": "123",
  "amount": 320,
  "type": "expense",
  "merchant": "Swiggy",
  "category": "Food",
  "date": "2026-08-17",
  "source": "AA",
  "sourceTransactionId": "abc123"
}
```

### Pseudocode

```pseudo
function normalizeTransaction(raw):

    merchant = extractMerchant(raw.description)

    category = classifyCategory(
        merchant,
        raw.description
    )

    return {
        userId: currentUser,
        amount: normalizeAmount(raw.amount),
        type: detectType(raw),
        merchant: merchant,
        category: category,
        date: normalizeDate(raw.date),
        source: raw.source,
        sourceTransactionId: raw.id
    }
```

---

# 5.9 Merchant & Category Classification

Initial implementation should use deterministic rules.

### Example

```text
swiggy      → Food
zomato      → Food

uber        → Transport
ola         → Transport

amazon      → Shopping
myntra      → Shopping

netflix     → Entertainment
spotify     → Entertainment

airtel      → Bills
electricity → Bills
```

### Pseudocode

```pseudo
function classifyCategory(merchant, description):

    text = lower(merchant + " " + description)

    if containsAny(text, ["swiggy", "zomato"]):
        return "Food"

    if containsAny(text, ["uber", "ola"]):
        return "Transport"

    if containsAny(text, ["amazon", "myntra"]):
        return "Shopping"

    if containsAny(text, ["netflix", "spotify"]):
        return "Entertainment"

    if containsAny(text, ["airtel", "electricity"]):
        return "Bills"

    return "Others"
```

Later, unknown merchants can be handled with a machine-learning or LLM-assisted classifier.

---

# 5.10 Safe-to-Spend Engine

This is the central feature of the product.

### Objective

Answer:

> "How much can I reasonably spend today without putting my current plan at risk?"

### Inputs

```text
Current available money
Remaining planned expenses
Upcoming bills
Remaining savings requirement
Goal contribution requirement
Emergency contribution
Buffer
Current spending
Remaining days
```

### Conceptual Flow

```text
Current financial state
        │
        ├── Required expenses
        ├── Savings
        ├── Goals
        ├── Emergency
        ├── Buffer
        └── Current spending
        │
        ▼
Available discretionary amount
        │
        ▼
Remaining days
        │
        ▼
Safe-to-Spend Today
```

### Pseudocode

```pseudo
function calculateSafeToSpend(state):

    protectedMoney =
        state.remainingEssentialExpenses
        + state.remainingSavingsRequirement
        + state.remainingGoalRequirement
        + state.remainingEmergencyContribution
        + state.requiredBuffer

    discretionary =
        state.availableMoney - protectedMoney

    daysRemaining = max(state.daysRemainingInPeriod, 1)

    safeToSpend = max(
        discretionary / daysRemaining,
        0
    )

    return round(safeToSpend)
```

The production formula should be refined as more real-world financial behavior is validated.

---

# 5.11 Plan vs Actual Engine

### Objective

Compare what the user planned to spend with what actually happened.

### Example

```text
Food
Plan   = ₹4,000
Actual = ₹5,200

Variance = +₹1,200
Status   = Over Plan
```

### Pseudocode

```pseudo
function calculatePlanVsActual(plan, transactions):

    result = []

    for allocation in plan.allocations:

        actual = sumTransactions(
            transactions,
            allocation.category
        )

        variance = actual - allocation.plannedAmount

        if variance > 0:
            status = "OVER"
        else if variance < 0:
            status = "UNDER"
        else:
            status = "ON_TRACK"

        result.push({
            category: allocation.category,
            planned: allocation.plannedAmount,
            actual: actual,
            variance: variance,
            status: status
        })

    return result
```

---

# 5.12 Spending Limits & Warning Engine

The user can set self-imposed limits.

### Example

```text
Shopping Limit = ₹2,000

Actual Spending = ₹2,300

Warning:
You've crossed your self-set shopping limit by ₹300.
```

### Warning Types

```text
SPENDING_TOO_FAST
LIMIT_NEAR
LIMIT_CROSSED
SAVINGS_AT_RISK
POSITIVE_PROGRESS
```

### Pseudocode

```pseudo
function evaluateWarnings(financialState):

    warnings = []

    if spendingVelocity(financialState) > plannedVelocity(financialState):
        warnings.push(
            "SPENDING_TOO_FAST"
        )

    for limit in financialState.limits:

        actual = getCategorySpend(limit.category)

        if actual >= limit.amount:
            warnings.push(
                createLimitCrossedWarning(limit, actual)
            )
        else if actual >= limit.amount * 0.85:
            warnings.push(
                createLimitNearWarning(limit, actual)
            )

    if savingsAtRisk(financialState):
        warnings.push(
            createSavingsRiskWarning()
        )

    return warnings
```

---

# 5.13 Goals Module

### Goal Structure

```text
Goal
- id
- user_id
- name
- target_amount
- current_amount
- deadline
- monthly_target
- status
```

### Example

```text
Laptop

Target:    ₹80,000
Current:   ₹50,400
Progress:  63%
Deadline:  Dec 2026
```

### Required Monthly Contribution

```pseudo
function calculateRequiredMonthlySaving(goal):

    remaining = goal.targetAmount - goal.currentAmount

    monthsRemaining = monthsUntil(goal.deadline)

    if monthsRemaining <= 0:
        return remaining

    return ceil(
        remaining / monthsRemaining
    )
```

---

# 5.14 Emergency Fund Module

Emergency fund is separate from normal goals.

### Calculation

```text
Essential Monthly Expenses × Target Months
```

Example:

```text
₹15,000 × 6
= ₹90,000 emergency target
```

### Pseudocode

```pseudo
function calculateEmergencyTarget(
    essentialExpenses,
    targetMonths
):

    return essentialExpenses * targetMonths
```

```pseudo
function calculateEmergencyProgress(target, current):

    remaining = max(target - current, 0)

    progress = 0

    if target > 0:
        progress = current / target

    return {
        target: target,
        current: current,
        remaining: remaining,
        progress: progress
    }
```

---

# 5.15 Savings Recovery Module

When the user misses their savings target, do not simply mark them as failed.

### Example

```text
Target = ₹3,000
Actual = ₹1,000
Shortfall = ₹2,000
```

Possible plans:

```text
Fast
₹1,000 × 2 months

Balanced
₹500 × 4 months

Easy
~₹333 × 6 months
```

### Pseudocode

```pseudo
function generateRecoveryOptions(shortfall):

    return [
        {
            name: "Fast",
            months: 2,
            extraMonthlySaving:
                shortfall / 2
        },
        {
            name: "Balanced",
            months: 4,
            extraMonthlySaving:
                shortfall / 4
        },
        {
            name: "Easy",
            months: 6,
            extraMonthlySaving:
                shortfall / 6
        }
    ]
```

### User Flow

```text
Missed Savings
      ↓
Calculate Shortfall
      ↓
Generate Options
      ↓
User Selects
      ↓
Update Plan
      ↓
Track Recovery
```

---

# 5.16 Purchase Impact Simulator

This feature answers:

> "What happens if I buy this?"

### Example

```text
Purchase = ₹5,000
```

The engine compares:

```text
Current State
     VS
Simulated State
```

### Outputs

```text
Savings impact
Goal delay
Enjoyment remaining
Safe-to-Spend change
```

### Pseudocode

```pseudo
function simulatePurchase(state, purchaseAmount):

    simulated = clone(state)

    simulated.availableMoney -= purchaseAmount

    simulated.savingsProjection =
        recalculateSavings(simulated)

    simulated.goalProjection =
        recalculateGoals(simulated)

    simulated.safeToSpend =
        calculateSafeToSpend(simulated)

    return {
        savingsImpact:
            compare(state.savingsProjection,
                    simulated.savingsProjection),

        goalImpact:
            compare(state.goalProjection,
                    simulated.goalProjection),

        safeToSpendImpact:
            compare(state.safeToSpend,
                    simulated.safeToSpend)
    }
```

The simulator should explain consequences rather than force the user to reject the purchase.

---

# 5.17 Insights Module

The Insights engine identifies meaningful patterns.

### Examples

```text
"You spent 2.1× more on weekends."

"Food delivery is your biggest adjustable expense."

"Your current savings pace may delay your laptop goal."

"You spent ₹600 less than planned this week."
```

### Architecture

```text
Transactions
     +
Plan
     +
Goals
     +
Time
     ↓
Analytics Engine
     ↓
Detected Facts
     ↓
AI Explanation
     ↓
Insight
```

### Important Rule

Do not ask AI to discover the entire financial state blindly.

First calculate structured facts.

```json
{
  "weekendSpendRatio": 2.1,
  "highestAdjustableCategory": "Food",
  "potentialMonthlySaving": 1100
}
```

Then give those facts to the AI for explanation.

---

# 5.18 AI Service

### Role

```text
Find
 ↓
Explain
 ↓
Suggest
```

### Example Pipeline

```pseudo
facts = analytics.generateFacts(userId)

prompt = buildInsightPrompt(facts)

response = AI.generate(
    prompt,
    strictOutputSchema
)

validateAIResponse(response)

saveInsight(response)
```

### AI Must Not

- Directly mutate financial balances.
- Decide whether a user is "allowed" to spend.
- Invent transaction data.
- Replace deterministic financial calculations.

### AI Can

- Explain patterns.
- Rephrase warnings.
- Generate human-friendly suggestions.
- Explain why a number changed.
- Summarize financial behavior.

---

# 5.19 Dashboard / Home Module

The Home screen should aggregate the most important information.

### Example

```text
Safe to Spend Today       ₹327

This Month
Spent                     ₹12,420
Savings                    ₹2,500
Enjoyment                  ₹2,400
Emergency Fund             ₹2,000

Goals
Laptop                     63%

Insight
You're ₹420 ahead of your spending plan.
```

### API

```http
GET /api/dashboard
```

### Response Concept

```json
{
  "safeToSpend": 327,
  "monthlySpent": 12420,
  "savings": 2500,
  "enjoymentSpent": 2400,
  "emergencyFund": 2000,
  "goals": [],
  "insight": {}
}
```

The frontend should primarily render this response rather than implement the financial calculations itself.

---

# 6. Database Design

A practical initial relational schema:

```text
users
├── id
├── name
├── email
├── password_hash
└── timestamps

financial_profiles
├── id
├── user_id
├── monthly_income
├── currency
└── timestamps

plans
├── id
├── user_id
├── month
├── year
├── income
├── status
└── timestamps

plan_allocations
├── id
├── plan_id
├── category
├── planned_amount
└── timestamps

transactions
├── id
├── user_id
├── amount
├── type
├── category
├── merchant
├── description
├── transaction_date
├── source
├── source_transaction_id
└── timestamps

goals
├── id
├── user_id
├── name
├── target_amount
├── current_amount
├── deadline
├── monthly_target
├── status
└── timestamps

goal_contributions
├── id
├── goal_id
├── amount
├── contribution_date
└── source

limits
├── id
├── user_id
├── category
├── limit_amount
├── period
└── timestamps

emergency_funds
├── id
├── user_id
├── monthly_essential
├── target_months
├── target_amount
├── current_amount
└── timestamps

notifications
├── id
├── user_id
├── type
├── title
├── message
├── read
└── timestamps

insights
├── id
├── user_id
├── type
├── title
├── description
├── structured_data
└── timestamps

connected_accounts
├── id
├── user_id
├── provider
├── external_account_id
├── status
└── timestamps

consents
├── id
├── user_id
├── provider
├── external_consent_id
├── status
├── purpose
└── timestamps
```

Foreign keys and exact implementation details can be adjusted based on the selected database/ORM.

---

# 7. Suggested Backend API

## Auth

```text
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
```

## Profile

```text
GET    /api/profile
PUT    /api/profile
```

## Plans

```text
GET    /api/plans/current
POST   /api/plans/generate
PUT    /api/plans/current
POST   /api/plans/recalculate
```

## Transactions

```text
GET    /api/transactions
POST   /api/transactions
PUT    /api/transactions/:id
DELETE /api/transactions/:id
```

## Goals

```text
GET    /api/goals
POST   /api/goals
PUT    /api/goals/:id
DELETE /api/goals/:id
POST   /api/goals/:id/contributions
```

## Dashboard

```text
GET    /api/dashboard
```

## Financial Engine

```text
GET    /api/safe-to-spend
GET    /api/analytics/plan-vs-actual
GET    /api/analytics/spending
GET    /api/analytics/savings
```

## Warnings

```text
GET    /api/warnings
PUT    /api/warnings/:id/read
```

## Recovery

```text
GET    /api/recovery
POST   /api/recovery/select
```

## Simulation

```text
POST   /api/simulation/purchase
```

## Insights

```text
GET    /api/insights
```

## Account Aggregator

Provider-specific names may vary; keep the controller provider-agnostic:

```text
POST   /api/aa/connect
GET    /api/aa/accounts
POST   /api/aa/sync
POST   /api/aa/callback
DELETE /api/aa/accounts/:id
```

---

# 8. Important End-to-End Flows

## Flow A — First-Time User

```text
Open App
   ↓
Register / Login
   ↓
Enter Monthly Income
   ↓
Enter Essential Expenses
   ↓
Set Savings Target
   ↓
Set Enjoyment Budget
   ↓
Configure Emergency Fund
   ↓
Configure Buffer
   ↓
Generate Plan
   ↓
Review Plan
   ↓
User Accepts / Edits
   ↓
Active Financial Plan
   ↓
Home Dashboard
```

---

## Flow B — Manual Expense

```text
User clicks "Add Expense"
       ↓
Enter amount
       ↓
Select merchant/category
       ↓
Select date
       ↓
Submit
       ↓
Save transaction
       ↓
Recalculate plan-vs-actual
       ↓
Recalculate safe-to-spend
       ↓
Evaluate warnings
       ↓
Update dashboard
       ↓
Generate/refresh insight if required
```

### Pseudocode

```pseudo
function addExpense(input, userId):

    transaction = validateAndCreateTransaction(
        input,
        source="MANUAL"
    )

    save(transaction)

    financialState =
        recalculateFinancialState(userId)

    warnings =
        evaluateWarnings(financialState)

    saveWarnings(warnings)

    return buildDashboardResponse(
        financialState,
        warnings
    )
```

---

## Flow C — Automatic Transaction via AA

```text
User
 ↓
Connect Account
 ↓
Consent
 ↓
Account Linking
 ↓
Data Request
 ↓
AA / FIP
 ↓
Callback
 ↓
Fetch Financial Data
 ↓
Decrypt / Parse
 ↓
Normalize
 ↓
Classify Merchant
 ↓
Save Transaction
 ↓
Recalculate Financial State
 ↓
Update Dashboard
```

---

## Flow D — User Crosses Spending Limit

```text
Transaction
   ↓
Category detected
   ↓
Category total updated
   ↓
Compare with limit
   ↓
Limit exceeded?
   │
   ├── No → Continue
   │
   └── Yes
         ↓
      Create warning
         ↓
      Show notification
         ↓
      Calculate possible savings impact
```

---

## Flow E — Savings Shortfall

```text
End of period
      ↓
Compare target vs actual
      ↓
Shortfall?
      │
      ├── No → Positive progress
      │
      └── Yes
            ↓
       Calculate shortfall
            ↓
       Generate recovery options
            ↓
       User chooses
            ↓
       Update plan
            ↓
       Track recovery
```

---

## Flow F — Purchase Simulation

```text
User enters:
"I want to spend ₹5,000"
          ↓
Create temporary copy of state
          ↓
Subtract purchase
          ↓
Recalculate:
    - savings
    - goals
    - safe-to-spend
    - budget position
          ↓
Compare old vs new
          ↓
Show consequences
          ↓
User decides
```

---

# 9. Financial State Recalculation

A single service should orchestrate most calculations.

```pseudo
function recalculateFinancialState(userId):

    profile = getFinancialProfile(userId)

    plan = getActivePlan(userId)

    transactions =
        getCurrentPeriodTransactions(userId)

    goals = getGoals(userId)

    limits = getLimits(userId)

    emergencyFund =
        getEmergencyFund(userId)

    planVsActual =
        calculatePlanVsActual(
            plan,
            transactions
        )

    safeToSpend =
        calculateSafeToSpend({
            profile,
            plan,
            transactions,
            goals,
            emergencyFund
        })

    goalProgress =
        calculateGoalProgress(goals)

    warnings =
        evaluateWarnings({
            plan,
            transactions,
            limits,
            goals
        })

    return {
        planVsActual,
        safeToSpend,
        goalProgress,
        warnings
    }
```

---

# 10. Dashboard Refresh Strategy

After an important mutation:

```text
Transaction added
Goal contribution added
Plan changed
Recovery plan selected
Account synced
```

run:

```text
recalculateFinancialState()
```

Then return updated summary data.

### Example

```text
POST /transactions
       ↓
save transaction
       ↓
recalculate state
       ↓
return:
    transaction
    safeToSpend
    affected category
    warnings
    summary
```

This avoids the frontend having to understand business rules.

---

# 11. Security & Privacy

Financial data is highly sensitive.

The application should follow these principles:

```text
Minimum data collection
        ↓
Explicit consent
        ↓
Secure transport
        ↓
Encrypted sensitive data
        ↓
Strict access control
        ↓
Audit important actions
        ↓
Allow account/data deletion
```

### AA Credentials

Never expose:

```text
client secret
API secret
provider credentials
```

inside:

```text
React
Next.js browser code
Vue browser code
```

They belong on the backend.

---

# 12. Frontend Structure

Example:

```text
src/
├── modules/
│   ├── auth/
│   ├── onboarding/
│   ├── dashboard/
│   ├── money/
│   ├── plan/
│   ├── goals/
│   ├── insights/
│   └── settings/
│
├── services/
│   ├── api/
│   ├── auth/
│   ├── finance/
│   └── aa/
│
├── components/
│   ├── SafeToSpendCard
│   ├── PlanBreakdown
│   ├── TransactionList
│   ├── GoalCard
│   ├── InsightCard
│   └── WarningCard
│
└── utils/
```

The UI shown in the project design can be mapped to:

```text
Home
Money
Plan
Goals
Insights
```

---

# 13. Recommended Development Order

## Phase 1 — Foundation

```text
1. Project setup
2. Database
3. Authentication
4. User profile
5. API structure
```

## Phase 2 — Financial Setup

```text
1. Income
2. Essential expenses
3. Savings target
4. Enjoyment
5. Emergency fund
6. Buffer
```

## Phase 3 — Plan Engine

```text
1. Generate recommendation
2. Allow user editing
3. Save active plan
4. Plan history/versioning
```

## Phase 4 — Transactions

```text
1. Add expense
2. Transaction list
3. Categories
4. Merchant data
5. Monthly spending aggregation
```

## Phase 5 — Financial Engine

```text
1. Plan vs Actual
2. Safe-to-Spend
3. Goal progress
4. Emergency progress
5. Limits
```

## Phase 6 — Alerts & Recovery

```text
1. Limit warnings
2. Savings risk
3. Spending velocity
4. Savings recovery
```

## Phase 7 — Dashboard & Charts

```text
1. Home dashboard
2. Spending charts
3. Plan vs Actual chart
4. Goal progress chart
5. Savings trend
```

## Phase 8 — AA Sandbox

```text
1. Choose AA sandbox provider
2. Create developer account
3. Configure sandbox
4. Consent flow
5. Account linking
6. Financial data request
7. Callback
8. Transaction normalization
9. Import transactions
```

## Phase 9 — AI Insights

```text
1. Analytics facts
2. Insight schemas
3. AI prompt layer
4. Explanation generation
5. Insight persistence
6. Quality checks
```

## Phase 10 — Hardening

```text
1. Validation
2. Security
3. Rate limiting
4. Audit logging
5. Error handling
6. Monitoring
7. Testing
```

---

# 14. Testing Strategy

## Unit Tests

Test financial calculations independently.

```text
calculatePlan()
calculateSafeToSpend()
calculateGoalProgress()
calculateEmergencyTarget()
calculatePlanVsActual()
generateRecoveryOptions()
simulatePurchase()
```

## Integration Tests

Test:

```text
API → Service → Database
```

## Financial Scenario Tests

Create realistic scenarios:

### Scenario 1

```text
Income = ₹30,000
Normal spending
Expected = plan on track
```

### Scenario 2

```text
Food overspending
Expected = Food warning
```

### Scenario 3

```text
Savings shortfall
Expected = Recovery options
```

### Scenario 4

```text
Large purchase
Expected = Goal delay / safe-spend impact
```

### Scenario 5

```text
Near limit
Expected = Warning
```

---

# 15. Example Complete Transaction Flow

Suppose the user spends ₹320 at Swiggy.

```text
User
 ↓
Add Expense / imported transaction
 ↓
Transaction Service
 ↓
Normalize:
    merchant = Swiggy
    category = Food
    amount = ₹320
 ↓
Database
 ↓
Financial Engine
 ├── Food actual spending
 ├── Monthly spending
 ├── Plan vs Actual
 ├── Safe-to-Spend
 ├── Savings projection
 └── Warning evaluation
 ↓
Dashboard
 ├── Updated spending
 ├── Updated safe-to-spend
 └── Updated insight/warning
```

---

# 16. Key Business Rules

### Rule 1 — User owns the final plan

```text
Recommended plan ≠ forced plan
```

### Rule 2 — Enjoyment is allowed

The application should not behave as though all discretionary spending is bad.

### Rule 3 — Essential expenses should be protected

Recovery should not require sacrificing essential expenses simply to meet a savings target.

### Rule 4 — Warnings should be meaningful

Do not notify for every small deviation.

### Rule 5 — Financial calculations should be deterministic

Use normal application logic for money calculations.

### Rule 6 — AI explains, it does not control

AI should not become the source of truth for balances or calculations.

---

# 17. Future Architecture

Once the MVP is validated, extend the same architecture rather than rebuilding it.

```text
MVP
 ├── Manual Transactions
 ├── Plans
 ├── Safe-to-Spend
 ├── Goals
 └── Recovery

Phase 2
 ├── Account Aggregator
 ├── Subscription Detection
 ├── Recurring Bills
 ├── Predictive Overspending
 ├── Future Impact Simulator
 └── Advanced AI Insights

Phase 3
 ├── Investment Education
 ├── Compliant Investment Integrations
 ├── Family Planning
 ├── Couple Planning
 ├── Financial Safety Score
 └── Long-Term Wealth Roadmap
```

---

# 18. Final System Formula

The complete product can be understood as:

```text
EARN
 ↓
Understand income
 ↓
PLAN
 ↓
Decide where money should go
 ↓
SPEND
 ↓
Allow guilt-free spending within the chosen plan
 ↓
TRACK
 ↓
Record what actually happened
 ↓
WARN
 ↓
Identify important deviations
 ↓
ADJUST
 ↓
Update the plan when reality changes
 ↓
RECOVER
 ↓
Gradually recover missed savings
 ↓
PROTECT
 ↓
Build emergency reserves
 ↓
GROW
 ↓
Work toward long-term wealth
```

---

# 19. Definition of Done for the MVP

The MVP is successful when a new user can:

```text
[ ] Create an account
[ ] Enter monthly income
[ ] Enter essential expenses
[ ] Set savings target
[ ] Set enjoyment budget
[ ] Configure emergency fund
[ ] Configure buffer
[ ] Generate a personalized plan
[ ] Edit and activate the plan
[ ] Add expenses manually
[ ] See spending by category
[ ] See Plan vs Actual
[ ] See Safe-to-Spend Today
[ ] Create financial goals
[ ] Track goal progress
[ ] Receive meaningful warnings
[ ] See a savings shortfall
[ ] Choose a recovery plan
[ ] See basic charts
[ ] Understand why key numbers changed
```

The first technical milestone should therefore be:

```text
Income
  ↓
Plan
  ↓
Safe-to-Spend
  ↓
Transaction
  ↓
Plan vs Actual
  ↓
Warning
  ↓
Recovery
```

Once this loop works correctly, the rest of the application can be expanded around it.
