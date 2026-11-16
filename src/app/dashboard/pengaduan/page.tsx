import React from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getMyPengaduan } from './actions';
import PengaduanClientView, { PengaduanItem } from './PengaduanClientView';

export const dynamic = 'force-dynamic';

export default async function PengaduanWargaPage() {
  const session = await getSession();

  // 1. Guard Autentikasi & Role: Khusus WARGA dengan akun terdaftar
  if (!session) {
    redirect('/login');
  }

  if (session.role !== 'WARGA' || !session.wargaId) {
    redirect('/unauthorized');
  }

  // 2. Fetch pengaduan milik warga yang sedang login
  const result = await getMyPengaduan();
  const pengaduanList = (result.data || []) as PengaduanItem[];

  return <PengaduanClientView initialPengaduan={pengaduanList} />;
}
