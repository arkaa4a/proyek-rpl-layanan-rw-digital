import fs from 'fs';
import path from 'path';
import prisma from '@/lib/db';
import { EmailAttachment } from './types';

/**
 * Sanitasi string agar aman dijadikan nama berkas PDF di sistem operasi
 * Mengganti karakter invalid / garis miring dengan underscore
 */
export function sanitizeFilenamePart(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_\-]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Membentuk nama file lampiran dokumen resmi yang informatif
 * Contoh: Surat_Keterangan_Domisili_470_12_RW05_X_2026.pdf
 */
export function buildOfficialDocumentFilename(
  serviceName: string,
  documentNumber?: string | null,
  requestId?: string
): string {
  const cleanService = sanitizeFilenamePart(serviceName) || 'Surat_Resmi';
  const cleanNumber = documentNumber
    ? sanitizeFilenamePart(documentNumber)
    : requestId
    ? sanitizeFilenamePart(requestId)
    : 'Dokumen';
  return `${cleanService}_${cleanNumber}.pdf`;
}

export interface DocumentAttachmentResult {
  isAvailable: boolean;
  attachment?: EmailAttachment;
  filename?: string;
  fileSize?: number;
  error?: string;
  storagePath?: string;
}

/**
 * Mengambil dan memvalidasi berkas PDF dokumen resmi dari penyimpanan sistem
 * Memverifikasi hak kepemilikan pemohon dan keabsahan file
 */
export async function resolveOfficialDocumentAttachment({
  requestId,
  applicantId,
  serviceName,
  documentNumber,
  currentStatus,
}: {
  requestId: string;
  applicantId: string;
  serviceName: string;
  documentNumber?: string | null;
  currentStatus?: string;
}): Promise<DocumentAttachmentResult> {
  if (!requestId || !applicantId) {
    return {
      isAvailable: false,
      error: 'ID Pengajuan atau ID Pemohon tidak valid.',
    };
  }

  // Syarat 7: Lampiran PDF HANYA dikirim jika statusnya DOCUMENT_ISSUED.
  if (currentStatus && currentStatus !== 'DOCUMENT_ISSUED') {
    return {
      isAvailable: false,
      error: `Status pengajuan adalah ${currentStatus}, bukan DOCUMENT_ISSUED. Lampiran PDF tidak disertakan.`,
    };
  }

  // 1. Verifikasi data pengajuan dan kepemilikan pemohon di database
  const req = await prisma.request.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      applicantId: true,
      status: true,
      documentNumber: true,
      pdfUrl: true,
    },
  });

  if (!req) {
    return {
      isAvailable: false,
      error: `Data pengajuan ${requestId} tidak ditemukan.`,
    };
  }

  // Keamanan: Validasi bahwa pengajuan benar-benar milik pemohon yang dituju
  if (req.applicantId !== applicantId) {
    return {
      isAvailable: false,
      error: 'Pelanggaran Otorisasi: Dokumen tidak sesuai dengan pemohon yang terdaftar.',
    };
  }

  // Dokumen hanya dilampirkan jika status resmi DOCUMENT_ISSUED atau APPROVED
  if (!['APPROVED', 'DOCUMENT_ISSUED'].includes(req.status)) {
    return {
      isAvailable: false,
      error: `Dokumen belum berstatus DOCUMENT_ISSUED (status saat ini: ${req.status}).`,
    };
  }

  // 2. Periksa berkas fisik PDF di storage/documents
  const rawFileName = `doc-${requestId}.pdf`;
  const storagePath = path.join(process.cwd(), 'storage', 'documents', rawFileName);

  if (!fs.existsSync(storagePath)) {
    return {
      isAvailable: false,
      error: `Berkas PDF resmi belum tersedia di penyimpanan (${rawFileName}).`,
    };
  }

  try {
    const stats = fs.statSync(storagePath);
    if (!stats.isFile() || stats.size === 0) {
      return {
        isAvailable: false,
        error: 'Berkas PDF kosong atau rusak.',
      };
    }

    // 3. Batas ukuran aman lampiran email (maksimum 10 MB)
    const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB
    if (stats.size > MAX_ATTACHMENT_BYTES) {
      return {
        isAvailable: false,
        fileSize: stats.size,
        error: `Ukuran dokumen (${(stats.size / 1024 / 1024).toFixed(2)} MB) melebihi batas lampiran email (10 MB). Gunakan tautan unduh portal.`,
      };
    }

    // 4. Baca buffer PDF untuk lampiran MIME email
    const fileBuffer = fs.readFileSync(storagePath);
    const finalFilename = buildOfficialDocumentFilename(
      serviceName,
      documentNumber || req.documentNumber,
      requestId
    );

    return {
      isAvailable: true,
      filename: finalFilename,
      fileSize: stats.size,
      storagePath,
      attachment: {
        filename: finalFilename,
        content: fileBuffer,
        contentType: 'application/pdf',
      },
    };
  } catch (err: any) {
    return {
      isAvailable: false,
      error: `Gagal membaca berkas PDF: ${err.message}`,
    };
  }
}
