import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getAuditLogs, getAuditLogStats } from '@/lib/data';
import AuditLogClientView from '@/components/dashboard/AuditLogClientView';

export default async function AuditLogPage() {
  const session = await getSession();

  if (!session || session.role !== 'SUPER_ADMIN') {
    redirect('/dashboard/admin');
  }

  const [logs, stats] = await Promise.all([
    getAuditLogs(200),
    getAuditLogStats(),
  ]);

  return <AuditLogClientView initialLogs={logs} stats={stats} />;
}
