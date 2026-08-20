/**
 * Email Service — SMTP integration for sending platform emails.
 * ============================================================================
 * Uses nodemailer with configurable SMTP settings (stored in the DB via the
 * SmtpSettings model). The admin configures SMTP in the Admin Panel →
 * System & Database → SMTP Settings section.
 *
 * Features:
 *   - sendEmail() — generic email sender (HTML + plain text)
 *   - sendCommitConfirmationEmail() — formal AI-generated commit confirmation
 *   - testSmtpConnection() — health check (admin "Send test email" button)
 *   - All sent emails are logged to the EmailLog table for audit.
 *
 * NOTE: This module is server-only (imports nodemailer).
 */

import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { db } from "@/lib/db";
import { aiComplete } from "@/lib/ai";
import { logger } from "@/lib/logger";

export interface SmtpConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
  encryption: "starttls" | "ssl" | "none";
  enabled: boolean;
}

export interface SendEmailParams {
  to: string;
  toName?: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  type?: string; // "commit_confirmation" | "institution_invite" | "notification" | "test"
  relatedId?: string; // e.g. commit id, institution id
}

let cachedTransporter: Transporter | null = null;
let cachedConfigKey: string | null = null;

/**
 * Load SMTP settings from the DB. Returns null if not configured or disabled.
 */
async function loadSmtpConfig(): Promise<SmtpConfig | null> {
  try {
    const settings = await db.smtpSettings.findUnique({ where: { id: "default" } });
    if (!settings || !settings.enabled) return null;
    return {
      host: settings.host,
      port: settings.port,
      username: settings.username,
      password: settings.password,
      fromEmail: settings.fromEmail,
      fromName: settings.fromName,
      encryption: settings.encryption as "starttls" | "ssl" | "none",
      enabled: settings.enabled,
    };
  } catch (err) {
    logger.warn("[email-service] Failed to load SMTP settings:", err);
    return null;
  }
}

/**
 * Get or create a nodemailer transporter based on the current SMTP config.
 * Caches the transporter until the config changes.
 */
async function getTransporter(): Promise<{ transporter: Transporter; config: SmtpConfig } | null> {
  const config = await loadSmtpConfig();
  if (!config) return null;

  const configKey = `${config.host}:${config.port}:${config.username}`;
  if (cachedTransporter && cachedConfigKey === configKey) {
    return { transporter: cachedTransporter, config };
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.encryption === "ssl", // true for 465, false for 587/25
    auth: config.username ? {
      user: config.username,
      pass: config.password,
    } : undefined,
    tls: config.encryption === "starttls" ? { rejectUnauthorized: false } : undefined,
  });

  cachedTransporter = transporter;
  cachedConfigKey = configKey;
  return { transporter, config };
}

/**
 * Send an email. Returns { success, messageId?, error? }.
 * Always logs to the EmailLog table.
 */
export async function sendEmail(params: SendEmailParams): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  const { transporter, config } = (await getTransporter()) || {};
  if (!transporter || !config) {
    // Log as queued (SMTP not configured).
    await logEmail({ ...params, status: "queued", error: "SMTP not configured or disabled" });
    return { success: false, error: "SMTP not configured or disabled" };
  }

  try {
    const info = await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: params.toName ? `"${params.toName}" <${params.to}>` : params.to,
      subject: params.subject,
      html: params.bodyHtml,
      text: params.bodyText || stripHtml(params.bodyHtml),
    });

    await logEmail({
      ...params,
      status: "sent",
      smtpResponse: info.messageId || info.response,
      sentAt: new Date(),
    });

    return { success: true, messageId: info.messageId };
  } catch (err) {
    const errorMsg = String(err).slice(0, 500);
    await logEmail({ ...params, status: "failed", error: errorMsg });
    logger.error("[email-service] Send failed:", err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Test the SMTP connection by sending a simple test email.
 * Used by the admin "Send test email" button.
 */
export async function testSmtpConnection(testToEmail: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const result = await sendEmail({
    to: testToEmail,
    subject: "Cirkle — SMTP Test Email",
    bodyHtml: `
      <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #0d9488;">✅ SMTP Test Successful</h1>
        <p>This is a test email from your Cirkle platform.</p>
        <p>If you received this, your SMTP settings are correctly configured.</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;" />
        <p style="color: #6b7280; font-size: 12px;">
          Sent at: ${new Date().toISOString()}<br/>
          Platform: Cirkle (دوائر)
        </p>
      </div>
    `,
    bodyText: "SMTP Test Successful\n\nThis is a test email from your Cirkle platform.",
    type: "test",
  });

  // Update the SmtpSettings record with test result.
  try {
    await db.smtpSettings.update({
      where: { id: "default" },
      data: {
        lastTestSentAt: new Date(),
        lastTestStatus: result.success ? "success" : `failed: ${result.error || ""}`,
      },
    });
  } catch {
    // non-critical
  }

  return result;
}

/**
 * Send a formal AI-generated commit confirmation email.
 * Used when a user presses "Commit" and chooses to send it as an email.
 */
export async function sendCommitConfirmationEmail(params: {
  to: string;
  toName?: string;
  commitTitle: string;
  commitDescription: string;
  commitType: string; // price | commodity | agreement | work | service | etc.
  parties: Array<{ name: string; role: string }>;
  amount?: number;
  currency?: string;
  deadline?: string;
  conditions: string[];
  isFromInstitution?: boolean;
  senderEmail?: string; // auto-detected for institutions
  receiverEmail?: string; // auto-detected for institutions
  aiGeneratedBody?: string; // pre-generated formal body (optional)
}): Promise<{ success: boolean; messageId?: string; error?: string; html?: string }> {
  // ── Generate formal email body via AI ──────────────────────────────────
  let formalBody = params.aiGeneratedBody;
  if (!formalBody) {
    try {
      formalBody = await generateFormalCommitEmail(params);
    } catch {
      formalBody = generateFallbackCommitEmail(params);
    }
  }

  const subject = `[Cirkle Commit] ${params.commitTitle}`;

  const fullHtml = wrapInEmailTemplate({
    title: "Commit Confirmation",
    subtitle: params.isFromInstitution ? "Institutional Agreement" : "Personal Agreement",
    body: formalBody,
    meta: {
      "Commit Type": params.commitType,
      "Parties": params.parties.map(p => `${p.name} (${p.role})`).join(", "),
      ...(params.amount ? { "Amount": `${params.amount} ${params.currency || ""}`.trim() } : {}),
      ...(params.deadline ? { "Deadline": params.deadline } : {}),
      ...(params.senderEmail ? { "Sender Email": params.senderEmail } : {}),
      ...(params.receiverEmail ? { "Recipient Email": params.receiverEmail } : {}),
    },
    footer: params.isFromInstitution
      ? "This commit was sent from an institution. The company emails have been auto-detected from registered addresses."
      : "This commit confirmation was generated by Cirkle Brain AI.",
  });

  const result = await sendEmail({
    to: params.to,
    toName: params.toName,
    subject,
    bodyHtml: fullHtml,
    bodyText: stripHtml(formalBody),
    type: "commit_confirmation",
  });

  return { ...result, html: fullHtml };
}

/**
 * Generate a formal commit email body using the AI.
 */
async function generateFormalCommitEmail(params: {
  commitTitle: string;
  commitDescription: string;
  commitType: string;
  parties: Array<{ name: string; role: string }>;
  amount?: number;
  currency?: string;
  deadline?: string;
  conditions: string[];
  isFromInstitution?: boolean;
}): Promise<string> {
  const prompt = `Generate a formal, professional email confirming a business agreement/commitment. The email should be:

1. Addressed formally (Dear [Party Names],)
2. Reference the commit title: "${params.commitTitle}"
3. Summarize the agreement: ${params.commitDescription}
4. List the type: ${params.commitType}
5. List the parties: ${params.parties.map(p => `${p.name} (${p.role})`).join(", ")}
6. ${params.amount ? `Amount: ${params.amount} ${params.currency || ""}`.trim() + "\n" : ""}7. ${params.deadline ? `Deadline: ${params.deadline}\n` : ""}8. List the conditions: ${params.conditions.join("; ")}
9. ${params.isFromInstitution ? "Note this is an institutional commitment from a registered company." : ""}
10. Close formally with "Sincerely," and "Cirkle Commit System"

Format as HTML. Keep it professional, clear, and legally clear. Do not include <html> or <body> tags — just the inner content.`;

  const result = await aiComplete({
    prompt,
    systemPrompt: "You are a formal business email writer. Generate professional, legally-clear commit confirmation emails. Always respond in HTML format (inner content only, no body/html tags).",
    maxTokens: 800,
    temperature: 0.3,
  });

  return result.text || generateFallbackCommitEmail(params);
}

function generateFallbackCommitEmail(params: {
  commitTitle: string;
  commitDescription: string;
  commitType: string;
  parties: Array<{ name: string; role: string }>;
  amount?: number;
  currency?: string;
  deadline?: string;
  conditions: string[];
  isFromInstitution?: boolean;
}): string {
  return `
    <p>Dear ${params.parties.map(p => p.name).join(" and ")},</p>
    <p>This email serves as formal confirmation of the following commitment:</p>
    <h3>${escapeHtml(params.commitTitle)}</h3>
    <p>${escapeHtml(params.commitDescription)}</p>
    <table style="width:100%; border-collapse:collapse; margin:16px 0;">
      <tr><td style="padding:8px; border:1px solid #e5e7eb; font-weight:bold;">Type:</td><td style="padding:8px; border:1px solid #e5e7eb;">${escapeHtml(params.commitType)}</td></tr>
      ${params.amount ? `<tr><td style="padding:8px; border:1px solid #e5e7eb; font-weight:bold;">Amount:</td><td style="padding:8px; border:1px solid #e5e7eb;">${params.amount} ${escapeHtml(params.currency || "")}</td></tr>` : ""}
      ${params.deadline ? `<tr><td style="padding:8px; border:1px solid #e5e7eb; font-weight:bold;">Deadline:</td><td style="padding:8px; border:1px solid #e5e7eb;">${escapeHtml(params.deadline)}</td></tr>` : ""}
    </table>
    <p><strong>Conditions:</strong></p>
    <ul>${params.conditions.map(c => `<li>${escapeHtml(c)}</li>`).join("")}</ul>
    <p>This commitment is binding and recorded on the Cirkle platform.</p>
    <p>Sincerely,<br/>Cirkle Commit System</p>
  `;
}

/**
 * Wrap content in the standard Cirkle email template.
 */
function wrapInEmailTemplate(opts: {
  title: string;
  subtitle?: string;
  body: string;
  meta?: Record<string, string>;
  footer?: string;
}): string {
  const metaRows = opts.meta
    ? Object.entries(opts.meta)
        .map(
          ([k, v]) =>
            `<tr><td style="padding:6px 12px; color:#6b7280; font-size:12px;">${escapeHtml(k)}</td><td style="padding:6px 12px; font-size:13px;">${escapeHtml(v)}</td></tr>`,
        )
        .join("")
    : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0; padding:0; background:#f3f4f6; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; margin-top:24px; margin-bottom:24px;">
    <div style="background:linear-gradient(135deg,#0d9488,#0f766e); padding:24px 32px;">
      <h1 style="margin:0; color:#ffffff; font-size:22px;">${escapeHtml(opts.title)}</h1>
      ${opts.subtitle ? `<p style="margin:4px 0 0; color:#a7f3d0; font-size:13px;">${escapeHtml(opts.subtitle)}</p>` : ""}
    </div>
    <div style="padding:24px 32px;">
      ${opts.body}
      ${metaRows ? `<table style="width:100%; border-collapse:collapse; margin-top:16px; background:#f9fafb; border-radius:8px;">${metaRows}</table>` : ""}
    </div>
    <div style="padding:16px 32px; background:#f9fafb; border-top:1px solid #e5e7eb;">
      <p style="margin:0; color:#6b7280; font-size:11px;">${escapeHtml(opts.footer || "Generated by Cirkle Brain AI")}</p>
      <p style="margin:4px 0 0; color:#9ca3af; font-size:11px;">Cirkle (دوائر) — Privacy First. Always.</p>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Log an email to the EmailLog table.
 */
async function logEmail(params: SendEmailParams & {
  status: string;
  error?: string;
  smtpResponse?: string;
  sentAt?: Date;
}): Promise<void> {
  try {
    await db.emailLog.create({
      data: {
        type: params.type || "notification",
        toEmail: params.to,
        toName: params.toName || null,
        fromEmail: "platform@cirkle.app", // will be replaced by actual from email
        subject: params.subject,
        bodyHtml: params.bodyHtml,
        bodyText: params.bodyText || null,
        status: params.status,
        error: params.error || null,
        relatedId: params.relatedId || null,
        smtpResponse: params.smtpResponse || null,
        sentAt: params.sentAt || null,
      },
    });
  } catch (err) {
    logger.warn("[email-service] Failed to log email:", err);
  }
}
