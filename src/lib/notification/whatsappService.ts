/**
 * WhatsApp Business Platform / Meta Graph API & Gateway Integration Service
 */

export function formatAndValidateWhatsAppNumber(phone?: string | null): {
  isValid: boolean;
  formattedNumber: string;
  error?: string;
} {
  if (!phone) {
    return { isValid: false, formattedNumber: '', error: 'Nomor WhatsApp tidak boleh kosong.' };
  }

  // Bersihkan karakter selain angka
  let cleaned = phone.replace(/[^0-9]/g, '');

  // Format nomor Indonesia
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }

  // Validasi panjang digit standar internasional (E.164: 10-15 digit)
  if (cleaned.length < 10 || cleaned.length > 15) {
    return {
      isValid: false,
      formattedNumber: cleaned,
      error: `Nomor telepon tidak valid (${cleaned}). Harus terdiri dari 10 hingga 15 digit angka.`,
    };
  }

  return { isValid: true, formattedNumber: cleaned };
}

export interface WhatsAppMessageParams {
  to: string;
  body: string;
}

export async function sendWhatsAppMessage({ to, body }: WhatsAppMessageParams): Promise<{
  messageId: string;
  provider: string;
}> {
  const { isValid, formattedNumber, error } = formatAndValidateWhatsAppNumber(to);
  if (!isValid) {
    throw new Error(error || `Nomor WhatsApp tidak valid: ${to}`);
  }

  // Ambil konfigurasi provider aktif dari database / fallback ke .env
  let activeProvider = 'FONNTE';
  let fonnteToken = process.env.WHATSAPP_GATEWAY_TOKEN?.trim() || '';
  let fonnteCountryCode = '62';

  let gatewayUrl = process.env.WHATSAPP_GATEWAY_URL?.trim() || '';
  let gatewayToken = process.env.WHATSAPP_GATEWAY_TOKEN?.trim() || '';

  let phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || '';
  let accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim() || '';
  let apiVersion = process.env.WHATSAPP_API_VERSION?.trim() || 'v21.0';

  try {
    const { getDecryptedSystemConfig } = await import('@/lib/config/systemConfigService');
    const config = await getDecryptedSystemConfig();

    activeProvider = config.activeWaProvider || 'FONNTE';
    if (config.fonnteTokenDecrypted) fonnteToken = config.fonnteTokenDecrypted;
    if (config.fonnteCountryCode) fonnteCountryCode = config.fonnteCountryCode;

    if (config.gatewayUrl) gatewayUrl = config.gatewayUrl;
    if (config.gatewayTokenDecrypted) gatewayToken = config.gatewayTokenDecrypted;

    if (config.metaPhoneNumberId) phoneNumberId = config.metaPhoneNumberId;
    if (config.metaAccessTokenDecrypted) accessToken = config.metaAccessTokenDecrypted;
    if (config.metaApiVersion) apiVersion = config.metaApiVersion;
  } catch {
    // Fallback murni ke konfigurasi .env jika database belum siap
    if (phoneNumberId && accessToken) {
      activeProvider = 'META_CLOUD';
    } else if (gatewayUrl && !gatewayUrl.includes('fonnte.com')) {
      activeProvider = 'GATEWAY_SENDIRI';
    } else {
      activeProvider = 'FONNTE';
    }
  }

  // Eksekusi pengiriman melalui Driver Provider Terdaftar (Driver Pattern)
  const { getWhatsAppDriver } = await import('./whatsappDrivers');
  const driver = getWhatsAppDriver(activeProvider);

  if (!driver) {
    throw new Error(`Provider WhatsApp "${activeProvider}" belum didukung atau driver tidak ditemukan.`);
  }

  const result = await driver.send({
    to: formattedNumber,
    body,
    config: {
      fonnteToken,
      fonnteCountryCode,
      gatewayUrl,
      gatewayToken,
      metaPhoneNumberId: phoneNumberId,
      metaAccessToken: accessToken,
      metaApiVersion: apiVersion,
    },
  });

  return {
    messageId: result.messageId,
    provider: result.provider,
  };
}

import { generateStandardWhatsAppText } from './templates';
export { generateStandardWhatsAppText };

/**
 * Helper pembuat template pesan WhatsApp yang rapi dan terstruktur
 */
export function buildWhatsAppMessage({
  header,
  recipientName,
  content,
  details = [],
  notes,
  linkUrl,
  linkLabel,
}: {
  header: string;
  recipientName: string;
  content: string;
  details?: { label: string; value: string }[];
  notes?: string;
  linkUrl?: string;
  linkLabel?: string;
}): string {
  return generateStandardWhatsAppText({
    type: 'PENGUMUMAN',
    recipientName,
    headline: header,
    summary: content,
    details,
    officerNotes: notes,
    actionUrl: linkUrl,
    actionLabel: linkLabel,
  });
}
