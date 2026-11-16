import { getSession } from '@/lib/auth';
import { getRwStats, getRwAllRequests } from '@/lib/data';
import StatCard from '@/components/ui/StatCard';
import Link from 'next/link';
import PengajuanWargaTable from '@/components/dashboard/PengajuanWargaTable';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function RwDashboard() {
  const session = await getSession();
  
  if (!session?.rwId) {
    return <div>Error: RW ID tidak ditemukan untuk akun Anda.</div>;
  }

  const [stats, allRequests] = await Promise.all([
    getRwStats(session.rwId),
    getRwAllRequests(session.rwId),
  ]);

  const dashboardTitle = session.role === 'ADMIN_RW' ? 'Dashboard Admin RW' : 'Dashboard Ketua RW';
  const dashboardDesc = session.role === 'ADMIN_RW'
    ? 'Pemantauan operasional dan administrasi pengajuan seluruh warga di tingkat RW.'
    : 'Pemantauan aktivitas warga dan persetujuan pengajuan surat tingkat RW.';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '0.5rem' }}>{dashboardTitle}</h1>
        <p style={{ color: 'var(--secondary-foreground)' }}>{dashboardDesc}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <StatCard title="Total Warga RW" value={stats.wargaCount} />
        <StatCard title="Total RT" value={stats.rtCount} />
        <StatCard title="Pengajuan Masuk" value={stats.pengajuanMasuk} />
        <StatCard title="Menunggu Approval" value={stats.menungguApproval} trend="neutral" />
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <Link href="/dashboard/manajemen-warga" className="btn btn-primary">Manajemen Data Warga RW</Link>
        <Link href="/dashboard/layanan" className="btn" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>Buat Pengajuan Warga</Link>
        <Link href="/dashboard/pengaduan-warga" className="btn" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>Pengaduan Warga</Link>
      </div>

      <div className="card">
        <PengajuanWargaTable
          requests={allRequests}
          title="Daftar Pengajuan Surat Warga RW"
          description="Seluruh permohonan surat dari warga di semua RT di lingkungan RW Anda. Gunakan tab filter untuk memantau status pengajuan."
          role={session.role}
        />
      </div>
    </div>
  );
}

