import prisma from '@/lib/db';
import nodemailer from 'nodemailer';
import {
  getDecryptedSystemConfig,
  getRawSystemConfig,
} from './systemConfigService';
import { sanitizeRecipient } from '@/lib/encryption';
import {
  formatAndValidateWhatsAppNumber,
} from '@/lib/notification/whatsappService';
import { validateEmail } from '@/lib/notification/emailService';
import { generateStandardEmailHtml } from '@/lib/notification/templates';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';

function sanitizeErrorMessage(msg?: string): string {
  if (!msg) return 'Terjadi kesalahan yang tidak diketahui.';
  return msg
    .replace(/Bearer\s+[A-Za-z0-9_\-.]+/gi, 'Bearer [REDACTED]')
    .replace(/password=[^&]+/gi, 'password=[REDACTED]')
    .replace(/pass=[^&]+/gi, 'pass=[REDACTED]')
    .slice(0, 400);
}

/**
 * 1. Uji Koneksi Fonnte (Real ping ke https://api.fonnte.com/device)
 */
export async function testFonnteConnection(tokenOverride?: string, adminUsername = 'SUPER_ADMIN') {
  const config = await getDecryptedSystemConfig();
  const token = tokenOverride !== undefined ? tokenOverride.trim() : config.fonnteTokenDecrypted;

  if (!token) {
    const errorMsg = 'Token API Fonnte belum dikonfigurasi.';
    await prisma.systemConfig.update({
      where: { id: 'default' },
      data: {
        fonnteStatus: 'UNCONFIGURED',
        fonnteLastError: errorMsg,
      },
    });
    return { success: false, error: errorMsg, latencyMs: 0 };
  }

  const startTime = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch('https://api.fonnte.com/device', {
      method: 'POST',
      headers: {
        Authorization: token,
      },
      signal: controller.signal,
    });

    const latencyMs = Date.now() - startTime;
    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.status === false) {
      const errorDetail =
        data?.reason ||
        data?.message ||
        `HTTP ${response.status} ${response.statusText}`;
      const cleanError = sanitizeErrorMessage(`Gagal terhubung ke Fonnte: ${errorDetail}`);

      await prisma.systemConfig.update({
        where: { id: 'default' },
        data: {
          fonnteStatus: 'FAILED',
          fonnteLastTestedAt: new Date(),
          fonnteLastError: cleanError,
        },
      });

      await prisma.connectionTestLog.create({
        data: {
          provider: 'FONNTE',
          testType: 'CONNECTION_PING',
          status: 'FAILED',
          statusCode: response.status,
          latencyMs,
          message: cleanError,
          triggeredBy: adminUsername,
        },
      });

      return { success: false, error: cleanError, latencyMs };
    }

    // Berhasil terhubung ke Fonnte
    const deviceInfo = {
      device: data.device || '-',
      name: data.name || 'Admin RW',
      status: data.device_status || 'connect',
      package: data.package || 'Free',
      quota: data.quota ? String(data.quota) : '0',
      expired: data.expired || '-',
    };

    const isCurrentlyActive = config.activeWaProvider === 'FONNTE';
    const newStatus = isCurrentlyActive ? 'ACTIVE' : 'READY';

    await prisma.systemConfig.update({
      where: { id: 'default' },
      data: {
        fonnteStatus: newStatus,
        fonnteLastTestedAt: new Date(),
        fonnteLastError: null,
        fonnteDeviceInfo: JSON.stringify(deviceInfo),
      },
    });

    await prisma.connectionTestLog.create({
      data: {
        provider: 'FONNTE',
        testType: 'CONNECTION_PING',
        status: 'SUCCESS',
        statusCode: 200,
        latencyMs,
        message: `Terhubung sukses (Nomor: ${deviceInfo.device}, Kuota: ${deviceInfo.quota}, Status: ${deviceInfo.status})`,
        triggeredBy: adminUsername,
      },
    });

    return {
      success: true,
      latencyMs,
      deviceInfo,
      message: 'Koneksi Fonnte berhasil diverifikasi!',
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const cleanError = sanitizeErrorMessage(
      err.name === 'AbortError'
        ? 'Batas waktu koneksi ke server Fonnte terlampaui (Timeout 12 detik).'
        : `Gagal menghubungi server Fonnte: ${err.message}`
    );

    await prisma.systemConfig.update({
      where: { id: 'default' },
      data: {
        fonnteStatus: 'FAILED',
        fonnteLastTestedAt: new Date(),
        fonnteLastError: cleanError,
      },
    });

    await prisma.connectionTestLog.create({
      data: {
        provider: 'FONNTE',
        testType: 'CONNECTION_PING',
        status: 'FAILED',
        latencyMs,
        message: cleanError,
        triggeredBy: adminUsername,
      },
    });

    return { success: false, error: cleanError, latencyMs };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * 2. Uji Koneksi Gateway Sendiri
 */
export async function testGatewayConnection(
  urlOverride?: string,
  tokenOverride?: string,
  adminUsername = 'SUPER_ADMIN'
) {
  const config = await getDecryptedSystemConfig();
  const url = urlOverride !== undefined ? urlOverride.trim() : config.gatewayUrl;
  const token = tokenOverride !== undefined ? tokenOverride.trim() : config.gatewayTokenDecrypted;

  if (!url) {
    const errorMsg = 'URL Gateway belum diisi.';
    return { success: false, error: errorMsg, latencyMs: 0 };
  }

  const startTime = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    // Lakukan cek reachability ke endpoint gateway
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = token;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: controller.signal,
    }).catch(async () => {
      // Jika GET tidak diizinkan (misal method not allowed / 405), coba kirim ping OPTIONS
      return await fetch(url, { method: 'OPTIONS', headers, signal: controller.signal });
    });

    const latencyMs = Date.now() - startTime;

    // Jika server merespons apapun selain error jaringan (200-499), server fisik gateway online
    const isReachable = response.status >= 200 && response.status < 500;

    if (isReachable) {
      const isCurrentlyActive = config.activeWaProvider === 'GATEWAY_SENDIRI';
      const newStatus = isCurrentlyActive ? 'ACTIVE' : 'READY';

      await prisma.systemConfig.update({
        where: { id: 'default' },
        data: {
          gatewayStatus: newStatus,
          gatewayLastTestedAt: new Date(),
          gatewayLastError: null,
        },
      });

      await prisma.connectionTestLog.create({
        data: {
          provider: 'GATEWAY_SENDIRI',
          testType: 'CONNECTION_PING',
          status: 'SUCCESS',
          statusCode: response.status,
          latencyMs,
          message: `Gateway merespons dengan HTTP ${response.status} (${response.statusText || 'OK'})`,
          triggeredBy: adminUsername,
        },
      });

      return {
        success: true,
        latencyMs,
        statusCode: response.status,
        message: `Gateway online dan terjangkau (HTTP ${response.status})`,
      };
    } else {
      const errorMsg = `Gateway merespons dengan error HTTP ${response.status}: ${response.statusText}`;
      await prisma.systemConfig.update({
        where: { id: 'default' },
        data: {
          gatewayStatus: 'FAILED',
          gatewayLastTestedAt: new Date(),
          gatewayLastError: errorMsg,
        },
      });

      await prisma.connectionTestLog.create({
        data: {
          provider: 'GATEWAY_SENDIRI',
          testType: 'CONNECTION_PING',
          status: 'FAILED',
          statusCode: response.status,
          latencyMs,
          message: errorMsg,
          triggeredBy: adminUsername,
        },
      });

      return { success: false, error: errorMsg, latencyMs };
    }
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const cleanError = sanitizeErrorMessage(
      err.name === 'AbortError'
        ? 'Batas waktu koneksi ke Gateway terlampaui (Timeout 12 detik).'
        : `Gagal menghubungi URL Gateway: ${err.message}`
    );

    await prisma.systemConfig.update({
      where: { id: 'default' },
      data: {
        gatewayStatus: 'FAILED',
        gatewayLastTestedAt: new Date(),
        gatewayLastError: cleanError,
      },
    });

    await prisma.connectionTestLog.create({
      data: {
        provider: 'GATEWAY_SENDIRI',
        testType: 'CONNECTION_PING',
        status: 'FAILED',
        latencyMs,
        message: cleanError,
        triggeredBy: adminUsername,
      },
    });

    return { success: false, error: cleanError, latencyMs };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * 3. Uji Koneksi SMTP Email (Nodemailer transporter.verify())
 */
export async function testSmtpConnection(
  overrides?: {
    host?: string;
    port?: number;
    secure?: boolean;
    user?: string;
    pass?: string;
  },
  adminUsername = 'SUPER_ADMIN'
) {
  const config = await getDecryptedSystemConfig();

  const host = overrides?.host || config.smtpHost || process.env.SMTP_HOST?.trim();
  const port = overrides?.port || config.smtpPort || parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = overrides?.secure !== undefined ? overrides.secure : (config.smtpSecure ?? (port === 465));
  const user = overrides?.user || config.smtpUser || process.env.SMTP_USER?.trim();
  const pass = overrides?.pass || config.smtpPassDecrypted || process.env.SMTP_PASS?.trim();

  if (!host || !user || !pass) {
    const errorMsg = 'Konfigurasi SMTP belum lengkap (Host, Username, dan Password wajib diisi).';
    await prisma.systemConfig.update({
      where: { id: 'default' },
      data: {
        smtpStatus: 'UNCONFIGURED',
        smtpLastError: errorMsg,
      },
    });
    return { success: false, error: errorMsg, latencyMs: 0 };
  }

  const startTime = Date.now();

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 5000,
    });

    await transporter.verify();
    const latencyMs = Date.now() - startTime;

    await prisma.systemConfig.update({
      where: { id: 'default' },
      data: {
        smtpStatus: 'READY',
        smtpLastTestedAt: new Date(),
        smtpLastError: null,
      },
    });

    await prisma.connectionTestLog.create({
      data: {
        provider: 'SMTP_EMAIL',
        testType: 'CONNECTION_PING',
        status: 'SUCCESS',
        statusCode: 250,
        latencyMs,
        message: `Koneksi dan autentikasi SMTP berhasil diverifikasi (${host}:${port})`,
        triggeredBy: adminUsername,
      },
    });

    return {
      success: true,
      latencyMs,
      message: `Server SMTP (${host}:${port}) berhasil diverifikasi dan siap digunakan!`,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const cleanError = sanitizeErrorMessage(`Gagal autentikasi SMTP: ${err.message}`);

    await prisma.systemConfig.update({
      where: { id: 'default' },
      data: {
        smtpStatus: 'FAILED',
        smtpLastTestedAt: new Date(),
        smtpLastError: cleanError,
      },
    });

    await prisma.connectionTestLog.create({
      data: {
        provider: 'SMTP_EMAIL',
        testType: 'CONNECTION_PING',
        status: 'FAILED',
        latencyMs,
        message: cleanError,
        triggeredBy: adminUsername,
      },
    });

    return { success: false, error: cleanError, latencyMs };
  }
}

/**
 * 4. Kirim Pesan Uji Coba WhatsApp
 * HANYA dikirim jika administrator memasukkan nomor tujuan secara eksplisit dan menekan tombol kirim uji coba.
 */
export async function sendTestWhatsAppMessage({
  targetNumber,
  provider,
  adminUsername = 'SUPER_ADMIN',
}: {
  targetNumber: string;
  provider?: 'FONNTE' | 'GATEWAY_SENDIRI' | 'META_CLOUD';
  adminUsername?: string;
}) {
  const { isValid, formattedNumber, error } = formatAndValidateWhatsAppNumber(targetNumber);
  if (!isValid) {
    return { success: false, error: error || 'Nomor WhatsApp tidak valid.' };
  }

  const config = await getDecryptedSystemConfig();
  const chosenProvider = provider || config.activeWaProvider;
  const startTime = Date.now();
  const sanitizedTarget = sanitizeRecipient(formattedNumber);

  const testMessageBody = `*UJI KONEKSI WHATSAPP RESMI*\nSistem Informasi Pelayanan Digital RW\n━━━━━━━━━━━━━━━━━━━━━\nHalo! Ini adalah pesan uji coba resmi yang dikirimkan oleh Administrator (${adminUsername}) untuk memverifikasi sambungan API WhatsApp.\n\n• Provider: *${chosenProvider}*\n• Waktu Pengujian: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB\n• Status: *BERHASIL TERKONEKSI*\n\nJika Anda menerima pesan ini, jalur notifikasi WhatsApp telah beroperasi dengan baik.`;

  try {
    if (chosenProvider === 'FONNTE') {
      const token = config.fonnteTokenDecrypted || process.env.WHATSAPP_GATEWAY_TOKEN;
      if (!token) throw new Error('Token Fonnte belum dikonfigurasi.');

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      try {
        const response = await fetch('https://api.fonnte.com/send', {
          method: 'POST',
          headers: {
            Authorization: token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            target: formattedNumber,
            message: testMessageBody,
            countryCode: config.fonnteCountryCode || '62',
          }),
          signal: controller.signal,
        });

        const data = await response.json().catch(() => ({}));
        const latencyMs = Date.now() - startTime;

        if (!response.ok || data.status === false) {
          throw new Error(data?.reason || data?.message || `HTTP ${response.status} ${response.statusText}`);
        }

        await prisma.connectionTestLog.create({
          data: {
            provider: 'FONNTE',
            testType: 'TEST_MESSAGE',
            target: sanitizedTarget,
            status: 'SUCCESS',
            statusCode: 200,
            latencyMs,
            message: `Pesan uji coba terkirim via Fonnte (ID: ${data?.id?.[0] || 'sent'})`,
            triggeredBy: adminUsername,
          },
        });

        return {
          success: true,
          messageId: data?.id?.[0] || `fonnte_${Date.now()}`,
          provider: 'FONNTE',
          latencyMs,
        };
      } finally {
        clearTimeout(timeout);
      }
    } else if (chosenProvider === 'GATEWAY_SENDIRI') {
      const url = config.gatewayUrl;
      const token = config.gatewayTokenDecrypted;
      if (!url) throw new Error('URL Gateway belum dikonfigurasi.');

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = token;

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            target: formattedNumber,
            message: testMessageBody,
          }),
          signal: controller.signal,
        });

        const data = await response.json().catch(() => ({}));
        const latencyMs = Date.now() - startTime;

        if (!response.ok || data.status === false) {
          throw new Error(data?.reason || data?.message || `HTTP ${response.status} ${response.statusText}`);
        }

        await prisma.connectionTestLog.create({
          data: {
            provider: 'GATEWAY_SENDIRI',
            testType: 'TEST_MESSAGE',
            target: sanitizedTarget,
            status: 'SUCCESS',
            statusCode: response.status,
            latencyMs,
            message: `Pesan uji coba terkirim via Gateway Sendiri`,
            triggeredBy: adminUsername,
          },
        });

        return {
          success: true,
          messageId: data?.id || `gw_${Date.now()}`,
          provider: 'GATEWAY_SENDIRI',
          latencyMs,
        };
      } finally {
        clearTimeout(timeout);
      }
    } else {
      throw new Error(`Provider "${chosenProvider}" belum didukung untuk pesan uji coba.`);
    }
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const cleanError = sanitizeErrorMessage(err.message);

    await prisma.connectionTestLog.create({
      data: {
        provider: chosenProvider,
        testType: 'TEST_MESSAGE',
        target: sanitizedTarget,
        status: 'FAILED',
        latencyMs,
        message: cleanError,
        triggeredBy: adminUsername,
      },
    });

    return { success: false, error: cleanError, latencyMs };
  }
}

/**
 * 5. Kirim Email Uji Coba SMTP
 * HANYA dikirim jika administrator memasukkan email tujuan secara eksplisit.
 */
export async function sendTestEmailMessage({
  targetEmail,
  adminUsername = 'SUPER_ADMIN',
}: {
  targetEmail: string;
  adminUsername?: string;
}) {
  if (!validateEmail(targetEmail)) {
    return { success: false, error: 'Alamat email tujuan tidak valid.' };
  }

  const config = await getDecryptedSystemConfig();
  const host = config.smtpHost || process.env.SMTP_HOST?.trim();
  const port = config.smtpPort || parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = config.smtpSecure ?? (port === 465);
  const user = config.smtpUser || process.env.SMTP_USER?.trim();
  const pass = config.smtpPassDecrypted || process.env.SMTP_PASS?.trim();
  const from = config.smtpFrom || process.env.SMTP_FROM || `"Pelayanan Digital RW" <${user}>`;

  if (!host || !user || !pass) {
    return { success: false, error: 'Konfigurasi SMTP belum lengkap di server.' };
  }

  const startTime = Date.now();
  const sanitizedTarget = sanitizeRecipient(targetEmail);

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      connectionTimeout: 10000,
    });

    const testHtml = generateStandardEmailHtml({
      type: 'INFORMASI_LAYANAN',
      recipientName: 'Administrator Penguji',
      headline: 'Uji Coba Pengiriman Email SMTP',
      summary: 'Email ini merupakan pesan percobaan resmi dari halaman Konfigurasi Sistem untuk memverifikasi fungsionalitas pengiriman email SMTP.',
      statusBadge: {
        label: 'UJI SISTEM SUKSES',
        tone: 'success',
        color: '#166534',
        bgColor: '#dcfce7',
      },
      details: [
        { label: 'Host SMTP', value: host },
        { label: 'Port', value: String(port) },
        { label: 'Protokol Keamanan', value: secure ? 'SSL (Port 465)' : 'TLS / STARTTLS' },
        { label: 'Pengirim Resmi', value: from },
        { label: 'Diuji Oleh', value: adminUsername },
        { label: 'Waktu Pengujian', value: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB' },
      ],
      actionUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/konfigurasi`,
      actionLabel: 'Buka Dashboard Konfigurasi',
    });

    const info = await transporter.sendMail({
      from,
      to: targetEmail,
      subject: '[Uji Coba Sistem RW] Pengujian Pengiriman Email SMTP Berhasil',
      text: `Pengujian pengiriman email SMTP berhasil. Host: ${host}:${port}. Diuji oleh: ${adminUsername}.`,
      html: testHtml,
    });

    const latencyMs = Date.now() - startTime;

    await prisma.connectionTestLog.create({
      data: {
        provider: 'SMTP_EMAIL',
        testType: 'TEST_EMAIL',
        target: sanitizedTarget,
        status: 'SUCCESS',
        statusCode: 250,
        latencyMs,
        message: `Email uji coba berhasil terkirim (ID: ${info.messageId})`,
        triggeredBy: adminUsername,
      },
    });

    return {
      success: true,
      messageId: info.messageId,
      latencyMs,
      message: `Email percobaan berhasil dikirim ke ${sanitizedTarget}!`,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const cleanError = sanitizeErrorMessage(`Pengiriman email percobaan gagal: ${err.message}`);

    await prisma.connectionTestLog.create({
      data: {
        provider: 'SMTP_EMAIL',
        testType: 'TEST_EMAIL',
        target: sanitizedTarget,
        status: 'FAILED',
        latencyMs,
        message: cleanError,
        triggeredBy: adminUsername,
      },
    });

    return { success: false, error: cleanError, latencyMs };
  }
}

/**
 * 6. Riwayat Pengujian Koneksi
 */
export async function getConnectionTestHistory(limit = 25) {
  return await prisma.connectionTestLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * 7. Uji Koneksi Google Gemini AI (Ping ke API Gemini dengan respons nyata)
 */
export async function testGeminiConnection(
  apiKeyOverride?: string,
  modelOverride?: string,
  adminUsername = 'SUPER_ADMIN'
) {
  const config = await getDecryptedSystemConfig();
  const apiKey =
    apiKeyOverride !== undefined
      ? apiKeyOverride.trim()
      : config.geminiApiKeyDecrypted;

  let modelName =
    modelOverride !== undefined && modelOverride.trim() !== ''
      ? modelOverride.trim()
      : config.aiModel || 'gemini-3.5-flash-lite';

  if (
    modelName === 'gemini-1.5-flash' ||
    modelName === 'gemini-2.0-flash' ||
    modelName === 'gemini-2.5-flash' ||
    modelName === 'gemini-2.5-flash-lite'
  ) {
    modelName = 'gemini-3.5-flash-lite';
  }

  if (!apiKey) {
    const errorMsg =
      'API Key Google Gemini belum dikonfigurasi. Harap masukkan API key pada form.';
    await prisma.systemConfig.update({
      where: { id: 'default' },
      data: {
        aiStatus: 'UNCONFIGURED',
        aiLastError: errorMsg,
      },
    });
    return { success: false, error: errorMsg, latencyMs: 0, model: modelName };
  }

  const startTime = Date.now();

  try {
    const google = createGoogleGenerativeAI({ apiKey });
    const response = await generateText({
      model: google(modelName),
      prompt: 'Tes koneksi sistem AI RW. Jawab satu kalimat singkat: KONEKSI_AI_BERHASIL.',
      maxOutputTokens: 60,
    });

    const latencyMs = Date.now() - startTime;
    const isCurrentlyActive = config.chatbotEnabled;
    const newStatus = isCurrentlyActive ? 'ACTIVE' : 'READY';

    await prisma.systemConfig.update({
      where: { id: 'default' },
      data: {
        aiStatus: newStatus,
        aiLastTestedAt: new Date(),
        aiLastError: null,
      },
    });

    await prisma.connectionTestLog.create({
      data: {
        provider: 'GOOGLE_GEMINI',
        testType: 'CONNECTION_PING',
        target: modelName,
        status: 'SUCCESS',
        statusCode: 200,
        latencyMs,
        message: `Koneksi Google Gemini (${modelName}) berhasil terhubung. Respons: "${response.text.slice(0, 100).trim()}"`,
        triggeredBy: adminUsername,
      },
    });

    return {
      success: true,
      latencyMs,
      model: modelName,
      sampleResponse: response.text.trim(),
      message: `Koneksi Google Gemini (${modelName}) berhasil diverifikasi!`,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const cleanError = sanitizeErrorMessage(
      `Gagal terhubung ke Google Gemini: ${err.message || 'Respons tidak valid'}`
    );

    await prisma.systemConfig.update({
      where: { id: 'default' },
      data: {
        aiStatus: 'FAILED',
        aiLastTestedAt: new Date(),
        aiLastError: cleanError,
      },
    });

    await prisma.connectionTestLog.create({
      data: {
        provider: 'GOOGLE_GEMINI',
        testType: 'CONNECTION_PING',
        target: modelName,
        status: 'FAILED',
        latencyMs,
        message: cleanError,
        triggeredBy: adminUsername,
      },
    });

    return { success: false, error: cleanError, latencyMs, model: modelName };
  }
}

/**
 * 8. Uji Chatbot AI dengan Pertanyaan Nyata
 */
export async function testChatbotQuery(
  prompt: string,
  options?: {
    apiKeyOverride?: string;
    modelOverride?: string;
    temperature?: number;
    maxTokens?: number;
    systemInstruction?: string;
  },
  adminUsername = 'SUPER_ADMIN'
) {
  if (!prompt || !prompt.trim()) {
    return { success: false, error: 'Pertanyaan percobaan tidak boleh kosong.', latencyMs: 0 };
  }

  const config = await getDecryptedSystemConfig();
  const apiKey =
    options?.apiKeyOverride !== undefined
      ? options.apiKeyOverride.trim()
      : config.geminiApiKeyDecrypted;

  let modelName =
    options?.modelOverride !== undefined && options.modelOverride.trim() !== ''
      ? options.modelOverride.trim()
      : config.aiModel || 'gemini-3.5-flash-lite';

  if (
    modelName === 'gemini-1.5-flash' ||
    modelName === 'gemini-2.0-flash' ||
    modelName === 'gemini-2.5-flash' ||
    modelName === 'gemini-2.5-flash-lite'
  ) {
    modelName = 'gemini-3.5-flash-lite';
  }

  if (!apiKey) {
    return {
      success: false,
      error: 'API Key Google Gemini belum tersedia. Harap simpan API Key terlebih dahulu.',
      latencyMs: 0,
    };
  }

  const temperature =
    typeof options?.temperature === 'number'
      ? options.temperature
      : typeof config.aiTemperature === 'number'
      ? config.aiTemperature
      : 0.2;

  const maxTokens =
    typeof options?.maxTokens === 'number'
      ? options.maxTokens
      : typeof config.aiMaxTokens === 'number'
      ? config.aiMaxTokens
      : 1000;

  const instruction =
    options?.systemInstruction !== undefined
      ? options.systemInstruction
      : config.aiSystemInstruction || 'Anda adalah Asisten Digital RW resmi.';

  const startTime = Date.now();

  try {
    const google = createGoogleGenerativeAI({ apiKey });
    const response = await generateText({
      model: google(modelName),
      system: instruction,
      prompt: prompt.trim(),
      temperature,
      maxOutputTokens: maxTokens,
    });

    const latencyMs = Date.now() - startTime;
    const sanitizedPrompt = prompt.trim().slice(0, 80);

    await prisma.connectionTestLog.create({
      data: {
        provider: 'GOOGLE_GEMINI',
        testType: 'CHATBOT_TEST',
        target: `[${modelName}] ${sanitizedPrompt}...`,
        status: 'SUCCESS',
        statusCode: 200,
        latencyMs,
        message: `Uji Chatbot berhasil. Panjang respons: ${response.text.length} karakter.`,
        triggeredBy: adminUsername,
      },
    });

    return {
      success: true,
      answer: response.text.trim(),
      latencyMs,
      model: modelName,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const cleanError = sanitizeErrorMessage(
      `Pengujian Chatbot AI gagal: ${err.message || 'Gagal memproses respons'}`
    );

    await prisma.connectionTestLog.create({
      data: {
        provider: 'GOOGLE_GEMINI',
        testType: 'CHATBOT_TEST',
        target: `[${modelName}] ${prompt.trim().slice(0, 50)}...`,
        status: 'FAILED',
        latencyMs,
        message: cleanError,
        triggeredBy: adminUsername,
      },
    });

    return { success: false, error: cleanError, latencyMs, model: modelName };
  }
}

