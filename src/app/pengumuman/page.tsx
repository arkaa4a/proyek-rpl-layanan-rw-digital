import Link from 'next/link';
import NoticeBoardWrapper from '@/components/NoticeBoardWrapper';
import { getSession } from '@/lib/auth';

export default async function PengumumanPage() {
  const session = await getSession();
  
  let backLink = '/';
  let backLabel = 'Halaman Utama';

  if (session) {
    if (session.role === 'WARGA') backLink = '/dashboard/warga';
    else if (session.role === 'KETUA_RT') backLink = '/dashboard/rt';
    else if (session.role === 'KETUA_RW') backLink = '/dashboard/rw';
    else backLink = '/dashboard/admin'; // ADMIN_RW or SUPER_ADMIN
    
    backLabel = 'Dashboard';
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <Link href={backLink} className="btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--surface)', border: '1px solid var(--border)', fontSize: '0.875rem' }}>
          ← Kembali ke {backLabel}
        </Link>
      </div>
      <NoticeBoardWrapper />
    </div>
  );
}
