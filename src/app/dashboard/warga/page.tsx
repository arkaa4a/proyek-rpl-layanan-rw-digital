import { getSession } from '@/lib/auth';
import Link from 'next/link';
import { getWargaStats } from '@/lib/data';
import StatCard from '@/components/ui/StatCard';
import DataTable from '@/components/ui/DataTable';
import OpenAIAssistantButton from '@/components/ui/OpenAIAssistantButton';

export default async function WargaDashboard() {
  const session = await getSession();
  const stats = await getWargaStats(session?.wargaId);

  const formatStatusLabel = (val: string) => {
    switch (val) {
      case 'DOCUMENT_ISSUED': return 'Dokumen Terbit';
      case 'APPROVED':
      case 'COMPLETED': return 'Selesai';
      case 'REJECTED': return 'Ditolak';
      case 'SUBMITTED': return 'Menunggu RT';
      case 'VERIFIED_RT': return 'Menunggu RW';
      case 'REVISION_REQUIRED': return 'Revisi Diperlukan';
      default: return 'Sedang Diproses';
    }
  };

  const formatStatusColor = (val: string) => {
    switch (val) {
      case 'DOCUMENT_ISSUED':
      case 'APPROVED': 
      case 'COMPLETED': return '#22c55e';
      case 'REJECTED': return 'var(--error)';
      case 'SUBMITTED':
      case 'VERIFIED_RT': return '#eab308';
      default: return '#f97316'; 
    }
  };

  const requestColumns = [
    { header: 'ID Pengajuan', accessor: 'id', render: (val: string) => <Link href={`/dashboard/pengajuan/${val}`} style={{ color: 'var(--primary)', fontWeight: 600 }}>{val.slice(0, 8).toUpperCase()}</Link> },
    { header: 'Layanan', accessor: 'serviceType', render: (val: any) => val.name },
    { header: 'Status', accessor: 'status', render: (val: string) => (
      <span style={{ 
        padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 600,
        backgroundColor: formatStatusColor(val),
        color: 'white',
        border: val === 'DOCUMENT_ISSUED' ? '1px solid #16a34a' : 'none'
      }}>{formatStatusLabel(val)}</span>
    )},
    { header: 'Tanggal', accessor: 'createdAt', render: (val: Date) => new Date(val).toLocaleDateString('id-ID') },
    { header: 'Aksi', accessor: 'id', render: (val: string, row: any) => (
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Link href={`/dashboard/pengajuan/${val}`} className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', border: '1px solid var(--border)', background: 'var(--surface)' }}>Lihat Detail</Link>
        {row.status === 'DOCUMENT_ISSUED' && row.pdfUrl && (
          <a href={row.pdfUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Unduh PDF</a>
        )}
      </div>
    )},
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '0.5rem' }}>Dashboard Warga</h1>
        <p style={{ color: 'var(--secondary-foreground)' }}>Selamat datang, {session?.username}. Ini adalah ringkasan data kependudukan dan layanan Anda.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <StatCard title="Total Pengajuan" value={stats.totalPengajuan} />
        <StatCard title="Sedang Diproses" value={stats.pendingPengajuan} trend="neutral" />
        <StatCard title="Selesai" value={stats.selesaiPengajuan} trend="up" />
        <StatCard title="Ditolak" value={stats.ditolakPengajuan} trend="down" />
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <Link href="/dashboard/layanan" className="btn btn-primary">Ajukan Layanan Baru</Link>
        <Link 
          href="/pengumuman" 
          className="btn" 
          style={{ 
            background: 'var(--surface)', 
            border: '1px solid var(--border)', 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.45rem',
            color: 'var(--foreground)',
            textDecoration: 'none'
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 11 18-5v12L3 14v-3z" />
            <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
          </svg>
          <span>Papan Pengumuman</span>
        </Link>
        <OpenAIAssistantButton />
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>Pengajuan Terbaru</h2>
          <Link href="/dashboard/pengajuan" style={{ fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
            Lihat Semua Status Pengajuan &rarr;
          </Link>
        </div>
        <DataTable columns={requestColumns} data={stats.recentRequests} emptyMessage="Anda belum pernah melakukan pengajuan layanan." />
      </div>
    </div>
  );
}
