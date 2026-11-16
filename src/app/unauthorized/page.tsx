import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
      <h1 style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--error)', marginBottom: '1rem' }}>403 - Akses Ditolak</h1>
      <p style={{ fontSize: '1.25rem', marginBottom: '2rem', color: 'var(--secondary-foreground)' }}>
        Anda tidak memiliki izin (role) yang sesuai untuk mengakses halaman ini.
      </p>
      <Link href="/dashboard" className="btn btn-primary">
        Kembali ke Dashboard Anda
      </Link>
    </div>
  );
}
