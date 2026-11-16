/**
 * SISTEM INFORMASI PELAYANAN DIGITAL RW
 * Modul Standardisasi Desain Seluruh Notifikasi (Email, WhatsApp, Dashboard)
 * 
 * Standar Identitas Visual Resmi:
 * - Deep Royal Navy: #1e3a8a / #1e40af
 * - Latar Belakang: Putih (#ffffff) dan Abu Lembut (#f8fafc)
 * - Border Halus: #e2e8f0
 * - Sukses: #16a34a (bg: #dcfce7, border: #86efac)
 * - Peringatan: #b45309 (bg: #fef3c7, border: #fde68a)
 * - Perhatian / Penolakan: #b91c1c (bg: #fee2e2, border: #fca5a5)
 * - Informasi: #2563eb (bg: #eff6ff, border: #bfdbfe)
 */

export type StatusTone = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

export interface StatusBadgeConfig {
  label: string;
  tone: StatusTone;
  color: string;      // Warna teks badge
  bgColor: string;    // Warna latar badge
  borderColor?: string;
}

export interface DetailField {
  label: string;
  value?: string | null;
}

export interface StandardNotificationPayload {
  type: 'PENGUMUMAN' | 'PENGAJUAN_SURAT' | 'PENGADUAN' | 'INFORMASI_LAYANAN';
  recipientName: string;
  headline: string;
  summary: string;
  statusBadge?: StatusBadgeConfig;
  details?: DetailField[];
  officerNotes?: string | null;
  nextInstructions?: string | null;
  actionUrl?: string | null;
  actionLabel?: string | null;
  downloadUrl?: string | null;
  downloadLabel?: string | null;
  isDocumentAttached?: boolean;
  attachedFileName?: string | null;
  icon?: string;
}

export interface GeneratedNotificationFormat {
  subject: string;
  emailHtml: string;
  whatsappText: string;
  inApp: {
    icon: string;
    title: string;
    summary: string;
    statusBadge?: StatusBadgeConfig;
    actionUrl?: string | null;
    actionLabel?: string | null;
    downloadUrl?: string | null;
    downloadLabel?: string | null;
    isDocumentAttached?: boolean;
    attachedFileName?: string | null;
    officerNotes?: string | null;
    nextInstructions?: string | null;
    details: { label: string; value: string }[];
  };
}

// ============================================================================
// HELPER UTILITIES
// ============================================================================

export function escapeHtml(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Filter detail fields: Hanya menyertakan baris yang memiliki nilai aktual yang valid
 * Mencegah penampilan placeholder mentah seperti {{nama}}, undefined, null, atau baris kosong
 */
export function filterValidDetails(details?: DetailField[]): { label: string; value: string }[] {
  if (!Array.isArray(details)) return [];
  return details
    .filter(
      (d) =>
        d &&
        typeof d.label === 'string' &&
        d.value !== undefined &&
        d.value !== null &&
        String(d.value).trim() !== '' &&
        String(d.value).trim() !== '-'
    )
    .map((d) => ({
      label: d.label.trim(),
      value: String(d.value).trim(),
    }));
}

// ============================================================================
// 1. GENERATOR EMAIL HTML RESMI & RESPONSIF (GMAIL & MOBILE COMPATIBLE)
// ============================================================================

export function generateStandardEmailHtml(payload: StandardNotificationPayload): string {
  const {
    recipientName,
    headline,
    summary,
    statusBadge,
    details = [],
    officerNotes,
    nextInstructions,
    actionUrl,
    actionLabel = 'Lihat Detail Layanan',
    downloadUrl,
    downloadLabel = 'Unduh Dokumen Surat Resmi (PDF)',
    isDocumentAttached,
    attachedFileName,
  } = payload;

  const validDetails = filterValidDetails(details);

  const detailRowsHtml = validDetails
    .map(
      (d, idx) => `
      <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="padding: 10px 14px; font-size: 13px; color: #475569; font-weight: 600; width: 38%; border-bottom: 1px solid #e2e8f0; vertical-align: top;">
          ${escapeHtml(d.label)}
        </td>
        <td style="padding: 10px 14px; font-size: 13.5px; color: #0f172a; font-weight: 500; border-bottom: 1px solid #e2e8f0; vertical-align: top;">
          ${escapeHtml(d.value)}
        </td>
      </tr>`
    )
    .join('');

  const displayName = recipientName && recipientName.trim() ? recipientName.trim() : 'Warga Lingkungan';

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(headline)}</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    @media screen and (max-width: 600px) {
      .container-table { width: 100% !important; border-radius: 0 !important; }
      .mobile-padding { padding: 24px 18px !important; }
      .header-padding { padding: 22px 18px !important; }
      .cta-btn { width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #0f172a; line-height: 1.55;">
  <!-- Backdrop Background -->
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f1f5f9; padding: 32px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container (Max ~600px, Rounded, Smooth Border) -->
        <table class="container-table" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);">
          
          <!-- Header Biru Navy Resmi -->
          <tr>
            <td class="header-padding" style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); padding: 26px 32px; text-align: left; border-bottom: 3px solid #3b82f6;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td>
                    <div style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: 0.04em; text-transform: uppercase;">
                      Pelayanan Digital RW
                    </div>
                    <div style="font-size: 12.5px; font-weight: 500; color: #bfdbfe; margin-top: 3px; letter-spacing: 0.02em;">
                      Portal Informasi &amp; Layanan Digital Warga
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Card Content -->
          <tr>
            <td class="mobile-padding" style="padding: 32px 32px 24px 32px;">
              
              <!-- Sapaan Personal Sopan -->
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155;">
                Yth. Bapak/Ibu <strong>${escapeHtml(displayName)}</strong>,
              </p>

              <!-- Judul Notifikasi yang Jelas -->
              <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0f172a; line-height: 1.35;">
                ${escapeHtml(headline)}
              </h1>

              <!-- Badge Status Semantik (Jika ada) -->
              ${statusBadge
      ? `<div style="margin-bottom: 20px;">
                      <span style="display: inline-block; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 700; color: ${escapeHtml(
        statusBadge.color
      )}; background-color: ${escapeHtml(
        statusBadge.bgColor
      )}; border: 1px solid ${escapeHtml(
        statusBadge.borderColor || statusBadge.color + '40'
      )};">
                        ${escapeHtml(statusBadge.label)}
                      </span>
                    </div>`
      : ''
    }

              <!-- Ringkasan Informasi -->
              <div style="font-size: 14.5px; line-height: 1.65; color: #334155; margin-bottom: 24px;">
                ${escapeHtml(summary).replace(/\n/g, '<br>')}
              </div>

              <!-- Kartu Rincian Informasi Dinamis -->
              ${validDetails.length > 0
      ? `<div style="margin-bottom: 24px;">
                      <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
                        Detail Informasi
                      </div>
                      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border: 1px solid #e2e8f0; border-radius: 8px; border-collapse: separate; overflow: hidden; background-color: #ffffff;">
                        ${detailRowsHtml}
                      </table>
                    </div>`
      : ''
    }

              <!-- Kotak Catatan Petugas (Hanya jika tersedia) -->
              ${officerNotes && officerNotes.trim()
      ? `<div style="background-color: #eff6ff; border-left: 4px solid #1e40af; border-top: 1px solid #bfdbfe; border-right: 1px solid #bfdbfe; border-bottom: 1px solid #bfdbfe; padding: 14px 18px; border-radius: 6px; margin-bottom: 24px;">
                      <div style="font-size: 12px; font-weight: 700; color: #1e40af; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px;">
                        Catatan Petugas
                      </div>
                      <div style="font-size: 13.5px; color: #1e3a8a; line-height: 1.55;">
                        ${escapeHtml(officerNotes)}
                      </div>
                    </div>`
      : ''
    }

              <!-- Kotak Langkah Selanjutnya (Hanya jika tersedia) -->
              ${nextInstructions && nextInstructions.trim()
      ? `<div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; padding: 14px 18px; border-radius: 8px; margin-bottom: 24px;">
                      <div style="font-size: 12px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px;">
                        Langkah Selanjutnya
                      </div>
                      <div style="font-size: 13.5px; color: #475569; line-height: 1.55;">
                        ${escapeHtml(nextInstructions).replace(/\n/g, '<br>')}
                      </div>
                    </div>`
      : ''
    }

              <!-- Bagian Dokumen Resmi Surat -->
              ${isDocumentAttached && attachedFileName
      ? `<div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #16a34a; border-radius: 8px; padding: 18px 20px; margin-bottom: 24px;">
                      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                        <tr>
                          <td style="vertical-align: top; width: 34px;">
                            <span style="font-size: 11px; font-weight: 700; color: #166534; background: #dcfce7; border: 1px solid #86efac; border-radius: 4px; padding: 3px 6px;">PDF</span>
                          </td>
                          <td style="vertical-align: top;">
                            <div style="font-size: 13.5px; font-weight: 700; color: #166534; margin-bottom: 4px;">
                              Dokumen PDF Resmi Telah Dilampirkan pada Email Ini
                            </div>
                            <div style="font-size: 13px; color: #15803d; line-height: 1.55; margin-bottom: 8px;">
                              Berkas resmi <strong>${escapeHtml(attachedFileName)}</strong> telah disahkan secara digital lengkap dengan nomor surat resmi dan kode verifikasi QR. Dokumen terlampir langsung pada email ini dan dapat langsung Anda buka, unduh, atau cetak.
                            </div>
                            ${downloadUrl
        ? `<div style="font-size: 12px; color: #166534; border-top: 1px dashed #bbf7d0; padding-top: 8px; margin-top: 8px;">
                                    Salinan digital juga dapat diunduh melalui portal warga: 
                                    <a href="${escapeHtml(downloadUrl)}" style="color: #15803d; font-weight: 700; text-decoration: underline;">Unduh Salinan Dokumen Resmi (PDF)</a>
                                  </div>`
        : ''
      }
                          </td>
                        </tr>
                      </table>
                    </div>`
      : downloadUrl
        ? `<div style="background-color: #fefce8; border: 1px solid #fef08a; border-left: 4px solid #ca8a04; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
                      <div style="font-size: 13.5px; font-weight: 700; color: #854d0e; margin-bottom: 4px;">
                        Dokumen Resmi Siap Diunduh Melalui Portal
                      </div>
                      <div style="font-size: 12.5px; color: #713f12; line-height: 1.55; margin-bottom: 12px;">
                        Surat resmi Anda telah diterbitkan. Silakan klik tombol di bawah untuk mengunduh dokumen secara langsung dari portal resmi warga.
                      </div>
                      <a href="${escapeHtml(downloadUrl)}" style="display: inline-block; padding: 10px 22px; background-color: #ca8a04; color: #ffffff; text-decoration: none; font-size: 12.5px; font-weight: 700; border-radius: 6px; box-shadow: 0 2px 4px rgba(202, 138, 4, 0.25);">
                        ${escapeHtml(downloadLabel || 'Unduh Berkas Surat Resmi (PDF)')} &darr;
                      </a>
                    </div>`
        : ''
    }

              <!-- Tombol CTA Biru Navy -->
              ${actionUrl && actionUrl.trim()
      ? `<div style="text-align: center; margin: 32px 0 16px 0;">
                      <a class="cta-btn" href="${escapeHtml(actionUrl)}" style="display: inline-block; padding: 13px 32px; background-color: #1e3a8a; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(30, 58, 138, 0.25); text-align: center;">
                        ${escapeHtml(actionLabel)} &rarr;
                      </a>
                    </div>
                    <div style="text-align: center; font-size: 12px; color: #64748b; margin-top: 8px;">
                      Jika tombol tidak dapat diklik, buka tautan berikut:<br>
                      <a href="${escapeHtml(actionUrl)}" style="color: #1e40af; word-break: break-all;">${escapeHtml(actionUrl)}</a>
                    </div>`
      : ''
    }

              <!-- Penutup Sopan -->
              <p style="margin: 32px 0 0 0; font-size: 13.5px; color: #64748b; line-height: 1.5;">
                Terima kasih atas kerja sama dan partisipasi aktif Bapak/Ibu dalam mewujudkan lingkungan RW yang tertib, aman, dan nyaman.
              </p>
            </td>
          </tr>

          <!-- Footer Resmi dan Bantuan -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b; line-height: 1.55;">
              <p style="margin: 0 0 4px 0; font-weight: 700; color: #1e3a8a; font-size: 13px; letter-spacing: 0.02em;">
                PELAYANAN DIGITAL RW
              </p>
              <p style="margin: 0 0 8px 0; font-weight: 500; color: #475569;">
                Portal Informasi &amp; Layanan Digital Warga &copy; ${new Date().getFullYear()}
              </p>
              <p style="margin: 0 0 8px 0; color: #64748b; font-size: 11.5px;">
                Untuk bantuan atau informasi lebih lanjut, silakan hubungi pengurus RT/RW setempat melalui portal layanan warga.
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 11px;">
                Email pemberitahuan ini dikirim secara otomatis oleh sistem resmi. Mohon untuk tidak membalas langsung ke alamat email ini.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// ============================================================================
// 2. GENERATOR WHATSAPP RESMI & TERSTRUKTUR
// ============================================================================

export function generateStandardWhatsAppText(payload: StandardNotificationPayload): string {
  const {
    recipientName,
    headline,
    summary,
    statusBadge,
    details = [],
    officerNotes,
    nextInstructions,
    actionUrl,
    actionLabel,
    downloadUrl,
    downloadLabel,
    isDocumentAttached,
    attachedFileName,
  } = payload;

  const validDetails = filterValidDetails(details);
  const parts: string[] = [];

  // 1. Identitas Resmi Sistem
  parts.push('PELAYANAN DIGITAL RW');
  parts.push('Portal Informasi & Layanan Digital Warga');
  parts.push('━━━━━━━━━━━━━━━━━━━━━');

  // 2. Judul Notifikasi yang Jelas
  const iconHeader = payload.icon ? `${payload.icon} ` : '';
  parts.push(`*${iconHeader}${headline.toUpperCase()}*`);

  // Badge Status jika ada
  if (statusBadge) {
    parts.push(`*Status:* [${statusBadge.label}]`);
  }
  parts.push('');

  // 3. Sapaan Personal
  const displayName = recipientName && recipientName.trim() ? recipientName.trim() : 'Warga Lingkungan';
  parts.push(`Yth. Bapak/Ibu *${displayName}*,`);
  parts.push('');

  // 4. Ringkasan Informasi Utama
  parts.push(summary.trim());
  parts.push('');

  // 5. Detail Informasi dengan Label Konsisten
  if (validDetails.length > 0) {
    parts.push('*Detail Informasi*');
    for (const d of validDetails) {
      parts.push(`• ${d.label}: ${d.value}`);
    }
    parts.push('');
  }

  // 6. Catatan Petugas (Hanya jika tersedia)
  if (officerNotes && officerNotes.trim()) {
    parts.push('*Catatan Petugas:*');
    parts.push(`_${officerNotes.trim()}_`);
    parts.push('');
  }

  // 7. Langkah Selanjutnya (Hanya jika tersedia)
  if (nextInstructions && nextInstructions.trim()) {
    parts.push('*Langkah Selanjutnya:*');
    parts.push(nextInstructions.trim());
    parts.push('');
  }

  // 8. Dokumen Resmi (Lampiran Email / Tautan Unduh)
  if (isDocumentAttached && attachedFileName) {
    parts.push('*Lampiran Email:*');
    parts.push(`Berkas _${attachedFileName}_ telah dilampirkan langsung pada email Anda.`);
    if (downloadUrl && downloadUrl.trim()) {
      parts.push(`*Unduh Salinan Digital:* ${downloadUrl.trim()}`);
    }
    parts.push('');
  } else if (downloadUrl && downloadUrl.trim()) {
    const rawLabel = downloadLabel || 'Unduh Dokumen Surat Resmi';
    const dlTitle = rawLabel.includes('📥') ? rawLabel : `📥 ${rawLabel}`;
    parts.push(`*${dlTitle}:*`);
    parts.push(downloadUrl.trim());
    parts.push('');
  }

  // 9. Tautan Detail yang Valid (Hanya jika tersedia)
  if (actionUrl && actionUrl.trim()) {
    const linkText = actionLabel ? actionLabel : 'Lihat detail';
    parts.push(`*${linkText}:* ${actionUrl.trim()}`);
    parts.push('');
  }

  // 10. Penutup Sopan dari Pengurus RT/RW
  parts.push('Terima kasih.');
  parts.push('*Pengurus RT/RW*');

  return parts.join('\n');
}

// ============================================================================
// 3. CAKUPAN 1: PENGUMUMAN LINGKUNGAN
// ============================================================================

export function getPengumumanCategoryBadge(kategori: string): StatusBadgeConfig {
  const upper = (kategori || '').toUpperCase();
  if (
    upper.includes('KEGIATAN') ||
    upper.includes('KERJA BAKTI') ||
    upper.includes('GOTONG') ||
    upper.includes('POSYANDU') ||
    upper.includes('KESEHATAN')
  ) {
    return {
      label: kategori,
      tone: 'success',
      color: '#16a34a',
      bgColor: '#dcfce7',
      borderColor: '#86efac',
    };
  }
  if (
    upper.includes('KEAMANAN') ||
    upper.includes('PERINGATAN') ||
    upper.includes('MENDESAK') ||
    upper.includes('DARURAT') ||
    upper.includes('PENTING')
  ) {
    return {
      label: kategori,
      tone: 'warning',
      color: '#b45309',
      bgColor: '#fef3c7',
      borderColor: '#fde68a',
    };
  }
  return {
    label: kategori,
    tone: 'info',
    color: '#2563eb',
    bgColor: '#eff6ff',
    borderColor: '#bfdbfe',
  };
}

export function formatPengumumanNotification({
  recipientName,
  judul,
  kategori,
  konten,
  tanggalKegiatan,
  lokasiKegiatan,
  penyelenggara,
  wilayahSasaran,
  instruksi,
  actionUrl,
}: {
  recipientName: string;
  judul: string;
  kategori: string;
  konten: string;
  tanggalKegiatan?: string | null;
  lokasiKegiatan?: string | null;
  penyelenggara?: string | null;
  wilayahSasaran?: string | null;
  instruksi?: string | null;
  actionUrl?: string | null;
}): GeneratedNotificationFormat {
  const badge = getPengumumanCategoryBadge(kategori);

  const details: DetailField[] = [
    { label: 'Jenis', value: 'Pengumuman Lingkungan' },
    { label: 'Kategori', value: kategori },
    { label: 'Wilayah Sasaran', value: wilayahSasaran },
    { label: 'Jadwal / Waktu', value: tanggalKegiatan },
    { label: 'Lokasi Kegiatan', value: lokasiKegiatan },
    { label: 'Penyelenggara', value: penyelenggara || 'Pengurus Lingkungan RW' },
  ];

  const payload: StandardNotificationPayload = {
    type: 'PENGUMUMAN',
    recipientName,
    headline: `Pengumuman Warga: ${judul}`,
    summary: konten,
    statusBadge: badge,
    details,
    nextInstructions: instruksi || null,
    actionUrl: actionUrl || null,
    actionLabel: 'Lihat Pengumuman',
    icon: '📢',
  };

  const subject = `[Pengumuman RW] ${judul}`;

  return {
    subject,
    emailHtml: generateStandardEmailHtml(payload),
    whatsappText: generateStandardWhatsAppText(payload),
    inApp: {
      icon: 'PENGUMUMAN',
      title: `Pengumuman: ${judul}`,
      summary: konten.length > 150 ? konten.slice(0, 147) + '...' : konten,
      statusBadge: payload.statusBadge,
      actionUrl: payload.actionUrl,
      actionLabel: payload.actionLabel,
      nextInstructions: payload.nextInstructions,
      details: filterValidDetails(details),
    },
  };
}

// ============================================================================
// 4. CAKUPAN 2: PENGAJUAN SURAT
// ============================================================================

export interface SuratStatusMetadata {
  label: string;
  tone: StatusTone;
  badgeColor: string;
  badgeBg: string;
  borderColor: string;
  summary: string;
  nextSteps: string;
}

export const SURAT_STATUS_REGISTRY: Record<string, SuratStatusMetadata> = {
  SUBMITTED: {
    label: 'Pengajuan Diterima',
    tone: 'info',
    badgeColor: '#2563eb',
    badgeBg: '#eff6ff',
    borderColor: '#bfdbfe',
    summary:
      'Permohonan surat pengajuan Anda telah berhasil dicatat ke sistem dan sedang menunggu proses verifikasi awal oleh pengurus RT.',
    nextSteps:
      'Ketua RT akan memeriksa kelengkapan data dan identitas warga. Anda akan mendapatkan notifikasi pembaruan setelah verifikasi selesai.',
  },
  PENDING_RT_VERIFICATION: {
    label: 'Menunggu Verifikasi RT',
    tone: 'warning',
    badgeColor: '#b45309',
    badgeBg: '#fef3c7',
    borderColor: '#fde68a',
    summary: 'Pengajuan surat Anda sedang dalam antrean verifikasi oleh Ketua RT setempat.',
    nextSteps:
      'Mohon pastikan nomor kontak Anda tetap aktif apabila pengurus memerlukan konfirmasi berkas pendukung.',
  },
  VERIFIED_RT: {
    label: 'Diverifikasi Ketua RT',
    tone: 'info',
    badgeColor: '#2563eb',
    badgeBg: '#eff6ff',
    borderColor: '#bfdbfe',
    summary:
      'Pengajuan surat Anda telah disetujui dan diverifikasi oleh Ketua RT, serta diteruskan ke Pengurus RW.',
    nextSteps:
      'Pengurus RW sedang memproses persetujuan akhir serta penerbitan tanda tangan dan nomor dokumen resmi.',
  },
  PENDING_RW_APPROVAL: {
    label: 'Menunggu Persetujuan RW',
    tone: 'warning',
    badgeColor: '#b45309',
    badgeBg: '#fef3c7',
    borderColor: '#fde68a',
    summary: 'Pengajuan surat Anda saat ini dalam antrean persetujuan akhir oleh Pengurus RW.',
    nextSteps: 'Dokumen surat resmi akan segera diterbitkan setelah disahkan oleh Ketua RW.',
  },
  REVISION_REQUIRED: {
    label: 'Perlu Perbaikan (Revisi)',
    tone: 'warning',
    badgeColor: '#b45309',
    badgeBg: '#fef3c7',
    borderColor: '#fde68a',
    summary:
      'Pengajuan surat Anda memerlukan perbaikan atau kelengkapan dokumen pendukung sebelum dapat diproses lebih lanjut.',
    nextSteps:
      'Silakan periksa catatan pengurus di bawah ini, lalu buka tautan detail pengajuan untuk melengkapi atau mengunggah ulang dokumen perbaikan.',
  },
  APPROVED: {
    label: 'Pengajuan Disetujui',
    tone: 'success',
    badgeColor: '#16a34a',
    badgeBg: '#dcfce7',
    borderColor: '#86efac',
    summary: 'Pengajuan surat Anda telah resmi disetujui oleh Pengurus RW.',
    nextSteps:
      'Dokumen digital resmi sedang digenerate lengkap dengan nomor surat dan QR Code verifikasi keabsahan.',
  },
  DOCUMENT_ISSUED: {
    label: 'Dokumen Selesai Diterbitkan',
    tone: 'success',
    badgeColor: '#16a34a',
    badgeBg: '#dcfce7',
    borderColor: '#86efac',
    summary:
      'Surat resmi Anda telah berhasil diterbitkan lengkap dengan nomor dokumen resmi dan kode verifikasi keabsahan digital.',
    nextSteps:
      'Anda dapat langsung mengunduh dan mencetak dokumen resmi (format PDF) melalui portal warga atau tombol unduh di bawah ini.',
  },
  REJECTED: {
    label: 'Pengajuan Ditolak',
    tone: 'danger',
    badgeColor: '#b91c1c',
    badgeBg: '#fee2e2',
    borderColor: '#fca5a5',
    summary:
      'Permohonan pengajuan surat Anda belum dapat disetujui oleh pengurus lingkungan.',
    nextSteps:
      'Silakan cermati catatan petugas di bawah ini. Anda dapat berkonsultasi dengan pengurus RT/RW atau mengajukan ulang permohonan jika diperlukan.',
  },
  REVOKED: {
    label: 'Dokumen Telah Dicabut',
    tone: 'danger',
    badgeColor: '#b91c1c',
    badgeBg: '#fee2e2',
    borderColor: '#fca5a5',
    summary:
      'Dokumen surat yang sebelumnya telah diterbitkan telah dicabut status keabsahannya oleh pengurus RW.',
    nextSteps:
      'Dokumen tersebut tidak lagi sah untuk keperluan administrasi resmi. Hubungi pengurus RW untuk informasi klarifikasi lebih lanjut.',
  },
};

export function formatSuratStatusNotification({
  recipientName,
  requestId,
  serviceName,
  status,
  documentNumber,
  tanggal,
  wilayahPemohon,
  note,
  downloadUrl,
  isDocumentAttached,
  attachedFileName,
  actionUrl,
}: {
  recipientName: string;
  requestId: string;
  serviceName: string;
  status: string;
  documentNumber?: string | null;
  tanggal?: string | null;
  wilayahPemohon?: string | null;
  note?: string | null;
  downloadUrl?: string | null;
  isDocumentAttached?: boolean;
  attachedFileName?: string | null;
  actionUrl?: string | null;
}): GeneratedNotificationFormat {
  const statusMeta = SURAT_STATUS_REGISTRY[status] || {
    label: status,
    tone: 'info',
    badgeColor: '#2563eb',
    badgeBg: '#eff6ff',
    borderColor: '#bfdbfe',
    summary: `Status permohonan surat Anda telah diperbarui menjadi ${status}.`,
    nextSteps: 'Silakan pantau perkembangan pengajuan Anda secara berkala melalui portal pelayanan warga.',
  };

  const isIssued = status === 'DOCUMENT_ISSUED';
  const effectiveDownloadUrl = isIssued ? downloadUrl || null : null;

  const details: DetailField[] = [
    { label: 'Jenis Layanan', value: serviceName },
    { label: 'Nomor Referensi', value: requestId },
    { label: 'Status Terkini', value: statusMeta.label },
    { label: 'Tanggal Pembaruan', value: tanggal },
    { label: 'Wilayah Pemohon', value: wilayahPemohon },
  ];

  if (documentNumber && documentNumber.trim()) {
    details.push({ label: 'Nomor Dokumen Resmi', value: documentNumber.trim() });
  }

  if (isIssued) {
    if (isDocumentAttached && attachedFileName) {
      details.push({ label: 'Lampiran Berkas', value: attachedFileName });
    } else {
      details.push({ label: 'Akses Dokumen', value: 'Unduhan Portal Warga' });
    }
  }

  const effectiveSummary =
    isIssued && isDocumentAttached && attachedFileName
      ? 'Surat resmi Anda telah berhasil diterbitkan dan dilampirkan langsung pada email pemberitahuan ini dalam format PDF resmi bertanda tangan digital serta kode QR verifikasi keabsahan.'
      : statusMeta.summary;

  const payload: StandardNotificationPayload = {
    type: 'PENGAJUAN_SURAT',
    recipientName,
    headline: `Pembaruan Pengajuan: ${serviceName}`,
    summary: effectiveSummary,
    statusBadge: {
      label: statusMeta.label,
      tone: statusMeta.tone,
      color: statusMeta.badgeColor,
      bgColor: statusMeta.badgeBg,
      borderColor: statusMeta.borderColor,
    },
    details,
    officerNotes: note && note.trim() ? note.trim() : null,
    nextInstructions: statusMeta.nextSteps,
    actionUrl: actionUrl || null,
    actionLabel: 'Lihat Detail Pengajuan',
    downloadUrl: effectiveDownloadUrl,
    downloadLabel: 'Unduh Berkas Surat Resmi (PDF)',
    isDocumentAttached: Boolean(isDocumentAttached),
    attachedFileName: attachedFileName || null,
    icon: 'PENGAJUAN_SURAT',
  };

  const subject = `[Layanan Surat RW] ${serviceName}: ${statusMeta.label}`;

  return {
    subject,
    emailHtml: generateStandardEmailHtml(payload),
    whatsappText: generateStandardWhatsAppText(payload),
    inApp: {
      icon: 'PENGAJUAN_SURAT',
      title: `${serviceName} - ${statusMeta.label}`,
      summary: effectiveSummary,
      statusBadge: payload.statusBadge,
      actionUrl: payload.actionUrl,
      actionLabel: payload.actionLabel,
      downloadUrl: payload.downloadUrl,
      downloadLabel: payload.downloadLabel,
      isDocumentAttached: payload.isDocumentAttached,
      attachedFileName: payload.attachedFileName,
      officerNotes: payload.officerNotes,
      nextInstructions: payload.nextInstructions,
      details: filterValidDetails(details),
    },
  };
}

// ============================================================================
// 5. CAKUPAN 3: PENGADUAN WARGA
// ============================================================================

export interface PengaduanStatusMetadata {
  label: string;
  tone: StatusTone;
  badgeColor: string;
  badgeBg: string;
  borderColor: string;
  summary: string;
  nextSteps: string;
}

export const PENGADUAN_STATUS_REGISTRY: Record<string, PengaduanStatusMetadata> = {
  DILAPORKAN: {
    label: 'Pengaduan Berhasil Dicatat',
    tone: 'info',
    badgeColor: '#2563eb',
    badgeBg: '#eff6ff',
    borderColor: '#bfdbfe',
    summary:
      'Laporan pengaduan Anda telah berhasil dicatat ke sistem dan masuk ke dalam antrean telaah pengurus lingkungan.',
    nextSteps:
      'Pengurus wilayah akan meninjau laporan dan mengonfirmasi rencana penanganan dalam waktu dekat.',
  },
  DITINJAU: {
    label: 'Sedang Ditinjau',
    tone: 'warning',
    badgeColor: '#b45309',
    badgeBg: '#fef3c7',
    borderColor: '#fde68a',
    summary: 'Laporan pengaduan Anda saat ini sedang diperiksa dan ditelaah oleh tim pengurus lingkungan.',
    nextSteps:
      'Pengurus sedang berkoordinasi dengan seksi terkait untuk menentukan langkah tindak lanjut penanganan.',
  },
  DIPROSES: {
    label: 'Sedang Diproses',
    tone: 'info',
    badgeColor: '#2563eb',
    badgeBg: '#eff6ff',
    borderColor: '#bfdbfe',
    summary:
      'Laporan pengaduan Anda telah dikoordinasikan dan saat ini sedang dalam proses penanganan di lapangan.',
    nextSteps:
      'Tim lingkungan sedang melakukan perbaikan atau koordinasi fisik di lokasi yang dilaporkan.',
  },
  SELESAI: {
    label: 'Selesai Ditangani',
    tone: 'success',
    badgeColor: '#16a34a',
    badgeBg: '#dcfce7',
    borderColor: '#86efac',
    summary:
      'Laporan pengaduan Anda telah selesai ditangani dan diselesaikan oleh pihak pengurus lingkungan.',
    nextSteps:
      'Terima kasih atas kepedulian Anda dalam menjaga fasilitas, kebersihan, dan kenyamanan lingkungan bersama.',
  },
  DITOLAK: {
    label: 'Pengaduan Ditolak',
    tone: 'danger',
    badgeColor: '#b91c1c',
    badgeBg: '#fee2e2',
    borderColor: '#fca5a5',
    summary:
      'Laporan pengaduan Anda tidak dapat ditindaklanjuti sesuai dengan ketentuan dan batasan kewenangan lingkungan.',
    nextSteps:
      'Silakan periksa catatan pengurus di bawah ini untuk melihat alasan atau rekomendasi langkah selanjutnya.',
  },
};

export function formatPengaduanStatusNotification({
  recipientName,
  pengaduanId,
  judul,
  kategori,
  lokasi,
  status,
  tanggal,
  wilayahPelapor,
  catatan,
  actionUrl,
}: {
  recipientName: string;
  pengaduanId: string;
  judul: string;
  kategori: string;
  lokasi?: string | null;
  status: string;
  tanggal?: string | null;
  wilayahPelapor?: string | null;
  catatan?: string | null;
  actionUrl?: string | null;
}): GeneratedNotificationFormat {
  const statusMeta = PENGADUAN_STATUS_REGISTRY[status] || {
    label: status,
    tone: 'info',
    badgeColor: '#2563eb',
    badgeBg: '#eff6ff',
    borderColor: '#bfdbfe',
    summary: `Status pengaduan Anda telah diperbarui menjadi ${status}.`,
    nextSteps: 'Silakan pantau perkembangan tindak lanjut pengaduan melalui portal warga.',
  };

  const details: DetailField[] = [
    { label: 'Nomor Pengaduan', value: pengaduanId },
    { label: 'Judul Laporan', value: judul },
    { label: 'Kategori', value: kategori },
    { label: 'Lokasi Kejadian', value: lokasi },
    { label: 'Wilayah Pelapor', value: wilayahPelapor },
    { label: 'Status Terkini', value: statusMeta.label },
    { label: 'Tanggal Pembaruan', value: tanggal },
  ];

  const payload: StandardNotificationPayload = {
    type: 'PENGADUAN',
    recipientName,
    headline: `Pembaruan Pengaduan: ${judul}`,
    summary: statusMeta.summary,
    statusBadge: {
      label: statusMeta.label,
      tone: statusMeta.tone,
      color: statusMeta.badgeColor,
      bgColor: statusMeta.badgeBg,
      borderColor: statusMeta.borderColor,
    },
    details,
    officerNotes: catatan && catatan.trim() ? catatan.trim() : null,
    nextInstructions: statusMeta.nextSteps,
    actionUrl: actionUrl || null,
    actionLabel: 'Lihat Detail Pengaduan',
    icon: 'PENGADUAN',
  };

  const subject = `[Pengaduan Warga] ${judul}: ${statusMeta.label}`;

  return {
    subject,
    emailHtml: generateStandardEmailHtml(payload),
    whatsappText: generateStandardWhatsAppText(payload),
    inApp: {
      icon: 'PENGADUAN',
      title: `Pengaduan: ${judul} (${statusMeta.label})`,
      summary: statusMeta.summary,
      statusBadge: payload.statusBadge,
      actionUrl: payload.actionUrl,
      actionLabel: payload.actionLabel,
      officerNotes: payload.officerNotes,
      nextInstructions: payload.nextInstructions,
      details: filterValidDetails(details),
    },
  };
}

// ============================================================================
// 6. CAKUPAN 4: INFORMASI DAN PENGINGAT LAYANAN
// ============================================================================

export function formatServiceReminderNotification({
  recipientName,
  judul,
  isi,
  kategori = 'Pengingat Layanan',
  jadwal,
  lokasi,
  wilayahSasaran,
  tenggatWaktu,
  instruksi,
  actionUrl,
  actionLabel = 'Lihat Informasi Layanan',
}: {
  recipientName: string;
  judul: string;
  isi: string;
  kategori?: string;
  jadwal?: string | null;
  lokasi?: string | null;
  wilayahSasaran?: string | null;
  tenggatWaktu?: string | null;
  instruksi?: string | null;
  actionUrl?: string | null;
  actionLabel?: string;
}): GeneratedNotificationFormat {
  const details: DetailField[] = [
    { label: 'Kategori', value: kategori },
    { label: 'Wilayah Sasaran', value: wilayahSasaran },
    { label: 'Waktu / Jadwal', value: jadwal },
    { label: 'Lokasi Terkait', value: lokasi },
    { label: 'Tenggat Waktu', value: tenggatWaktu },
  ];

  const payload: StandardNotificationPayload = {
    type: 'INFORMASI_LAYANAN',
    recipientName,
    headline: judul,
    summary: isi,
    statusBadge: {
      label: kategori,
      tone: 'info',
      color: '#2563eb',
      bgColor: '#eff6ff',
      borderColor: '#bfdbfe',
    },
    details,
    nextInstructions: instruksi || null,
    actionUrl: actionUrl || null,
    actionLabel,
    icon: 'INFORMASI',
  };

  const subject = `[Info & Pengingat RW] ${judul}`;

  return {
    subject,
    emailHtml: generateStandardEmailHtml(payload),
    whatsappText: generateStandardWhatsAppText(payload),
    inApp: {
      icon: 'INFORMASI',
      title: judul,
      summary: isi.length > 150 ? isi.slice(0, 147) + '...' : isi,
      statusBadge: payload.statusBadge,
      actionUrl: payload.actionUrl,
      actionLabel: payload.actionLabel,
      nextInstructions: payload.nextInstructions,
      details: filterValidDetails(details),
    },
  };
}
