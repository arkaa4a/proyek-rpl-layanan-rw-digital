import prisma from '@/lib/db';
import {
  NotificationChannel,
  NotificationStatus,
  SendNotificationOptions,
  SendResult,
} from './types';
import { sendEmail, validateEmail } from './emailService';
import {
  sendWhatsAppMessage,
  formatAndValidateWhatsAppNumber,
} from './whatsappService';

function sanitizeErrorMessage(msg?: string): string {
  if (!msg) return 'Terjadi kesalahan sistem yang tidak diketahui.';
  // Hapus pola token atau authorization headers
  return msg
    .replace(/Bearer\s+[A-Za-z0-9_\-.]+/gi, 'Bearer [REDACTED]')
    .replace(/password=[^&]+/gi, 'password=[REDACTED]')
    .replace(/pass=[^&]+/gi, 'pass=[REDACTED]')
    .slice(0, 500); // Batasi panjang pesan
}

export async function dispatchNotification(
  options: SendNotificationOptions
): Promise<SendResult[]> {
  const results: SendResult[] = [];
  const {
    type,
    channels,
    recipient,
    subject,
    content,
    htmlContent,
    referenceId,
    actionUrl,
    attachments,
    metadata,
  } = options;

  for (const channel of channels) {
    const channelRefId = referenceId ? `${referenceId}_${channel}` : undefined;

    // 1. Cek pencegahan duplikasi (Idempotency)
    if (channelRefId) {
      const existing = await prisma.notificationLog.findFirst({
        where: {
          referenceId: channelRefId,
          channel,
        },
      });

      if (existing) {
        // Notifikasi sudah pernah diproses untuk kejadian ini, lewati untuk cegah pesan ganda
        results.push({
          channel,
          status: existing.status as NotificationStatus,
          recipient: existing.recipient,
          recipientName: recipient.namaLengkap,
          logId: existing.id,
          sentAt: existing.sentAt || undefined,
          error: existing.errorMessage || undefined,
        });
        continue;
      }
    }

    // 2. Cek Pengaturan Kanal Global Sistem (Konfigurasi Sistem)
    try {
      const { getRawSystemConfig } = await import('@/lib/config/systemConfigService');
      const sysConfig = await getRawSystemConfig();
      if (channel === 'EMAIL' && sysConfig.emailEnabled === false) {
        continue;
      }
      if (channel === 'WHATSAPP' && sysConfig.whatsappEnabled === false) {
        continue;
      }
      if (type === 'PENGUMUMAN') {
        if (channel === 'EMAIL' && sysConfig.notifyPengumumanEmail === false) continue;
        if (channel === 'WHATSAPP' && sysConfig.notifyPengumumanWa === false) continue;
      } else if (type === 'PENGAJUAN_SURAT') {
        if (channel === 'EMAIL' && sysConfig.notifySuratEmail === false) continue;
        if (channel === 'WHATSAPP' && sysConfig.notifySuratWa === false) continue;
      } else if (type === 'PENGADUAN') {
        if (channel === 'EMAIL' && sysConfig.notifyPengaduanEmail === false) continue;
        if (channel === 'WHATSAPP' && sysConfig.notifyPengaduanWa === false) continue;
      }
    } catch {
      // Lanjutkan jika konfigurasi sistem belum termuat
    }

    // 3. Cek Preferensi Notifikasi Warga (Opt-in / Opt-out perorangan)
    if (channel === 'EMAIL' && recipient.notifyEmail === false) {
      continue;
    }
    if (channel === 'WHATSAPP' && recipient.notifyWhatsapp === false) {
      continue;
    }

    // 3. Tentukan & Validasi Tujuan
    let destination = '';
    let isValidDestination = false;
    let validationError = '';

    if (channel === 'EMAIL') {
      destination = recipient.email?.trim() || '';
      isValidDestination = validateEmail(destination);
      if (!isValidDestination) {
        validationError = destination
          ? `Alamat email tidak valid (${destination}).`
          : 'Penerima tidak memiliki alamat email terdaftar.';
      }
    } else if (channel === 'WHATSAPP') {
      const rawPhone = recipient.noWhatsapp?.trim() || '';
      const phoneValidation = formatAndValidateWhatsAppNumber(rawPhone);
      destination = phoneValidation.formattedNumber || rawPhone;
      isValidDestination = phoneValidation.isValid;
      if (!isValidDestination) {
        validationError = phoneValidation.error || 'Nomor WhatsApp tidak valid atau belum terdaftar.';
      }
    }

    // Jika kontak kosong atau tidak valid, catat log FAILED dengan pesan aman
    if (!isValidDestination) {
      try {
        const failedLog = await prisma.notificationLog.create({
          data: {
            type,
            channel,
            recipient: destination || '(tidak tersedia)',
            recipientName: recipient.namaLengkap,
            subject,
            content,
            status: 'FAILED',
            errorMessage: validationError,
            referenceId: channelRefId,
            actionUrl: actionUrl || null,
            userId: recipient.userId || null,
            wargaId: recipient.wargaId || null,
            metadata: metadata ? JSON.stringify(metadata) : null,
          },
        });
        results.push({
          channel,
          status: 'FAILED',
          recipient: destination,
          recipientName: recipient.namaLengkap,
          logId: failedLog.id,
          error: validationError,
        });
      } catch (err: any) {
        console.error('Gagal mencatat log notifikasi tidak valid:', err);
      }
      continue;
    }

    // 4. Catat Log dengan status PENDING
    let logRecord: any;
    try {
      logRecord = await prisma.notificationLog.create({
        data: {
          type,
          channel,
          recipient: destination,
          recipientName: recipient.namaLengkap,
          subject,
          content,
          status: 'PENDING',
          referenceId: channelRefId,
          actionUrl: actionUrl || null,
          userId: recipient.userId || null,
          wargaId: recipient.wargaId || null,
          metadata: metadata ? JSON.stringify(metadata) : null,
        },
      });
    } catch (err: any) {
      console.error('Gagal membuat record log notifikasi:', err);
    }

    // 5. Eksekusi Pengiriman Sungguhan ke Penyedia
    try {
      if (channel === 'EMAIL') {
        await sendEmail({
          to: destination,
          subject,
          html: htmlContent || `<p>${content.replace(/\n/g, '<br>')}</p>`,
          text: content,
          attachments: attachments && attachments.length > 0 ? attachments : undefined,
        });
      } else if (channel === 'WHATSAPP') {
        await sendWhatsAppMessage({
          to: destination,
          body: content,
        });
      }

      // Jika berhasil, perbarui status menjadi SENT
      const sentAt = new Date();
      if (logRecord) {
        await prisma.notificationLog.update({
          where: { id: logRecord.id },
          data: {
            status: 'SENT',
            sentAt,
            errorMessage: null,
          },
        });
      }

      results.push({
        channel,
        status: 'SENT',
        recipient: destination,
        recipientName: recipient.namaLengkap,
        logId: logRecord?.id,
        sentAt,
      });
    } catch (sendError: any) {
      const cleanError = sanitizeErrorMessage(sendError.message);

      // Jika gagal, perbarui status menjadi FAILED
      if (logRecord) {
        await prisma.notificationLog.update({
          where: { id: logRecord.id },
          data: {
            status: 'FAILED',
            errorMessage: cleanError,
          },
        });
      }

      results.push({
        channel,
        status: 'FAILED',
        recipient: destination,
        recipientName: recipient.namaLengkap,
        logId: logRecord?.id,
        error: cleanError,
      });
    }
  }

  return results;
}

/**
 * Mekanisme Retry Pengiriman Notifikasi yang Gagal
 */
export async function retryNotificationLog(logId: string): Promise<{
  success: boolean;
  status: NotificationStatus;
  error?: string;
}> {
  const log = await prisma.notificationLog.findUnique({
    where: { id: logId },
  });

  if (!log) {
    return { success: false, status: 'FAILED', error: 'Catatan notifikasi tidak ditemukan.' };
  }

  if (log.status === 'SENT') {
    return {
      success: true,
      status: 'SENT',
      error: 'Notifikasi ini sudah berhasil terkirim sebelumnya.',
    };
  }

  // Dapatkan nomor/email terbaru jika warga telah memperbarui profil kontaknya
  let targetRecipient = log.recipient;
  if (log.wargaId) {
    const warga = await prisma.warga.findUnique({
      where: { id: log.wargaId },
      select: { noWhatsapp: true, email: true },
    });
    if (log.channel === 'WHATSAPP' && warga?.noWhatsapp) {
      const valid = formatAndValidateWhatsAppNumber(warga.noWhatsapp);
      if (valid.isValid) targetRecipient = valid.formattedNumber;
    } else if (log.channel === 'EMAIL' && warga?.email) {
      if (validateEmail(warga.email)) targetRecipient = warga.email;
    }
  }

  // Lakukan pengiriman ulang
  try {
    if (log.channel === 'EMAIL') {
      let retryAttachments: any[] | undefined = undefined;
      let retryHtml: string | undefined = undefined;

      try {
        if (log.metadata) {
          const parsed = JSON.parse(log.metadata);
          if (parsed.emailHtml) retryHtml = parsed.emailHtml;
          if (parsed.hasAttachment && parsed.storagePath && parsed.attachmentFileName) {
            const fs = await import('fs');
            if (fs.existsSync(parsed.storagePath)) {
              retryAttachments = [
                {
                  filename: parsed.attachmentFileName,
                  content: fs.readFileSync(parsed.storagePath),
                  contentType: 'application/pdf',
                },
              ];
            }
          }
        }
      } catch (metaErr) {
        // Fallback jika metadata gagal diurai
      }

      await sendEmail({
        to: targetRecipient,
        subject: log.subject,
        html: retryHtml || `<p>${log.content.replace(/\n/g, '<br>')}</p>`,
        text: log.content,
        attachments: retryAttachments,
      });
    } else if (log.channel === 'WHATSAPP') {
      await sendWhatsAppMessage({
        to: targetRecipient,
        body: log.content,
      });
    }

    const sentAt = new Date();
    await prisma.notificationLog.update({
      where: { id: logId },
      data: {
        status: 'SENT',
        recipient: targetRecipient,
        sentAt,
        errorMessage: null,
        retryCount: { increment: 1 },
      },
    });

    return { success: true, status: 'SENT' };
  } catch (error: any) {
    const cleanError = sanitizeErrorMessage(error.message);
    await prisma.notificationLog.update({
      where: { id: logId },
      data: {
        status: 'FAILED',
        errorMessage: cleanError,
        retryCount: { increment: 1 },
      },
    });

    return { success: false, status: 'FAILED', error: cleanError };
  }
}
