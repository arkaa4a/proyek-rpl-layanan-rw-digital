import React from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';
import StatusPengajuanClientView, { UserRequestItem } from './StatusPengajuanClientView';

export default async function StatusPengajuanPage() {
  const session = await getSession();

  // 1. Guard Autentikasi & Role
  if (!session) {
    redirect('/login');
  }

  // Khusus POV WARGA: Batasi hanya akun WARGA dengan wargaId valid
  if (session.role !== 'WARGA' || !session.wargaId) {
    redirect('/unauthorized');
  }

  // 2. Query aman server-side: hanya mengambil pengajuan milik warga yang sedang login
  const rawRequests = await prisma.request.findMany({
    where: {
      applicantId: session.wargaId,
    },
    include: {
      serviceType: true,
      histories: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Pastikan serializable untuk client component
  const requests: UserRequestItem[] = rawRequests.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    status: r.status,
    documentNumber: r.documentNumber,
    documentStatus: r.documentStatus,
    pdfUrl: r.pdfUrl,
    serviceType: {
      id: r.serviceType.id,
      name: r.serviceType.name,
    },
    histories: r.histories.map((h) => ({
      id: h.id,
      note: h.note,
      status: h.status,
      createdAt: h.createdAt.toISOString(),
    })),
  }));

  return <StatusPengajuanClientView requests={requests} />;
}

