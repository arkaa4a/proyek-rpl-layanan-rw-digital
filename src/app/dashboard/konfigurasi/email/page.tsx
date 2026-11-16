import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getClientSystemConfig } from '@/lib/config/systemConfigService';
import { getConnectionTestHistory } from '@/lib/config/connectionTestService';
import KonfigurasiClientView from '@/components/dashboard/KonfigurasiClientView';

export const metadata = {
  title: 'Pengaturan Email SMTP | Layanan RW Digital',
  description: 'Pengaturan server email SMTP Nodemailer, pengujian koneksi, dan pengiriman email tes.',
};

export default async function EmailKonfigurasiPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (session.role !== 'SUPER_ADMIN') {
    redirect('/unauthorized');
  }

  const [initialConfig, initialHistory] = await Promise.all([
    getClientSystemConfig(),
    getConnectionTestHistory(25),
  ]);

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '3rem' }}>
      <KonfigurasiClientView
        initialConfig={initialConfig}
        initialHistory={initialHistory}
        adminUser={session}
        initialTab="email"
      />
    </div>
  );
}
