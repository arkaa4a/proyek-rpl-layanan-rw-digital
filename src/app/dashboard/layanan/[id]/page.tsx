import { getServiceDetails } from '@/lib/data-service';
import { getWargaList } from '@/lib/data-warga';
import { getSession } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import ServiceFormClient from './ServiceFormClient';
import Link from 'next/link';

export default async function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const resolvedParams = await params;
  const id = resolvedParams.id;
  
  if (!id) notFound();

  const service = await getServiceDetails(id);
  if (!service) notFound();

  // Ambil list warga jika inclusive mode
  let wargaList: any[] = [];
  const isInclusiveMode = ['KETUA_RT', 'KETUA_RW', 'ADMIN_RW', 'SUPER_ADMIN'].includes(session.role);
  if (isInclusiveMode) {
    wargaList = await getWargaList(session.role, session.rtId, session.rwId);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <Link href="/dashboard/layanan" style={{ color: 'var(--primary)', fontWeight: 500, fontSize: '0.875rem' }}>
          &larr; Kembali ke Daftar Layanan
        </Link>
      </div>

      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '0.5rem' }}>
          {service.name}
        </h1>
        <p style={{ color: 'var(--secondary-foreground)', fontSize: '1rem', lineHeight: '1.5' }}>
          {service.description}
        </p>
      </div>

      <ServiceFormClient service={service} userRole={session.role} wargaList={wargaList} />
    </div>
  );
}
