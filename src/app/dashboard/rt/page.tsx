import { getSession } from '@/lib/auth';
import { getRtStats, getRtAllRequests } from '@/lib/data';
import StatCard from '@/components/ui/StatCard';
import Link from 'next/link';
import PengajuanWargaTable from '@/components/dashboard/PengajuanWargaTable';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function RtDashboard() {
  const session = await getSession();
  
  if (!session?.rtId) {
    return <div>Error: RT ID tidak ditemukan untuk akun Anda.</div>;
  }

  const [stats, allRequests] = await Promise.all([
    getRtStats(session.rtId),
    getRtAllRequests(session.rtId),
  ]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '0.5rem' }}>Dashboard Ketua RT</h1>
        <p style={{ color: 'var(--secondary-foreground)' }}>Pemantauan aktivitas dan pengajuan warga RT Anda.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <StatCard title="Total Warga Aktif" value={stats.wargaCount} />
        <StatCard title="Menunggu Verifikasi" value={stats.pengajuanBaru} trend="neutral" />
        <StatCard title="Pengajuan Selesai" value={stats.selesai} trend="up" />
        <StatCard title="Pengajuan Ditolak" value={stats.ditolak} trend="down" />
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <Link href="/dashboard/manajemen-warga" className="btn btn-primary">Kelola Data Warga RT</Link>
        <Link href="/dashboard/layanan" className="btn" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>Buat Pengajuan Warga</Link>
        <Link href="/dashboard/pengaduan-warga" className="btn" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>Pengaduan Warga</Link>
      </div>

      <div className="card">
        <PengajuanWargaTable
          requests={allRequests}
          title="Daftar Pengajuan Surat Warga RT"
          description="Seluruh permohonan surat dari warga di lingkungan RT Anda. Gunakan tab filter untuk melihat status pengajuan."
          role="KETUA_RT"
        />
      </div>
    </div>
  );
}

