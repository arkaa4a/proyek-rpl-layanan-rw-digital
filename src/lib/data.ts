import prisma from './db';

// WARGA STATS
export async function getWargaStats(wargaId: string | null | undefined) {
  if (!wargaId) return { totalPengajuan: 0, pendingPengajuan: 0, selesaiPengajuan: 0, ditolakPengajuan: 0, recentRequests: [] };
  
  const [totalPengajuan, pendingPengajuan, selesaiPengajuan, ditolakPengajuan] = await Promise.all([
    prisma.request.count({ where: { applicantId: wargaId } }),
    prisma.request.count({ where: { applicantId: wargaId, status: { notIn: ['DRAFT', 'APPROVED', 'DOCUMENT_ISSUED', 'REJECTED', 'COMPLETED'] } } }),
    prisma.request.count({ where: { applicantId: wargaId, status: { in: ['APPROVED', 'COMPLETED', 'DOCUMENT_ISSUED'] } } }),
    prisma.request.count({ where: { applicantId: wargaId, status: 'REJECTED' } }),
  ]);
  
  const recentRequests = await prisma.request.findMany({
    where: { applicantId: wargaId },
    orderBy: { createdAt: 'desc' },
    include: { serviceType: true },
    take: 5,
  });
  
  return { totalPengajuan, pendingPengajuan, selesaiPengajuan, ditolakPengajuan, recentRequests };
}

// RT STATS
export async function getRtStats(rtId: string) {
  const wargaCount = await prisma.warga.count({ where: { rtId, isActive: true } });
  
  const [pengajuanBaru, selesai, ditolak] = await Promise.all([
    prisma.request.count({ where: { applicant: { rtId }, status: { in: ['SUBMITTED', 'REVISION_REQUIRED'] } } }),
    prisma.request.count({ where: { applicant: { rtId }, status: { in: ['APPROVED', 'COMPLETED', 'DOCUMENT_ISSUED'] } } }),
    prisma.request.count({ where: { applicant: { rtId }, status: 'REJECTED' } })
  ]);
  
  const pendingRequests = await prisma.request.findMany({
    where: { applicant: { rtId }, status: { in: ['SUBMITTED', 'REVISION_REQUIRED'] } },
    orderBy: { createdAt: 'desc' },
    include: { serviceType: true, applicant: true },
    take: 10,
  });

  return { wargaCount, pengajuanBaru, selesai, ditolak, pendingRequests };
}

// RW STATS
export async function getRwStats(rwId: string) {
  const [wargaCount, rtCount] = await Promise.all([
    prisma.warga.count({ where: { rt: { rwId }, isActive: true } }),
    prisma.rt.count({ where: { rwId } })
  ]);
  
  const [pengajuanMasuk, menungguApproval, selesai, ditolak] = await Promise.all([
    prisma.request.count({ where: { applicant: { rt: { rwId } } } }),
    prisma.request.count({ where: { applicant: { rt: { rwId } }, status: 'VERIFIED_RT' } }),
    prisma.request.count({ where: { applicant: { rt: { rwId } }, status: { in: ['APPROVED', 'COMPLETED', 'DOCUMENT_ISSUED'] } } }),
    prisma.request.count({ where: { applicant: { rt: { rwId } }, status: 'REJECTED' } })
  ]);
  
  const pendingRequests = await prisma.request.findMany({
    where: { applicant: { rt: { rwId } }, status: 'VERIFIED_RT' },
    orderBy: { createdAt: 'desc' },
    include: { serviceType: true, applicant: { include: { rt: true } } },
    take: 10,
  });

  return { wargaCount, rtCount, pengajuanMasuk, menungguApproval, selesai, ditolak, pendingRequests };
}

// ADMIN / SUPER ADMIN STATS
export async function getAdminStats() {
  const [wargaCount, rtCount, rwCount, totalPengajuan, aktif, selesai] = await Promise.all([
    prisma.warga.count({ where: { isActive: true } }),
    prisma.rt.count(),
    prisma.rw.count(),
    prisma.request.count(),
    prisma.request.count({ where: { status: { notIn: ['DRAFT', 'APPROVED', 'DOCUMENT_ISSUED', 'REJECTED', 'COMPLETED'] } } }),
    prisma.request.count({ where: { status: { in: ['APPROVED', 'COMPLETED', 'DOCUMENT_ISSUED'] } } })
  ]);
  
  return { wargaCount, rtCount, rwCount, totalPengajuan, aktif, selesai };
}

// GET ALL PENGAJUAN (SURAT) FOR RT
export async function getRtAllRequests(rtId: string) {
  return prisma.request.findMany({
    where: { applicant: { rtId } },
    orderBy: { createdAt: 'desc' },
    include: {
      serviceType: true,
      applicant: {
        include: {
          rt: {
            include: { rw: true },
          },
        },
      },
    },
  });
}

// GET ALL PENGAJUAN (SURAT) FOR RW
export async function getRwAllRequests(rwId: string) {
  return prisma.request.findMany({
    where: { applicant: { rt: { rwId } } },
    orderBy: { createdAt: 'desc' },
    include: {
      serviceType: true,
      applicant: {
        include: {
          rt: {
            include: { rw: true },
          },
        },
      },
    },
  });
}

// GET ALL PENGAJUAN (SURAT) FOR SUPER ADMIN (GLOBAL)
export async function getAdminAllRequests() {
  return prisma.request.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      serviceType: true,
      applicant: {
        include: {
          rt: {
            include: { rw: true },
          },
        },
      },
    },
  });
}

// GET AUDIT LOGS FOR SUPER ADMIN / ADMIN
export async function getAuditLogs(limit = 100) {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: {
        include: {
          role: true,
        },
      },
    },
  });
}

// GET AUDIT LOG STATS
export async function getAuditLogStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalLogs, loginCount, todayCount, usersList] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.count({ where: { action: { contains: 'LOGIN' } } }),
    prisma.auditLog.count({ where: { createdAt: { gte: today } } }),
    prisma.auditLog.findMany({
      where: { userId: { not: null } },
      select: { userId: true },
      distinct: ['userId'],
    }),
  ]);

  return {
    totalLogs,
    loginCount,
    todayCount,
    activeUsersCount: usersList.length,
  };
}

