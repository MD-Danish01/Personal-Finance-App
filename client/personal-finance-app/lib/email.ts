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
  <title>Spendly Daily Spending Summary</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #090d16; color: #f1f5f9; margin: 0; padding: 32px 16px;">
  <!-- Preview text -->
  <div style="display: none; max-height: 0px; overflow: hidden; font-size: 1px; line-height: 1px; max-width: 0px; opacity: 0;">
    Daily spending summary: ₹${todaySpent.toLocaleString("en-IN")} spent of ₹${dailyLimit.toLocaleString("en-IN")} daily plan.
  </div>

  <div style="max-width: 540px; margin: 0 auto; background-color: #111726; border: 1px solid #1f293d; border-radius: 24px; padding: 32px 28px; box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5);">
    
    <!-- Header Badge -->
    <div style="margin-bottom: 20px;">
      <span style="display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #10b981; background-color: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.25); padding: 5px 12px; border-radius: 999px;">
        Spendly Budget Update
      </span>
    </div>

    <!-- Title -->
    <h1 style="font-size: 22px; font-weight: 800; color: #ffffff; margin: 0 0 12px 0; letter-spacing: -0.4px;">
      Daily Spending Summary
    </h1>

    <!-- Intro -->
    <p style="font-size: 14px; line-height: 22px; color: #94a3b8; margin: 0 0 24px 0;">
      Hi ${name || "there"},<br><br>
      Here is your daily spending summary for today. You have spent <strong style="color: #f87171;">₹${todaySpent.toLocaleString("en-IN")}</strong>, which is <strong style="color: #f87171;">+₹${overspentAmount.toLocaleString("en-IN")}</strong> relative to your planned daily allowance of <strong style="color: #ffffff;">₹${dailyLimit.toLocaleString("en-IN")}</strong>.
    </p>

    <!-- Metrics Summary Card -->
    <div style="background-color: #0b0f19; border: 1px solid #1e293b; border-radius: 16px; padding: 18px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; font-size: 12px; color: #64748b;">Daily Designated Limit:</td>
          <td style="padding: 6px 0; font-size: 13px; font-weight: 700; color: #cbd5e1; text-align: right; font-family: monospace;">₹${dailyLimit.toLocaleString("en-IN")}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 12px; color: #64748b;">Today's Total Spending:</td>
          <td style="padding: 6px 0; font-size: 13px; font-weight: 700; color: #f87171; text-align: right; font-family: monospace;">₹${todaySpent.toLocaleString("en-IN")}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 12px; color: #64748b;">Over Limit Amount:</td>
          <td style="padding: 6px 0; font-size: 14px; font-weight: 800; color: #ef4444; text-align: right; font-family: monospace;">+₹${overspentAmount.toLocaleString("en-IN")}</td>
        </tr>
        <tr style="border-top: 1px solid #1e293b;">
          <td style="padding: 10px 0 4px 0; font-size: 12px; color: #38bdf8; font-weight: 600;">Adjusted Daily Safe-to-Spend:</td>
          <td style="padding: 10px 0 4px 0; font-size: 14px; font-weight: 800; color: #38bdf8; text-align: right; font-family: monospace;">₹${newDailySafeToSpend.toLocaleString("en-IN")}/day</td>
        </tr>
      </table>
    </div>

    <!-- Recommendations -->
    <h2 style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #cbd5e1; margin: 0 0 12px 0;">
      How to keep your month on track
    </h2>

    <div style="margin-bottom: 24px;">
      <div style="margin-bottom: 12px; padding: 12px 14px; background-color: rgba(239, 68, 68, 0.06); border-left: 3px solid #ef4444; border-radius: 8px;">
        <strong style="font-size: 13px; color: #f87171;">Lower Daily Allowance for Remaining ${remainingDays} Days</strong>
        <p style="margin: 4px 0 0 0; font-size: 12px; line-height: 18px; color: #94a3b8;">
          To prevent a month-end cashflow deficit, capping your discretionary expenses at ₹${newDailySafeToSpend}/day will keep your savings protected.
        </p>
      </div>

      <div style="margin-bottom: 12px; padding: 12px 14px; background-color: rgba(245, 158, 11, 0.06); border-left: 3px solid #f59e0b; border-radius: 8px;">
        <strong style="font-size: 13px; color: #fbbf24;">Protect Your Priority Savings Goals</strong>
        <p style="margin: 4px 0 0 0; font-size: 12px; line-height: 18px; color: #94a3b8;">
          Pausing non-essential purchases for the rest of today ensures your scheduled goal contributions stay on schedule.
        </p>
      </div>

      <div style="padding: 12px 14px; background-color: rgba(14, 165, 233, 0.06); border-left: 3px solid #0ea5e9; border-radius: 8px;">
        <strong style="font-size: 13px; color: #38bdf8;">Preserve Your Emergency Buffer</strong>
        <p style="margin: 4px 0 0 0; font-size: 12px; line-height: 18px; color: #94a3b8;">
          Avoid dipping into your safety cushion by postponing optional shopping until tomorrow's fresh daily allowance.
        </p>
      </div>
    </div>

    <!-- Call to action -->
    <div style="text-align: center; margin: 30px 0 16px 0;">
      <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; font-size: 13px; font-weight: 700; text-decoration: none; padding: 13px 28px; border-radius: 12px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);">
        Open Spendly Dashboard
      </a>
    </div>

    <!-- Footer -->
    <div style="font-size: 11px; line-height: 18px; color: #64748b; text-align: center; margin: 24px 0 0 0; border-top: 1px solid #1e293b; padding-top: 16px;">
      <p style="margin: 0 0 6px 0;">
        This is an automated account update sent to ${to} regarding your Spendly budget plan.
      </p>
      <p style="margin: 0;">
        <a href="${dashboardUrl}" style="color: #10b981; text-decoration: none;">View Dashboard</a> &middot; Spendly Personal Finance
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
Spendly Daily Spending Summary

Hi ${name || "there"},

Here is your daily spending summary for today (${formattedDate}):

• Daily Designated Limit: ₹${dailyLimit.toLocaleString("en-IN")}
• Today's Total Spending: ₹${todaySpent.toLocaleString("en-IN")}
• Difference: ₹${overspentAmount.toLocaleString("en-IN")} over daily limit
• Adjusted Daily Allowance: ₹${newDailySafeToSpend.toLocaleString("en-IN")}/day for the remaining ${remainingDays} days.

To keep your monthly savings on track, we recommend pacing discretionary purchases for the rest of today.

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
