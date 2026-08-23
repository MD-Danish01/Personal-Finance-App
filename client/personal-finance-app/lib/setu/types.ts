import type { FinancialBucket } from "@/lib/finance/plan-vs-actual";

export type SetuConsentRequest = {
  vua: string;
  consentDuration?: { unit: "MONTH" | "YEAR" | "DAY"; value: number };
  consentDateRange?: { startDate: string; endDate: string };
  fetchType: "ONETIME" | "PERIODIC";
  consentTypes: ("PROFILE" | "SUMMARY" | "TRANSACTIONS")[];
  dataRange: { from: string; to: string };
  fiTypes: ["DEPOSIT"];
  consentMode: "VIEW" | "STORE" | "QUERY" | "STREAM";
  dataLife: { unit: "MONTH" | "YEAR" | "DAY" | "INF"; value: number };
  purpose: { code: string; text: string; category?: string | null; refUri?: string };
  frequency?: { unit: "HOURLY" | "DAILY" | "MONTHLY" | "YEARLY"; value: number };
  dataFilter?: unknown[];
  context?: unknown[];
  additionalParams?: { tags?: string[] };
  enableAdditionalPhoneNumber?: boolean;
  redirectUrl?: string;
};

export type SetuConsentResponse = {
  id: string;
  url: string;
  status: string;
};

export type SetuDataSessionResponse = {
  id: string;
  consentId: string;
  status: string;
  dataRange?: { from: string; to: string };
};

export type NormalizedAccount = {
  fipId: string;
  fipName: string;
  linkRefNumber: string;
  maskedAccountNumber: string | null;
  accountType: string;
};

export type NormalizedTransaction = {
  setuAccountId: string;
  setuTransactionId: string;
  amount: number;
  type: "expense" | "income";
  category: "Food" | "Transport" | "Shopping" | "Entertainment" | "Bills" | "Others";
  financialBucket: FinancialBucket;
  merchant: string;
  description: string | null;
  transactionDate: string;
};

export interface FinancialDataProvider {
  createConsent(payload: SetuConsentRequest): Promise<SetuConsentResponse>;
  createDataSession(input: {
    consentId: string;
    from: string;
    to: string;
  }): Promise<SetuDataSessionResponse>;
  fetchDataSession(sessionId: string): Promise<unknown>;
}
