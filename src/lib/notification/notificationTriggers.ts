import prisma from '@/lib/db';
import { dispatchNotification } from './notificationManager';
import { NotificationChannel, EmailAttachment } from './types';
import {
  formatPengumumanNotification,
  formatSuratStatusNotification,
  formatPengaduanStatusNotification,
  formatServiceReminderNotification,
} from './templates';
import { resolveOfficialDocumentAttachment } from './documentAttachment';

function getBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }
  return 'http://localhost:3000';
}

// ============================================================================
// 1. TRIGGER NOTIFIKASI PENGUMUMAN LINGKUNGAN
// ============================================================================
export async function notifyPengumumanCreated({
  pengumumanId,
  judul,
  konten,
  kategori,
  tanggalKegiatan,
  lokasiKegiatan,
  rwId,
  targetRtId,
  channels = ['EMAIL', 'WHATSAPP'],
  isPublished = true,
}: {
  pengumumanId: string;
  judul: string;
  konten: string;
  kategori: string;
  tanggalKegiatan?: string | null;
  lokasiKegiatan?: string | null;
  rwId?: string | null;
  targetRtId?: string | null;
  channels?: NotificationChannel[];
  isPublished?: boolean;
}) {
  // Hanya kirim notifikasi jika pengumuman sudah dipublikasikan (bukan draf)
  if (!isPublished) {
    return { skipped: true, reason: 'Pengumuman berstatus draf, notifikasi tidak dikirim.' };
  }

  if (!channels || channels.length === 0) {
    return { skipped: true, reason: 'Tidak ada kanal notifikasi yang dipilih.' };
  }

  // Tentukan target penerima warga aktif di wilayah terkait
  const whereWarga: any = { isActive: true };
  let wilayahSasaran = 'Seluruh Warga RW';

  if (targetRtId) {
    whereWarga.rtId = targetRtId;
    const rtData = await prisma.rt.findUnique({
      where: { id: targetRtId },
      select: { nomor: true },
    });
    if (rtData) {
      wilayahSasaran = `Warga RT ${rtData.nomor}`;
    }
  } else if (rwId) {
    whereWarga.rt = { rwId };
    const rwData = await prisma.rw.findUnique({
      where: { id: rwId },
      select: { nomor: true },
    });
    if (rwData) {
      wilayahSasaran = `Seluruh Warga RW ${rwData.nomor}`;
    }
  }

  const wargaList = await prisma.warga.findMany({
    where: whereWarga,
    select: {
      id: true,
      namaLengkap: true,
      email: true,
      noWhatsapp: true,
      notifyEmail: true,
      notifyWhatsapp: true,
      user: {
        select: {
          id: true,
          email: true,
          noWhatsapp: true,
          notifyEmail: true,
          notifyWhatsapp: true,
        },
      },
    },
  });

  if (wargaList.length === 0) {
    return { totalSent: 0, message: 'Tidak ada warga aktif di wilayah target.' };
  }

  const baseUrl = getBaseUrl();
  const noticeUrl = `${baseUrl}/pengumuman`;

  // Kirim notifikasi secara asynchronous ke semua warga yang relevan
  const dispatchPromises = wargaList.map(async (warga) => {
    const effectiveEmail = warga.email || warga.user?.email || null;
    const effectiveWhatsapp = warga.noWhatsapp || warga.user?.noWhatsapp || null;
    const notifyEmail = warga.notifyEmail && (warga.user ? warga.user.notifyEmail : true);
    const notifyWhatsapp = warga.notifyWhatsapp && (warga.user ? warga.user.notifyWhatsapp : true);

    const formatted = formatPengumumanNotification({
      recipientName: warga.namaLengkap,
      judul,
      kategori,
      konten,
      tanggalKegiatan,
      lokasiKegiatan,
      wilayahSasaran,
      penyelenggara: 'Pengurus Lingkungan RW',
      actionUrl: noticeUrl,
    });

    return dispatchNotification({
      type: 'PENGUMUMAN',
      channels,
      recipient: {
        userId: warga.user?.id,
        wargaId: warga.id,
        namaLengkap: warga.namaLengkap,
        email: effectiveEmail,
        noWhatsapp: effectiveWhatsapp,
        notifyEmail,
        notifyWhatsapp,
      },
      subject: formatted.subject,
      content: formatted.whatsappText,
      htmlContent: formatted.emailHtml,
      referenceId: `PENGUMUMAN_${pengumumanId}_${warga.id}`,
      actionUrl: noticeUrl,
      metadata: {
        pengumumanId,
        kategori,
        inApp: formatted.inApp,
      },
    });
  });

  const results = await Promise.allSettled(dispatchPromises);
  return { totalWarga: wargaList.length, results };
}

// ============================================================================
// 2. TRIGGER NOTIFIKASI PERUBAHAN STATUS PENGAJUAN SURAT
// ============================================================================
export async function notifyRequestStatusChanged({
  requestId,
  status,
  note,
  documentNumber,
}: {
  requestId: string;
  status: string;
  note?: string | null;
  documentNumber?: string | null;
}) {
  const req = await prisma.request.findUnique({
    where: { id: requestId },
    include: {
      serviceType: true,
      applicant: {
        include: {
          user: true,
          rt: { include: { rw: true } },
        },
      },
    },
  });

  if (!req || !req.applicant) {
    return { error: 'Data pengajuan atau pemohon tidak ditemukan.' };
  }

  const applicant = req.applicant;
  const baseUrl = getBaseUrl();
  const detailUrl = `${baseUrl}/dashboard/pengajuan/${requestId}`;
  const isDocumentIssued = status === 'DOCUMENT_ISSUED';
  const downloadUrl =
    isDocumentIssued || req.status === 'DOCUMENT_ISSUED'
      ? `${baseUrl}/api/documents/${requestId}`
      : undefined;

  // Syarat 1, 4, 5, 7, 8, 9: Lampiran PDF resmi langsung (MIME Attachment)
  // Hanya jika status DOCUMENT_ISSUED, kepemilikan terverifikasi, dan berkas fisik PDF valid
  let emailAttachments: EmailAttachment[] | undefined;
  let isDocumentAttached = false;
  let attachedFileName: string | undefined;
  let storagePath: string | undefined;

  if (isDocumentIssued) {
    const attachRes = await resolveOfficialDocumentAttachment({
      requestId,
      applicantId: applicant.id,
      serviceName: req.serviceType.name,
      documentNumber: documentNumber || req.documentNumber,
      currentStatus: status,
    });

    if (attachRes.isAvailable && attachRes.attachment) {
      emailAttachments = [attachRes.attachment];
      isDocumentAttached = true;
      attachedFileName = attachRes.filename;
      storagePath = attachRes.storagePath;
    } else {
      console.warn(
        `[NOTIFIKASI EMAIL] Berkas PDF tidak dilampirkan untuk pengajuan ${requestId}: ${attachRes.error}`
      );
    }
  }

  const effectiveEmail = applicant.email || applicant.user?.email || null;
  const effectiveWhatsapp = applicant.noWhatsapp || applicant.user?.noWhatsapp || null;
  const notifyEmail = applicant.notifyEmail && (applicant.user ? applicant.user.notifyEmail : true);
  const notifyWhatsapp = applicant.notifyWhatsapp && (applicant.user ? applicant.user.notifyWhatsapp : true);

  const wilayahPemohon = applicant.rt
    ? `RT ${applicant.rt.nomor || '-'} / RW ${applicant.rt.rw?.nomor || '-'}`
    : undefined;

  const tanggalStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const formatted = formatSuratStatusNotification({
    recipientName: applicant.namaLengkap,
    requestId,
    serviceName: req.serviceType.name,
    status,
    documentNumber: documentNumber || req.documentNumber,
    tanggal: tanggalStr,
    wilayahPemohon,
    note,
    downloadUrl,
    isDocumentAttached,
    attachedFileName,
    actionUrl: detailUrl,
  });

  return dispatchNotification({
    type: 'PENGAJUAN_SURAT',
    channels: ['EMAIL', 'WHATSAPP'],
    recipient: {
      userId: applicant.user?.id,
      wargaId: applicant.id,
      namaLengkap: applicant.namaLengkap,
      email: effectiveEmail,
      noWhatsapp: effectiveWhatsapp,
      notifyEmail,
      notifyWhatsapp,
    },
    subject: formatted.subject,
    content: formatted.whatsappText,
    htmlContent: formatted.emailHtml,
    referenceId: `SURAT_${requestId}_${status}`,
    actionUrl: detailUrl,
    attachments: emailAttachments,
    metadata: {
      requestId,
      status,
      serviceType: req.serviceType.name,
      inApp: formatted.inApp,
      emailHtml: formatted.emailHtml,
      hasAttachment: isDocumentAttached,
      attachmentFileName: attachedFileName,
      storagePath,
    },
  });
}

// ============================================================================
// 3. TRIGGER NOTIFIKASI PERUBAHAN STATUS PENGADUAN WARGA
// ============================================================================
export async function notifyPengaduanStatusChanged({
  pengaduanId,
  status,
  catatan,
}: {
  pengaduanId: string;
  status: string;
  catatan?: string | null;
}) {
  const pengaduan = await prisma.pengaduan.findUnique({
    where: { id: pengaduanId },
    include: {
      rt: { include: { rw: true } },
      pelapor: {
        include: {
          rt: { include: { rw: true } },
          user: {
            include: {
              role: true,
            },
          },
        },
      },
    },
  });

  if (!pengaduan || !pengaduan.pelapor) {
    return { error: 'Pengaduan atau pelapor tidak ditemukan.' };
  }

  const pelapor = pengaduan.pelapor;
  const baseUrl = getBaseUrl();

  // Pastikan hak akses URL detail diperiksa sesuai peran pelapor
  const isPelaporWarga = !pelapor.user || pelapor.user.role?.name === 'WARGA';
  const detailUrl = isPelaporWarga
    ? `${baseUrl}/dashboard/pengaduan/${pengaduanId}`
    : `${baseUrl}/dashboard/pengaduan-warga/${pengaduanId}`;

  const effectiveEmail = pelapor.email || pelapor.user?.email || null;
  const effectiveWhatsapp = pelapor.noWhatsapp || pelapor.user?.noWhatsapp || null;
  const notifyEmail = pelapor.notifyEmail && (pelapor.user ? pelapor.user.notifyEmail : true);
  const notifyWhatsapp = pelapor.notifyWhatsapp && (pelapor.user ? pelapor.user.notifyWhatsapp : true);

  const wilayahPelapor = pelapor.rt
    ? `RT ${pelapor.rt.nomor || '-'} / RW ${pelapor.rt.rw?.nomor || '-'}`
    : pengaduan.rt
    ? `RT ${pengaduan.rt.nomor || '-'}`
    : undefined;

  const tanggalStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const formatted = formatPengaduanStatusNotification({
    recipientName: pelapor.namaLengkap,
    pengaduanId,
    judul: pengaduan.judul,
    kategori: pengaduan.kategori,
    lokasi: pengaduan.lokasi,
    status,
    tanggal: tanggalStr,
    wilayahPelapor,
    catatan,
    actionUrl: detailUrl,
  });

  return dispatchNotification({
    type: 'PENGADUAN',
    channels: ['EMAIL', 'WHATSAPP'],
    recipient: {
      userId: pelapor.user?.id,
      wargaId: pelapor.id,
      namaLengkap: pelapor.namaLengkap,
      email: effectiveEmail,
      noWhatsapp: effectiveWhatsapp,
      notifyEmail,
      notifyWhatsapp,
    },
    subject: formatted.subject,
    content: formatted.whatsappText,
    htmlContent: formatted.emailHtml,
    referenceId: `PENGADUAN_${pengaduanId}_${status}`,
    actionUrl: detailUrl,
    metadata: {
      pengaduanId,
      status,
      judul: pengaduan.judul,
      inApp: formatted.inApp,
    },
  });
}

// ============================================================================
// 4. TRIGGER NOTIFIKASI INFORMASI DAN PENGINGAT LAYANAN
// ============================================================================
export async function notifyServiceReminder({
  wargaId,
  userId,
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
  channels = ['EMAIL', 'WHATSAPP'],
  referenceKey,
}: {
  wargaId?: string | null;
  userId?: string | null;
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
  channels?: NotificationChannel[];
  referenceKey?: string;
}) {
  let targetWarga: any = null;

  if (wargaId) {
    targetWarga = await prisma.warga.findUnique({
      where: { id: wargaId },
      include: {
        user: true,
        rt: { include: { rw: true } },
      },
    });
  } else if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        warga: {
          include: {
            rt: { include: { rw: true } },
          },
        },
      },
    });
    if (user) {
      targetWarga = user.warga
        ? { ...user.warga, user }
        : {
            id: null,
            namaLengkap: user.username,
            email: user.email,
            noWhatsapp: user.noWhatsapp,
            notifyEmail: user.notifyEmail,
            notifyWhatsapp: user.notifyWhatsapp,
            user,
          };
    }
  }

  if (!targetWarga) {
    return { error: 'Penerima pengingat layanan tidak ditemukan.' };
  }

  const effectiveEmail = targetWarga.email || targetWarga.user?.email || null;
  const effectiveWhatsapp = targetWarga.noWhatsapp || targetWarga.user?.noWhatsapp || null;
  const notifyEmail = targetWarga.notifyEmail && (targetWarga.user ? targetWarga.user.notifyEmail : true);
  const notifyWhatsapp = targetWarga.notifyWhatsapp && (targetWarga.user ? targetWarga.user.notifyWhatsapp : true);

  const effectiveWilayah =
    wilayahSasaran ||
    (targetWarga.rt ? `RT ${targetWarga.rt.nomor || '-'}/RW ${targetWarga.rt.rw?.nomor || '-'}` : undefined);

  const formatted = formatServiceReminderNotification({
    recipientName: targetWarga.namaLengkap,
    judul,
    isi,
    kategori,
    jadwal,
    lokasi,
    wilayahSasaran: effectiveWilayah,
    tenggatWaktu,
    instruksi,
    actionUrl: actionUrl || undefined,
    actionLabel,
  });

  const refId = referenceKey
    ? `REMINDER_${referenceKey}_${targetWarga.id || targetWarga.user?.id || 'warga'}`
    : `REMINDER_${Date.now()}_${targetWarga.id || targetWarga.user?.id || 'warga'}`;

  return dispatchNotification({
    type: 'INFORMASI_LAYANAN',
    channels,
    recipient: {
      userId: targetWarga.user?.id || userId,
      wargaId: targetWarga.id || wargaId,
      namaLengkap: targetWarga.namaLengkap,
      email: effectiveEmail,
      noWhatsapp: effectiveWhatsapp,
      notifyEmail,
      notifyWhatsapp,
    },
    subject: formatted.subject,
    content: formatted.whatsappText,
    htmlContent: formatted.emailHtml,
    referenceId: refId,
    actionUrl: actionUrl || undefined,
    metadata: {
      judul,
      kategori,
      inApp: formatted.inApp,
    },
  });
}
