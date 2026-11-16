export type NotificationChannel = 'EMAIL' | 'WHATSAPP';
export type NotificationType =
  | 'PENGUMUMAN'
  | 'PENGAJUAN_SURAT'
  | 'PENGADUAN'
  | 'INFORMASI_LAYANAN';
export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED';

export interface RecipientInfo {
  userId?: string | null;
  wargaId?: string | null;
  namaLengkap: string;
  email?: string | null;
  noWhatsapp?: string | null;
  notifyEmail?: boolean;
  notifyWhatsapp?: boolean;
}

export interface EmailAttachment {
  filename: string;
  content?: Buffer | string;
  path?: string;
  contentType?: string;
}

export interface SendNotificationOptions {
  type: NotificationType;
  channels: NotificationChannel[];
  recipient: RecipientInfo;
  subject: string;
  content: string; // Plain text or summary
  htmlContent?: string; // HTML for email
  referenceId?: string; // Idempotency key to avoid duplicate sends
  actionUrl?: string; // Link to detail page
  attachments?: EmailAttachment[];
  metadata?: Record<string, any>;
}

export interface SendResult {
  channel: NotificationChannel;
  status: NotificationStatus;
  recipient: string;
  recipientName?: string;
  logId?: string;
  error?: string;
  sentAt?: Date;
}
