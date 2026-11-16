import prisma from '@/lib/db';
import {
  encryptSecret,
  decryptSecret,
  maskSecret,
} from '@/lib/encryption';
import type { SystemConfig } from '@prisma/client';

/**
 * Interface data mentah SystemConfig dari database dengan dukungan field backup API Key.
 */
export type RawSystemConfig = SystemConfig & {
  apiKeyBackup1?: string | null;
  apiKeyBackup2?: string | null;
};

export interface ClientSystemConfig {
  id: string;
  // 1. Umum
  appName: string;
  rwNomor: string;
  kelurahan: string;
  kecamatan: string;
  kota: string;
  kontakEmail: string;
  kontakWa: string;
  alamatSekretariat: string;
  deskripsiSistem: string;

  // 2. WhatsApp
  activeWaProvider: 'FONNTE' | 'GATEWAY_SENDIRI' | 'META_CLOUD' | string;
  
  // Fonnte
  hasFonnteToken: boolean;
  fonnteTokenMasked: string;
  fonnteCountryCode: string;
  fonnteStatus: 'ACTIVE' | 'READY' | 'UNCONFIGURED' | 'FAILED' | string;
  fonnteLastTestedAt?: string | null;
  fonnteLastError?: string | null;
  fonnteDeviceInfo?: any | null;

  // Gateway Sendiri
  gatewayUrl: string;
  hasGatewayToken: boolean;
  gatewayTokenMasked: string;
  gatewayStatus: 'ACTIVE' | 'READY' | 'UNCONFIGURED' | 'FAILED' | string;
  gatewayLastTestedAt?: string | null;
  gatewayLastError?: string | null;

  // Meta Cloud API
  metaPhoneNumberId: string;
  hasMetaAccessToken: boolean;
  metaAccessTokenMasked: string;
  metaApiVersion: string;
  metaStatus: 'ACTIVE' | 'READY' | 'UNCONFIGURED' | 'FAILED' | string;
  metaLastTestedAt?: string | null;
  metaLastError?: string | null;

  // 3. SMTP Email
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  hasSmtpPass: boolean;
  smtpPassMasked: string;
  smtpFrom: string;
  smtpStatus: 'READY' | 'UNCONFIGURED' | 'FAILED' | string;
  smtpLastTestedAt?: string | null;
  smtpLastError?: string | null;

  // 4. Kanal Notifikasi
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  inAppEnabled: boolean;
  notifyPengumumanEmail: boolean;
  notifyPengumumanWa: boolean;
  notifySuratEmail: boolean;
  notifySuratWa: boolean;
  notifyPengaduanEmail: boolean;
  notifyPengaduanWa: boolean;

  // 5. Chatbot AI (Google Gemini)
  chatbotEnabled: boolean;
  aiProvider: 'GOOGLE_GEMINI' | string;
  aiModel: string;
  hasGeminiApiKey: boolean;
  geminiApiKeyMasked: string;
  hasApiKeyBackup1: boolean;
  apiKeyBackup1Masked: string;
  apiKeyBackup1?: string | null;
  hasApiKeyBackup2: boolean;
  apiKeyBackup2Masked: string;
  apiKeyBackup2?: string | null;
  aiTemperature: number;
  aiMaxTokens: number;
  aiSystemInstruction: string;
  aiFallbackMessage: string;
  aiOutOfScopeMessage: string;
  aiStatus: 'ACTIVE' | 'READY' | 'UNCONFIGURED' | 'FAILED' | 'NONAKTIF' | string;
  aiLastTestedAt?: string | null;
  aiLastError?: string | null;

  updatedAt: string;
  updatedBy?: string | null;
}

/**
 * Memuat konfigurasi mentah dari database.
 * Jika belum ada di DB, otomatis menginisialisasi singleton row dengan nilai default dan membaca .env.
 */
export async function getRawSystemConfig(): Promise<RawSystemConfig> {
  let config = await prisma.systemConfig.findUnique({
    where: { id: 'default' },
  });

  if (!config) {
    // Inisialisasi awal dari environment variable yang tersedia
    const envGwUrl = process.env.WHATSAPP_GATEWAY_URL?.trim() || '';
    const envGwToken = process.env.WHATSAPP_GATEWAY_TOKEN?.trim() || '';
    const isFonnte = envGwUrl.includes('fonnte.com') || (!envGwUrl && !!envGwToken);

    const envSmtpHost = process.env.SMTP_HOST?.trim() || 'smtp.gmail.com';
    const envSmtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const envSmtpSecure = process.env.SMTP_SECURE === 'true' || envSmtpPort === 465;
    const envSmtpUser = process.env.SMTP_USER?.trim() || '';
    const envSmtpPass = process.env.SMTP_PASS?.trim() || '';
    const envSmtpFrom = process.env.SMTP_FROM?.trim() || (envSmtpUser ? `"Pelayanan Digital RW" <${envSmtpUser}>` : '');

    const envMetaPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || '';
    const envMetaToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim() || '';

    // Tentukan provider awal
    let initialProvider = 'FONNTE';
    if (envMetaPhoneId && envMetaToken) {
      initialProvider = 'META_CLOUD';
    } else if (envGwUrl && !envGwUrl.includes('fonnte.com')) {
      initialProvider = 'GATEWAY_SENDIRI';
    }

    config = await prisma.systemConfig.create({
      data: {
        id: 'default',
        appName: 'Sistem Informasi Pelayanan Digital RW 12',
        rwNomor: '12',
        kelurahan: 'Harjamukti',
        kecamatan: 'Harjamukti',
        kota: 'Kota Cirebon',
        kontakEmail: envSmtpUser || 'arkasaputra630@gmail.com',
        kontakWa: '085799873238',
        alamatSekretariat: 'Balai Warga RW 12, Kelurahan Harjamukti, Kecamatan Harjamukti, Kota Cirebon',
        deskripsiSistem: 'Portal pelayanan publik, administrasi persuratan, dan pengaduan warga digital terpadu tingkat Rukun Warga 12 Kelurahan Harjamukti, Kota Cirebon berbasis Web dan AI.',

        activeWaProvider: initialProvider,

        // Fonnte
        fonnteToken: isFonnte && envGwToken ? encryptSecret(envGwToken) : null,
        fonnteCountryCode: '62',
        fonnteStatus: isFonnte && envGwToken ? (initialProvider === 'FONNTE' ? 'ACTIVE' : 'READY') : 'UNCONFIGURED',

        // Gateway Sendiri
        gatewayUrl: !isFonnte ? envGwUrl : '',
        gatewayToken: !isFonnte && envGwToken ? encryptSecret(envGwToken) : null,
        gatewayStatus: !isFonnte && envGwUrl ? (initialProvider === 'GATEWAY_SENDIRI' ? 'ACTIVE' : 'READY') : 'UNCONFIGURED',

        // Meta Cloud
        metaPhoneNumberId: envMetaPhoneId,
        metaAccessToken: envMetaToken ? encryptSecret(envMetaToken) : null,
        metaApiVersion: process.env.WHATSAPP_API_VERSION?.trim() || 'v21.0',
        metaStatus: envMetaPhoneId && envMetaToken ? (initialProvider === 'META_CLOUD' ? 'ACTIVE' : 'READY') : 'UNCONFIGURED',

        // SMTP
        smtpHost: envSmtpHost,
        smtpPort: envSmtpPort,
        smtpSecure: envSmtpSecure,
        smtpUser: envSmtpUser,
        smtpPass: envSmtpPass ? encryptSecret(envSmtpPass) : null,
        smtpFrom: envSmtpFrom,
        smtpStatus: envSmtpHost && envSmtpUser && envSmtpPass ? 'READY' : 'UNCONFIGURED',

        // Kanal
        emailEnabled: true,
        whatsappEnabled: true,
        inAppEnabled: true,
        notifyPengumumanEmail: true,
        notifyPengumumanWa: true,
        notifySuratEmail: true,
        notifySuratWa: true,
        notifyPengaduanEmail: true,
        notifyPengaduanWa: true,
      },
    });
  }

  // Sinkronkan status provider aktif jika masih 'READY'
  if (config.activeWaProvider === 'FONNTE' && config.fonnteStatus === 'READY') {
    config = await prisma.systemConfig.update({
      where: { id: 'default' },
      data: { fonnteStatus: 'ACTIVE' },
    });
  } else if (config.activeWaProvider === 'GATEWAY_SENDIRI' && config.gatewayStatus === 'READY') {
    config = await prisma.systemConfig.update({
      where: { id: 'default' },
      data: { gatewayStatus: 'ACTIVE' },
    });
  } else if (config.activeWaProvider === 'META_CLOUD' && config.metaStatus === 'READY') {
    config = await prisma.systemConfig.update({
      where: { id: 'default' },
      data: { metaStatus: 'ACTIVE' },
    });
  }

  return config as RawSystemConfig;
}

/**
 * Mengambil rahasia yang telah didekripsi untuk keperluan backend internal saja.
 */
export async function getDecryptedSystemConfig() {
  const raw: RawSystemConfig = await getRawSystemConfig();
  return {
    ...raw,
    fonnteTokenDecrypted: decryptSecret(raw.fonnteToken) || process.env.WHATSAPP_GATEWAY_TOKEN || '',
    gatewayTokenDecrypted: decryptSecret(raw.gatewayToken) || process.env.WHATSAPP_GATEWAY_TOKEN || '',
    metaAccessTokenDecrypted: decryptSecret(raw.metaAccessToken) || process.env.WHATSAPP_ACCESS_TOKEN || '',
    smtpPassDecrypted: decryptSecret(raw.smtpPass) || process.env.SMTP_PASS || '',
    geminiApiKeyDecrypted:
      decryptSecret(raw.geminiApiKey) ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      '',
    apiKeyBackup1Decrypted: decryptSecret(raw.apiKeyBackup1 ?? null) || '',
    apiKeyBackup2Decrypted: decryptSecret(raw.apiKeyBackup2 ?? null) || '',
  };
}

/**
 * Mengambil konfigurasi sistem yang aman untuk ditampilkan pada UI (Client).
 * Seluruh token API dan password di-masking secara ketat.
 */
export async function getClientSystemConfig(): Promise<ClientSystemConfig> {
  const raw: RawSystemConfig = await getRawSystemConfig();

  const fonnteTokenPlain = decryptSecret(raw.fonnteToken) || process.env.WHATSAPP_GATEWAY_TOKEN || '';
  const gatewayTokenPlain = decryptSecret(raw.gatewayToken) || '';
  const metaTokenPlain = decryptSecret(raw.metaAccessToken) || process.env.WHATSAPP_ACCESS_TOKEN || '';
  const smtpPassPlain = decryptSecret(raw.smtpPass) || process.env.SMTP_PASS || '';
  const geminiApiKeyPlain =
    decryptSecret(raw.geminiApiKey) ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    '';
  const hasGeminiApiKey = Boolean(geminiApiKeyPlain);
  const apiKeyBackup1Plain = decryptSecret(raw.apiKeyBackup1 ?? null) || '';
  const hasApiKeyBackup1 = Boolean(apiKeyBackup1Plain);
  const apiKeyBackup2Plain = decryptSecret(raw.apiKeyBackup2 ?? null) || '';
  const hasApiKeyBackup2 = Boolean(apiKeyBackup2Plain);

  let displayAiStatus = raw.aiStatus || 'UNCONFIGURED';
  if (!raw.chatbotEnabled) {
    displayAiStatus = 'NONAKTIF';
  } else if (!hasGeminiApiKey) {
    displayAiStatus = 'UNCONFIGURED';
  } else if (displayAiStatus === 'UNCONFIGURED' && hasGeminiApiKey) {
    displayAiStatus = 'READY';
  }

  let deviceInfo: any = null;
  if (raw.fonnteDeviceInfo) {
    try {
      deviceInfo = JSON.parse(raw.fonnteDeviceInfo);
    } catch {
      deviceInfo = null;
    }
  }

  return {
    id: raw.id,
    appName: raw.appName,
    rwNomor: raw.rwNomor,
    kelurahan: raw.kelurahan || '',
    kecamatan: raw.kecamatan || '',
    kota: raw.kota || '',
    kontakEmail: raw.kontakEmail || '',
    kontakWa: raw.kontakWa || '',
    alamatSekretariat: raw.alamatSekretariat || '',
    deskripsiSistem: raw.deskripsiSistem || '',

    activeWaProvider: raw.activeWaProvider,

    // Fonnte
    hasFonnteToken: Boolean(fonnteTokenPlain),
    fonnteTokenMasked: maskSecret(fonnteTokenPlain),
    fonnteCountryCode: raw.fonnteCountryCode || '62',
    fonnteStatus: raw.fonnteStatus,
    fonnteLastTestedAt: raw.fonnteLastTestedAt?.toISOString() || null,
    fonnteLastError: raw.fonnteLastError || null,
    fonnteDeviceInfo: deviceInfo,

    // Gateway Sendiri
    gatewayUrl: raw.gatewayUrl || '',
    hasGatewayToken: Boolean(gatewayTokenPlain),
    gatewayTokenMasked: maskSecret(gatewayTokenPlain),
    gatewayStatus: raw.gatewayStatus,
    gatewayLastTestedAt: raw.gatewayLastTestedAt?.toISOString() || null,
    gatewayLastError: raw.gatewayLastError || null,

    // Meta Cloud
    metaPhoneNumberId: raw.metaPhoneNumberId || '',
    hasMetaAccessToken: Boolean(metaTokenPlain),
    metaAccessTokenMasked: maskSecret(metaTokenPlain),
    metaApiVersion: raw.metaApiVersion || 'v21.0',
    metaStatus: raw.metaStatus,
    metaLastTestedAt: raw.metaLastTestedAt?.toISOString() || null,
    metaLastError: raw.metaLastError || null,

    // SMTP Email
    smtpHost: raw.smtpHost || '',
    smtpPort: raw.smtpPort,
    smtpSecure: raw.smtpSecure,
    smtpUser: raw.smtpUser || '',
    hasSmtpPass: Boolean(smtpPassPlain),
    smtpPassMasked: maskSecret(smtpPassPlain, 3, 3),
    smtpFrom: raw.smtpFrom || '',
    smtpStatus: raw.smtpStatus,
    smtpLastTestedAt: raw.smtpLastTestedAt?.toISOString() || null,
    smtpLastError: raw.smtpLastError || null,

    // Kanal
    emailEnabled: raw.emailEnabled,
    whatsappEnabled: raw.whatsappEnabled,
    inAppEnabled: raw.inAppEnabled,
    notifyPengumumanEmail: raw.notifyPengumumanEmail,
    notifyPengumumanWa: raw.notifyPengumumanWa,
    notifySuratEmail: raw.notifySuratEmail,
    notifySuratWa: raw.notifySuratWa,
    notifyPengaduanEmail: raw.notifyPengaduanEmail,
    notifyPengaduanWa: raw.notifyPengaduanWa,

    // Chatbot AI
    chatbotEnabled: raw.chatbotEnabled ?? true,
    aiProvider: raw.aiProvider || 'GOOGLE_GEMINI',
    aiModel: raw.aiModel || 'gemini-1.5-flash',
    hasGeminiApiKey,
    geminiApiKeyMasked: maskSecret(geminiApiKeyPlain, 6, 4),
    hasApiKeyBackup1,
    apiKeyBackup1Masked: maskSecret(apiKeyBackup1Plain, 6, 4),
    hasApiKeyBackup2,
    apiKeyBackup2Masked: maskSecret(apiKeyBackup2Plain, 6, 4),
    aiTemperature: typeof raw.aiTemperature === 'number' ? raw.aiTemperature : 0.2,
    aiMaxTokens: typeof raw.aiMaxTokens === 'number' ? raw.aiMaxTokens : 2000,
    aiSystemInstruction: raw.aiSystemInstruction || '',
    aiFallbackMessage:
      raw.aiFallbackMessage ||
      'Maaf, saya tidak bisa menjawab pertanyaan tersebut. Silakan hubungi pengurus RT Anda atau sekretariat Balai RW 12 untuk konfirmasi lebih lanjut.',
    aiOutOfScopeMessage:
      raw.aiOutOfScopeMessage ||
      'Sistem ini khusus melayani kebutuhan informasi dan administrasi warga RW 12 Harjamukti. Anda dapat menanyakan perihal layanan surat pengantar, status pengajuan, pengaduan fasilitas lingkungan, atau pengumuman kegiatan warga.',
    aiStatus: displayAiStatus,
    aiLastTestedAt: raw.aiLastTestedAt?.toISOString() || null,
    aiLastError: raw.aiLastError || null,

    updatedAt: raw.updatedAt.toISOString(),
    updatedBy: raw.updatedBy,
  };
}

/**
 * 1. Simpan Konfigurasi Umum
 */
export async function updateGeneralConfig(
  data: {
    appName: string;
    rwNomor: string;
    kelurahan?: string;
    kecamatan?: string;
    kota?: string;
    kontakEmail?: string;
    kontakWa?: string;
    alamatSekretariat?: string;
    deskripsiSistem?: string;
  },
  adminUsername: string,
  adminUserId?: string
) {
  if (!data.appName?.trim()) throw new Error('Nama aplikasi / sistem tidak boleh kosong.');
  if (!data.rwNomor?.trim()) throw new Error('Nomor RW tidak boleh kosong.');

  const updated = await prisma.systemConfig.update({
    where: { id: 'default' },
    data: {
      appName: data.appName.trim(),
      rwNomor: data.rwNomor.trim(),
      kelurahan: data.kelurahan?.trim() || null,
      kecamatan: data.kecamatan?.trim() || null,
      kota: data.kota?.trim() || null,
      kontakEmail: data.kontakEmail?.trim() || null,
      kontakWa: data.kontakWa?.trim() || null,
      alamatSekretariat: data.alamatSekretariat?.trim() || null,
      deskripsiSistem: data.deskripsiSistem?.trim() || null,
      updatedBy: adminUsername,
    },
  });

  // Catat ke AuditLog
  await prisma.auditLog.create({
    data: {
      action: 'UPDATE_GENERAL_CONFIG',
      userId: adminUserId || null,
      details: JSON.stringify({
        appName: updated.appName,
        rwNomor: updated.rwNomor,
        updatedBy: adminUsername,
      }),
    },
  });

  return updated;
}

/**
 * 2. Simpan Konfigurasi Fonnte
 */
export async function updateFonnteConfig(
  data: {
    token?: string;
    countryCode?: string;
  },
  adminUsername: string,
  adminUserId?: string
) {
  const current = await getRawSystemConfig();
  const updateData: any = {
    fonnteCountryCode: data.countryCode?.trim() || '62',
    updatedBy: adminUsername,
  };

  if (data.token !== undefined) {
    const trimmed = data.token.trim();
    if (trimmed) {
      updateData.fonnteToken = encryptSecret(trimmed);
      // Jika statusnya sebelumnya UNCONFIGURED, ubah jadi READY
      if (current.fonnteStatus === 'UNCONFIGURED') {
        updateData.fonnteStatus = 'READY';
      }
    } else {
      // Dikosongkan
      updateData.fonnteToken = null;
      updateData.fonnteStatus = 'UNCONFIGURED';
      updateData.fonnteDeviceInfo = null;
      if (current.activeWaProvider === 'FONNTE') {
        updateData.fonnteStatus = 'UNCONFIGURED';
      }
    }
  }

  const updated = await prisma.systemConfig.update({
    where: { id: 'default' },
    data: updateData,
  });

  await prisma.auditLog.create({
    data: {
      action: 'UPDATE_FONNTE_CONFIG',
      userId: adminUserId || null,
      details: JSON.stringify({
        countryCode: updated.fonnteCountryCode,
        hasToken: Boolean(updated.fonnteToken),
        status: updated.fonnteStatus,
        updatedBy: adminUsername,
      }),
    },
  });

  return updated;
}

/**
 * 3. Simpan Konfigurasi Gateway Sendiri
 */
export async function updateGatewayConfig(
  data: {
    url?: string;
    token?: string;
  },
  adminUsername: string,
  adminUserId?: string
) {
  const current = await getRawSystemConfig();
  const updateData: any = {
    gatewayUrl: data.url?.trim() || '',
    updatedBy: adminUsername,
  };

  if (data.token !== undefined) {
    const trimmed = data.token.trim();
    if (trimmed) {
      updateData.gatewayToken = encryptSecret(trimmed);
    } else {
      updateData.gatewayToken = null;
    }
  }

  // Tentukan status
  const hasUrl = Boolean(updateData.gatewayUrl);
  const hasToken = updateData.gatewayToken !== undefined ? Boolean(updateData.gatewayToken) : Boolean(current.gatewayToken);

  if (hasUrl && hasToken) {
    if (current.gatewayStatus === 'UNCONFIGURED') {
      updateData.gatewayStatus = 'READY';
    }
  } else {
    updateData.gatewayStatus = 'UNCONFIGURED';
  }

  const updated = await prisma.systemConfig.update({
    where: { id: 'default' },
    data: updateData,
  });

  await prisma.auditLog.create({
    data: {
      action: 'UPDATE_GATEWAY_CONFIG',
      userId: adminUserId || null,
      details: JSON.stringify({
        gatewayUrl: updated.gatewayUrl,
        hasToken: Boolean(updated.gatewayToken),
        status: updated.gatewayStatus,
        updatedBy: adminUsername,
      }),
    },
  });

  return updated;
}

/**
 * 4. Simpan Konfigurasi Meta Cloud API
 */
export async function updateMetaConfig(
  data: {
    phoneNumberId?: string;
    accessToken?: string;
    apiVersion?: string;
  },
  adminUsername: string,
  adminUserId?: string
) {
  const current = await getRawSystemConfig();
  const updateData: any = {
    metaPhoneNumberId: data.phoneNumberId?.trim() || '',
    metaApiVersion: data.apiVersion?.trim() || 'v21.0',
    updatedBy: adminUsername,
  };

  if (data.accessToken !== undefined) {
    const trimmed = data.accessToken.trim();
    if (trimmed) {
      updateData.metaAccessToken = encryptSecret(trimmed);
    } else {
      updateData.metaAccessToken = null;
    }
  }

  const hasPhoneId = Boolean(updateData.metaPhoneNumberId);
  const hasToken = updateData.metaAccessToken !== undefined ? Boolean(updateData.metaAccessToken) : Boolean(current.metaAccessToken);

  if (hasPhoneId && hasToken) {
    if (current.metaStatus === 'UNCONFIGURED') {
      updateData.metaStatus = 'READY';
    }
  } else {
    updateData.metaStatus = 'UNCONFIGURED';
  }

  const updated = await prisma.systemConfig.update({
    where: { id: 'default' },
    data: updateData,
  });

  await prisma.auditLog.create({
    data: {
      action: 'UPDATE_META_CONFIG',
      userId: adminUserId || null,
      details: JSON.stringify({
        phoneNumberId: updated.metaPhoneNumberId,
        hasToken: Boolean(updated.metaAccessToken),
        status: updated.metaStatus,
        updatedBy: adminUsername,
      }),
    },
  });

  return updated;
}

/**
 * 5. Simpan Konfigurasi SMTP Email
 */
export async function updateSmtpConfig(
  data: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass?: string;
    from: string;
  },
  adminUsername: string,
  adminUserId?: string
) {
  if (!data.host?.trim()) throw new Error('Host SMTP tidak boleh kosong.');
  if (!data.user?.trim()) throw new Error('Username/Email pengirim SMTP tidak boleh kosong.');

  const updateData: any = {
    smtpHost: data.host.trim(),
    smtpPort: Number(data.port) || 587,
    smtpSecure: Boolean(data.secure),
    smtpUser: data.user.trim(),
    smtpFrom: data.from?.trim() || `"Pelayanan Digital RW" <${data.user.trim()}>`,
    updatedBy: adminUsername,
  };

  if (data.pass !== undefined && data.pass.trim() !== '') {
    updateData.smtpPass = encryptSecret(data.pass.trim());
    updateData.smtpStatus = 'READY';
  }

  const updated = await prisma.systemConfig.update({
    where: { id: 'default' },
    data: updateData,
  });

  await prisma.auditLog.create({
    data: {
      action: 'UPDATE_SMTP_CONFIG',
      userId: adminUserId || null,
      details: JSON.stringify({
        host: updated.smtpHost,
        port: updated.smtpPort,
        secure: updated.smtpSecure,
        user: updated.smtpUser,
        from: updated.smtpFrom,
        updatedBy: adminUsername,
      }),
    },
  });

  return updated;
}

/**
 * 6. Simpan Pengaturan Kanal Notifikasi
 */
export async function updateNotificationChannels(
  data: {
    emailEnabled: boolean;
    whatsappEnabled: boolean;
    inAppEnabled: boolean;
    notifyPengumumanEmail: boolean;
    notifyPengumumanWa: boolean;
    notifySuratEmail: boolean;
    notifySuratWa: boolean;
    notifyPengaduanEmail: boolean;
    notifyPengaduanWa: boolean;
  },
  adminUsername: string,
  adminUserId?: string
) {
  const updated = await prisma.systemConfig.update({
    where: { id: 'default' },
    data: {
      emailEnabled: Boolean(data.emailEnabled),
      whatsappEnabled: Boolean(data.whatsappEnabled),
      inAppEnabled: Boolean(data.inAppEnabled),
      notifyPengumumanEmail: Boolean(data.notifyPengumumanEmail),
      notifyPengumumanWa: Boolean(data.notifyPengumumanWa),
      notifySuratEmail: Boolean(data.notifySuratEmail),
      notifySuratWa: Boolean(data.notifySuratWa),
      notifyPengaduanEmail: Boolean(data.notifyPengaduanEmail),
      notifyPengaduanWa: Boolean(data.notifyPengaduanWa),
      updatedBy: adminUsername,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: 'UPDATE_NOTIFICATION_CHANNELS',
      userId: adminUserId || null,
      details: JSON.stringify({
        emailEnabled: updated.emailEnabled,
        whatsappEnabled: updated.whatsappEnabled,
        inAppEnabled: updated.inAppEnabled,
        updatedBy: adminUsername,
      }),
    },
  });

  return updated;
}

/**
 * 7. Ganti Provider WhatsApp Aktif
 * Ketentuan:
 * - Hanya satu provider yang aktif pada satu waktu.
 * - Provider yang diaktifkan harus memiliki kredensial valid dan tidak berstatus UNCONFIGURED / FAILED.
 * - Mengubah activeWaProvider benar-benar mengubah penyedia yang dipakai oleh whatsappService.
 */
export async function switchActiveWhatsAppProvider(
  provider: 'FONNTE' | 'GATEWAY_SENDIRI' | 'META_CLOUD',
  adminUsername: string,
  adminUserId?: string
) {
  const config = await getRawSystemConfig();

  // Validasi kredensial sebelum mengizinkan aktivasi
  if (provider === 'FONNTE') {
    const token = decryptSecret(config.fonnteToken) || process.env.WHATSAPP_GATEWAY_TOKEN;
    if (!token) {
      throw new Error(
        'Tidak dapat mengaktifkan Fonnte: Token API Fonnte belum dikonfigurasi. Mohon isi dan simpan token terlebih dahulu.'
      );
    }
    if (config.fonnteStatus === 'FAILED') {
      throw new Error(
        'Tidak dapat mengaktifkan Fonnte: Status koneksi terakhir gagal. Harap lakukan "Uji Koneksi" terlebih dahulu.'
      );
    }
  } else if (provider === 'GATEWAY_SENDIRI') {
    const url = config.gatewayUrl;
    const token = decryptSecret(config.gatewayToken);
    if (!url || !token) {
      throw new Error(
        'Tidak dapat mengaktifkan Gateway Sendiri: URL Gateway dan Token Akses belum lengkap dikonfigurasi.'
      );
    }
    if (config.gatewayStatus === 'FAILED') {
      throw new Error(
        'Tidak dapat mengaktifkan Gateway Sendiri: Status koneksi terakhir gagal. Harap lakukan "Uji Koneksi" terlebih dahulu.'
      );
    }
  } else if (provider === 'META_CLOUD') {
    const phoneId = config.metaPhoneNumberId;
    const token = decryptSecret(config.metaAccessToken);
    if (!phoneId || !token) {
      throw new Error(
        'Tidak dapat mengaktifkan Meta WhatsApp Cloud API: Phone Number ID dan Access Token belum dikonfigurasi.'
      );
    }
  } else {
    throw new Error(`Provider WhatsApp "${provider}" tidak didukung oleh sistem.`);
  }

  // Perbarui status: provider lama jadi READY, provider baru jadi ACTIVE
  const updateData: any = {
    activeWaProvider: provider,
    updatedBy: adminUsername,
  };

  if (provider === 'FONNTE') {
    updateData.fonnteStatus = 'ACTIVE';
    if (config.gatewayStatus === 'ACTIVE') updateData.gatewayStatus = 'READY';
    if (config.metaStatus === 'ACTIVE') updateData.metaStatus = 'READY';
  } else if (provider === 'GATEWAY_SENDIRI') {
    updateData.gatewayStatus = 'ACTIVE';
    if (config.fonnteStatus === 'ACTIVE') updateData.fonnteStatus = 'READY';
    if (config.metaStatus === 'ACTIVE') updateData.metaStatus = 'READY';
  } else if (provider === 'META_CLOUD') {
    updateData.metaStatus = 'ACTIVE';
    if (config.fonnteStatus === 'ACTIVE') updateData.fonnteStatus = 'READY';
    if (config.gatewayStatus === 'ACTIVE') updateData.gatewayStatus = 'READY';
  }

  const updated = await prisma.systemConfig.update({
    where: { id: 'default' },
    data: updateData,
  });

  await prisma.auditLog.create({
    data: {
      action: 'SWITCH_ACTIVE_WA_PROVIDER',
      userId: adminUserId || null,
      details: JSON.stringify({
        previousProvider: config.activeWaProvider,
        newActiveProvider: provider,
        switchedBy: adminUsername,
      }),
    },
  });

  return updated;
}

/**
 * 8. Simpan Konfigurasi Chatbot AI (Google Gemini)
 */
export async function updateChatbotConfig(
  data: {
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
  },
  adminUsername: string,
  adminUserId?: string
) {
  const current = await getRawSystemConfig();
  const updateData: any = {
    updatedBy: adminUsername,
  };

  if (data.chatbotEnabled !== undefined) {
    updateData.chatbotEnabled = Boolean(data.chatbotEnabled);
  }

  if (data.provider !== undefined) {
    const prov = data.provider.trim();
    if (!prov) throw new Error('Provider AI tidak boleh kosong.');
    updateData.aiProvider = prov;
  }

  if (data.model !== undefined) {
    const mod = data.model.trim();
    if (!mod) throw new Error('Model AI tidak boleh kosong.');
    updateData.aiModel = mod;
  }

  if (data.temperature !== undefined) {
    const temp = Number(data.temperature);
    if (isNaN(temp) || temp < 0.0 || temp > 2.0) {
      throw new Error('Nilai Temperature harus berada dalam rentang 0.0 sampai 2.0.');
    }
    updateData.aiTemperature = temp;
  }

  if (data.maxTokens !== undefined) {
    const tokens = parseInt(String(data.maxTokens), 10);
    if (isNaN(tokens) || tokens < 100 || tokens > 8192) {
      throw new Error('Batas Maksimum Token harus berupa angka antara 100 dan 8192.');
    }
    updateData.aiMaxTokens = tokens;
  }

  if (data.systemInstruction !== undefined) {
    updateData.aiSystemInstruction = data.systemInstruction.trim() || null;
  }

  if (data.fallbackMessage !== undefined) {
    updateData.aiFallbackMessage =
      data.fallbackMessage.trim() ||
      'Maaf, saya tidak bisa menjawab pertanyaan tersebut. Silakan hubungi pengurus RT Anda atau sekretariat Balai RW 12 untuk konfirmasi lebih lanjut.';
  }

  if (data.outOfScopeMessage !== undefined) {
    updateData.aiOutOfScopeMessage =
      data.outOfScopeMessage.trim() ||
      'Sistem ini khusus melayani kebutuhan informasi dan administrasi warga RW 12 Harjamukti. Anda dapat menanyakan perihal layanan surat pengantar, status pengajuan, pengaduan fasilitas lingkungan, atau pengumuman kegiatan warga.';
  }

  if (data.apiKey !== undefined) {
    const trimmed = data.apiKey.trim();
    if (trimmed) {
      updateData.geminiApiKey = encryptSecret(trimmed);
      if (current.aiStatus === 'UNCONFIGURED' || current.aiStatus === 'FAILED') {
        updateData.aiStatus = 'READY';
      }
    } else {
      // Jika dikosongkan secara eksplisit oleh admin
      updateData.geminiApiKey = null;
      updateData.aiStatus = 'UNCONFIGURED';
    }
  }

  if (data.apiKeyBackup1 !== undefined) {
    const trimmed = data.apiKeyBackup1.trim();
    if (trimmed) {
      updateData.apiKeyBackup1 = encryptSecret(trimmed);
    } else {
      updateData.apiKeyBackup1 = null;
    }
  }

  if (data.apiKeyBackup2 !== undefined) {
    const trimmed = data.apiKeyBackup2.trim();
    if (trimmed) {
      updateData.apiKeyBackup2 = encryptSecret(trimmed);
    } else {
      updateData.apiKeyBackup2 = null;
    }
  }

  const updated = await prisma.systemConfig.update({
    where: { id: 'default' },
    data: updateData,
  });

  await prisma.auditLog.create({
    data: {
      action: 'UPDATE_CHATBOT_CONFIG',
      userId: adminUserId || null,
      details: JSON.stringify({
        chatbotEnabled: updated.chatbotEnabled,
        aiProvider: updated.aiProvider,
        aiModel: updated.aiModel,
        aiTemperature: updated.aiTemperature,
        aiMaxTokens: updated.aiMaxTokens,
        hasApiKey: Boolean(updated.geminiApiKey),
        status: updated.aiStatus,
        updatedBy: adminUsername,
      }),
    },
  });

  return updated;
}

/**
 * 9. Ubah Status Aktif / Nonaktif Chatbot AI
 */
export async function toggleChatbotStatus(
  enabled: boolean,
  adminUsername: string,
  adminUserId?: string
) {
  const current = await getRawSystemConfig();
  const targetEnabled = Boolean(enabled);

  const updated = await prisma.systemConfig.update({
    where: { id: 'default' },
    data: {
      chatbotEnabled: targetEnabled,
      updatedBy: adminUsername,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: 'TOGGLE_CHATBOT_STATUS',
      userId: adminUserId || null,
      details: JSON.stringify({
        previousStatus: current.chatbotEnabled,
        newStatus: targetEnabled,
        updatedBy: adminUsername,
      }),
    },
  });

  return updated;
}

