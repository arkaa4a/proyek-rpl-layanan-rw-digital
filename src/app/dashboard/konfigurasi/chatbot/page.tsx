import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getClientSystemConfig } from '@/lib/config/systemConfigService';
import { getConnectionTestHistory } from '@/lib/config/connectionTestService';
import KonfigurasiClientView from '@/components/dashboard/KonfigurasiClientView';

export const metadata = {
  title: 'Konfigurasi Chatbot AI | Layanan RW Digital',
  description: 'Pengaturan model AI Google Gemini, API key rahasia, parameter respons, dan pengujian interaktif asisten digital RW.',
};

export default async function ChatbotKonfigurasiPage() {
  const session = await getSession();

  // 1. Validasi Autentikasi Sesi di Server
  if (!session) {
    redirect('/login');
  }

  // 2. Otorisasi Ketat di Server: HANYA SUPER_ADMIN yang diizinkan
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
        initialTab="chatbot"
      />
    </div>
  );
}
