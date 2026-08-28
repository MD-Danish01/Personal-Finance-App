import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  date,
  jsonb,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";

/**
 * Money is stored as integer paise (1 INR = 100 paise) so all financial
 * math stays exact and deterministic — never float.
 *
 * user_id columns hold Auth.js (next-auth v5) user IDs from Google OAuth
 * and reference auth_users.id (managed by @auth/drizzle-adapter).
 */

// ---------- Enums ----------

export const planStatusEnum = pgEnum("plan_status", [
  "draft",
  "recommended",
  "active",
]);

export const allocationKeyEnum = pgEnum("allocation_key", [
  "essentials",
  "enjoyment",
  "emergency",
  "future_savings",
  "long_term_wealth",
  "buffer",
]);

export const transactionTypeEnum = pgEnum("transaction_type", [
  "expense",
  "income",
]);

export const transactionCategoryEnum = pgEnum("transaction_category", [
  "Food",
  "Transport",
  "Shopping",
  "Entertainment",
  "Bills",
  "Others",
]);

export const transactionSourceEnum = pgEnum("transaction_source", [
  "MANUAL",
  "ACCOUNT_AGGREGATOR",
]);

export const goalStatusEnum = pgEnum("goal_status", [
  "on_track",
  "at_risk",
  "completed",
]);

export const insightToneEnum = pgEnum("insight_tone", [
  "positive",
  "warning",
  "info",
]);

export const consentStatusEnum = pgEnum("consent_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "REVOKED",
  "EXPIRED",
]);

export const dataSessionStatusEnum = pgEnum("data_session_status", [
  "PENDING",
  "COMPLETED",
  "EXPIRED",
  "FAILED",
]);

// ---------- Auth.js tables ----------
// Required by @auth/drizzle-adapter. Table names (user, account, session,
// verificationToken) and column shapes must match what the adapter expects.
// See: https://authjs.dev/getting-started/adapters/drizzle

export const authUsers = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const authAccounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  ],
);

export const authSessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const authVerificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => [
    primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  ],
);

// ---------- Core finance tables ----------

export const financialProfiles = pgTable("financial_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  monthlyIncome: integer("monthly_income").notNull(), // paise
  currency: text("currency").notNull().default("INR"),
  essentialsPercent: integer("essentials_percent").notNull().default(50),
  savingsPercent: integer("savings_percent").notNull().default(20),
  enjoymentPercent: integer("enjoyment_percent").notNull().default(20),
  bufferPercent: integer("buffer_percent").notNull().default(10),
  emergencyMonthsTarget: integer("emergency_months_target")
    .notNull()
    .default(6),
  onboardingCompleted: boolean("onboarding_completed")
    .notNull()
    .default(false),
  themeColor: text("theme_color").notNull().default("emerald"),
  themeMode: text("theme_mode").notNull().default("system"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const plans = pgTable(
  "plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    month: integer("month").notNull(), // 1-12
    year: integer("year").notNull(),
    monthlyIncome: integer("monthly_income").notNull(), // paise, snapshot at plan time
    status: planStatusEnum("status").notNull().default("draft"),
    whyThisPlan: text("why_this_plan"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("plans_user_month_year_idx").on(t.userId, t.month, t.year),
    index("plans_user_id_idx").on(t.userId),
  ],
);

export const planAllocations = pgTable(
  "plan_allocations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    key: allocationKeyEnum("key").notNull(),
    amount: integer("amount").notNull(), // paise
    percent: integer("percent").notNull(), // 0-100
  },
  (t) => [index("plan_allocations_plan_id_idx").on(t.planId)],
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(), // paise
    type: transactionTypeEnum("type").notNull(),
    category: transactionCategoryEnum("category").notNull(),
    merchant: text("merchant").notNull().default(""),
    description: text("description"),
    transactionDate: date("transaction_date").notNull(),
    source: transactionSourceEnum("source").notNull().default("MANUAL"),
    setuTransactionId: text("setu_transaction_id"), // dedupe key for AA-sourced rows
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("transactions_user_date_idx").on(t.userId, t.transactionDate),
    uniqueIndex("transactions_setu_id_idx").on(t.setuTransactionId),
  ],
);

export const goals = pgTable(
  "goals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    icon: text("icon").notNull().default("target"),
    targetAmount: integer("target_amount").notNull(), // paise
    currentAmount: integer("current_amount").notNull().default(0), // paise
    deadline: date("deadline"),
    monthlyTarget: integer("monthly_target").notNull().default(0), // paise
    status: goalStatusEnum("status").notNull().default("on_track"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("goals_user_id_idx").on(t.userId)],
);

export const goalContributions = pgTable(
  "goal_contributions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(), // paise
    note: text("note"),
    contributedAt: timestamp("contributed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("goal_contributions_goal_id_idx").on(t.goalId)],
);

export const limits = pgTable(
  "limits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    category: transactionCategoryEnum("category").notNull(),
    monthlyLimit: integer("monthly_limit").notNull(), // paise
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("limits_user_category_idx").on(t.userId, t.category)],
);

export const emergencyFunds = pgTable("emergency_funds", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  targetAmount: integer("target_amount").notNull(), // paise
  currentAmount: integer("current_amount").notNull().default(0), // paise
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // e.g. "limit_warning", "plan_deviation"
    title: text("title").notNull(),
    body: text("body").notNull(),
    read: boolean("read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("notifications_user_id_idx").on(t.userId, t.read)],
);

export const insights = pgTable(
  "insights",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    tone: insightToneEnum("tone").notNull().default("info"),
    generatedAt: timestamp("generated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("insights_user_id_idx").on(t.userId)],
);

// ---------- Setu AA tables ----------

export const connectedFinancialAccounts = pgTable(
  "connected_financial_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    fipId: text("fip_id").notNull(), // e.g. "HDFC", "ICICI" per Setu registry
    fipName: text("fip_name").notNull(),
    maskedAccountNumber: text("masked_account_number"),
    accountType: text("account_type").notNull().default("DEPOSIT"),
    linkedAt: timestamp("linked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("cfa_user_id_idx").on(t.userId)],
);

export const setuConsents = pgTable(
  "setu_consents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    consentId: text("consent_id").notNull().unique(), // Setu's consent handle
    status: consentStatusEnum("status").notNull().default("PENDING"),
    consentUrl: text("consent_url"), // hosted consent screen URL
    purposeCode: text("purpose_code"),
    dataRangeFrom: timestamp("data_range_from", { withTimezone: true }),
    dataRangeTo: timestamp("data_range_to", { withTimezone: true }),
    consentExpiry: timestamp("consent_expiry", { withTimezone: true }),
    rawPayload: jsonb("raw_payload"), // full Setu response for audit
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("setu_consents_user_id_idx").on(t.userId)],
);

export const setuDataSessions = pgTable(
  "setu_data_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    consentId: text("consent_id")
      .notNull()
      .references(() => setuConsents.consentId),
    sessionId: text("session_id").notNull().unique(), // Setu's session id
    status: dataSessionStatusEnum("status").notNull().default("PENDING"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("setu_data_sessions_consent_idx").on(t.consentId)],
);

// Idempotency dedupe for Setu webhooks — eventId uniqueness guarantees
// duplicate deliveries never create duplicate side effects.
export const setuWebhookEvents = pgTable("setu_webhook_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: text("event_id").notNull().unique(),
  eventType: text("event_type").notNull(), // e.g. "CONSENT_STATUS_UPDATE"
  payload: jsonb("payload").notNull(),
  processed: boolean("processed").notNull().default(false),
  receivedAt: timestamp("received_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

//persistance chat history
// db/schema.ts


export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: text("user_id").notNull(),

    title: text("title").notNull().default("New conversation"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdIdx: index("conversations_user_id_idx").on(table.userId),
  }),
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, {
        onDelete: "cascade",
      }),

    role: text("role").notNull(),

    content: text("content").notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    conversationIdIdx: index(
      "messages_conversation_id_idx",
    ).on(table.conversationId),
  }),
);