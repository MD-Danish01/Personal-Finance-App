import type { NormalizedAccount, NormalizedTransaction } from "./types";

const categoryRules: Array<[string[], NormalizedTransaction["category"]]> = [
  [["swiggy", "zomato"], "Food"],
  [["uber", "ola"], "Transport"],
  [["amazon", "myntra"], "Shopping"],
  [["netflix", "spotify"], "Entertainment"],
  [["airtel", "electricity"], "Bills"],
];

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : null;
}

function amountToPaise(value: unknown) {
  const text = stringValue(value) ?? (typeof value === "number" ? String(value) : null);
  if (!text || !/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  const paise = BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
  return paise > BigInt(2_147_483_647) ? null : Number(paise);
}

function dateOnly(value: unknown) {
  const text = stringValue(value);
  if (!text) return null;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(text);
  return match?.[1] ?? null;
}

function classifyMerchant(value: string) {
  const text = value.toLowerCase();
  return categoryRules.find(([terms]) => terms.some((term) => text.includes(term)))?.[1] ?? "Others";
}

function transactionList(account: Record<string, unknown>) {
  const transactions = asRecord(account.transactions).transaction;
  return Array.isArray(transactions) ? transactions : [];
}

export function normalizeSetuData(payload: unknown) {
  const root = asRecord(payload);
  const fips = Array.isArray(root.fips) ? root.fips : [];
  const accounts: NormalizedAccount[] = [];
  const transactions: NormalizedTransaction[] = [];

  for (const fipValue of fips) {
    const fip = asRecord(fipValue);
    const fipId = stringValue(fip.fipID);
    const fipAccounts = Array.isArray(fip.accounts) ? fip.accounts : [];
    if (!fipId) continue;

    for (const accountValue of fipAccounts) {
      const account = asRecord(accountValue);
      const data = asRecord(account.data);
      const decrypted = asRecord(account.decryptedFI);
      const accountData = Object.keys(decrypted).length ? decrypted : data;
      const accountDetails = asRecord(accountData.account);
      const linkRefNumber = stringValue(
        account.linkRefNumber ?? accountDetails.linkedAccRef,
      );
      if (!linkRefNumber) continue;

      const normalizedAccount: NormalizedAccount = {
        fipId,
        fipName: fipId,
        linkRefNumber,
        maskedAccountNumber:
          stringValue(account.maskedAccNumber) ?? stringValue(accountDetails.maskedAccNumber),
        accountType: stringValue(accountDetails.type)?.toUpperCase() ?? "DEPOSIT",
      };
      accounts.push(normalizedAccount);

      for (const transactionValue of transactionList(asRecord(accountData))) {
        const transaction = asRecord(transactionValue);
        const transactionId = stringValue(transaction.txnId);
        const transactionDate = dateOnly(
          transaction.transactionTimestamp ?? transaction.valueDate,
        );
        const amount = amountToPaise(transaction.amount);
        if (!transactionId || !transactionDate || amount === null || amount <= 0) continue;

        const narration = stringValue(transaction.narration) ?? "";
        const type = transaction.type === "CREDIT" ? "income" : transaction.type === "DEBIT" ? "expense" : null;
        if (!type) continue;
        transactions.push({
          setuAccountId: linkRefNumber,
          setuTransactionId: transactionId,
          amount,
          type,
          category: classifyMerchant(narration),
          financialBucket: "unknown",
          merchant: narration,
          description: stringValue(transaction.reference) ?? (narration || null),
          transactionDate,
        });
      }
    }
  }

  return { accounts, transactions };
}
