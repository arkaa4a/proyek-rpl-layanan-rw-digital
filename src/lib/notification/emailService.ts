import nodemailer from 'nodemailer';

export function validateEmail(email?: string | null): boolean {
  if (!email) return false;
  const trimmed = email.trim();
  // Standard RFC 5322 regex validation
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed);
}

export function getMailTransporter(overrides?: {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
}) {
  const host = overrides?.host || process.env.SMTP_HOST?.trim();
  const port = overrides?.port || parseInt(process.env.SMTP_PORT || '587', 10);
  const user = overrides?.user || process.env.SMTP_USER?.trim();
  const pass = overrides?.pass || process.env.SMTP_PASS?.trim();
  const secure = overrides?.secure !== undefined ? overrides.secure : (process.env.SMTP_SECURE === 'true' || port === 465);

  if (!host || !user || !pass) {
    throw new Error(
      'Konfigurasi SMTP belum lengkap di file .env atau Konfigurasi Sistem (memerlukan SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS).'
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    // Timeout safeguard
    connectionTimeout: 10000,
    greetingTimeout: 5000,
  });
}

import { generateStandardEmailHtml } from './templates';
export { generateStandardEmailHtml };

export interface EmailTemplateParams {
  title: string;
  recipientName: string;
  badgeText?: string;
  badgeColor?: string; // hex or css color
  description: string;
  details?: { label: string; value: string }[];
  ctaLabel?: string;
  ctaUrl?: string;
  notes?: string;
}

export function generateEmailTemplate({
  title,
  recipientName,
  badgeText,
  badgeColor = '#1e40af',
  description,
  details = [],
  ctaLabel,
  ctaUrl,
  notes,
}: EmailTemplateParams): string {
  return generateStandardEmailHtml({
    type: 'PENGUMUMAN',
    recipientName,
    headline: title,
    summary: description,
    statusBadge: badgeText
      ? {
          label: badgeText,
          tone: 'info',
          color: badgeColor,
          bgColor: '#eff6ff',
        }
      : undefined,
    details,
    officerNotes: notes,
    actionUrl: ctaUrl,
    actionLabel: ctaLabel,
  });
}


function escapeHtml(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

import { EmailAttachment } from './types';

export async function sendEmail({
  to,
  subject,
  html,
  text,
  attachments,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
}) {
  if (!validateEmail(to)) {
    throw new Error(`Alamat email tidak valid: ${to}`);
  }

  let transporter: any;
  let from = process.env.SMTP_FROM || `"Layanan RW Digital" <${process.env.SMTP_USER}>`;

  try {
    const { getDecryptedSystemConfig } = await import('@/lib/config/systemConfigService');
    const config = await getDecryptedSystemConfig();

    if (config.smtpHost && config.smtpUser && config.smtpPassDecrypted) {
      transporter = getMailTransporter({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpSecure,
        user: config.smtpUser,
        pass: config.smtpPassDecrypted,
      });
      if (config.smtpFrom) {
        from = config.smtpFrom;
      }
    } else {
      transporter = getMailTransporter();
    }
  } catch {
    transporter = getMailTransporter();
  }

  const mailOptions: any = {
    from,
    to,
    subject,
    text: text || subject,
    html,
  };

  if (attachments && Array.isArray(attachments) && attachments.length > 0) {
    mailOptions.attachments = attachments;
  }

  const info = await transporter.sendMail(mailOptions);

  return {
    messageId: info.messageId,
    response: info.response,
  };
}
