import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getAccountsAction, getReferenceDataAction } from './actions';
import ManajemenAkunClientView from './ManajemenAkunClientView';

export const metadata = {
  title: 'Manajemen Data Akun - Sistem Informasi Pelayanan Digital RW',
  description: 'Kelola akun pengguna, peran, dan hak akses sistem informasi RW.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ManajemenAkunPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  // Hanya role SUPER_ADMIN yang berhak mengakses halaman ini
  if (session.role !== 'SUPER_ADMIN') {
    redirect('/dashboard');
  }

  const [accountsRes, refRes] = await Promise.all([
    getAccountsAction({ page: 1, limit: 10 }),
    getReferenceDataAction(),
  ]);

  const initialData = {
    currentUserId: session.id,
    users: (accountsRes.success && accountsRes.users ? accountsRes.users : []) as any,
    pagination: accountsRes.pagination || { page: 1, limit: 10, totalItems: 0, totalPages: 1 },
    stats: accountsRes.stats || { total: 0, active: 0, inactive: 0, superAdmin: 0, warga: 0, pengurus: 0 },
  };

  const referenceData = {
    roles: (refRes.success && refRes.data?.roles ? refRes.data.roles : []) as any,
    rws: (refRes.success && refRes.data?.rws ? refRes.data.rws : []) as any,
    rts: (refRes.success && refRes.data?.rts ? refRes.data.rts : []) as any,
    unlinkedWarga: (refRes.success && refRes.data?.unlinkedWarga ? refRes.data.unlinkedWarga : []) as any,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '3rem' }}>
      <ManajemenAkunClientView
        initialData={initialData}
        referenceData={referenceData}
      />
    </div>
  );
}
