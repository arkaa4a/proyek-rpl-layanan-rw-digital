import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getClientSystemConfig } from '@/lib/config/systemConfigService';
import { getConnectionTestHistory } from '@/lib/config/connectionTestService';
import KonfigurasiClientView from '@/components/dashboard/KonfigurasiClientView';

export const metadata = {
  title: 'Konfigurasi Sistem & Provider | Layanan RW Digital',
  description: 'Pengaturan umum sistem, provider WhatsApp, email SMTP, dan kanal notifikasi RW.',
};

export default async function KonfigurasiPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  // Otorisasi ketat di server: Hanya SUPER_ADMIN
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
      />
    </div>
  );
}
