import { getActiveServices } from '@/lib/data-service';
import { getSession } from '@/lib/auth';
import Link from 'next/link';

export default async function LayananPage() {
  const session = await getSession();
  const services = await getActiveServices();

  let backLink = '/';
  if (session) {
    if (session.role === 'SUPER_ADMIN') backLink = '/dashboard/admin';
    else if (session.role === 'KETUA_RT') backLink = '/dashboard/rt';
    else if (session.role === 'KETUA_RW' || session.role === 'ADMIN_RW') backLink = '/dashboard/rw';
    else backLink = '/dashboard/warga';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '0.5rem' }}>Daftar Layanan Digital</h1>
          <p style={{ color: 'var(--secondary-foreground)' }}>
            Pilih layanan administrasi yang Anda butuhkan.
          </p>
        </div>

        {session && (
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
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {services.map((svc) => (
          <div key={svc.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{svc.name}</h3>
              <p style={{ color: 'var(--secondary-foreground)', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                {svc.description}
              </p>
            </div>
            <Link href={`/dashboard/layanan/${svc.id}`} className="btn btn-primary" style={{ width: '100%', textAlign: 'center', justifyContent: 'center' }}>
              Pilih Layanan
            </Link>
          </div>
        ))}
      </div>
      
      {services.length === 0 && (
        <div className="card glass" style={{ textAlign: 'center', padding: '3rem', color: 'var(--secondary-foreground)' }}>
          Belum ada layanan yang aktif saat ini.
        </div>
      )}
    </div>
  );
}
