'use server';

import { getSession } from '@/lib/auth';
import {
  getClientSystemConfig,
  updateGeneralConfig,
  updateFonnteConfig,
  updateGatewayConfig,
  updateMetaConfig,
  updateSmtpConfig,
  updateNotificationChannels,
  switchActiveWhatsAppProvider,
  updateChatbotConfig,
  toggleChatbotStatus,
} from '@/lib/config/systemConfigService';
import {
  testFonnteConnection,
  testGatewayConnection,
  testSmtpConnection,
  sendTestWhatsAppMessage,
  sendTestEmailMessage,
  getConnectionTestHistory,
  testGeminiConnection,
  testChatbotQuery,
} from '@/lib/config/connectionTestService';

/**
 * Validasi otorisasi SUPER_ADMIN di tingkat server
 */
async function requireSuperAdmin() {
  const session = await getSession();
  if (!session || session.role !== 'SUPER_ADMIN') {
    throw new Error('Akses Ditolak: Fitur konfigurasi sistem hanya dapat diakses oleh SUPER_ADMIN.');
  }
  return session;
}

/**
 * 1. Ambil data konfigurasi lengkap (dengan rahasia yang di-masking aman)
 */
export async function getSystemConfigAction() {
  try {
    await requireSuperAdmin();
    const config = await getClientSystemConfig();
    return { success: true, data: config };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal memuat konfigurasi sistem.' };
  }
}

/**
 * 2. Simpan Konfigurasi Umum Sistem
 */
export async function saveGeneralConfigAction(data: {
  appName: string;
  rwNomor: string;
  kelurahan?: string;
  kecamatan?: string;
  kota?: string;
  kontakEmail?: string;
  kontakWa?: string;
  alamatSekretariat?: string;
  deskripsiSistem?: string;
}) {
  try {
    const session = await requireSuperAdmin();
    await updateGeneralConfig(data, session.username, session.id);
    const updated = await getClientSystemConfig();
    return {
      success: true,
      message: 'Konfigurasi umum sistem berhasil diperbarui.',
      data: updated,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menyimpan konfigurasi umum.' };
  }
}

/**
 * 3. Simpan Konfigurasi Fonnte
 */
export async function saveFonnteConfigAction(data: {
  token?: string;
  countryCode?: string;
}) {
  try {
    const session = await requireSuperAdmin();
    await updateFonnteConfig(data, session.username, session.id);
    const updated = await getClientSystemConfig();
    return {
      success: true,
      message: 'Pengaturan API Fonnte berhasil disimpan secara aman.',
      data: updated,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menyimpan konfigurasi Fonnte.' };
  }
}

/**
 * 4. Simpan Konfigurasi Gateway Sendiri
 */
export async function saveGatewayConfigAction(data: {
  url?: string;
  token?: string;
}) {
  try {
    const session = await requireSuperAdmin();
    await updateGatewayConfig(data, session.username, session.id);
    const updated = await getClientSystemConfig();
    return {
      success: true,
      message: 'Pengaturan Gateway WhatsApp Sendiri berhasil disimpan.',
      data: updated,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menyimpan konfigurasi Gateway Sendiri.' };
  }
}

/**
 * 5. Simpan Konfigurasi Meta Cloud
 */
export async function saveMetaConfigAction(data: {
  phoneNumberId?: string;
  accessToken?: string;
  apiVersion?: string;
}) {
  try {
    const session = await requireSuperAdmin();
    await updateMetaConfig(data, session.username, session.id);
    const updated = await getClientSystemConfig();
    return {
      success: true,
      message: 'Pengaturan Meta WhatsApp Cloud API berhasil disimpan.',
      data: updated,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menyimpan konfigurasi Meta Cloud.' };
  }
}

/**
 * 6. Simpan Konfigurasi Email SMTP
 */
export async function saveSmtpConfigAction(data: {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass?: string;
  from: string;
}) {
  try {
    const session = await requireSuperAdmin();
    await updateSmtpConfig(data, session.username, session.id);
    const updated = await getClientSystemConfig();
    return {
      success: true,
      message: 'Pengaturan Email SMTP berhasil disimpan.',
      data: updated,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menyimpan konfigurasi SMTP.' };
  }
}

/**
 * 7. Simpan Pengaturan Kanal Notifikasi
 */
export async function saveNotificationChannelsAction(data: {
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  inAppEnabled: boolean;
  notifyPengumumanEmail: boolean;
  notifyPengumumanWa: boolean;
  notifySuratEmail: boolean;
  notifySuratWa: boolean;
  notifyPengaduanEmail: boolean;
  notifyPengaduanWa: boolean;
}) {
  try {
    const session = await requireSuperAdmin();
    await updateNotificationChannels(data, session.username, session.id);
    const updated = await getClientSystemConfig();
    return {
      success: true,
      message: 'Status dan preferensi kanal notifikasi berhasil diperbarui.',
      data: updated,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menyimpan pengaturan kanal.' };
  }
}

/**
 * 8. Ganti Provider WhatsApp Aktif
 */
export async function switchWhatsAppProviderAction(
  provider: 'FONNTE' | 'GATEWAY_SENDIRI' | 'META_CLOUD'
) {
  try {
    const session = await requireSuperAdmin();
    await switchActiveWhatsAppProvider(provider, session.username, session.id);
    const updated = await getClientSystemConfig();
    return {
      success: true,
      message: `Provider WhatsApp aktif berhasil dialihkan ke ${provider}.`,
      data: updated,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mengubah provider aktif.' };
  }
}

/**
 * 9. Uji Koneksi Fonnte
 */
export async function testFonnteConnectionAction(tokenOverride?: string) {
  try {
    const session = await requireSuperAdmin();
    const result = await testFonnteConnection(tokenOverride, session.username);
    const updated = await getClientSystemConfig();
    return { ...result, config: updated };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Gagal menguji koneksi Fonnte.',
      config: null,
      latencyMs: 0,
      deviceInfo: null,
      message: undefined,
    };
  }
}

/**
 * 10. Uji Koneksi Gateway Sendiri
 */
export async function testGatewayConnectionAction(
  urlOverride?: string,
  tokenOverride?: string
) {
  try {
    const session = await requireSuperAdmin();
    const result = await testGatewayConnection(urlOverride, tokenOverride, session.username);
    const updated = await getClientSystemConfig();
    return { ...result, config: updated };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Gagal menguji koneksi Gateway.',
      config: null,
      latencyMs: 0,
      statusCode: undefined,
      message: undefined,
    };
  }
}

/**
 * 11. Uji Koneksi Email SMTP
 */
export async function testSmtpConnectionAction(overrides?: {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
}) {
  try {
    const session = await requireSuperAdmin();
    const result = await testSmtpConnection(overrides, session.username);
    const updated = await getClientSystemConfig();
    return { ...result, config: updated };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Gagal menguji koneksi SMTP.',
      config: null,
      latencyMs: 0,
      message: undefined,
    };
  }
}

/**
 * 12. Kirim Pesan WhatsApp Percobaan (Eksplisit dari Administrator)
 */
export async function sendTestWhatsAppAction(
  targetNumber: string,
  provider?: 'FONNTE' | 'GATEWAY_SENDIRI' | 'META_CLOUD'
) {
  try {
    const session = await requireSuperAdmin();
    if (!targetNumber?.trim()) {
      return {
        success: false,
        error: 'Nomor WhatsApp tujuan wajib diisi untuk uji coba.',
        latencyMs: 0,
        provider: provider || 'FONNTE',
        messageId: undefined,
      };
    }
    const result = await sendTestWhatsAppMessage({
      targetNumber: targetNumber.trim(),
      provider,
      adminUsername: session.username,
    });
    return result;
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Gagal mengirim pesan percobaan WhatsApp.',
      latencyMs: 0,
      provider: provider || 'FONNTE',
      messageId: undefined,
    };
  }
}

/**
 * 13. Kirim Email Percobaan SMTP (Eksplisit dari Administrator)
 */
export async function sendTestEmailAction(targetEmail: string) {
  try {
    const session = await requireSuperAdmin();
    if (!targetEmail?.trim()) {
      return {
        success: false,
        error: 'Alamat email tujuan wajib diisi untuk uji coba.',
        latencyMs: 0,
        messageId: undefined,
        message: undefined,
      };
    }
    const result = await sendTestEmailMessage({
      targetEmail: targetEmail.trim(),
      adminUsername: session.username,
    });
    return result;
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Gagal mengirim email percobaan.',
      latencyMs: 0,
      messageId: undefined,
      message: undefined,
    };
  }
}

/**
 * 14. Ambil Riwayat Pengujian Koneksi
 */
export async function getConnectionHistoryAction(limit = 25) {
  try {
    await requireSuperAdmin();
    const history = await getConnectionTestHistory(limit);
    return { success: true, data: history };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal memuat riwayat pengujian.' };
  }
}

/**
 * 15. Simpan Pengaturan Chatbot AI
 */
export async function saveChatbotConfigAction(data: {
  chatbotEnabled?: boolean;
  provider?: string;
  model?: string;
  apiKey?: string;
  apiKeyBackup1?: string;
  apiKeyBackup2?: string;
  temperature?: number;
  maxTokens?: number;
  systemInstruction?: string;
  fallbackMessage?: string;
  outOfScopeMessage?: string;
}) {
  try {
    const session = await requireSuperAdmin();
    await updateChatbotConfig(data, session.username, session.id);
    const updated = await getClientSystemConfig();
    return {
      success: true,
      message: 'Pengaturan Chatbot AI berhasil disimpan secara aman.',
      data: updated,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menyimpan konfigurasi Chatbot AI.' };
  }
}

/**
 * 16. Aktifkan / Nonaktifkan Chatbot AI
 */
export async function toggleChatbotStatusAction(enabled: boolean) {
  try {
    const session = await requireSuperAdmin();
    await toggleChatbotStatus(enabled, session.username, session.id);
    const updated = await getClientSystemConfig();
    return {
      success: true,
      message: `Chatbot AI berhasil ${enabled ? 'diaktifkan' : 'dinonaktifkan'}.`,
      data: updated,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mengubah status Chatbot AI.' };
  }
}

/**
 * 17. Uji Koneksi Google Gemini AI
 */
export async function testGeminiConnectionAction(
  apiKeyOverride?: string,
  modelOverride?: string
) {
  try {
    const session = await requireSuperAdmin();
    const result = await testGeminiConnection(apiKeyOverride, modelOverride, session.username);
    const updated = await getClientSystemConfig();
    return { ...result, config: updated };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Gagal menguji koneksi Google Gemini.',
      config: null,
      latencyMs: 0,
    };
  }
}

/**
 * 18. Uji Chatbot AI dengan Pertanyaan Nyata
 */
export async function testChatbotQueryAction(
  prompt: string,
  options?: {
    apiKeyOverride?: string;
    modelOverride?: string;
    temperature?: number;
    maxTokens?: number;
    systemInstruction?: string;
  }
) {
  try {
    const session = await requireSuperAdmin();
    const result = await testChatbotQuery(prompt, options, session.username);
    return result;
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Gagal menguji chatbot AI.',
      latencyMs: 0,
    };
  }
}

