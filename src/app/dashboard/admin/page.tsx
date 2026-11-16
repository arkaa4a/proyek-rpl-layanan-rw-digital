import { getAdminStats, getAdminAllRequests } from '@/lib/data';
import StatCard from '@/components/ui/StatCard';
import Link from 'next/link';
import PengajuanWargaTable from '@/components/dashboard/PengajuanWargaTable';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminDashboard() {
  const [stats, allRequests] = await Promise.all([
    getAdminStats(),
    getAdminAllRequests(),
  ]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '0.5rem' }}>Admin / Super Admin Dashboard</h1>
        <p style={{ color: 'var(--secondary-foreground)' }}>Pemantauan sistem secara global mencakup semua RW dan RT.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <StatCard title="Total Warga" value={stats.wargaCount} />
        <StatCard title="Total RT" value={stats.rtCount} />
        <StatCard title="Total RW" value={stats.rwCount} />
        <StatCard title="Total Pengajuan" value={stats.totalPengajuan} />
        <StatCard title="Pengajuan Aktif" value={stats.aktif} trend="neutral" />
        <StatCard title="Pengajuan Selesai" value={stats.selesai} trend="up" />
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <Link href="/dashboard/konfigurasi" className="btn btn-primary">Konfigurasi Sistem</Link>
        <Link href="/dashboard/manajemen-akun" className="btn" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>Manajemen Data Akun</Link>
        <Link href="/dashboard/manajemen-warga" className="btn" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>Manajemen Data Warga Global</Link>
        <Link href="/dashboard/pengaduan-warga" className="btn" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>Pengaduan Warga</Link>
        <Link href="/dashboard/admin/log" className="btn" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>Lihat Log Aktivitas</Link>
      </div>

      <div className="card">
        <PengajuanWargaTable
          requests={allRequests}
          title="Daftar Seluruh Pengajuan Surat Warga (Global)"
          description="Seluruh permohonan surat administrasi dari warga lintas seluruh RT dan RW. Gunakan tab filter untuk memantau status secara terpusat."
          role="SUPER_ADMIN"
        />
      </div>
    </div>
  );
}

