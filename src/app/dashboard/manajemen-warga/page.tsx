import { getSession } from '@/lib/auth';
import { getWargaList } from '@/lib/data-warga';
import prisma from '@/lib/db';
import WargaClient from './WargaClient';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ManajemenWargaPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  if (session.role === 'WARGA') {
    return (
      <div style={{ textAlign: 'center', marginTop: '4rem' }}>
        <h2 style={{ fontSize: '1.5rem', color: 'var(--error)' }}>Akses Ditolak</h2>
        <p style={{ color: 'var(--secondary-foreground)' }}>Anda tidak memiliki izin untuk mengakses halaman ini.</p>
      </div>
    );
  }

  let rtWhereClause: any = {};
  if (session.role === 'KETUA_RT' && session.rtId) {
    rtWhereClause.id = session.rtId;
  } else if (['KETUA_RW', 'ADMIN_RW'].includes(session.role) && session.rwId) {
    rtWhereClause.rwId = session.rwId;
  }

  const [rawWargaData, rtList, keluargaList] = await Promise.all([
    getWargaList(session.role, session.rtId, session.rwId),
    prisma.rt.findMany({
      where: rtWhereClause,
      select: {
        id: true,
        nomor: true,
        rwId: true,
        rw: { select: { id: true, nomor: true } }
      },
      orderBy: [{ rw: { nomor: 'asc' } }, { nomor: 'asc' }]
    }),
    prisma.keluarga.findMany({
      select: { id: true, nomorKk: true, alamat: true },
      orderBy: { nomorKk: 'asc' }
    })
  ]);

  const wargaData = rawWargaData.map((w: any) => ({
    ...w,
    tanggalLahir: w.tanggalLahir ? new Date(w.tanggalLahir).toISOString().split('T')[0] : null,
    createdAt: w.createdAt ? new Date(w.createdAt).toISOString() : null,
    updatedAt: w.updatedAt ? new Date(w.updatedAt).toISOString() : null,
  }));

  const backLink = session.role === 'SUPER_ADMIN' 
    ? '/dashboard/admin' 
    : session.role === 'KETUA_RT' 
      ? '/dashboard/rt' 
      : '/dashboard/rw';

  let pageSubtitle = 'Kelola seluruh data warga dan kepala keluarga.';
  if (session.role === 'KETUA_RT') {
    const currentRt = rtList[0];
    pageSubtitle = currentRt 
      ? `Daftar warga resmi di lingkungan RT ${currentRt.nomor} / RW ${currentRt.rw?.nomor || '-'}. (Warga RT lain dikelola oleh RT masing-masing).`
      : 'Daftar warga di lingkungan RT Anda.';
  } else if (['KETUA_RW', 'ADMIN_RW'].includes(session.role)) {
    const rwNomor = rtList[0]?.rw?.nomor || '12';
    pageSubtitle = `Daftar seluruh warga di lingkungan RW ${rwNomor} (mencakup RT 01, RT 02, dan RT 03).`;
  } else if (session.role === 'SUPER_ADMIN') {
    pageSubtitle = 'Kelola seluruh data warga secara global mencakup seluruh RT dan RW di sistem.';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '0.5rem' }}>Manajemen Data Warga</h1>
          <p style={{ color: 'var(--secondary-foreground)' }}>
            {pageSubtitle}
          </p>
        </div>

        <Link
          href={backLink}
          className="btn"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--foreground)',
            fontSize: '0.875rem',
            fontWeight: 500,
            textDecoration: 'none',
            padding: '0.5rem 0.9rem',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Kembali ke Dashboard
        </Link>
      </div>

      <WargaClient 
        wargaData={wargaData} 
        userRole={session.role} 
        rtList={rtList} 
        keluargaList={keluargaList}
      />
    </div>
  );
}
