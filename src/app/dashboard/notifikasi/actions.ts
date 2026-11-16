'use server';

import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { retryNotificationLog } from '@/lib/notification/notificationManager';

const ALLOWED_ROLES = ['SUPER_ADMIN', 'ADMIN_RW', 'KETUA_RW', 'KETUA_RT'];

export async function getNotificationHistory() {
  const session = await getSession();
  if (!session || !ALLOWED_ROLES.includes(session.role)) {
    return { error: 'Unauthorized: Akses dibatasi khusus pengurus dan admin.' };
  }

  try {
    // Bangun filter scoping wilayah
    let whereCondition: any = {};

    if (session.role === 'KETUA_RT') {
      // Hanya log notifikasi yang berhubungan dengan warga di RT miliknya
      whereCondition = {
        OR: [
          { warga: { rtId: session.rtId } },
          { user: { rtId: session.rtId } },
        ],
      };
    } else if (['ADMIN_RW', 'KETUA_RW'].includes(session.role)) {
      // Log notifikasi warga di wilayah RW miliknya
      whereCondition = {
        OR: [
          { warga: { rt: { rwId: session.rwId } } },
          { user: { rwId: session.rwId } },
        ],
      };
    } else if (session.role === 'SUPER_ADMIN') {
      whereCondition = {}; // Global
    }

    const [logs, totalCount, sentCount, failedCount, pendingCount] = await Promise.all([
      prisma.notificationLog.findMany({
        where: whereCondition,
        orderBy: { createdAt: 'desc' },
        take: 100, // 100 log terbaru
        select: {
          id: true,
          type: true,
          channel: true,
          recipient: true,
          recipientName: true,
          subject: true,
          content: true,
          status: true,
          errorMessage: true,
          actionUrl: true,
          isRead: true,
          retryCount: true,
          sentAt: true,
          createdAt: true,
        },
      }),
      prisma.notificationLog.count({ where: whereCondition }),
      prisma.notificationLog.count({ where: { ...whereCondition, status: 'SENT' } }),
      prisma.notificationLog.count({ where: { ...whereCondition, status: 'FAILED' } }),
      prisma.notificationLog.count({ where: { ...whereCondition, status: 'PENDING' } }),
    ]);

    return {
      success: true,
      data: logs,
      stats: {
        total: totalCount,
        sent: sentCount,
        failed: failedCount,
        pending: pendingCount,
      },
    };
  } catch (error: any) {
    console.error('Error getNotificationHistory:', error);
    return { error: error.message || 'Gagal memuat riwayat notifikasi.' };
  }
}

export async function retryNotificationAction(logId: string) {
  const session = await getSession();
  if (!session || !ALLOWED_ROLES.includes(session.role)) {
    return { success: false, error: 'Unauthorized: Akses ditolak.' };
  }

  if (!logId || typeof logId !== 'string') {
    return { success: false, error: 'ID Notifikasi tidak valid.' };
  }

  try {
    const result = await retryNotificationLog(logId);
    revalidatePath('/dashboard/notifikasi');
    return result;
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal mengirim ulang notifikasi.' };
  }
}
