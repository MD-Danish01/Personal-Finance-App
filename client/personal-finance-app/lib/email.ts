import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "Personal Finance <noreply@devforge.danishdev.me>";

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
  baseUrl,
}: VerificationEmailParams): Promise<{ success: boolean; error?: string }> {
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    baseUrl ||
    "https://devforge.danishdev.me";

  const verificationUrl = `${origin.replace(/\/$/, "")}/api/auth/verify?token=${encodeURIComponent(
    token,
  )}&email=${encodeURIComponent(to)}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email - Personal Finance</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0c0e12; color: #f3f4f6; margin: 0; padding: 40px 20px;">
  <div style="max-width: 540px; margin: 0 auto; background-color: #161a22; border: 1px solid #232836; border-radius: 24px; padding: 36px 32px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);">
    <div style="margin-bottom: 24px;">
      <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #10b981; background: rgba(16, 185, 129, 0.12); padding: 4px 10px; border-radius: 999px;">
        Personal Finance Assistant
      </span>
    </div>

    <h1 style="font-size: 22px; font-weight: 800; color: #ffffff; margin: 0 0 12px 0; letter-spacing: -0.5px;">
      Verify your email address
    </h1>

    <p style="font-size: 14px; line-height: 22px; color: #9ca3af; margin: 0 0 24px 0;">
      Hi ${name || "there"},<br><br>
      Thank you for joining Personal Finance Assistant. Please verify your email address to secure your account and activate automated financial insights.
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
Personal Finance Assistant

Verify your email address

Hi ${name || "there"},

Thank you for joining Personal Finance Assistant. Please verify your email address by clicking the link below:

${verificationUrl}

This link will expire in 24 hours. If you did not create an account, you can safely ignore this email.
  `.trim();

  if (!resend) {
    console.log(`[Resend (Dev Mode)]: RESEND_API_KEY not configured. Verification URL for ${to}: ${verificationUrl}`);
    return { success: true };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: "Verify your email - Personal Finance Assistant",
      html,
      text,
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
