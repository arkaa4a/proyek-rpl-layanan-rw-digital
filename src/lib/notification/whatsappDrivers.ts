/**
 * Arsitektur Driver Provider WhatsApp
 * Memungkinkan penambahan provider baru di masa depan tanpa mengubah kode sistem notifikasi utama.
 */

export interface WhatsAppSendParams {
  to: string; // Nomor terformat (misal: 628123456789)
  body: string;
  config: {
    fonnteToken?: string;
    fonnteCountryCode?: string;
    gatewayUrl?: string;
    gatewayToken?: string;
    metaPhoneNumberId?: string;
    metaAccessToken?: string;
    metaApiVersion?: string;
    [key: string]: any;
  };
}

export interface WhatsAppSendResponse {
  messageId: string;
  provider: string;
  rawResponse?: any;
}

export interface WhatsAppDriver {
  id: string; // Identifier unik: 'FONNTE', 'GATEWAY_SENDIRI', 'META_CLOUD', dsb.
  name: string;
  description: string;
  send: (params: WhatsAppSendParams) => Promise<WhatsAppSendResponse>;
  checkConnection?: (config: any) => Promise<{
    success: boolean;
    latencyMs: number;
    message?: string;
    deviceInfo?: any;
    error?: string;
  }>;
}

// 1. DRIVER FONNTE
export const fonnteDriver: WhatsAppDriver = {
  id: 'FONNTE',
  name: 'Fonnte WhatsApp API',
  description: 'Layanan WhatsApp Gateway Cloud resmi fonnte.com',
  async send({ to, body, config }) {
    const token = config.fonnteToken;
    if (!token) {
      throw new Error('Token API Fonnte belum dikonfigurasi.');
    }

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
          target: to,
          message: body,
          countryCode: config.fonnteCountryCode || '62',
        }),
        signal: controller.signal,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.status === false) {
        const errorMsg = data?.reason || data?.message || `HTTP ${response.status} ${response.statusText}`;
        throw new Error(`Gagal mengirim WhatsApp via Fonnte: ${errorMsg}`);
      }

      return {
        messageId: data?.id?.[0] || `fonnte_${Date.now()}`,
        provider: 'fonnte',
        rawResponse: data,
      };
    } finally {
      clearTimeout(timeout);
    }
  },
};

// 2. DRIVER GATEWAY SENDIRI
export const gatewaySendiriDriver: WhatsAppDriver = {
  id: 'GATEWAY_SENDIRI',
  name: 'Gateway Sendiri (REST API)',
  description: 'Gateway mandiri (Baileys / WPPConnect / HTTP Webhook internal)',
  async send({ to, body, config }) {
    const url = config.gatewayUrl;
    if (!url) {
      throw new Error('URL Gateway WhatsApp Sendiri belum dikonfigurasi.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (config.gatewayToken) {
        headers['Authorization'] = config.gatewayToken;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          target: to,
          message: body,
        }),
        signal: controller.signal,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.status === false) {
        const errorMsg = data?.reason || data?.message || `HTTP ${response.status} ${response.statusText}`;
        throw new Error(`Gagal mengirim WhatsApp via Gateway Sendiri: ${errorMsg}`);
      }

      return {
        messageId: data?.id || `gw_${Date.now()}`,
        provider: 'gateway_sendiri',
        rawResponse: data,
      };
    } finally {
      clearTimeout(timeout);
    }
  },
};

// 3. DRIVER META WHATSAPP CLOUD API (OFFICIAL)
export const metaCloudDriver: WhatsAppDriver = {
  id: 'META_CLOUD',
  name: 'Meta WhatsApp Cloud API',
  description: 'Official WhatsApp Business Platform by Meta Graph API',
  async send({ to, body, config }) {
    const phoneNumberId = config.metaPhoneNumberId;
    const accessToken = config.metaAccessToken;
    const apiVersion = config.metaApiVersion || 'v21.0';

    if (!phoneNumberId || !accessToken) {
      throw new Error('Kredensial Meta WhatsApp Cloud API belum lengkap (Phone Number ID & Access Token).');
    }

    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: {
        preview_url: false,
        body,
      },
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg =
          data?.error?.message ||
          data?.error?.error_data?.details ||
          `Meta API Error (HTTP ${response.status}): ${response.statusText}`;
        throw new Error(`Gagal mengirim WhatsApp via Meta API: ${errorMsg}`);
      }

      return {
        messageId: data?.messages?.[0]?.id || `wamid_${Date.now()}`,
        provider: 'meta_cloud_api',
        rawResponse: data,
      };
    } finally {
      clearTimeout(timeout);
    }
  },
};

// REGISTRY DRIVER
const driversRegistry = new Map<string, WhatsAppDriver>([
  ['FONNTE', fonnteDriver],
  ['GATEWAY_SENDIRI', gatewaySendiriDriver],
  ['META_CLOUD', metaCloudDriver],
]);

/**
 * Mendaftarkan provider driver baru secara dinamis
 */
export function registerWhatsAppDriver(driver: WhatsAppDriver) {
  driversRegistry.set(driver.id.toUpperCase(), driver);
}

/**
 * Mengambil provider driver berdasarkan ID
 */
export function getWhatsAppDriver(providerId: string): WhatsAppDriver | undefined {
  return driversRegistry.get(providerId.toUpperCase());
}

/**
 * Mengambil daftar seluruh driver yang terdaftar
 */
export function getAllWhatsAppDrivers(): WhatsAppDriver[] {
  return Array.from(driversRegistry.values());
}
