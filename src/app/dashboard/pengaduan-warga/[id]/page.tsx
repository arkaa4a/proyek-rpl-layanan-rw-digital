import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';
import PengaduanPengurusDetailClient from './PengaduanPengurusDetailClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PengaduanPengurusDetailPage({ params }: PageProps) {
  const session = await getSession();

  // 1. Guard Autentikasi
  if (!session) {
    redirect('/login');
  }

  // 2. Guard Role: Hanya Pengurus
  const ALLOWED_ROLES = ['KETUA_RT', 'KETUA_RW', 'ADMIN_RW', 'SUPER_ADMIN'];
  if (!ALLOWED_ROLES.includes(session.role)) {
    redirect('/unauthorized');
  }

  const resolvedParams = await params;
  const id = resolvedParams.id;
  if (!id) notFound();

  // 3. Ambil data pengaduan dengan relasi history & pelapor
  const pengaduan = await prisma.pengaduan.findUnique({
    where: { id },
    select: {
      id: true,
      judul: true,
      kategori: true,
      deskripsi: true,
      lokasi: true,
      status: true,
      rtId: true,
      rwId: true,
      createdAt: true,
      updatedAt: true,
      pelapor: {
        select: {
          id: true,
          namaLengkap: true, // Zero NIK, Zero password
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
      history: {
        orderBy: {
          createdAt: 'asc',
        },
        select: {
          id: true,
          status: true,
          catatan: true,
          createdAt: true,
          author: {
            select: {
              id: true,
              username: true,
              role: {
                select: {
                  name: true,
                  description: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!pengaduan) {
    notFound();
  }

  // 4. Scoping Authorization Check
  if (session.role === 'KETUA_RT') {
    if (!session.rtId || pengaduan.rtId !== session.rtId) {
      redirect('/unauthorized');
    }
  } else if (['KETUA_RW', 'ADMIN_RW'].includes(session.role)) {
    if (!session.rwId || pengaduan.rwId !== session.rwId) {
      redirect('/unauthorized');
    }
  }

  return (
    <PengaduanPengurusDetailClient
      pengaduan={pengaduan}
      userRole={session.role}
    />
  );
}
