'use client';

import React, { useState, useTransition } from 'react';
import { ClientSystemConfig } from '@/lib/config/systemConfigService';
import {
  saveGeneralConfigAction,
  saveFonnteConfigAction,
  saveGatewayConfigAction,
  saveMetaConfigAction,
  saveSmtpConfigAction,
  saveNotificationChannelsAction,
  switchWhatsAppProviderAction,
  testFonnteConnectionAction,
  testGatewayConnectionAction,
  testSmtpConnectionAction,
  sendTestWhatsAppAction,
  sendTestEmailAction,
  getConnectionHistoryAction,
  saveChatbotConfigAction,
  toggleChatbotStatusAction,
  testGeminiConnectionAction,
  testChatbotQueryAction,
} from '@/app/dashboard/konfigurasi/actions';

interface KonfigurasiClientViewProps {
  initialConfig: ClientSystemConfig;
  initialHistory: any[];
  adminUser: {
    id: string;
    username: string;
    role: string;
  };
  initialTab?: TabType;
}

type TabType = 'general' | 'whatsapp' | 'email' | 'chatbot' | 'channels' | 'history';

// Clean Minimalist Icons (SVG)
const IconSettings = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconWhatsApp = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

const IconMail = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const IconBot = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 8V4H8" />
    <rect width="16" height="12" x="4" y="8" rx="2" />
    <path d="M2 14h2" />
    <path d="M20 14h2" />
    <path d="M15 13v2" />
    <path d="M9 13v2" />
  </svg>
);

const IconBell = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

const IconBuilding = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
    <path d="M9 22v-4h6v4" />
    <path d="M8 6h.01" />
    <path d="M16 6h.01" />
    <path d="M12 6h.01" />
    <path d="M12 10h.01" />
    <path d="M12 14h.01" />
    <path d="M16 10h.01" />
    <path d="M16 14h.01" />
    <path d="M8 10h.01" />
    <path d="M8 14h.01" />
  </svg>
);

const IconActivity = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12h4l3 8 4-16 3 8h4" />
  </svg>
);

const IconEye = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconEyeOff = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" x2="22" y1="2" y2="22" />
  </svg>
);

const IconCheckCircle = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <path d="m9 11 3 3L22 4" />
  </svg>
);

const IconAlertCircle = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" x2="12" y1="8" y2="12" />
    <line x1="12" x2="12.01" y1="16" y2="16" />
  </svg>
);

const IconInfo = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </svg>
);

const IconSave = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
    <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
    <path d="M7 3v4a1 1 0 0 0 1 1h7" />
  </svg>
);

const IconZap = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const IconRefresh = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
    <path d="M16 21h5v-5" />
  </svg>
);

export default function KonfigurasiClientView({
  initialConfig,
  initialHistory,
  adminUser,
  initialTab = 'whatsapp',
}: KonfigurasiClientViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [config, setConfig] = useState<ClientSystemConfig>(initialConfig);
  const [history, setHistory] = useState<any[]>(initialHistory);
  const [isPending, startTransition] = useTransition();

  // Feedback Banner
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Form States - Umum
  const [generalForm, setGeneralForm] = useState({
    appName: config.appName,
    rwNomor: config.rwNomor,
    kelurahan: config.kelurahan,
    kecamatan: config.kecamatan,
    kota: config.kota,
    kontakEmail: config.kontakEmail,
    kontakWa: config.kontakWa,
    alamatSekretariat: config.alamatSekretariat,
    deskripsiSistem: config.deskripsiSistem,
  });

  // Form States - Fonnte
  const [fonnteTokenInput, setFonnteTokenInput] = useState('');
  const [showFonnteToken, setShowFonnteToken] = useState(false);
  const [fonnteCountryCode, setFonnteCountryCode] = useState(config.fonnteCountryCode || '62');

  // Form States - Gateway Sendiri
  const [gatewayUrl, setGatewayUrl] = useState(config.gatewayUrl || '');
  const [gatewayTokenInput, setGatewayTokenInput] = useState('');
  const [showGatewayToken, setShowGatewayToken] = useState(false);

  // Form States - Meta Cloud
  const [metaPhoneId, setMetaPhoneId] = useState(config.metaPhoneNumberId || '');
  const [metaTokenInput, setMetaTokenInput] = useState('');
  const [showMetaToken, setShowMetaToken] = useState(false);
  const [metaApiVersion, setMetaApiVersion] = useState(config.metaApiVersion || 'v21.0');

  // Form States - SMTP Email
  const [smtpForm, setSmtpForm] = useState({
    host: config.smtpHost || '',
    port: config.smtpPort || 587,
    secure: config.smtpSecure || false,
    user: config.smtpUser || '',
    pass: '',
    from: config.smtpFrom || '',
  });
  const [showSmtpPass, setShowSmtpPass] = useState(false);

  // Form States - Channels
  const [channelToggles, setChannelToggles] = useState({
    emailEnabled: config.emailEnabled,
    whatsappEnabled: config.whatsappEnabled,
    inAppEnabled: config.inAppEnabled,
    notifyPengumumanEmail: config.notifyPengumumanEmail,
    notifyPengumumanWa: config.notifyPengumumanWa,
    notifySuratEmail: config.notifySuratEmail,
    notifySuratWa: config.notifySuratWa,
    notifyPengaduanEmail: config.notifyPengaduanEmail,
    notifyPengaduanWa: config.notifyPengaduanWa,
  });

  // Helper pembersih string API Key dari awalan "Tersimpan: "
  const cleanApiKey = (val?: string | null) => {
    if (!val) return '';
    return val.replace(/^Tersimpan:\s*/i, '').trim();
  };

  // Form States - Chatbot AI (Google Gemini)
  const [chatbotForm, setChatbotForm] = useState({
    chatbotEnabled: config.chatbotEnabled ?? true,
    provider: config.aiProvider || 'GOOGLE_GEMINI',
    model: config.aiModel || 'gemini-1.5-flash',
    apiKey: cleanApiKey(config.geminiApiKeyMasked),
    apiKeyBackup1: cleanApiKey(config.apiKeyBackup1Masked),
    apiKeyBackup2: cleanApiKey(config.apiKeyBackup2Masked),
    temperature: typeof config.aiTemperature === 'number' ? config.aiTemperature : 0.2,
    maxTokens: typeof config.aiMaxTokens === 'number' ? config.aiMaxTokens : 2000,
    systemInstruction: config.aiSystemInstruction || '',
    fallbackMessage:
      config.aiFallbackMessage ||
      'Maaf, saya tidak bisa menjawab pertanyaan tersebut. Silakan hubungi pengurus RT Anda atau sekretariat Balai RW 12 untuk konfirmasi lebih lanjut.',
    outOfScopeMessage:
      config.aiOutOfScopeMessage ||
      'Sistem ini khusus melayani kebutuhan informasi dan administrasi warga RW 12 Harjamukti. Anda dapat menanyakan perihal layanan surat pengantar, status pengajuan, pengaduan fasilitas lingkungan, atau pengumuman kegiatan warga.',
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiKeyBackup1, setShowApiKeyBackup1] = useState(false);
  const [showApiKeyBackup2, setShowApiKeyBackup2] = useState(false);
  const [showAdvancedAi, setShowAdvancedAi] = useState(false);
  const [testQueryPrompt, setTestQueryPrompt] = useState(
    'Apa saja jenis layanan surat administrasi yang dapat diajukan di RW ini?'
  );
  const [testQueryResult, setTestQueryResult] = useState<{
    answer?: string;
    latencyMs?: number;
    model?: string;
    error?: string;
  } | null>(null);
  const [isTestingQuery, setIsTestingQuery] = useState(false);

  // Modals
  const [switchProviderModal, setSwitchProviderModal] = useState<
    'FONNTE' | 'GATEWAY_SENDIRI' | 'META_CLOUD' | null
  >(null);
  const [testWaModal, setTestWaModal] = useState<{
    open: boolean;
    provider: 'FONNTE' | 'GATEWAY_SENDIRI' | 'META_CLOUD';
    target: string;
  }>({ open: false, provider: 'FONNTE', target: '' });
  const [testEmailModal, setTestEmailModal] = useState<{
    open: boolean;
    target: string;
  }>({ open: false, target: '' });

  // Refresh history
  const refreshHistory = async () => {
    const res = await getConnectionHistoryAction(25);
    if (res.success && res.data) {
      setHistory(res.data);
    }
  };

  // Helper status badge WhatsApp
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.78rem',
              fontWeight: 700,
              backgroundColor: '#dcfce7',
              color: '#166534',
              border: '1px solid #86efac',
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16a34a' }} />
            Aktif Digunakan
          </span>
        );
      case 'READY':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.78rem',
              fontWeight: 700,
              backgroundColor: '#eff6ff',
              color: '#1e40af',
              border: '1px solid #bfdbfe',
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563eb' }} />
            Siap Digunakan
          </span>
        );
      case 'FAILED':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.78rem',
              fontWeight: 700,
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              border: '1px solid #fca5a5',
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#dc2626' }} />
            Koneksi Gagal
          </span>
        );
      default:
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.78rem',
              fontWeight: 600,
              backgroundColor: '#f1f5f9',
              color: '#475569',
              border: '1px solid #cbd5e1',
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#94a3b8' }} />
            Belum Dikonfigurasi
          </span>
        );
    }
  };

  // 1. Simpan Umum
  const handleSaveGeneral = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await saveGeneralConfigAction(generalForm);
      if (res.success && res.data) {
        setConfig(res.data);
        setFeedback({ type: 'success', message: res.message || 'Konfigurasi umum berhasil disimpan.' });
      } else {
        setFeedback({ type: 'error', message: res.error || 'Gagal menyimpan konfigurasi.' });
      }
    });
  };

  // 2. Simpan Fonnte
  const handleSaveFonnte = () => {
    setFeedback(null);
    startTransition(async () => {
      const payload: any = { countryCode: fonnteCountryCode };
      if (fonnteTokenInput.trim() !== '') {
        payload.token = fonnteTokenInput.trim();
      }
      const res = await saveFonnteConfigAction(payload);
      if (res.success && res.data) {
        setConfig(res.data);
        setFonnteTokenInput('');
        setFeedback({ type: 'success', message: res.message || 'Konfigurasi Fonnte tersimpan.' });
      } else {
        setFeedback({ type: 'error', message: res.error || 'Gagal menyimpan Fonnte.' });
      }
    });
  };

  // 3. Simpan Gateway Sendiri
  const handleSaveGateway = () => {
    setFeedback(null);
    startTransition(async () => {
      const payload: any = { url: gatewayUrl };
      if (gatewayTokenInput.trim() !== '') {
        payload.token = gatewayTokenInput.trim();
      }
      const res = await saveGatewayConfigAction(payload);
      if (res.success && res.data) {
        setConfig(res.data);
        setGatewayTokenInput('');
        setFeedback({ type: 'success', message: res.message || 'Konfigurasi Gateway tersimpan.' });
      } else {
        setFeedback({ type: 'error', message: res.error || 'Gagal menyimpan Gateway.' });
      }
    });
  };

  // 4. Simpan SMTP
  const handleSaveSmtp = () => {
    setFeedback(null);
    startTransition(async () => {
      const payload: any = { ...smtpForm };
      if (smtpForm.pass.trim() === '') {
        delete payload.pass;
      }
      const res = await saveSmtpConfigAction(payload);
      if (res.success && res.data) {
        setConfig(res.data);
        setSmtpForm((prev) => ({ ...prev, pass: '' }));
        setFeedback({ type: 'success', message: res.message || 'Pengaturan SMTP tersimpan.' });
      } else {
        setFeedback({ type: 'error', message: res.error || 'Gagal menyimpan SMTP.' });
      }
    });
  };

  // 5. Simpan Kanal Notifikasi
  const handleSaveChannels = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await saveNotificationChannelsAction(channelToggles);
      if (res.success && res.data) {
        setConfig(res.data);
        setFeedback({ type: 'success', message: res.message || 'Pengaturan kanal berhasil disimpan.' });
      } else {
        setFeedback({ type: 'error', message: res.error || 'Gagal menyimpan kanal notifikasi.' });
      }
    });
  };

  // Uji Koneksi Fonnte
  const handleTestFonnte = () => {
    setFeedback({ type: 'info', message: 'Sedang menguji koneksi ke server API Fonnte...' });
    startTransition(async () => {
      const res = (await testFonnteConnectionAction(fonnteTokenInput || undefined)) as any;
      if (res.config) setConfig(res.config);
      await refreshHistory();

      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Koneksi Fonnte berhasil terverifikasi! (Latensi: ${res.latencyMs}ms, Perangkat: ${res.deviceInfo?.device}, Kuota: ${res.deviceInfo?.quota})`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Uji koneksi Fonnte gagal.',
        });
      }
    });
  };

  // Uji Koneksi Gateway
  const handleTestGateway = () => {
    setFeedback({ type: 'info', message: 'Sedang memeriksa endpoint Gateway Sendiri...' });
    startTransition(async () => {
      const res = (await testGatewayConnectionAction(gatewayUrl || undefined, gatewayTokenInput || undefined)) as any;
      if (res.config) setConfig(res.config);
      await refreshHistory();

      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Koneksi Gateway berhasil! ${res.message || 'Server merespons'} (Latensi: ${res.latencyMs}ms)`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Uji koneksi Gateway gagal.',
        });
      }
    });
  };

  // Uji Koneksi SMTP
  const handleTestSmtp = () => {
    setFeedback({ type: 'info', message: 'Sedang melakukan handshake & verifikasi kredensial SMTP...' });
    startTransition(async () => {
      const overrides: any = {
        host: smtpForm.host,
        port: Number(smtpForm.port),
        secure: smtpForm.secure,
        user: smtpForm.user,
      };
      if (smtpForm.pass) overrides.pass = smtpForm.pass;

      const res = (await testSmtpConnectionAction(overrides)) as any;
      if (res.config) setConfig(res.config);
      await refreshHistory();

      if (res.success) {
        setFeedback({
          type: 'success',
          message: `${res.message} (Latensi: ${res.latencyMs}ms)`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Verifikasi koneksi SMTP gagal.',
        });
      }
    });
  };

  // Ganti Provider Aktif
  const handleConfirmSwitchProvider = () => {
    if (!switchProviderModal) return;
    const targetProvider = switchProviderModal;
    setSwitchProviderModal(null);
    setFeedback({ type: 'info', message: `Sedang mengaktifkan provider ${targetProvider}...` });

    startTransition(async () => {
      const res = await switchWhatsAppProviderAction(targetProvider);
      if (res.success && res.data) {
        setConfig(res.data);
        setFeedback({
          type: 'success',
          message: `Provider WhatsApp aktif berhasil diubah menjadi "${targetProvider}". Seluruh notifikasi berikutnya akan dikirim via provider ini.`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Gagal mengubah provider aktif.',
        });
      }
    });
  };

  // Eksekusi Kirim Uji Coba WhatsApp
  const handleSendTestWa = () => {
    if (!testWaModal.target) {
      alert('Harap masukkan nomor WhatsApp tujuan uji coba.');
      return;
    }
    const target = testWaModal.target;
    const provider = testWaModal.provider;
    setTestWaModal({ open: false, provider: 'FONNTE', target: '' });
    setFeedback({ type: 'info', message: `Sedang mengirim pesan uji coba WhatsApp ke ${target}...` });

    startTransition(async () => {
      const res = (await sendTestWhatsAppAction(target, provider)) as any;
      await refreshHistory();
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Pesan uji coba WhatsApp berhasil dikirim via ${res.provider}! (ID: ${res.messageId}, Latensi: ${res.latencyMs}ms)`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Pengiriman pesan uji coba WhatsApp gagal.',
        });
      }
    });
  };

  // Eksekusi Kirim Uji Coba Email
  const handleSendTestEmail = () => {
    if (!testEmailModal.target) {
      alert('Harap masukkan alamat email tujuan uji coba.');
      return;
    }
    const target = testEmailModal.target;
    setTestEmailModal({ open: false, target: '' });
    setFeedback({ type: 'info', message: `Sedang mengirim email percobaan ke ${target}...` });

    startTransition(async () => {
      const res = (await sendTestEmailAction(target)) as any;
      await refreshHistory();
      if (res.success) {
        setFeedback({
          type: 'success',
          message: res.message || `Email uji coba berhasil dikirim ke ${target}! (Latensi: ${res.latencyMs}ms)`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Pengiriman email uji coba gagal.',
        });
      }
    });
  };

  // Helper status badge Chatbot AI
  const renderChatbotStatusBadge = () => {
    if (!config.chatbotEnabled) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.78rem',
            fontWeight: 700,
            backgroundColor: '#f1f5f9',
            color: '#475569',
            border: '1px solid #cbd5e1',
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#64748b' }} />
          Nonaktif
        </span>
      );
    }
    if (!config.hasGeminiApiKey) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.78rem',
            fontWeight: 700,
            backgroundColor: '#fef3c7',
            color: '#92400e',
            border: '1px solid #fcd34d',
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#d97706' }} />
          Belum Dikonfigurasi
        </span>
      );
    }
    if (config.aiStatus === 'FAILED') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.78rem',
            fontWeight: 700,
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            border: '1px solid #fca5a5',
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#dc2626' }} />
          Koneksi Gagal
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.25rem 0.75rem',
          borderRadius: '9999px',
          fontSize: '0.78rem',
          fontWeight: 700,
          backgroundColor: '#dcfce7',
          color: '#166534',
          border: '1px solid #86efac',
        }}
      >
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16a34a' }} />
        Aktif Digunakan
      </span>
    );
  };

  // 6. Simpan Chatbot AI
  const handleSaveChatbot = () => {
    setFeedback(null);
    startTransition(async () => {
      const payload: any = {
        chatbotEnabled: chatbotForm.chatbotEnabled,
        provider: chatbotForm.provider,
        model: chatbotForm.model,
        temperature: Number(chatbotForm.temperature),
        maxTokens: Number(chatbotForm.maxTokens),
        systemInstruction: chatbotForm.systemInstruction,
        fallbackMessage: chatbotForm.fallbackMessage,
        outOfScopeMessage: chatbotForm.outOfScopeMessage,
      };
      // Safety check: Hanya kirim payload jika user benar-benar memasukkan key baru (bukan string masking bawaan database)
      const isUnchangedOrMasked = (val: string) => {
        const v = val.trim();
        return !v || v.includes('•') || v.includes('*');
      };

      if (!isUnchangedOrMasked(chatbotForm.apiKey)) {
        payload.apiKey = chatbotForm.apiKey.trim();
      }
      if (!isUnchangedOrMasked(chatbotForm.apiKeyBackup1)) {
        payload.apiKeyBackup1 = chatbotForm.apiKeyBackup1.trim();
      }
      if (!isUnchangedOrMasked(chatbotForm.apiKeyBackup2)) {
        payload.apiKeyBackup2 = chatbotForm.apiKeyBackup2.trim();
      }
      const res = await saveChatbotConfigAction(payload);
      if (res.success && res.data) {
        setConfig(res.data);
        setChatbotForm((prev) => ({
          ...prev,
          apiKey: cleanApiKey(res.data.geminiApiKeyMasked),
          apiKeyBackup1: cleanApiKey(res.data.apiKeyBackup1Masked),
          apiKeyBackup2: cleanApiKey(res.data.apiKeyBackup2Masked),
        }));
        setFeedback({
          type: 'success',
          message: res.message || 'Konfigurasi Chatbot AI berhasil disimpan secara aman.',
        });
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Gagal menyimpan konfigurasi Chatbot AI.',
        });
      }
    });
  };

  // 7. Toggle Status Chatbot (Aktif / Nonaktif)
  const handleToggleChatbot = (targetEnabled: boolean) => {
    setFeedback({
      type: 'info',
      message: `Sedang ${targetEnabled ? 'mengaktifkan' : 'menonaktifkan'} Chatbot AI...`,
    });
    startTransition(async () => {
      const res = await toggleChatbotStatusAction(targetEnabled);
      if (res.success && res.data) {
        setConfig(res.data);
        setChatbotForm((prev) => ({ ...prev, chatbotEnabled: targetEnabled }));
        setFeedback({
          type: 'success',
          message: res.message || `Chatbot AI berhasil ${targetEnabled ? 'diaktifkan' : 'dinonaktifkan'}.`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Gagal mengubah status Chatbot AI.',
        });
      }
    });
  };

  // 8. Uji Koneksi Google Gemini AI
  const handleTestGeminiConnection = () => {
    setFeedback({ type: 'info', message: 'Sedang menguji koneksi ke API Google Gemini...' });
    startTransition(async () => {
      const res = (await testGeminiConnectionAction(
        chatbotForm.apiKey.trim() || undefined,
        chatbotForm.model || undefined
      )) as any;
      if (res.config) setConfig(res.config);
      await refreshHistory();

      if (res.success) {
        setFeedback({
          type: 'success',
          message: `${res.message} (Latensi: ${res.latencyMs}ms, Respons: "${res.sampleResponse}")`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Uji koneksi Google Gemini gagal.',
        });
      }
    });
  };

  // 9. Uji Chatbot Langsung (Live Test Query)
  const handleRunChatbotTestQuery = async () => {
    if (!testQueryPrompt.trim()) {
      alert('Pertanyaan uji coba tidak boleh kosong.');
      return;
    }
    setIsTestingQuery(true);
    setTestQueryResult(null);

    const res = (await testChatbotQueryAction(testQueryPrompt.trim(), {
      apiKeyOverride: chatbotForm.apiKey.trim() || undefined,
      modelOverride: chatbotForm.model,
      temperature: Number(chatbotForm.temperature),
      maxTokens: Number(chatbotForm.maxTokens),
      systemInstruction: chatbotForm.systemInstruction,
    })) as any;

    setIsTestingQuery(false);
    await refreshHistory();

    if (res.success) {
      setTestQueryResult({
        answer: res.answer,
        latencyMs: res.latencyMs,
        model: res.model,
      });
    } else {
      setTestQueryResult({
        error: res.error || 'Pengujian respons Chatbot gagal.',
        latencyMs: res.latencyMs,
        model: res.model,
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header Dashboard Konfigurasi */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.25rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'rgba(30, 58, 138, 0.08)',
                color: '#1e3a8a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconSettings size={20} />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-0.02em', margin: 0 }}>
              Konfigurasi Sistem & Provider
            </h1>
          </div>
          <p style={{ color: 'var(--secondary-foreground)', fontSize: '0.875rem', margin: 0 }}>
            Pusat kendali pengaturan aplikasi, manajemen provider WhatsApp, SMTP email, kanal notifikasi, dan diagnostik koneksi.
          </p>
        </div>

        {/* Info Ringkas Status Aktif */}
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div
            style={{
              padding: '0.45rem 0.8rem',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
            }}
          >
            <span style={{ color: '#64748b' }}>WA Aktif:</span>
            <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#10b981' }} />
            <strong style={{ color: 'var(--primary)' }}>
              {config.activeWaProvider === 'FONNTE'
                ? 'Fonnte Gateway'
                : config.activeWaProvider === 'GATEWAY_SENDIRI'
                ? 'Gateway Sendiri'
                : 'Meta Cloud API'}
            </strong>
          </div>
          <div
            style={{
              padding: '0.45rem 0.8rem',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
            }}
          >
            <span style={{ color: '#64748b' }}>SMTP:</span>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: config.smtpStatus === 'READY' ? '#10b981' : '#f59e0b',
              }}
            />
            <strong style={{ color: config.smtpStatus === 'READY' ? '#16a34a' : '#d97706' }}>
              {config.smtpStatus === 'READY' ? 'Terverifikasi' : 'Perlu Diuji'}
            </strong>
          </div>
          <div
            style={{
              padding: '0.45rem 0.8rem',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
            }}
          >
            <span style={{ color: '#64748b' }}>Chatbot AI:</span>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: !config.chatbotEnabled
                  ? '#94a3b8'
                  : !config.hasGeminiApiKey
                  ? '#f59e0b'
                  : config.aiStatus === 'FAILED'
                  ? '#ef4444'
                  : '#10b981',
              }}
            />
            <strong
              style={{
                color: !config.chatbotEnabled
                  ? '#64748b'
                  : !config.hasGeminiApiKey
                  ? '#d97706'
                  : config.aiStatus === 'FAILED'
                  ? '#dc2626'
                  : '#16a34a',
              }}
            >
              {!config.chatbotEnabled
                ? 'Nonaktif'
                : !config.hasGeminiApiKey
                ? 'Belum Dikonfigurasi'
                : config.aiStatus === 'FAILED'
                ? 'Gagal'
                : 'Aktif'}
            </strong>
          </div>
        </div>
      </div>

      {/* Banner Feedback / Pesan Sistem */}
      {feedback && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            backgroundColor:
              feedback.type === 'success'
                ? '#f0fdf4'
                : feedback.type === 'error'
                ? '#fef2f2'
                : '#eff6ff',
            border: `1px solid ${
              feedback.type === 'success'
                ? '#86efac'
                : feedback.type === 'error'
                ? '#fca5a5'
                : '#bfdbfe'
            }`,
            color:
              feedback.type === 'success'
                ? '#166534'
                : feedback.type === 'error'
                ? '#991b1b'
                : '#1e40af',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.875rem' }}>
            <span>
              {feedback.type === 'success' ? (
                <IconCheckCircle size={18} />
              ) : feedback.type === 'error' ? (
                <IconAlertCircle size={18} />
              ) : (
                <IconInfo size={18} />
              )}
            </span>
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              fontWeight: 700,
              fontSize: '1rem',
              padding: '0 0.25rem',
            }}
            aria-label="Tutup pesan"
          >
            &times;
          </button>
        </div>
      )}

      {/* Navigasi Tab Elegan & Modern (Segmented Pills) */}
      <div
        style={{
          display: 'flex',
          backgroundColor: '#f1f5f9',
          padding: '5px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          overflowX: 'auto',
          gap: '4px',
        }}
      >
        <button
          onClick={() => setActiveTab('whatsapp')}
          style={{
            padding: '0.55rem 1rem',
            backgroundColor: activeTab === 'whatsapp' ? '#ffffff' : 'transparent',
            border: 'none',
            borderRadius: '8px',
            boxShadow: activeTab === 'whatsapp' ? '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' : 'none',
            color: activeTab === 'whatsapp' ? '#1e3a8a' : '#64748b',
            fontWeight: activeTab === 'whatsapp' ? 600 : 500,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          <IconWhatsApp size={16} />
          <span>Provider WhatsApp</span>
        </button>

        <button
          onClick={() => setActiveTab('email')}
          style={{
            padding: '0.55rem 1rem',
            backgroundColor: activeTab === 'email' ? '#ffffff' : 'transparent',
            border: 'none',
            borderRadius: '8px',
            boxShadow: activeTab === 'email' ? '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' : 'none',
            color: activeTab === 'email' ? '#1e3a8a' : '#64748b',
            fontWeight: activeTab === 'email' ? 600 : 500,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          <IconMail size={16} />
          <span>Email SMTP</span>
        </button>

        <button
          onClick={() => setActiveTab('chatbot')}
          style={{
            padding: '0.55rem 1rem',
            backgroundColor: activeTab === 'chatbot' ? '#ffffff' : 'transparent',
            border: 'none',
            borderRadius: '8px',
            boxShadow: activeTab === 'chatbot' ? '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' : 'none',
            color: activeTab === 'chatbot' ? '#1e3a8a' : '#64748b',
            fontWeight: activeTab === 'chatbot' ? 600 : 500,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          <IconBot size={16} />
          <span>Chatbot AI</span>
        </button>

        <button
          onClick={() => setActiveTab('channels')}
          style={{
            padding: '0.55rem 1rem',
            backgroundColor: activeTab === 'channels' ? '#ffffff' : 'transparent',
            border: 'none',
            borderRadius: '8px',
            boxShadow: activeTab === 'channels' ? '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' : 'none',
            color: activeTab === 'channels' ? '#1e3a8a' : '#64748b',
            fontWeight: activeTab === 'channels' ? 600 : 500,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          <IconBell size={16} />
          <span>Kanal Notifikasi</span>
        </button>

        <button
          onClick={() => setActiveTab('general')}
          style={{
            padding: '0.55rem 1rem',
            backgroundColor: activeTab === 'general' ? '#ffffff' : 'transparent',
            border: 'none',
            borderRadius: '8px',
            boxShadow: activeTab === 'general' ? '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' : 'none',
            color: activeTab === 'general' ? '#1e3a8a' : '#64748b',
            fontWeight: activeTab === 'general' ? 600 : 500,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          <IconBuilding size={16} />
          <span>Konfigurasi Umum</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('history');
            refreshHistory();
          }}
          style={{
            padding: '0.55rem 1rem',
            backgroundColor: activeTab === 'history' ? '#ffffff' : 'transparent',
            border: 'none',
            borderRadius: '8px',
            boxShadow: activeTab === 'history' ? '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' : 'none',
            color: activeTab === 'history' ? '#1e3a8a' : '#64748b',
            fontWeight: activeTab === 'history' ? 600 : 500,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          <IconActivity size={16} />
          <span>Status & Riwayat Uji</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MANAJEMEN PROVIDER WHATSAPP                                        */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* TAB 1: MANAJEMEN PROVIDER WHATSAPP (FONNTE API)                           */}
      {/* ========================================================================= */}
      {activeTab === 'whatsapp' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: '0.35rem' }}>
              WhatsApp Gateway (Fonnte API)
            </h2>
            <p style={{ color: 'var(--secondary-foreground)', fontSize: '0.875rem' }}>
              Layanan pengiriman pesan notifikasi WhatsApp resmi berbasis cloud melalui Fonnte untuk notifikasi surat pengantar, aduan warga, dan siaran pengumuman kegiatan RW.
            </p>
          </div>

          {/* KARTU STATUS PROVIDER: FONNTE */}
          <div
            className="card"
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              border: '2px solid var(--primary)',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.12)',
            }}
          >
            <div>
              {/* Header Kartu */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '10px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '1.1rem',
                    }}
                  >
                    F
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Fonnte WhatsApp API</h3>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Penyedia Gateway WhatsApp Cloud (fonnte.com)</span>
                  </div>
                </div>
                {renderStatusBadge(config.fonnteStatus)}
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--secondary-foreground)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                Layanan WhatsApp gateway berbasis cloud resmi tanpa perlu server mandiri. Mendukung pengiriman cepat, webhooks, dan manajemen perangkat nomor handphone.
              </p>

              {/* Status Token & Missing Info */}
              {!config.hasFonnteToken ? (
                <div
                  style={{
                    padding: '0.65rem 0.85rem',
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fef3c7',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    color: '#92400e',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <IconAlertCircle size={16} />
                  <span>Token API belum diatur. Masukkan token Fonnte pada formulir di bawah ini.</span>
                </div>
              ) : (
                <div
                  style={{
                    padding: '0.65rem 0.85rem',
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Token Terdaftar:</span>
                    <code style={{ fontWeight: 600 }}>{config.fonnteTokenMasked}</code>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Kode Negara:</span>
                    <span>+{config.fonnteCountryCode}</span>
                  </div>
                  {config.fonnteDeviceInfo && (
                    <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '0.4rem', marginTop: '0.2rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#166534', fontWeight: 600 }}>
                        <span>Nomor Terhubung:</span>
                        <span>{config.fonnteDeviceInfo.device}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
                        <span>Sisa Kuota: {config.fonnteDeviceInfo.quota} pesan</span>
                        <span>Paket: {config.fonnteDeviceInfo.package}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <span
                style={{
                  flex: 1,
                  textAlign: 'center',
                  fontSize: '0.825rem',
                  fontWeight: 700,
                  color: '#166534',
                  padding: '0.45rem',
                  backgroundColor: '#dcfce7',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                ✓ Provider Aktif Digunakan
              </span>

              <button
                type="button"
                onClick={handleTestFonnte}
                disabled={isPending || (!config.hasFonnteToken && !fonnteTokenInput)}
                className="btn"
                style={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  fontSize: '0.825rem',
                  padding: '0.45rem 0.75rem',
                }}
              >
                Uji Koneksi
              </button>

              <button
                type="button"
                onClick={() => setTestWaModal({ open: true, provider: 'FONNTE', target: '' })}
                disabled={isPending || !config.hasFonnteToken}
                className="btn"
                style={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  fontSize: '0.825rem',
                  padding: '0.45rem 0.75rem',
                }}
              >
                Kirim Pesan Tes
              </button>
            </div>
          </div>

          {/* FORM PENGATURAN API FONNTE */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--primary)' }}>
              Pengaturan API Fonnte
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Kredensial disimpan secara aman di server menggunakan enkripsi AES-256-GCM dan tidak dikirimkan mentah ke browser.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Token API Fonnte
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showFonnteToken ? 'text' : 'password'}
                    value={fonnteTokenInput}
                    onChange={(e) => setFonnteTokenInput(e.target.value)}
                    placeholder={config.hasFonnteToken ? `Tersimpan: ${config.fonnteTokenMasked}` : 'Masukkan token akun Fonnte...'}
                    style={{
                      width: '100%',
                      padding: '0.55rem 2.5rem 0.55rem 0.75rem',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.875rem',
                      backgroundColor: 'var(--background)',
                      color: 'var(--foreground)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowFonnteToken(!showFonnteToken)}
                    style={{
                      position: 'absolute',
                      right: '0.5rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      color: '#64748b',
                    }}
                    title={showFonnteToken ? 'Sembunyikan' : 'Tampilkan'}
                  >
                    {showFonnteToken ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                  </button>
                </div>
                <span style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                  Kosongkan jika tidak ingin mengubah token yang tersimpan. Dapatkan token di dashboard <a href="https://fonnte.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>fonnte.com</a>.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Kode Negara Default
                </label>
                <input
                  type="text"
                  value={fonnteCountryCode}
                  onChange={(e) => setFonnteCountryCode(e.target.value)}
                  placeholder="62"
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem',
                    backgroundColor: 'var(--background)',
                    color: 'var(--foreground)',
                  }}
                />
                <span style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                  Nilai bawaan: 62 (Indonesia). Nomor berawalan 0 atau 8 otomatis diformat.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleSaveFonnte}
                  disabled={isPending}
                  className="btn btn-primary"
                  style={{ fontSize: '0.85rem' }}
                >
                  Simpan Pengaturan Fonnte
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: KONFIGURASI EMAIL SMTP                                             */}
      {/* ========================================================================= */}
      {activeTab === 'email' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: '0.35rem' }}>
              Konfigurasi Server Email (SMTP)
            </h2>
            <p style={{ color: 'var(--secondary-foreground)', fontSize: '0.875rem' }}>
              Koneksi server SMTP resmi menggunakan Nodemailer untuk pengiriman notifikasi persuratan, berkas lampiran resmi PDF, dan verifikasi akun.
            </p>
          </div>

          <div className="card" style={{ maxWidth: '840px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Parameter Server SMTP</h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Kompatibel dengan Gmail App Password, Mailgun, Zimbra, atau SMTP Hosting RW</span>
              </div>
              <div>
                {config.smtpStatus === 'READY' ? (
                  <span style={{ padding: '0.3rem 0.75rem', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: 700, backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #86efac' }}>
                    ✓ SMTP Terverifikasi
                  </span>
                ) : config.smtpStatus === 'FAILED' ? (
                  <span style={{ padding: '0.3rem 0.75rem', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: 700, backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }}>
                    ✕ Koneksi Gagal
                  </span>
                ) : (
                  <span style={{ padding: '0.3rem 0.75rem', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: 600, backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>
                    Belum Dikonfigurasi
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  SMTP Host *
                </label>
                <input
                  type="text"
                  value={smtpForm.host}
                  onChange={(e) => setSmtpForm({ ...smtpForm, host: e.target.value })}
                  placeholder="smtp.gmail.com"
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem',
                    backgroundColor: 'var(--background)',
                    color: 'var(--foreground)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  SMTP Port *
                </label>
                <input
                  type="number"
                  value={smtpForm.port}
                  onChange={(e) => setSmtpForm({ ...smtpForm, port: parseInt(e.target.value, 10) || 587 })}
                  placeholder="587"
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem',
                    backgroundColor: 'var(--background)',
                    color: 'var(--foreground)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Email Pengguna / Akun Pengirim *
                </label>
                <input
                  type="email"
                  value={smtpForm.user}
                  onChange={(e) => setSmtpForm({ ...smtpForm, user: e.target.value })}
                  placeholder="pengurus.rw@domain.id"
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem',
                    backgroundColor: 'var(--background)',
                    color: 'var(--foreground)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Password / Google App Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showSmtpPass ? 'text' : 'password'}
                    value={smtpForm.pass}
                    onChange={(e) => setSmtpForm({ ...smtpForm, pass: e.target.value })}
                    placeholder={config.hasSmtpPass ? `Tersimpan: ${config.smtpPassMasked}` : 'Masukkan password SMTP...'}
                    style={{
                      width: '100%',
                      padding: '0.55rem 2.5rem 0.55rem 0.75rem',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.875rem',
                      backgroundColor: 'var(--background)',
                      color: 'var(--foreground)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSmtpPass(!showSmtpPass)}
                    style={{
                      position: 'absolute',
                      right: '0.5rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      color: '#64748b',
                    }}
                  >
                    {showSmtpPass ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                  </button>
                </div>
                <span style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>
                  Kosongkan jika tidak ingin mengganti password tersimpan.
                </span>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Nama & Alamat Pengirim (From Header)
                </label>
                <input
                  type="text"
                  value={smtpForm.from}
                  onChange={(e) => setSmtpForm({ ...smtpForm, from: e.target.value })}
                  placeholder='"Pelayanan Digital RW" <pengurus.rw@domain.id>'
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem',
                    backgroundColor: 'var(--background)',
                    color: 'var(--foreground)',
                  }}
                />
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="smtpSecure"
                  checked={smtpForm.secure}
                  onChange={(e) => setSmtpForm({ ...smtpForm, secure: e.target.checked })}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                />
                <label htmlFor="smtpSecure" style={{ fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                  Gunakan Protokol SSL / TLS Langsung (Wajib dicentang jika menggunakan Port 465)
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
              <button
                type="button"
                onClick={handleSaveSmtp}
                disabled={isPending}
                className="btn btn-primary"
                style={{ fontSize: '0.875rem' }}
              >
                Simpan Konfigurasi SMTP
              </button>

              <button
                type="button"
                onClick={handleTestSmtp}
                disabled={isPending || (!config.hasSmtpPass && !smtpForm.pass)}
                className="btn"
                style={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  fontSize: '0.875rem',
                }}
              >
                Uji Koneksi SMTP
              </button>

              <button
                type="button"
                onClick={() => setTestEmailModal({ open: true, target: '' })}
                disabled={isPending || !config.hasSmtpPass}
                className="btn"
                style={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  fontSize: '0.875rem',
                }}
              >
                Kirim Email Percobaan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: KONFIGURASI CHATBOT AI (GOOGLE GEMINI)                               */}
      {/* ========================================================================= */}
      {activeTab === 'chatbot' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: '0.35rem' }}>
              Pengaturan & Diagnostik Chatbot AI
            </h2>
            <p style={{ color: 'var(--secondary-foreground)', fontSize: '0.875rem' }}>
              Pusat konfigurasi asisten kecerdasan buatan (Google Gemini) yang terintegrasi langsung dengan database kependudukan, pengajuan surat, pengaduan warga, dan informasi lingkungan RW.
            </p>
          </div>

          {/* Kartu Ringkasan Status Chatbot */}
          <div
            className="card"
            style={{
              background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
              color: 'white',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              boxShadow: '0 10px 25px rgba(30, 58, 138, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                  }}
                >
                  <IconBot size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Asisten Digital RW (Google Gemini)</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.825rem', color: '#bfdbfe' }}>
                    Chatbot AI interaktif untuk pelayanan informasi kependudukan dan administrasi publik
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {renderChatbotStatusBadge()}
                <button
                  type="button"
                  onClick={() => handleToggleChatbot(!config.chatbotEnabled)}
                  disabled={isPending}
                  style={{
                    padding: '0.45rem 0.9rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    backgroundColor: config.chatbotEnabled ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                  }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: config.chatbotEnabled ? '#f87171' : '#4ade80' }} />
                  {config.chatbotEnabled ? 'Nonaktifkan Chatbot' : 'Aktifkan Chatbot'}
                </button>
              </div>
            </div>

            {/* Grid Informasi Diagnostik */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                padding: '1rem',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                fontSize: '0.825rem',
              }}
            >
              <div>
                <span style={{ color: '#93c5fd', display: 'block', fontSize: '0.75rem' }}>Provider & Model AI:</span>
                <strong style={{ fontSize: '0.9rem' }}>{config.aiProvider} ({config.aiModel})</strong>
              </div>
              <div>
                <span style={{ color: '#93c5fd', display: 'block', fontSize: '0.75rem' }}>Status API Key:</span>
                <strong>{config.hasGeminiApiKey ? config.geminiApiKeyMasked : 'Belum Ada (Wajib Disimpan)'}</strong>
              </div>
              <div>
                <span style={{ color: '#93c5fd', display: 'block', fontSize: '0.75rem' }}>Batas Token & Suhu:</span>
                <strong>{config.aiMaxTokens} tokens | Temp: {config.aiTemperature}</strong>
              </div>
              <div>
                <span style={{ color: '#93c5fd', display: 'block', fontSize: '0.75rem' }}>Pengujian Terakhir:</span>
                <strong>
                  {config.aiLastTestedAt
                    ? new Date(config.aiLastTestedAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
                    : 'Belum pernah diuji'}
                </strong>
              </div>
            </div>

            {config.aiLastError && (
              <div
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  color: '#fecaca',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <IconAlertCircle size={16} />
                <span>Kendala terakhir: {config.aiLastError}</span>
              </div>
            )}
          </div>

          {/* Form Konfigurasi Chatbot AI */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>
                1. Pengaturan Dasar Chatbot
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                Kredensial API Google Gemini dan pemilihan model utama yang digunakan oleh sistem.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {/* Status Chatbot */}
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Status Layanan Chatbot *
                </label>
                <select
                  value={chatbotForm.chatbotEnabled ? 'true' : 'false'}
                  onChange={(e) => setChatbotForm({ ...chatbotForm, chatbotEnabled: e.target.value === 'true' })}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem',
                    backgroundColor: 'var(--background)',
                    color: 'var(--foreground)',
                  }}
                >
                  <option value="true">Aktif (Melayani Pengguna Dashboard)</option>
                  <option value="false">Nonaktif (Tampilkan Pesan Penonaktifan)</option>
                </select>
                <span style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                  Jika dinonaktifkan, chatbot akan memberikan respons penonaktifan yang sopan dan konsisten.
                </span>
              </div>

              {/* Provider AI */}
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Provider AI *
                </label>
                <input
                  type="text"
                  readOnly
                  value="Google Gemini (Generative AI)"
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem',
                    backgroundColor: 'rgba(0,0,0,0.03)',
                    color: 'var(--foreground)',
                    cursor: 'not-allowed',
                  }}
                />
                <span style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                  Provider resmi Google Generative AI (@ai-sdk/google).
                </span>
              </div>

              {/* Pilihan Model AI */}
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Model AI Gemini *
                </label>
                <select
                  value={chatbotForm.model}
                  onChange={(e) => setChatbotForm({ ...chatbotForm, model: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem',
                    backgroundColor: 'var(--background)',
                    color: 'var(--foreground)',
                  }}
                >
                  <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite (Direkomendasikan - Ultra Cepat ~0.6 Detik)</option>
                  <option value="gemini-flash-lite-latest">gemini-flash-lite-latest (Super Ringan & Hemat Token)</option>
                  <option value="gemini-flash-latest">gemini-flash-latest (Generasi Terkini)</option>
                  <option value="gemini-3.8-flash">gemini-3.8-flash (Model Flash v3.8)</option>
                </select>
                <span style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                  Pilih model yang didukung oleh Google AI Studio API key Anda.
                </span>
              </div>

              {/* API Key Google Gemini (Utama) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--foreground)' }}>
                    API Key Google Gemini (Utama) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  {config.hasGeminiApiKey ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '9999px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        backgroundColor: '#dcfce7',
                        color: '#15803d',
                        border: '1px solid #bbf7d0',
                      }}
                    >
                      <IconCheckCircle size={11} />
                      Tersimpan
                    </span>
                  ) : (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '9999px',
                        fontSize: '0.7rem',
                        fontWeight: 500,
                        backgroundColor: '#f1f5f9',
                        color: '#64748b',
                        border: '1px solid #cbd5e1',
                      }}
                    >
                      Kosong
                    </span>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={chatbotForm.apiKey}
                    onChange={(e) => setChatbotForm({ ...chatbotForm, apiKey: e.target.value })}
                    placeholder="Contoh: AIzaSy..."
                    style={{
                      width: '100%',
                      padding: '0.55rem 2.5rem 0.55rem 0.75rem',
                      border: '1px solid #93c5fd',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.875rem',
                      backgroundColor: 'var(--background)',
                      color: 'var(--foreground)',
                      fontFamily: showApiKey ? 'inherit' : 'monospace',
                      boxShadow: '0 0 0 1px rgba(59, 130, 246, 0.15)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    style={{
                      position: 'absolute',
                      right: '0.5rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      color: '#64748b',
                      padding: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title={showApiKey ? 'Sembunyikan API key' : 'Tampilkan API key'}
                  >
                    {showApiKey ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                  </button>
                </div>
                {chatbotForm.apiKey.trim().length > 0 && !chatbotForm.apiKey.includes('•') ? (
                  <span style={{ fontSize: '0.725rem', color: '#d97706', fontWeight: 600, marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <IconAlertCircle size={12} />
                    <span>Anda sedang mengubah API Key Utama. Jangan lupa klik Simpan Pengaturan.</span>
                  </span>
                ) : (
                  <span style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                    Dienkripsi di server dengan AES-256-GCM. Tidak akan pernah dikirim plaintext ke browser.
                  </span>
                )}
              </div>

              {/* API Key Cadangan 1 (Opsional) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--foreground)' }}>
                    API Key Cadangan 1 (Opsional)
                  </label>
                  {config.hasApiKeyBackup1 ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '9999px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        backgroundColor: '#dcfce7',
                        color: '#15803d',
                        border: '1px solid #bbf7d0',
                      }}
                    >
                      <IconCheckCircle size={11} />
                      Tersimpan
                    </span>
                  ) : (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '9999px',
                        fontSize: '0.7rem',
                        fontWeight: 500,
                        backgroundColor: '#f1f5f9',
                        color: '#64748b',
                        border: '1px solid #cbd5e1',
                      }}
                    >
                      Kosong
                    </span>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showApiKeyBackup1 ? 'text' : 'password'}
                    value={chatbotForm.apiKeyBackup1}
                    onChange={(e) => setChatbotForm({ ...chatbotForm, apiKeyBackup1: e.target.value })}
                    placeholder="Contoh: AIzaSy..."
                    style={{
                      width: '100%',
                      padding: '0.55rem 2.5rem 0.55rem 0.75rem',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.875rem',
                      backgroundColor: 'var(--background)',
                      color: 'var(--foreground)',
                      fontFamily: showApiKeyBackup1 ? 'inherit' : 'monospace',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKeyBackup1(!showApiKeyBackup1)}
                    style={{
                      position: 'absolute',
                      right: '0.5rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      color: '#64748b',
                      padding: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title={showApiKeyBackup1 ? 'Sembunyikan API key' : 'Tampilkan API key'}
                  >
                    {showApiKeyBackup1 ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                  </button>
                </div>
                {chatbotForm.apiKeyBackup1.trim().length > 0 && !chatbotForm.apiKeyBackup1.includes('•') ? (
                  <span style={{ fontSize: '0.725rem', color: '#d97706', fontWeight: 600, marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <IconAlertCircle size={12} />
                    <span>Anda sedang mengubah API Key Cadangan 1. Jangan lupa klik Simpan Pengaturan.</span>
                  </span>
                ) : (
                  <span style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                    Digunakan otomatis sebagai cadangan jika API Key Utama gagal atau kuota habis (503/429).
                  </span>
                )}
              </div>

              {/* API Key Cadangan 2 (Opsional) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--foreground)' }}>
                    API Key Cadangan 2 (Opsional)
                  </label>
                  {config.hasApiKeyBackup2 ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '9999px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        backgroundColor: '#dcfce7',
                        color: '#15803d',
                        border: '1px solid #bbf7d0',
                      }}
                    >
                      <IconCheckCircle size={11} />
                      Tersimpan
                    </span>
                  ) : (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '9999px',
                        fontSize: '0.7rem',
                        fontWeight: 500,
                        backgroundColor: '#f1f5f9',
                        color: '#64748b',
                        border: '1px solid #cbd5e1',
                      }}
                    >
                      Kosong
                    </span>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showApiKeyBackup2 ? 'text' : 'password'}
                    value={chatbotForm.apiKeyBackup2}
                    onChange={(e) => setChatbotForm({ ...chatbotForm, apiKeyBackup2: e.target.value })}
                    placeholder="Contoh: AIzaSy..."
                    style={{
                      width: '100%',
                      padding: '0.55rem 2.5rem 0.55rem 0.75rem',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.875rem',
                      backgroundColor: 'var(--background)',
                      color: 'var(--foreground)',
                      fontFamily: showApiKeyBackup2 ? 'inherit' : 'monospace',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKeyBackup2(!showApiKeyBackup2)}
                    style={{
                      position: 'absolute',
                      right: '0.5rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      color: '#64748b',
                      padding: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title={showApiKeyBackup2 ? 'Sembunyikan API key' : 'Tampilkan API key'}
                  >
                    {showApiKeyBackup2 ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                  </button>
                </div>
                {chatbotForm.apiKeyBackup2.trim().length > 0 && !chatbotForm.apiKeyBackup2.includes('•') ? (
                  <span style={{ fontSize: '0.725rem', color: '#d97706', fontWeight: 600, marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <IconAlertCircle size={12} />
                    <span>Anda sedang mengubah API Key Cadangan 2. Jangan lupa klik Simpan Pengaturan.</span>
                  </span>
                ) : (
                  <span style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                    Lapisan cadangan kedua jika API Key Utama dan Cadangan 1 keduanya gagal.
                  </span>
                )}
              </div>
            </div>

            {/* Bagian Pengaturan Lanjutan (Collapsible / Terbuka) */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>
                    2. Pengaturan Lanjutan & Perilaku AI
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                    Kustomisasi temperature, batas token, system instruction tambahan, dan template pesan penolakan/fallback.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdvancedAi(!showAdvancedAi)}
                  style={{
                    background: 'none',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: 'var(--foreground)',
                  }}
                >
                  {showAdvancedAi ? '▲ Sembunyikan Detail Lanjutan' : '▼ Buka Pengaturan Lanjutan'}
                </button>
              </div>

              {showAdvancedAi && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', animation: 'fadeIn 0.2s ease' }}>
                  {/* Temperature & Max Tokens */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                        <label style={{ fontSize: '0.825rem', fontWeight: 600 }}>
                          Temperature (Kreativitas Jawaban): <strong>{chatbotForm.temperature}</strong>
                        </label>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Skala 0.0 - 2.0</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.05"
                        value={chatbotForm.temperature}
                        onChange={(e) => setChatbotForm({ ...chatbotForm, temperature: parseFloat(e.target.value) })}
                        style={{ width: '100%', accentColor: '#1e40af', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                        0.0 - 0.3: Sangat faktual & patuh database (Direkomendasikan untuk layanan RW). 0.7+: Lebih kreatif.
                      </span>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                        Batas Maksimum Token (Max Output Tokens) *
                      </label>
                      <input
                        type="number"
                        min="100"
                        max="8192"
                        value={chatbotForm.maxTokens}
                        onChange={(e) => setChatbotForm({ ...chatbotForm, maxTokens: parseInt(e.target.value, 10) || 2000 })}
                        style={{
                          width: '100%',
                          padding: '0.55rem 0.75rem',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.875rem',
                          backgroundColor: 'var(--background)',
                          color: 'var(--foreground)',
                        }}
                      />
                      <span style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                        Rentang valid: 100 s/d 8192 token (Default: 2000). Mengontrol panjang maksimum jawaban.
                      </span>
                    </div>
                  </div>

                  {/* System Instruction */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                      Instruksi Utama / Tambahan Sistem (System Instruction)
                    </label>
                    <textarea
                      rows={3}
                      value={chatbotForm.systemInstruction}
                      onChange={(e) => setChatbotForm({ ...chatbotForm, systemInstruction: e.target.value })}
                      placeholder="Contoh: Utamakan menjawab pertanyaan warga seputar RW dengan ramah, santun, dan sebutkan jam pelayanan kantor RW..."
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.75rem',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.85rem',
                        backgroundColor: 'var(--background)',
                        color: 'var(--foreground)',
                        lineHeight: 1.5,
                      }}
                    />
                    <span style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                      Instruksi tambahan bagi AI. Seluruh aturan keamanan server, isolasi hak akses database, dan proteksi privasi warga tetap ditegakkan secara mutlak.
                    </span>
                  </div>

                  {/* Pesan Fallback & Pesan Out of Scope */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                        Pesan Fallback (Data Tidak Tersedia) *
                      </label>
                      <textarea
                        rows={3}
                        value={chatbotForm.fallbackMessage}
                        onChange={(e) => setChatbotForm({ ...chatbotForm, fallbackMessage: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.6rem 0.75rem',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.85rem',
                          backgroundColor: 'var(--background)',
                          color: 'var(--foreground)',
                          lineHeight: 1.5,
                        }}
                      />
                      <span style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                        Respons standar ketika informasi yang dicari tidak ditemukan di database.
                      </span>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                        Pesan Penolakan Topik di Luar Sistem (Out of Scope) *
                      </label>
                      <textarea
                        rows={3}
                        value={chatbotForm.outOfScopeMessage}
                        onChange={(e) => setChatbotForm({ ...chatbotForm, outOfScopeMessage: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.6rem 0.75rem',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.85rem',
                          backgroundColor: 'var(--background)',
                          color: 'var(--foreground)',
                          lineHeight: 1.5,
                        }}
                      />
                      <span style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                        Respons penolakan ketika warga menanyakan hal di luar cakupan RW (politik, hiburan, coding, dll).
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Tombol Aksi Simpan & Uji */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
              <button
                type="button"
                onClick={handleSaveChatbot}
                disabled={isPending}
                className="btn btn-primary"
                style={{
                  fontSize: '0.85rem',
                  backgroundColor: '#1e40af',
                  borderColor: '#1e3a8a',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.55rem 1.1rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                }}
              >
                <IconSave size={15} />
                <span>Simpan Konfigurasi Chatbot</span>
              </button>

              <button
                type="button"
                onClick={handleTestGeminiConnection}
                disabled={isPending || (!config.hasGeminiApiKey && !chatbotForm.apiKey.trim())}
                className="btn"
                style={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  fontSize: '0.85rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.55rem 1.1rem',
                  borderRadius: '8px',
                  fontWeight: 500,
                }}
              >
                <IconZap size={15} />
                <span>Uji Koneksi AI</span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleChatbot(!config.chatbotEnabled)}
                disabled={isPending}
                className="btn"
                style={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  fontSize: '0.875rem',
                  color: config.chatbotEnabled ? '#dc2626' : '#16a34a',
                }}
              >
                {config.chatbotEnabled ? 'Nonaktifkan Chatbot' : 'Aktifkan Chatbot'}
              </button>
            </div>
          </div>

          {/* Kolom Uji Chatbot Interaktif */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>
                  3. Uji Chatbot Interaktif (Live Testing)
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                  Kirim pertanyaan percobaan untuk melihat langsung jawaban yang dihasilkan provider Google Gemini dengan parameter dan instruksi aktif.
                </p>
              </div>
              <span
                style={{
                  padding: '0.25rem 0.65rem',
                  borderRadius: '9999px',
                  backgroundColor: '#eff6ff',
                  color: '#1e40af',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: '1px solid #bfdbfe',
                }}
              >
                Model Aktif: {chatbotForm.model}
              </span>
            </div>

            {/* Quick Prompt Chips */}
            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.4rem' }}>
                Pilih pertanyaan cepat atau ketik sendiri di bawah:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {[
                  'Apa saja jenis layanan surat administrasi yang dapat diajukan di RW ini?',
                  'Siapa ketua RW dan wakil ketua RW saat ini?',
                  'Berapa jadwal ronda malam dan operasional balai RW?',
                  'Siapa presiden Amerika Serikat saat ini?',
                ].map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setTestQueryPrompt(q)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.75rem',
                      backgroundColor: testQueryPrompt === q ? '#dbeafe' : 'var(--background)',
                      color: testQueryPrompt === q ? '#1e40af' : 'var(--foreground)',
                      border: '1px solid var(--border)',
                      borderRadius: '9999px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {q.length > 45 ? q.slice(0, 45) + '...' : q}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Pertanyaan Uji */}
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Pertanyaan Percobaan *
              </label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <input
                  type="text"
                  value={testQueryPrompt}
                  onChange={(e) => setTestQueryPrompt(e.target.value)}
                  placeholder="Ketik pertanyaan untuk menguji respon AI..."
                  style={{
                    flex: 1,
                    padding: '0.65rem 0.85rem',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.9rem',
                    backgroundColor: 'var(--background)',
                    color: 'var(--foreground)',
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleRunChatbotTestQuery();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleRunChatbotTestQuery}
                  disabled={isTestingQuery || isPending || !testQueryPrompt.trim() || (!config.hasGeminiApiKey && !chatbotForm.apiKey.trim())}
                  className="btn btn-primary"
                  style={{
                    backgroundColor: '#1e3a8a',
                    borderColor: '#1e3a8a',
                    padding: '0.65rem 1.25rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isTestingQuery ? (
                    <>
                      <span
                        style={{
                          width: '14px',
                          height: '14px',
                          border: '2px solid rgba(255,255,255,0.3)',
                          borderTopColor: '#ffffff',
                          borderRadius: '50%',
                          display: 'inline-block',
                          animation: 'spin 0.8s linear infinite',
                        }}
                      />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <span>Kirim Uji Chatbot</span>
                  )}
                </button>
              </div>
            </div>

            {/* Kotak Hasil Uji Chatbot */}
            {testQueryResult && (
              <div
                style={{
                  marginTop: '0.5rem',
                  padding: '1.25rem',
                  borderRadius: '12px',
                  backgroundColor: testQueryResult.error ? '#fef2f2' : '#f8fafc',
                  border: `1px solid ${testQueryResult.error ? '#fca5a5' : '#cbd5e1'}`,
                  animation: 'fadeIn 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: testQueryResult.error ? '#dc2626' : '#1e3a8a' }}>
                      {testQueryResult.error ? <IconAlertCircle size={18} /> : <IconBot size={18} />}
                    </span>
                    <strong style={{ fontSize: '0.875rem', color: testQueryResult.error ? '#991b1b' : '#0f172a' }}>
                      {testQueryResult.error ? 'Hasil Pengujian Gagal' : 'Respons Asli dari Google Gemini'}
                    </strong>
                  </div>
                  {testQueryResult.latencyMs !== undefined && (
                    <span
                      style={{
                        padding: '0.2rem 0.65rem',
                        borderRadius: '6px',
                        backgroundColor: testQueryResult.error ? '#fee2e2' : '#e2e8f0',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: testQueryResult.error ? '#991b1b' : '#475569',
                      }}
                    >
                      {testQueryResult.latencyMs}ms | Model: {testQueryResult.model || chatbotForm.model}
                    </span>
                  )}
                </div>

                {testQueryResult.error ? (
                  <div style={{ color: '#991b1b', fontSize: '0.85rem', lineHeight: 1.5 }}>
                    {testQueryResult.error}
                  </div>
                ) : (
                  <div
                    style={{
                      color: '#1e293b',
                      fontSize: '0.875rem',
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                      backgroundColor: 'white',
                      padding: '1rem',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    {testQueryResult.answer}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PENGATURAN KANAL NOTIFIKASI                                        */}
      {/* ========================================================================= */}
      {activeTab === 'channels' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '860px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: '0.35rem' }}>
              Pengaturan Kanal Notifikasi
            </h2>
            <p style={{ color: 'var(--secondary-foreground)', fontSize: '0.875rem' }}>
              Atur aktivasi kanal pengiriman notifikasi secara global dan berdasarkan tipe modul (Pengumuman, Pengajuan Surat, dan Pengaduan Warga).
            </p>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--primary)' }}>
              Master Switch Kanal Global
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: channelToggles.emailEnabled ? '#eff6ff' : 'var(--background)',
                  border: channelToggles.emailEnabled ? '1px solid #bfdbfe' : '1px solid var(--border)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={channelToggles.emailEnabled}
                  onChange={(e) => setChannelToggles({ ...channelToggles, emailEnabled: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                />
                <div>
                  <strong style={{ fontSize: '0.875rem', display: 'block' }}>Kanal Email</strong>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Pengiriman surat & lampiran PDF</span>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: channelToggles.whatsappEnabled ? '#dcfce7' : 'var(--background)',
                  border: channelToggles.whatsappEnabled ? '1px solid #86efac' : '1px solid var(--border)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={channelToggles.whatsappEnabled}
                  onChange={(e) => setChannelToggles({ ...channelToggles, whatsappEnabled: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#16a34a' }}
                />
                <div>
                  <strong style={{ fontSize: '0.875rem', display: 'block' }}>Kanal WhatsApp</strong>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Pesan instan & update status</span>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: channelToggles.inAppEnabled ? '#f3e8ff' : 'var(--background)',
                  border: channelToggles.inAppEnabled ? '1px solid #d8b4fe' : '1px solid var(--border)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={channelToggles.inAppEnabled}
                  onChange={(e) => setChannelToggles({ ...channelToggles, inAppEnabled: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#9333ea' }}
                />
                <div>
                  <strong style={{ fontSize: '0.875rem', display: 'block' }}>In-App Notification</strong>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Lonceng notifikasi dashboard</span>
                </div>
              </label>
            </div>

            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--foreground)' }}>
              Matriks Kanal Per Modul Layanan
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Row 1: Pengumuman */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  backgroundColor: 'var(--background)',
                  border: '1px solid var(--border)',
                }}
              >
                <div>
                  <strong style={{ fontSize: '0.875rem' }}>Pengumuman Warga</strong>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>
                    Siaran informasi dan kegiatan dari RT / RW
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '1.25rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={channelToggles.notifyPengumumanEmail}
                      onChange={(e) => setChannelToggles({ ...channelToggles, notifyPengumumanEmail: e.target.checked })}
                      style={{ accentColor: 'var(--primary)' }}
                    />
                    Email
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={channelToggles.notifyPengumumanWa}
                      onChange={(e) => setChannelToggles({ ...channelToggles, notifyPengumumanWa: e.target.checked })}
                      style={{ accentColor: '#16a34a' }}
                    />
                    WhatsApp
                  </label>
                </div>
              </div>

              {/* Row 2: Pengajuan Surat */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  backgroundColor: 'var(--background)',
                  border: '1px solid var(--border)',
                }}
              >
                <div>
                  <strong style={{ fontSize: '0.875rem' }}>Pengajuan Surat Administrasi</strong>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>
                    Pemberitahuan perubahan status verifikasi & penerbitan surat resmi
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '1.25rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={channelToggles.notifySuratEmail}
                      onChange={(e) => setChannelToggles({ ...channelToggles, notifySuratEmail: e.target.checked })}
                      style={{ accentColor: 'var(--primary)' }}
                    />
                    Email
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={channelToggles.notifySuratWa}
                      onChange={(e) => setChannelToggles({ ...channelToggles, notifySuratWa: e.target.checked })}
                      style={{ accentColor: '#16a34a' }}
                    />
                    WhatsApp
                  </label>
                </div>
              </div>

              {/* Row 3: Pengaduan Warga */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  backgroundColor: 'var(--background)',
                  border: '1px solid var(--border)',
                }}
              >
                <div>
                  <strong style={{ fontSize: '0.875rem' }}>Pengaduan & Aspirasi Warga</strong>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>
                    Pemberitahuan tindak lanjut pengaduan fasilitas umum & keamanan
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '1.25rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={channelToggles.notifyPengaduanEmail}
                      onChange={(e) => setChannelToggles({ ...channelToggles, notifyPengaduanEmail: e.target.checked })}
                      style={{ accentColor: 'var(--primary)' }}
                    />
                    Email
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={channelToggles.notifyPengaduanWa}
                      onChange={(e) => setChannelToggles({ ...channelToggles, notifyPengaduanWa: e.target.checked })}
                      style={{ accentColor: '#16a34a' }}
                    />
                    WhatsApp
                  </label>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <button
                type="button"
                onClick={handleSaveChannels}
                disabled={isPending}
                className="btn btn-primary"
                style={{ fontSize: '0.875rem' }}
              >
                Simpan Preferensi Kanal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: KONFIGURASI UMUM SISTEM                                            */}
      {/* ========================================================================= */}
      {activeTab === 'general' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '840px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: '0.35rem' }}>
              Konfigurasi Umum Sistem
            </h2>
            <p style={{ color: 'var(--secondary-foreground)', fontSize: '0.875rem' }}>
              Identitas dan informasi wilayah yang digunakan pada kop surat resmi, header template email, dan tampilan antarmuka warga.
            </p>
          </div>

          <div className="card">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Nama Aplikasi / Sistem *
                </label>
                <input
                  type="text"
                  value={generalForm.appName}
                  onChange={(e) => setGeneralForm({ ...generalForm, appName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem',
                    backgroundColor: 'var(--background)',
                    color: 'var(--foreground)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Nomor RW *
                </label>
                <input
                  type="text"
                  value={generalForm.rwNomor}
                  onChange={(e) => setGeneralForm({ ...generalForm, rwNomor: e.target.value })}
                  placeholder="05"
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem',
                    backgroundColor: 'var(--background)',
                    color: 'var(--foreground)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Kelurahan
                </label>
                <input
                  type="text"
                  value={generalForm.kelurahan}
                  onChange={(e) => setGeneralForm({ ...generalForm, kelurahan: e.target.value })}
                  placeholder="Mekarwangi"
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem',
                    backgroundColor: 'var(--background)',
                    color: 'var(--foreground)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Kecamatan
                </label>
                <input
                  type="text"
                  value={generalForm.kecamatan}
                  onChange={(e) => setGeneralForm({ ...generalForm, kecamatan: e.target.value })}
                  placeholder="Bojongloa Kidul"
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem',
                    backgroundColor: 'var(--background)',
                    color: 'var(--foreground)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Kota / Kabupaten
                </label>
                <input
                  type="text"
                  value={generalForm.kota}
                  onChange={(e) => setGeneralForm({ ...generalForm, kota: e.target.value })}
                  placeholder="Kota Bandung"
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem',
                    backgroundColor: 'var(--background)',
                    color: 'var(--foreground)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Kontak Email Resmi RW
                </label>
                <input
                  type="email"
                  value={generalForm.kontakEmail}
                  onChange={(e) => setGeneralForm({ ...generalForm, kontakEmail: e.target.value })}
                  placeholder="pengurus.rw@example.com"
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem',
                    backgroundColor: 'var(--background)',
                    color: 'var(--foreground)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Nomor WhatsApp Hotline RW
                </label>
                <input
                  type="text"
                  value={generalForm.kontakWa}
                  onChange={(e) => setGeneralForm({ ...generalForm, kontakWa: e.target.value })}
                  placeholder="081234567890"
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem',
                    backgroundColor: 'var(--background)',
                    color: 'var(--foreground)',
                  }}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Alamat Sekretariat Balai RW
                </label>
                <input
                  type="text"
                  value={generalForm.alamatSekretariat}
                  onChange={(e) => setGeneralForm({ ...generalForm, alamatSekretariat: e.target.value })}
                  placeholder="Balai Warga RW 05, Jl. Mekar Asri No. 12"
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem',
                    backgroundColor: 'var(--background)',
                    color: 'var(--foreground)',
                  }}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Deskripsi Singkat Sistem
                </label>
                <textarea
                  rows={3}
                  value={generalForm.deskripsiSistem}
                  onChange={(e) => setGeneralForm({ ...generalForm, deskripsiSistem: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem',
                    backgroundColor: 'var(--background)',
                    color: 'var(--foreground)',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <button
                type="button"
                onClick={handleSaveGeneral}
                disabled={isPending}
                className="btn btn-primary"
                style={{ fontSize: '0.875rem' }}
              >
                Simpan Konfigurasi Umum
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: STATUS KONEKSI DAN RIWAYAT PENGUJIAN                                */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: '0.35rem' }}>
                Status Koneksi & Riwayat Diagnostik
              </h2>
              <p style={{ color: 'var(--secondary-foreground)', fontSize: '0.875rem' }}>
                Catatan riwayat verifikasi koneksi API, latensi respons, dan pengiriman pesan uji coba resmi.
              </p>
            </div>
            <button
              type="button"
              onClick={refreshHistory}
              disabled={isPending}
              className="btn"
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                fontSize: '0.825rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                borderRadius: '8px',
              }}
            >
              <IconRefresh size={14} />
              <span>Muat Ulang Riwayat</span>
            </button>
          </div>

          {/* Tabel Log Pengujian */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--background)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Waktu</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Provider / Layanan</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Jenis Uji Coba</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Tujuan</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Latensi</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Keterangan / Diagnostik</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Penguji</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                        Belum ada riwayat pengujian koneksi. Lakukan "Uji Koneksi" pada tab WhatsApp atau Email SMTP.
                      </td>
                    </tr>
                  ) : (
                    history.map((log) => {
                      const dateStr = new Date(log.createdAt).toLocaleString('id-ID', {
                        timeZone: 'Asia/Jakarta',
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      });

                      return (
                        <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', color: '#64748b', fontSize: '0.78rem' }}>
                            {dateStr}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                            {log.provider === 'FONNTE'
                              ? 'Fonnte'
                              : log.provider === 'GATEWAY_SENDIRI'
                              ? 'Gateway Sendiri'
                              : log.provider === 'SMTP_EMAIL'
                              ? 'Email SMTP'
                              : log.provider}
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span
                              style={{
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.725rem',
                                fontWeight: 600,
                                backgroundColor: 'rgba(148, 163, 184, 0.15)',
                              }}
                            >
                              {log.testType === 'CONNECTION_PING'
                                ? 'Handshake'
                                : log.testType === 'TEST_MESSAGE'
                                ? 'Kirim WA Tes'
                                : log.testType === 'TEST_EMAIL'
                                ? 'Kirim Email Tes'
                                : log.testType}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                            {log.target || '-'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            {log.status === 'SUCCESS' ? (
                              <span style={{ color: '#166534', fontWeight: 700, backgroundColor: '#dcfce7', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.725rem' }}>
                                ✓ BERHASIL
                              </span>
                            ) : (
                              <span style={{ color: '#991b1b', fontWeight: 700, backgroundColor: '#fee2e2', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.725rem' }}>
                                ✕ GAGAL
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                            {log.latencyMs ? `${log.latencyMs} ms` : '-'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', maxWidth: '320px', wordBreak: 'break-word', color: log.status === 'FAILED' ? '#b91c1c' : 'inherit' }}>
                            {log.message || '-'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.78rem' }}>
                            {log.triggeredBy || '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIALOG MODAL 1: KONFIRMASI GANTI PROVIDER WHATSAPP AKTIF                  */}
      {/* ========================================================================= */}
      {switchProviderModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(3px)',
            padding: '1rem',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '460px',
              width: '100%',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-lg)',
              animation: 'fadeIn 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center' }}>
                <IconAlertCircle size={26} />
              </span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Konfirmasi Pergantian Provider</h3>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--secondary-foreground)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Apakah Anda yakin ingin menjadikan <strong>{switchProviderModal}</strong> sebagai provider aktif?
              <br /><br />
              Seluruh pengiriman pesan WhatsApp berikutnya (status pengajuan surat warga, notifikasi pengaduan, dan siaran pengumuman) akan segera dialihkan ke provider ini.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setSwitchProviderModal(null)}
                className="btn"
                style={{ backgroundColor: 'var(--secondary)', color: 'var(--secondary-foreground)' }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmSwitchProvider}
                disabled={isPending}
                className="btn btn-primary"
              >
                Ya, Aktifkan Provider
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIALOG MODAL 2: UJI COBA PENGIRIMAN PESAN WHATSAPP                        */}
      {/* ========================================================================= */}
      {testWaModal.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(3px)',
            padding: '1rem',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '480px',
              width: '100%',
              backgroundColor: 'var(--surface)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-lg)',
              animation: 'fadeIn 0.15s ease',
            }}
          >
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              Kirim Pesan WhatsApp Percobaan
            </h3>
            <p style={{ fontSize: '0.825rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Pesan uji coba resmi akan dikirim melalui provider <strong>{testWaModal.provider}</strong> ke nomor telepon yang Anda tentukan di bawah.
            </p>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Nomor WhatsApp Penerima (Format: 08xx / 628xx) *
              </label>
              <input
                type="tel"
                value={testWaModal.target}
                onChange={(e) => setTestWaModal({ ...testWaModal, target: e.target.value })}
                placeholder="Contoh: 081234567890"
                autoFocus
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.9rem',
                  backgroundColor: 'var(--background)',
                  color: 'var(--foreground)',
                }}
              />
              <span style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '0.35rem', display: 'block' }}>
                Pastikan nomor aktif dan terdaftar di WhatsApp. Sistem tidak akan pernah mengirim pesan otomatis tanpa persetujuan Anda.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setTestWaModal({ open: false, provider: 'FONNTE', target: '' })}
                className="btn"
                style={{ backgroundColor: 'var(--secondary)', color: 'var(--secondary-foreground)' }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSendTestWa}
                disabled={isPending || !testWaModal.target.trim()}
                className="btn btn-primary"
              >
                Kirim Pesan Percobaan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIALOG MODAL 3: UJI COBA PENGIRIMAN EMAIL SMTP                            */}
      {/* ========================================================================= */}
      {testEmailModal.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(3px)',
            padding: '1rem',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '480px',
              width: '100%',
              backgroundColor: 'var(--surface)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-lg)',
              animation: 'fadeIn 0.15s ease',
            }}
          >
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              Kirim Email Percobaan SMTP
            </h3>
            <p style={{ fontSize: '0.825rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Email pengujian berformat resmi akan dikirim melalui server SMTP ke alamat email yang Anda masukkan.
            </p>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Alamat Email Penerima *
              </label>
              <input
                type="email"
                value={testEmailModal.target}
                onChange={(e) => setTestEmailModal({ ...testEmailModal, target: e.target.value })}
                placeholder="nama.anda@example.com"
                autoFocus
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.9rem',
                  backgroundColor: 'var(--background)',
                  color: 'var(--foreground)',
                }}
              />
              <span style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '0.35rem', display: 'block' }}>
                Periksa kotak masuk (Inbox) atau folder Spam setelah pengiriman berhasil.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setTestEmailModal({ open: false, target: '' })}
                className="btn"
                style={{ backgroundColor: 'var(--secondary)', color: 'var(--secondary-foreground)' }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={isPending || !testEmailModal.target.trim()}
                className="btn btn-primary"
              >
                Kirim Email Percobaan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
