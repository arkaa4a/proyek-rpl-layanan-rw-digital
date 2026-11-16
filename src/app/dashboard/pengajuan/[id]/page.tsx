import { getRequestDetails } from '@/lib/data-service';
import { getSession } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import RequestDetailClient from './RequestDetailClient';
import Link from 'next/link';

export default async function PengajuanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const resolvedParams = await params;
  const id = resolvedParams.id;
  
  if (!id) notFound();

  const request = await getRequestDetails(id);
  if (!request) notFound();

  // Basic authorization
  if (session.role !== 'SUPER_ADMIN') {
    if (session.role === 'WARGA' && request.applicantId !== session.wargaId) {
      redirect('/unauthorized');
    }
    if (['ADMIN_RW', 'KETUA_RW'].includes(session.role) && request.applicant.rt?.rwId !== session.rwId) {
      redirect('/unauthorized');
    }
    if (session.role === 'KETUA_RT' && request.applicant.rtId !== session.rtId) {
      redirect('/unauthorized');
    }
  }

  // Tandai notifikasi terkait pengajuan ini sebagai sudah dibaca karena pengguna sedang membuka detailnya
  try {
    const prisma = (await import('@/lib/db')).default;
    await prisma.notificationLog.updateMany({
      where: {
        OR: [
          { referenceId: { startsWith: `SURAT_${id}` } },
          { metadata: { contains: `"requestId":"${id}"` } },
        ],
        isRead: false,
      },
      data: { isRead: true },
    });
  } catch (notifErr) {
    console.warn('Gagal menandai notifikasi surat dibaca saat membuka detail:', notifErr);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <Link href={`/dashboard/${session.role === 'WARGA' ? 'warga' : session.role.split('_')[1].toLowerCase()}`} style={{ color: 'var(--primary)', fontWeight: 500, fontSize: '0.875rem' }}>
          &larr; Kembali ke Dashboard
        </Link>
      </div>

      <RequestDetailClient request={request} userRole={session.role} />
    </div>
  );
}
