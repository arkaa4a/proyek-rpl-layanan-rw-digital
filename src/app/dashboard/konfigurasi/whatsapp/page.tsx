import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getClientSystemConfig } from '@/lib/config/systemConfigService';
import { getConnectionTestHistory } from '@/lib/config/connectionTestService';
import KonfigurasiClientView from '@/components/dashboard/KonfigurasiClientView';

export const metadata = {
  title: 'Manajemen Provider WhatsApp | Layanan RW Digital',
  description: 'Pengaturan provider WhatsApp (Fonnte, Gateway Sendiri, Meta Cloud API) dan pengujian koneksi.',
};

export default async function WhatsAppKonfigurasiPage() {
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
        initialTab="whatsapp"
      />
    </div>
  );
}
