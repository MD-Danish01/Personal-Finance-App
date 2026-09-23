import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;

function getSenderAddress(displayName = "Spendly"): string {
  const envFrom = process.env.RESEND_FROM_EMAIL;
  if (!envFrom) return `${displayName} <noreply@devforge.danishdev.me>`;
  if (envFrom.includes("<") && envFrom.includes(">")) return envFrom;
  return `${displayName} <${envFrom.trim()}>`;
}

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

interface VerificationEmailParams {
  to: string;
  name: string;
  token: string;
  baseUrl?: string;
}

export async function sendVerificationEmail({
  to,
  name,
  token,
}: VerificationEmailParams): Promise<{ success: boolean; error?: string }> {
  const origin =
    process.env.EMAIL_APP_URL ||
    (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes("localhost")
      ? process.env.NEXT_PUBLIC_APP_URL
      : "https://devforge.danishdev.me");

  const verificationUrl = `${origin.replace(/\/$/, "")}/api/auth/verify?token=${encodeURIComponent(
    token,
  )}&email=${encodeURIComponent(to)}`;

  const html = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en" xml:lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>Verify your email - Spendly</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0c0e12; color: #f3f4f6; margin: 0; padding: 40px 20px;">
  <!-- Hidden preview text -->
  <div style="display: none; max-height: 0px; overflow: hidden; font-size: 1px; line-height: 1px; max-width: 0px; opacity: 0;">
    Please verify your email address to activate your Spendly personal finance assistant.
  </div>

  <div style="max-width: 540px; margin: 0 auto; background-color: #161a22; border: 1px solid #232836; border-radius: 24px; padding: 36px 32px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);">
    <div style="margin-bottom: 24px;">
      <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #10b981; background: rgba(16, 185, 129, 0.12); padding: 4px 10px; border-radius: 999px;">
        Spendly Personal Finance
      </span>
    </div>

    <h1 style="font-size: 22px; font-weight: 800; color: #ffffff; margin: 0 0 12px 0; letter-spacing: -0.5px;">
      Verify your email address
    </h1>

    <p style="font-size: 14px; line-height: 22px; color: #9ca3af; margin: 0 0 24px 0;">
      Hi ${name || "there"},<br><br>
      Thank you for creating an account with Spendly. Please verify your email address to secure your account and activate automated financial insights.
    </p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${verificationUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 14px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
        Verify Email Address
      </a>
    </div>

    <p style="font-size: 12px; line-height: 18px; color: #6b7280; margin: 0 0 16px 0;">
      If the button above does not work, copy and paste this link into your browser:
    </p>
    <p style="font-size: 11px; line-height: 16px; color: #10b981; word-break: break-all; margin: 0 0 24px 0; background: #0c0e12; padding: 10px 14px; border-radius: 10px; border: 1px solid #232836;">
      ${verificationUrl}
    </p>

    <p style="font-size: 11px; color: #6b7280; margin: 24px 0 0 0; border-top: 1px solid #232836; padding-top: 16px;">
      This link will expire in 24 hours. If you did not create an account, you can safely ignore this email.
    </p>
  </div>
</body>
</html>
  `;

  const text = `
Spendly Personal Finance

Verify your email address

Hi ${name || "there"},

Thank you for creating an account with Spendly. Please verify your email address by clicking the link below:

${verificationUrl}

This link will expire in 24 hours. If you did not create an account, you can safely ignore this email.
  `.trim();

  if (!resend) {
    console.log(`[Resend (Dev Mode)]: RESEND_API_KEY not configured. Verification URL for ${to}: ${verificationUrl}`);
    return { success: true };
  }

  try {
    const fromAddress = getSenderAddress("Spendly");
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: [to],
      subject: "Verify your Spendly email address",
      html,
      text,
      replyTo: "noreply@devforge.danishdev.me",
      headers: {
        "X-Entity-Ref-ID": crypto.randomUUID(),
      },
    });

    if (error) {
      console.error("[Resend Error]:", error);
      return { success: false, error: error.message };
    }

    console.log(`[Resend Success]: Email sent to ${to}, ID: ${data?.id}`);
    return { success: true };
  } catch (err) {
    console.error("[Resend Exception]:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to send email" };
  }
}

export interface OverspendingAlertEmailParams {
  to: string;
  name: string;
  todaySpent: number;
  dailyLimit: number;
  overspentAmount: number;
  remainingDays: number;
  newDailySafeToSpend: number;
  baseUrl?: string;
}

export interface MonthlyReportEmailParams {
  to: string;
  name: string;
  monthLabel: string;
  budget: number;
  spent: number;
  remaining: number;
  categoryBreakdown: Array<{ category: string; amount: number }>;
  dashboardUrl?: string;
}

export async function sendMonthlyReportEmail({
  to,
  name,
  monthLabel,
  budget,
  spent,
  remaining,
  categoryBreakdown,
  dashboardUrl,
}: MonthlyReportEmailParams): Promise<{ success: boolean; error?: string }> {
  const origin =
    process.env.EMAIL_APP_URL ||
    (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes("localhost")
      ? process.env.NEXT_PUBLIC_APP_URL
      : "https://devforge.danishdev.me");
  const reportUrl = dashboardUrl ?? `${origin.replace(/\/$/, "")}/home`;
  const rows = categoryBreakdown
    .map(
      ({ category, amount }) =>
        `<tr><td style="padding:6px 0;color:#94a3b8;font-size:13px;">${category}</td><td style="padding:6px 0;text-align:right;color:#f3f4f6;font-size:13px;font-weight:700;font-family:monospace;">₹${amount.toLocaleString("en-IN")}</td></tr>`,
    )
    .join("");
  const textBreakdown = categoryBreakdown
    .map(({ category, amount }) => `• ${category}: ₹${amount.toLocaleString("en-IN")}`)
    .join("\n");

  const html = `
<html><body style="font-family:Arial,sans-serif;background:#0c0e12;color:#f3f4f6;padding:40px 20px;">
  <div style="max-width:540px;margin:0 auto;background:#161a22;border:1px solid #232836;border-radius:24px;padding:36px 32px;">
    <div style="color:#10b981;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Spendly Personal Finance</div>
    <h1 style="font-size:22px;color:#fff;margin:22px 0 12px;">Your monthly report</h1>
    <p style="font-size:14px;line-height:22px;color:#94a3b8;">Hi ${name || "there"}, here is your spending summary for <strong>${monthLabel}</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin:24px 0;background:#0c0e12;border:1px solid #232836;border-radius:16px;padding:12px;">
      <tr><td style="padding:8px 0;color:#94a3b8;">Monthly budget</td><td style="padding:8px 0;text-align:right;font-weight:700;">₹${budget.toLocaleString("en-IN")}</td></tr>
      <tr><td style="padding:8px 0;color:#94a3b8;">Total spent</td><td style="padding:8px 0;text-align:right;font-weight:700;">₹${spent.toLocaleString("en-IN")}</td></tr>
      <tr><td style="padding:8px 0;color:#10b981;">Remaining</td><td style="padding:8px 0;text-align:right;color:#10b981;font-weight:800;">₹${remaining.toLocaleString("en-IN")}</td></tr>
    </table>
    <h2 style="font-size:14px;color:#fff;margin:24px 0 8px;">Spending by category</h2>
    <table style="width:100%;border-collapse:collapse;">${rows || `<tr><td style="padding:6px 0;color:#94a3b8;">No expenses recorded</td></tr>`}</table>
    <div style="text-align:center;margin:30px 0 10px;"><a href="${reportUrl}" style="background:#10b981;color:#fff;text-decoration:none;padding:14px 28px;border-radius:14px;font-weight:700;font-size:14px;">View Dashboard</a></div>
    <p style="font-size:11px;color:#6b7280;text-align:center;border-top:1px solid #232836;padding-top:16px;">Automated monthly report for ${to}.</p>
  </div>
</body></html>`.trim();
  const text = `Spendly Personal Finance\n\nMonthly report for ${monthLabel}\n\nHi ${name || "there"},\n\n• Monthly budget: ₹${budget.toLocaleString("en-IN")}\n• Total spent: ₹${spent.toLocaleString("en-IN")}\n• Remaining: ₹${remaining.toLocaleString("en-IN")}\n\nSpending by category:\n${textBreakdown || "No expenses recorded."}\n\nView your dashboard: ${reportUrl}`;

  if (!resend) {
    console.log(`[Resend (Dev Mode)]: Monthly report prepared for ${to} (${monthLabel})`);
    return { success: true };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: getSenderAddress("Spendly"),
      to: [to],
      subject: `Your ${monthLabel} spending report - Spendly`,
      html,
      text,
      replyTo: "noreply@devforge.danishdev.me",
      headers: { "X-Entity-Ref-ID": crypto.randomUUID() },
    });
    if (error) {
      console.error("[Resend Error - Monthly Report]:", error);
      return { success: false, error: error.message };
    }
    console.log(`[Resend Success]: Monthly report sent to ${to}, ID: ${data?.id}`);
    return { success: true };
  } catch (err) {
    console.error("[Resend Exception - Monthly Report]:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to send monthly report" };
  }
}

export async function sendOverspendingAlertEmail({
  to,
  name,
  todaySpent,
  dailyLimit,
  overspentAmount,
  remainingDays,
  newDailySafeToSpend,
}: OverspendingAlertEmailParams): Promise<{ success: boolean; error?: string }> {
  const origin =
    process.env.EMAIL_APP_URL ||
    (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes("localhost")
      ? process.env.NEXT_PUBLIC_APP_URL
      : "https://devforge.danishdev.me");

  const dashboardUrl = `${origin.replace(/\/$/, "")}/home`;
  const formattedDate = new Date().toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
  });

  const html = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en" xml:lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>Your Daily Spending Summary - Spendly</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0c0e12; color: #f3f4f6; margin: 0; padding: 40px 20px;">
  <!-- Preview text -->
  <div style="display: none; max-height: 0px; overflow: hidden; font-size: 1px; line-height: 1px; max-width: 0px; opacity: 0;">
    Your daily spending summary: ₹${todaySpent.toLocaleString("en-IN")} recorded today for ${formattedDate}.
  </div>

  <div style="max-width: 540px; margin: 0 auto; background-color: #161a22; border: 1px solid #232836; border-radius: 24px; padding: 36px 32px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);">
    <div style="margin-bottom: 24px;">
      <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #10b981; background: rgba(16, 185, 129, 0.12); padding: 4px 10px; border-radius: 999px;">
        Spendly Personal Finance
      </span>
    </div>

    <h1 style="font-size: 22px; font-weight: 800; color: #ffffff; margin: 0 0 12px 0; letter-spacing: -0.5px;">
      Daily Spending Summary
    </h1>

    <p style="font-size: 14px; line-height: 22px; color: #94a3b8; margin: 0 0 24px 0;">
      Hi ${name || "there"},<br><br>
      Here is your daily spending summary for <strong>${formattedDate}</strong>. You recorded <strong>₹${todaySpent.toLocaleString("en-IN")}</strong> in expenses today, compared to your planned daily allowance of <strong>₹${dailyLimit.toLocaleString("en-IN")}</strong>.
    </p>

    <!-- Spending Breakdown Box -->
    <div style="background-color: #0c0e12; border: 1px solid #232836; border-radius: 16px; padding: 20px; margin: 24px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #94a3b8;">Planned Daily Allowance</td>
          <td style="padding: 6px 0; font-size: 13px; font-weight: 700; color: #f3f4f6; text-align: right; font-family: monospace;">₹${dailyLimit.toLocaleString("en-IN")}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #94a3b8;">Today's Total Expenses</td>
          <td style="padding: 6px 0; font-size: 13px; font-weight: 700; color: #f3f4f6; text-align: right; font-family: monospace;">₹${todaySpent.toLocaleString("en-IN")}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #94a3b8;">Difference</td>
          <td style="padding: 6px 0; font-size: 13px; font-weight: 700; color: #f87171; text-align: right; font-family: monospace;">+₹${overspentAmount.toLocaleString("en-IN")}</td>
        </tr>
        <tr style="border-top: 1px solid #232836;">
          <td style="padding: 12px 0 4px 0; font-size: 13px; color: #10b981; font-weight: 600;">Recommended Allowance (Next ${remainingDays} Days)</td>
          <td style="padding: 12px 0 4px 0; font-size: 14px; font-weight: 800; color: #10b981; text-align: right; font-family: monospace;">₹${newDailySafeToSpend.toLocaleString("en-IN")}/day</td>
        </tr>
      </table>
    </div>

    <p style="font-size: 13px; line-height: 20px; color: #94a3b8; margin: 0 0 24px 0;">
      To keep your monthly plan on target, keeping discretionary expenses around <strong>₹${newDailySafeToSpend.toLocaleString("en-IN")}/day</strong> for the remainder of the month will keep your planned savings intact.
    </p>

    <!-- Button -->
    <div style="text-align: center; margin: 32px 0;">
      <a href="${dashboardUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 14px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
        View Dashboard
      </a>
    </div>

    <!-- Footer -->
    <p style="font-size: 11px; color: #6b7280; margin: 24px 0 0 0; border-top: 1px solid #232836; padding-top: 16px; text-align: center;">
      This is an automated update for ${to} regarding your Spendly financial plan.
    </p>
  </div>
</body>
</html>
  `.trim();

  const text = `
Spendly Personal Finance

Daily Spending Summary (${formattedDate})

Hi ${name || "there"},

Here is your daily spending summary for ${formattedDate}:

• Planned Daily Allowance: ₹${dailyLimit.toLocaleString("en-IN")}
• Today's Total Expenses: ₹${todaySpent.toLocaleString("en-IN")}
• Difference: +₹${overspentAmount.toLocaleString("en-IN")}
• Recommended Daily Allowance: ₹${newDailySafeToSpend.toLocaleString("en-IN")}/day for the remaining ${remainingDays} days.

To keep your monthly plan on target, pacing discretionary expenses for the remainder of the month will keep your savings protected.

View your full dashboard:
${dashboardUrl}
  `.trim();

  if (!resend) {
    console.log(`[Resend (Dev Mode)]: RESEND_API_KEY not configured. Overspending alert for ${to}: Spent ₹${todaySpent}, Limit ₹${dailyLimit}, Over ₹${overspentAmount}`);
    return { success: true };
  }

  try {
    const fromAddress = getSenderAddress("Spendly");
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: [to],
      subject: `Daily spending summary for ${formattedDate} - Spendly`,
      html,
      text,
      replyTo: "noreply@devforge.danishdev.me",
      headers: {
        "X-Entity-Ref-ID": crypto.randomUUID(),
      },
    });

    if (error) {
      console.error("[Resend Error - Overspend Alert]:", error);
      return { success: false, error: error.message };
    }

    console.log(`[Resend Success]: Overspending alert sent to ${to}, ID: ${data?.id}`);
    return { success: true };
  } catch (err) {
    console.error("[Resend Exception - Overspend Alert]:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to send overspending alert" };
  }
}
