import React from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';
import PengaduanPengurusClient, { PengurusPengaduanItem } from './PengaduanPengurusClient';

export const dynamic = 'force-dynamic';

export default async function PengaduanPengurusPage() {
  const session = await getSession();

  // 1. Guard Autentikasi
  if (!session) {
    redirect('/login');
  }

  // 2. Guard Role: Hanya KETUA_RT, KETUA_RW, ADMIN_RW, SUPER_ADMIN
  const ALLOWED_ROLES = ['KETUA_RT', 'KETUA_RW', 'ADMIN_RW', 'SUPER_ADMIN'];
  if (!ALLOWED_ROLES.includes(session.role)) {
    redirect('/unauthorized');
  }

  // 3. Bangun Scoping Wilayah Server-Side
  const whereClause: Record<string, unknown> = {};
  let scopeDescription = 'Pemantauan pengaduan warga seluruh wilayah (Global).';

  if (session.role === 'KETUA_RT') {
    if (!session.rtId) {
      return (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--error)' }}>
          Akun Ketua RT Anda belum terhubung dengan wilayah RT manapun. Silakan hubungi Administrator.
        </div>
      );
    }
    whereClause.rtId = session.rtId;

    const rtData = await prisma.rt.findUnique({
      where: { id: session.rtId },
      select: { nomor: true },
    });
    scopeDescription = `Pemantauan pengaduan khusus warga lingkungan RT ${rtData?.nomor || '-'}.`;
  } else if (['KETUA_RW', 'ADMIN_RW'].includes(session.role)) {
    if (!session.rwId) {
      return (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--error)' }}>
          Akun Pengurus RW Anda belum terhubung dengan wilayah RW manapun. Silakan hubungi Administrator.
        </div>
      );
    }
    whereClause.rwId = session.rwId;

    const rwData = await prisma.rw.findUnique({
      where: { id: session.rwId },
      select: { nomor: true },
    });
    scopeDescription = `Pemantauan pengaduan seluruh RT di lingkungan RW ${rwData?.nomor || '-'}.`;
  }

  // 4. Hitung Metrik Statistik Sesuai Scoping
  const [total, perluDitinjau, diproses, selesai] = await Promise.all([
    prisma.pengaduan.count({ where: whereClause }),
    prisma.pengaduan.count({
      where: {
        ...whereClause,
        status: { in: ['DILAPORKAN', 'DITINJAU'] },
      },
    }),
    prisma.pengaduan.count({
      where: {
        ...whereClause,
        status: 'DIPROSES',
      },
    }),
    prisma.pengaduan.count({
      where: {
        ...whereClause,
        status: 'SELESAI',
      },
    }),
  ]);

  // 5. Query Daftar Pengaduan dengan Scoping Wilayah
  const pengaduanRaw = await prisma.pengaduan.findMany({
    where: whereClause,
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      judul: true,
      kategori: true,
      deskripsi: true,
      lokasi: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      pelapor: {
        select: {
          id: true,
          namaLengkap: true, // Perlindungan Privasi: Zero NIK/password
        },
      },
      rt: {
        select: {
          id: true,
          nomor: true,
        },
      },
      rw: {
        select: {
          id: true,
          nomor: true,
        },
      },
      _count: {
        select: {
          history: true,
        },
      },
    },
  });

  const backLink = session.role === 'SUPER_ADMIN'
    ? '/dashboard/admin'
    : session.role === 'KETUA_RT'
      ? '/dashboard/rt'
      : '/dashboard/rw';

  return (
    <PengaduanPengurusClient
      initialData={pengaduanRaw as unknown as PengurusPengaduanItem[]}
      stats={{
        total,
        perluDitinjau,
        diproses,
        selesai,
      }}
      scopeDescription={scopeDescription}
      backLink={backLink}
    />
  );
}
