import crypto from 'crypto';

// Secret key server-side (dapat dikonfigurasi via APP_SECRET atau fallback JWT_SECRET)
const RAW_SECRET =
  process.env.APP_SECRET ||
  process.env.JWT_SECRET ||
  'super-secret-key-untuk-dev-lingkungan-rw';

// Turunkan kunci 32-byte menggunakan SHA-256 untuk AES-256
const ENCRYPTION_KEY = crypto.createHash('sha256').update(RAW_SECRET).digest();
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standar 96-bit IV untuk GCM

/**
 * Enkripsi string rahasia (token API, password SMTP) menggunakan AES-256-GCM
 */
export function encryptSecret(plainText: string): string {
  if (!plainText || typeof plainText !== 'string') return '';

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  // Format: enc:v1:<iv_hex>:<authTag_hex>:<cipher_hex>
  return `enc:v1:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Dekripsi string rahasia yang terenkripsi
 */
export function decryptSecret(cipherText?: string | null): string {
  if (!cipherText || typeof cipherText !== 'string') return '';

  // Jika belum terenkripsi (misal string lama), kembalikan langsung
  if (!cipherText.startsWith('enc:v1:')) {
    return cipherText;
  }

  try {
    const parts = cipherText.split(':');
    if (parts.length !== 5) {
      throw new Error('Format cipher teks enkripsi tidak valid.');
    }

    const iv = Buffer.from(parts[2], 'hex');
    const authTag = Buffer.from(parts[3], 'hex');
    const encryptedHex = parts[4];

    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error: any) {
    console.error('Gagal mendekripsi rahasia server:', error.message);
    return '';
  }
}

/**
 * Masking rahasia agar aman ditampilkan di UI (Client) tanpa membocorkan isi token
 */
export function maskSecret(secret?: string | null, startLen = 4, endLen = 3): string {
  if (!secret) return '';
  const trimmed = secret.trim();
  if (trimmed.length <= startLen + endLen) {
    return '••••••••••••';
  }
  const prefix = trimmed.slice(0, startLen);
  const suffix = trimmed.slice(-endLen);
  return `${prefix}••••••••${suffix}`;
}

/**
 * Masking nomor telepon atau email untuk log publik / audit log
 */
export function sanitizeRecipient(target?: string | null): string {
  if (!target) return '-';
  const trimmed = target.trim();

  // Jika email
  if (trimmed.includes('@')) {
    const [local, domain] = trimmed.split('@');
    const maskedLocal =
      local.length > 2
        ? `${local[0]}${'*'.repeat(Math.min(local.length - 2, 5))}${local[local.length - 1]}`
        : `${local[0]}*`;
    return `${maskedLocal}@${domain}`;
  }

  // Jika nomor telepon
  if (trimmed.length > 6) {
    const prefix = trimmed.slice(0, 4);
    const suffix = trimmed.slice(-3);
    return `${prefix}****${suffix}`;
  }

  return '****';
}
