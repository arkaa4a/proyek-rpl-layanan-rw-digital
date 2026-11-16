import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getNotificationHistory } from './actions';
import NotificationHistoryClientView from '@/components/dashboard/NotificationHistoryClientView';

export const metadata = {
  title: 'Riwayat Notifikasi - Sistem Layanan Digital RW',
  description: 'Pencatatan dan pemantauan pengiriman notifikasi Email dan WhatsApp warga',
};

export default async function NotifikasiPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const ALLOWED_ROLES = ['SUPER_ADMIN', 'ADMIN_RW', 'KETUA_RW', 'KETUA_RT'];
  if (!ALLOWED_ROLES.includes(session.role)) {
    redirect('/unauthorized');
  }

  const result = await getNotificationHistory();

  const logs = result.data || [];
  const stats = result.stats || { total: 0, sent: 0, failed: 0, pending: 0 };

  return <NotificationHistoryClientView initialLogs={logs as any} stats={stats} role={session.role} />;
}
