'use server';

import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export interface InAppNotificationItem {
  id: string;
  type: string;
  channel: string;
  subject: string;
  content: string;
  recipientName: string;
  isRead: boolean;
  createdAt: string; // ISO string
  timeAgo: string;
  actionUrl?: string | null;
  actionLabel?: string | null;
  downloadUrl?: string | null;
  downloadLabel?: string | null;
  icon: string;
  statusBadge?: {
    label: string;
    tone: string;
    color: string;
    bgColor: string;
  };
  details: { label: string; value: string }[];
  officerNotes?: string | null;
  nextInstructions?: string | null;
  referenceId?: string | null;
  requiresAction?: boolean;
  actionType?: 'APPROVAL' | 'REVISION' | 'FOLLOW_UP' | null;
}

function formatRelativeTime(dateInput: Date | string): string {
  const d = new Date(dateInput);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 45) return 'Baru saja';
  if (diffMin < 60) return `${diffMin} menit yang lalu`;
  if (diffHour < 24) return `${diffHour} jam yang lalu`;
  if (diffDay === 1) return 'Kemarin';
  if (diffDay < 7) return `${diffDay} hari yang lalu`;

  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

interface ActionableCheckResult {
  requiresAction: boolean;
  actionType?: 'APPROVAL' | 'REVISION' | 'FOLLOW_UP' | null;
  actionUrl?: string | null;
  actionLabel?: string | null;
}

function cleanNotificationSubject(subject: string, statusLabel?: string): string {
  let clean = subject
    .replace(/^\[.*?\]\s*/, '')
    .replace(/^Status Pengajuan\s*/i, '')
    .replace(/^Status Pengaduan\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Jika ada label status spesifik di akhir judul setelah ':', bersihkan agar judul tidak redundan
  if (statusLabel) {
    const escaped = statusLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    clean = clean.replace(new RegExp(`\\s*:\\s*${escaped}\\s*$`, 'i'), '');
  }

  // Pola status umum yang sering menempel setelah tanda ':'
  clean = clean.replace(
    /:\s*(Dokumen Selesai Diterbitkan|Dokumen Diterbitkan|Pengajuan Disetujui|Sedang Diproses|Diverifikasi RT|Menunggu Persetujuan RW|Menunggu Verifikasi RT|Permohonan Baru|Selesai Ditangani|Laporan Selesai|Laporan Diterima|Ditolak|Perlu Perbaikan|Perlu Tindakan)$/i,
    ''
  );

  return clean.trim();
}

function formatConciseSummary({
  type,
  parsedMeta,
  rawContent,
}: {
  type: string;
  parsedMeta: any;
  rawContent: string;
}): string {
  const inApp = parsedMeta.inApp || {};
  const status = (parsedMeta.status || '').toUpperCase();

  if (type === 'PENGAJUAN_SURAT') {
    switch (status) {
      case 'DOCUMENT_ISSUED':
        return 'Dokumen resmi telah terbit dan siap diunduh dalam format PDF.';
      case 'APPROVED':
        return 'Pengajuan disetujui Pengurus RW. Menunggu pencetakan / penerbitan.';
      case 'VERIFIED_RT':
        return 'Berkas telah diverifikasi Ketua RT. Menunggu pengesahan Pengurus RW.';
      case 'PENDING_RW_APPROVAL':
        return 'Dalam antrean persetujuan dan pengesahan Pengurus RW.';
      case 'PENDING_RT_VERIFICATION':
        return 'Menunggu pemeriksaan berkas permohonan oleh Ketua RT.';
      case 'SUBMITTED':
        return 'Pengajuan baru telah masuk antrean verifikasi RT.';
      case 'REVISION_REQUIRED':
        return parsedMeta.officerNotes
          ? `Perlu perbaikan berkas: ${parsedMeta.officerNotes}`
          : 'Memerlukan perbaikan berkas dari pemohon.';
      case 'REJECTED':
        return parsedMeta.officerNotes
          ? `Pengajuan ditolak: ${parsedMeta.officerNotes}`
          : 'Permohonan surat belum dapat disetujui.';
      case 'REVOKED':
        return 'Keabsahan dokumen resmi telah dicabut.';
    }
  }

  if (type === 'PENGADUAN') {
    switch (status) {
      case 'DILAPORKAN':
        return 'Laporan baru diterima, menunggu peninjauan pengurus.';
      case 'DITINJAU':
        return 'Laporan sedang ditinjau oleh pengurus lingkungan.';
      case 'DIPROSES':
        return 'Petugas sedang menangani laporan aduan di lokasi.';
      case 'SELESAI':
        return 'Laporan aduan telah selesai ditangani petugas.';
      case 'DITOLAK':
        return parsedMeta.officerNotes
          ? `Aduan ditolak: ${parsedMeta.officerNotes}`
          : 'Laporan aduan tidak dapat diproses lebih lanjut.';
    }
  }

  // Pengumuman & informasi umum: singkat, bersih dari markup & emoji
  const sourceText = inApp.summary || rawContent || '';
  const clean = sourceText
    .replace(/\[.*?\]/g, '')
    .replace(/[*_#]/g, '')
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // hapus emoji
    .replace(/\s+/g, ' ')
    .trim();

  if (clean.length > 85) {
    return clean.slice(0, 82) + '...';
  }
  return clean || 'Tidak ada keterangan tambahan.';
}

function evaluateActionable({
  type,
  parsedMeta,
  fallbackActionUrl,
  userRole,
  liveRequest,
  livePengaduan,
}: {
  type: string;
  parsedMeta: any;
  fallbackActionUrl?: string | null;
  userRole: string;
  liveRequest?: { id: string; status: string } | null;
  livePengaduan?: { id: string; status: string } | null;
}): ActionableCheckResult {
  if (type === 'PENGAJUAN_SURAT') {
    const notificationStatus = (parsedMeta.status || '').toUpperCase();
    const reqId = liveRequest ? liveRequest.id : parsedMeta.requestId;
    const actionUrl = reqId ? `/dashboard/pengajuan/${reqId}` : fallbackActionUrl;

    // Jika notifikasi ini sendiri mencatat dokumen terbit, disetujui, ditolak, atau dicabut:
    // BUKAN notifikasi yang membutuhkan tindakan!
    if (['APPROVED', 'DOCUMENT_ISSUED', 'REJECTED', 'REVOKED'].includes(notificationStatus)) {
      return {
        requiresAction: false,
        actionType: null,
        actionUrl,
        actionLabel: 'Lihat Detail',
      };
    }

    const currentStatus = (liveRequest ? liveRequest.status : notificationStatus) || '';

    // Jika live request di DB sudah selesai/disetujui/diterbitkan/ditolak:
    if (['APPROVED', 'DOCUMENT_ISSUED', 'REJECTED', 'REVOKED'].includes(currentStatus)) {
      return {
        requiresAction: false,
        actionType: null,
        actionUrl,
        actionLabel: 'Lihat Detail',
      };
    }

    // Status pengajuan yang membutuhkan persetujuan / verifikasi pengurus
    const pengurusApprovalStatuses = [
      'SUBMITTED',
      'PENDING_RT_VERIFICATION',
      'VERIFIED_RT',
      'PENDING_RW_APPROVAL',
    ];

    const isPengurus = ['SUPER_ADMIN', 'ADMIN_RW', 'KETUA_RW', 'KETUA_RT'].includes(userRole);

    if (isPengurus && pengurusApprovalStatuses.includes(currentStatus)) {
      let label = 'Tindak Lanjuti';
      if (['SUBMITTED', 'PENDING_RT_VERIFICATION'].includes(currentStatus)) {
        label = userRole === 'KETUA_RT' ? 'Verifikasi RT' : 'Tindak Lanjuti';
      } else if (['VERIFIED_RT', 'PENDING_RW_APPROVAL'].includes(currentStatus)) {
        label = ['ADMIN_RW', 'KETUA_RW', 'SUPER_ADMIN'].includes(userRole) ? 'Setujui RW' : 'Tindak Lanjuti';
      }

      return {
        requiresAction: true,
        actionType: 'APPROVAL',
        actionUrl,
        actionLabel: label,
      };
    }

    if (userRole === 'WARGA' && currentStatus === 'REVISION_REQUIRED') {
      return {
        requiresAction: true,
        actionType: 'REVISION',
        actionUrl,
        actionLabel: 'Lengkapi Revisi',
      };
    }

    return {
      requiresAction: false,
      actionType: null,
      actionUrl,
      actionLabel: 'Lihat Detail',
    };
  }

  if (type === 'PENGADUAN') {
    const notificationStatus = (parsedMeta.status || '').toUpperCase();
    const pengaduanId = livePengaduan ? livePengaduan.id : parsedMeta.pengaduanId;
    const isPengurus = ['SUPER_ADMIN', 'ADMIN_RW', 'KETUA_RW', 'KETUA_RT'].includes(userRole);
    const actionUrl = pengaduanId
      ? isPengurus
        ? `/dashboard/pengaduan-warga/${pengaduanId}`
        : `/dashboard/pengaduan/${pengaduanId}`
      : fallbackActionUrl;

    // Aduan yang sudah diproses atau selesai tidak butuh tindakan review baru
    if (['DIPROSES', 'SELESAI', 'DITOLAK'].includes(notificationStatus)) {
      return {
        requiresAction: false,
        actionType: null,
        actionUrl,
        actionLabel: 'Lihat Detail',
      };
    }

    const currentStatus = (livePengaduan ? livePengaduan.status : notificationStatus) || '';

    if (['DIPROSES', 'SELESAI', 'DITOLAK'].includes(currentStatus)) {
      return {
        requiresAction: false,
        actionType: null,
        actionUrl,
        actionLabel: 'Lihat Detail',
      };
    }

    if (isPengurus && ['DILAPORKAN', 'DITINJAU'].includes(currentStatus)) {
      return {
        requiresAction: true,
        actionType: 'FOLLOW_UP',
        actionUrl,
        actionLabel: 'Tindak Lanjuti',
      };
    }

    return {
      requiresAction: false,
      actionType: null,
      actionUrl,
      actionLabel: 'Lihat Detail',
    };
  }

  return {
    requiresAction: false,
    actionType: null,
    actionUrl: fallbackActionUrl,
    actionLabel: 'Lihat Detail',
  };
}

export async function getMyInAppNotifications(): Promise<{
  success: boolean;
  notifications: InAppNotificationItem[];
  unreadCount: number;
  error?: string;
}> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, notifications: [], unreadCount: 0, error: 'Unauthorized' };
    }

    let whereCondition: any = {};

    if (session.role === 'WARGA') {
      whereCondition = {
        OR: [
          { userId: session.id },
          ...(session.wargaId ? [{ wargaId: session.wargaId }] : []),
        ],
      };
    } else if (session.role === 'KETUA_RT') {
      whereCondition = {
        OR: [
          { userId: session.id },
          ...(session.wargaId ? [{ wargaId: session.wargaId }] : []),
          { warga: { rtId: session.rtId } },
          { user: { rtId: session.rtId } },
        ],
      };
    } else if (['ADMIN_RW', 'KETUA_RW'].includes(session.role)) {
      whereCondition = {
        OR: [
          { userId: session.id },
          ...(session.wargaId ? [{ wargaId: session.wargaId }] : []),
          { warga: { rt: { rwId: session.rwId } } },
          { user: { rwId: session.rwId } },
        ],
      };
    } else if (session.role === 'SUPER_ADMIN') {
      // Super admin melihat semua notifikasi sistem terkini
      whereCondition = {};
    }

    const rawLogs = await prisma.notificationLog.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
      take: 60,
      select: {
        id: true,
        type: true,
        channel: true,
        recipientName: true,
        subject: true,
        content: true,
        status: true,
        actionUrl: true,
        isRead: true,
        referenceId: true,
        metadata: true,
        createdAt: true,
      },
    });

    // Kumpulkan ID Pengajuan & Pengaduan untuk memeriksa status live terbaru
    const requestIds = new Set<string>();
    const pengaduanIds = new Set<string>();

    for (const log of rawLogs) {
      try {
        if (log.metadata) {
          const m = JSON.parse(log.metadata);
          if (m.requestId) requestIds.add(m.requestId);
          if (m.pengaduanId) pengaduanIds.add(m.pengaduanId);
        }
      } catch {}
    }

    const [liveRequests, livePengaduans] = await Promise.all([
      requestIds.size > 0
        ? prisma.request.findMany({
            where: { id: { in: Array.from(requestIds) } },
            select: { id: true, status: true },
          })
        : [],
      pengaduanIds.size > 0
        ? prisma.pengaduan.findMany({
            where: { id: { in: Array.from(pengaduanIds) } },
            select: { id: true, status: true },
          })
        : [],
    ]);

    const requestMap = new Map(liveRequests.map((r) => [r.id, r]));
    const pengaduanMap = new Map(livePengaduans.map((p) => [p.id, p]));

    // Deduplikasi notifikasi berdasarkan event/referenceId dasar (misal event dikirim ke Email & WA sekaligus)
    const seenEvents = new Set<string>();
    const notifications: InAppNotificationItem[] = [];

    for (const log of rawLogs) {
      const baseRefKey = log.referenceId
        ? log.referenceId.replace(/_(EMAIL|WHATSAPP)$/i, '')
        : log.id;

      if (seenEvents.has(baseRefKey)) {
        continue;
      }
      seenEvents.add(baseRefKey);

      let parsedMeta: any = {};
      try {
        if (log.metadata) {
          parsedMeta = JSON.parse(log.metadata);
        }
      } catch {
        parsedMeta = {};
      }

      const inAppMeta = parsedMeta.inApp || {};

      // Tentukan ikon berdasarkan tipe (menggunakan identifier bersih, hindari emotikon)
      let icon = inAppMeta.icon;
      if (
        !icon ||
        icon.length <= 2 ||
        ['PENGUMUMAN', 'PENGAJUAN_SURAT', 'PENGADUAN', 'INFORMASI'].includes(icon)
      ) {
        if (log.type === 'PENGUMUMAN') icon = 'announcement';
        else if (log.type === 'PENGAJUAN_SURAT') icon = 'document';
        else if (log.type === 'PENGADUAN') icon = 'complaint';
        else icon = 'info';
      }

      const details = Array.isArray(inAppMeta.details)
        ? inAppMeta.details.filter((d: any) => d && d.label && d.value && d.value !== '-')
        : [];

      const actionableResult = evaluateActionable({
        type: log.type,
        parsedMeta,
        fallbackActionUrl: log.actionUrl || inAppMeta.actionUrl || null,
        userRole: session.role,
        liveRequest: parsedMeta.requestId ? requestMap.get(parsedMeta.requestId) : null,
        livePengaduan: parsedMeta.pengaduanId ? pengaduanMap.get(parsedMeta.pengaduanId) : null,
      });

      const conciseContent = formatConciseSummary({
        type: log.type,
        parsedMeta,
        rawContent: inAppMeta.summary || log.content || '',
      });

      notifications.push({
        id: log.id,
        type: log.type,
        channel: log.channel,
        subject: cleanNotificationSubject(log.subject, inAppMeta.statusBadge?.label),
        content: conciseContent,
        recipientName: log.recipientName || 'Warga Lingkungan',
        isRead: log.isRead,
        createdAt: log.createdAt.toISOString(),
        timeAgo: formatRelativeTime(log.createdAt),
        actionUrl: actionableResult.actionUrl || log.actionUrl || inAppMeta.actionUrl || null,
        actionLabel: actionableResult.actionLabel || inAppMeta.actionLabel || 'Lihat Detail',
        downloadUrl: inAppMeta.downloadUrl || null,
        downloadLabel: inAppMeta.downloadLabel || null,
        icon,
        statusBadge: inAppMeta.statusBadge || undefined,
        details,
        officerNotes: inAppMeta.officerNotes || null,
        nextInstructions: inAppMeta.nextInstructions || null,
        referenceId: log.referenceId,
        requiresAction: actionableResult.requiresAction,
        actionType: actionableResult.actionType,
      });
    }

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return {
      success: true,
      notifications,
      unreadCount,
    };
  } catch (err: any) {
    console.error('Error in getMyInAppNotifications:', err);
    return {
      success: false,
      notifications: [],
      unreadCount: 0,
      error: err.message || 'Gagal memuat notifikasi.',
    };
  }
}

export async function markNotificationAsReadAction(logId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized' };

    const target = await prisma.notificationLog.findUnique({
      where: { id: logId },
    });

    if (!target) return { success: false, error: 'Notifikasi tidak ditemukan' };

    // Update log dan log pasangannya (jika ada referenceId)
    if (target.referenceId) {
      const baseRefKey = target.referenceId.replace(/_(EMAIL|WHATSAPP)$/i, '');
      await prisma.notificationLog.updateMany({
        where: {
          OR: [
            { id: logId },
            { referenceId: { startsWith: baseRefKey } },
          ],
        },
        data: { isRead: true },
      });
    } else {
      await prisma.notificationLog.update({
        where: { id: logId },
        data: { isRead: true },
      });
    }

    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function markAllNotificationsAsReadAction(): Promise<{
  success: boolean;
  updatedCount?: number;
  skippedActionableCount?: number;
  error?: string;
}> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized' };

    let whereCondition: any = {};
    if (session.role === 'WARGA') {
      whereCondition = {
        OR: [
          { userId: session.id },
          ...(session.wargaId ? [{ wargaId: session.wargaId }] : []),
        ],
      };
    } else if (session.role === 'KETUA_RT') {
      whereCondition = {
        OR: [
          { userId: session.id },
          ...(session.wargaId ? [{ wargaId: session.wargaId }] : []),
          { warga: { rtId: session.rtId } },
          { user: { rtId: session.rtId } },
        ],
      };
    } else if (['ADMIN_RW', 'KETUA_RW'].includes(session.role)) {
      whereCondition = {
        OR: [
          { userId: session.id },
          ...(session.wargaId ? [{ wargaId: session.wargaId }] : []),
          { warga: { rt: { rwId: session.rwId } } },
          { user: { rwId: session.rwId } },
        ],
      };
    } else if (session.role === 'SUPER_ADMIN') {
      whereCondition = {};
    }

    const unreadLogs = await prisma.notificationLog.findMany({
      where: {
        ...whereCondition,
        isRead: false,
      },
      select: {
        id: true,
        type: true,
        metadata: true,
        referenceId: true,
      },
    });

    if (unreadLogs.length === 0) {
      return { success: true, updatedCount: 0, skippedActionableCount: 0 };
    }

    // Kumpulkan requestId dan pengaduanId untuk periksa status live
    const requestIds = new Set<string>();
    const pengaduanIds = new Set<string>();

    for (const log of unreadLogs) {
      try {
        if (log.metadata) {
          const m = JSON.parse(log.metadata);
          if (m.requestId) requestIds.add(m.requestId);
          if (m.pengaduanId) pengaduanIds.add(m.pengaduanId);
        }
      } catch {}
    }

    const [liveRequests, livePengaduans] = await Promise.all([
      requestIds.size > 0
        ? prisma.request.findMany({
            where: { id: { in: Array.from(requestIds) } },
            select: { id: true, status: true },
          })
        : [],
      pengaduanIds.size > 0
        ? prisma.pengaduan.findMany({
            where: { id: { in: Array.from(pengaduanIds) } },
            select: { id: true, status: true },
          })
        : [],
    ]);

    const requestMap = new Map(liveRequests.map((r) => [r.id, r]));
    const pengaduanMap = new Map(livePengaduans.map((p) => [p.id, p]));

    const idsToMarkRead: string[] = [];
    let skippedActionableCount = 0;

    for (const log of unreadLogs) {
      let parsedMeta: any = {};
      try {
        if (log.metadata) parsedMeta = JSON.parse(log.metadata);
      } catch {}

      const check = evaluateActionable({
        type: log.type,
        parsedMeta,
        userRole: session.role,
        liveRequest: parsedMeta.requestId ? requestMap.get(parsedMeta.requestId) : null,
        livePengaduan: parsedMeta.pengaduanId ? pengaduanMap.get(parsedMeta.pengaduanId) : null,
      });

      // PENGECUALIAN: Notifikasi yang memerlukan tindak lanjut / persetujuan TIDAK ikut ditandai dibaca
      if (check.requiresAction) {
        skippedActionableCount++;
      } else {
        idsToMarkRead.push(log.id);
      }
    }

    if (idsToMarkRead.length > 0) {
      await prisma.notificationLog.updateMany({
        where: {
          id: { in: idsToMarkRead },
        },
        data: { isRead: true },
      });
    }

    revalidatePath('/dashboard');
    return {
      success: true,
      updatedCount: idsToMarkRead.length,
      skippedActionableCount,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
