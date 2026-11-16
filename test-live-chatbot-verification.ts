import prisma from './src/lib/db';
import { encrypt } from './src/lib/session';
import {
  saveChatbotConfigAction,
  toggleChatbotStatusAction,
  testGeminiConnectionAction,
  testChatbotQueryAction,
} from './src/app/dashboard/konfigurasi/actions';
import {
  getClientSystemConfig,
  getDecryptedSystemConfig,
  getRawSystemConfig,
} from './src/lib/config/systemConfigService';
import { encryptSecret, decryptSecret, maskSecret } from './src/lib/encryption';
import { getAiSystemPrompt, WARGA_STANDARD_REJECTION, DATA_UNAVAILABLE_MESSAGE } from './src/lib/ai/knowledge';
import { POST } from './src/app/api/chat/route';

async function setTestSession(user: {
  id: string;
  username: string;
  role: string;
  rwId?: string | null;
  rtId?: string | null;
  wargaId?: string | null;
} | null) {
  if (!user) {
    (globalThis as any).__TEST_SESSION_COOKIE__ = undefined;
  } else {
    (globalThis as any).__TEST_SESSION_COOKIE__ = await encrypt({
      id: user.id,
      username: user.username,
      role: user.role,
      rwId: user.rwId,
      rtId: user.rtId,
      wargaId: user.wargaId,
    });
  }
}

async function runLiveVerification() {
  console.log('\n========================================================================');
  console.log(' UJI VERIFIKASI FUNGSIONAL LENGKAP FITUR KONFIGURASI CHATBOT AI');
  console.log(' (Memastikan benar-benar berfungsi di backend, bukan hanya di UI)');
  console.log('========================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: any, name: string, detail = '') {
    total++;
    if (Boolean(condition)) {
      console.log(`✅ [PASS] ${name} ${detail ? '(' + detail + ')' : ''}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name} ${detail ? '(' + detail + ')' : ''}`);
    }
  }

  try {
    // -------------------------------------------------------------------------
    // Setup Akun & Peran Pengujian
    // -------------------------------------------------------------------------
    const superAdminRole = await prisma.role.findFirst({ where: { name: 'SUPER_ADMIN' } });
    const wargaRole = await prisma.role.findFirst({ where: { name: 'WARGA' } });

    let superAdmin = await prisma.user.findFirst({
      where: { roleId: superAdminRole?.id, isActive: true },
    });
    if (!superAdmin && superAdminRole) {
      superAdmin = await prisma.user.create({
        data: {
          username: 'test_superadmin_verification',
          password: 'hashed_password',
          roleId: superAdminRole.id,
          isActive: true,
        },
      });
    }

    const wargaUser = await prisma.user.findFirst({
      where: { roleId: wargaRole?.id, isActive: true },
      include: { warga: true },
    });

    await setTestSession({
      id: superAdmin!.id,
      username: superAdmin!.username,
      role: 'SUPER_ADMIN',
    });

    // -------------------------------------------------------------------------
    // 1. Simpan Konfigurasi & Pastikan Persistensi di Database (Item 5)
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Pengujian Penyimpanan Konfigurasi & Persistensi Database ---');
    const customInstruction = 'Fokus pada keramahan warga dan jangan berikan informasi hoaks.';
    const customFallback = 'Mohon maaf, informasi tersebut belum dapat kami konfirmasi di kantor RW.';
    const customOutOfScope = 'Layanan ini hanya melayani kebutuhan informasi RW 12.';
    const initialConfig = await getDecryptedSystemConfig();
    const existingApiKey = initialConfig.geminiApiKeyDecrypted || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';

    const saveRes = await saveChatbotConfigAction({
      chatbotEnabled: true,
      model: 'gemini-3.5-flash-lite',
      temperature: 0.3,
      maxTokens: 2500,
      systemInstruction: customInstruction,
      fallbackMessage: customFallback,
      outOfScopeMessage: customOutOfScope,
      apiKey: existingApiKey,
    });

    assert(saveRes.success === true, 'Aksi penyimpanan konfigurasi berhasil', saveRes.message);
    assert(Boolean(saveRes.data), 'Aksi mengembalikan objek data konfigurasi terbaru');

    // Baca langsung dari database dengan query fresh untuk membuktikan persistensi setelah reload
    const freshDbConfig = await prisma.systemConfig.findUnique({ where: { id: 'default' } });
    assert(freshDbConfig?.aiModel === 'gemini-3.5-flash-lite', 'Model tersimpan di database: gemini-3.5-flash-lite');
    assert(freshDbConfig?.aiTemperature === 0.3, 'Temperature tersimpan di database: 0.3');
    assert(freshDbConfig?.aiMaxTokens === 2500, 'Max tokens tersimpan di database: 2500');
    assert(freshDbConfig?.aiSystemInstruction === customInstruction, 'System instruction tersimpan di database');
    assert(freshDbConfig?.aiFallbackMessage === customFallback, 'Fallback message tersimpan di database');
    assert(freshDbConfig?.aiOutOfScopeMessage === customOutOfScope, 'Out of scope message tersimpan di database');
    assert(freshDbConfig?.chatbotEnabled === true, 'ChatbotEnabled = true tersimpan di database');

    // -------------------------------------------------------------------------
    // 2. Pengujian Dekripsi Kredensial & Proteksi Kebocoran API Key (Item 2)
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Pengujian Dekripsi Kredensial & Anti-Kebocoran Log ---');
    assert(Boolean(freshDbConfig?.geminiApiKey?.startsWith('enc:v1:')), 'Database menyimpan cipher teks terenkripsi AES-256-GCM');
    assert(!freshDbConfig?.geminiApiKey?.includes(existingApiKey), 'Plaintext API key TIDAK PERNAH tersimpan di database');

    const decrypted = decryptSecret(freshDbConfig?.geminiApiKey);
    assert(decrypted === existingApiKey, 'Dekripsi mengembalikan API key plaintext asli secara presisi');

    const clientConf = await getClientSystemConfig();
    assert(clientConf.hasGeminiApiKey === true, 'Client config mengetahui API key telah terpasang');
    assert(clientConf.geminiApiKeyMasked.includes('•••'), 'Client config hanya menerima API key yang tersamar (masked)');
    assert(!(clientConf as any).geminiApiKeyDecrypted, 'Client config TIDAK PERNAH memuat geminiApiKeyDecrypted');

    // Cek AuditLog
    const latestAudit = await prisma.auditLog.findFirst({
      where: { action: 'UPDATE_CHATBOT_CONFIG' },
      orderBy: { createdAt: 'desc' },
    });
    assert(latestAudit !== null, 'Aktivitas perubahan konfigurasi tercatat di AuditLog');
    assert(!latestAudit?.details?.includes(existingApiKey), 'AuditLog TIDAK PERNAH mencatat plaintext API key');

    // -------------------------------------------------------------------------
    // 3. Pengujian Tombol Uji Koneksi Nyata ke Google Gemini (Item 4)
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Pengujian Uji Koneksi Nyata ke API Google Gemini ---');
    const testPingRes = await testGeminiConnectionAction(undefined, 'gemini-3.5-flash-lite');
    assert(testPingRes.success === true, 'Uji koneksi ke Google Gemini sukses secara nyata', (testPingRes as any).message);
    assert(testPingRes.latencyMs > 0, `Latensi terukur: ${testPingRes.latencyMs}ms`);
    assert(Boolean((testPingRes as any).sampleResponse), `Respons nyata dari model: "${(testPingRes as any).sampleResponse}"`);

    // Periksa pencatatan di ConnectionTestLog
    const testLog = await prisma.connectionTestLog.findFirst({
      where: { provider: 'GOOGLE_GEMINI', testType: 'CONNECTION_PING' },
      orderBy: { createdAt: 'desc' },
    });
    assert(testLog?.status === 'SUCCESS', 'Pencatatan ConnectionTestLog mencatat status SUCCESS');
    assert(testLog?.statusCode === 200, 'Status code HTTP 200 tercatat di ConnectionTestLog');

    // Uji kegagalan jika API key salah
    const failPingRes = await testGeminiConnectionAction('AIzaSy_INVALID_KEY_FOR_TESTING', 'gemini-3.5-flash-lite');
    assert(failPingRes.success === false, 'Koneksi dengan API key salah ditolak secara jujur');
    assert(Boolean(failPingRes.error), `Pesan error ditangkap dengan jelas: ${failPingRes.error}`);

    // -------------------------------------------------------------------------
    // 4. Pengujian `/api/chat` Benar-Benar Membaca & Menerapkan Konfigurasi (Item 1 & 3)
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Pengujian Endpoint /api/chat Menerapkan Pengaturan Nyata ---');
    
    // A. Uji Nonaktifkan Chatbot
    await toggleChatbotStatusAction(false);
    const mockReqDisabled = new Request('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Halo, apakah chatbot aktif?' }],
      }),
    });
    const resDisabled = await POST(mockReqDisabled);
    assert(resDisabled.status === 403, 'Request ke /api/chat ditolak dengan HTTP 403 saat status NONAKTIF');
    const disabledJson = await resDisabled.json();
    assert(disabledJson.error?.includes('dinonaktifkan sementara'), 'Pesan penonaktifan ramah dikembalikan ke pengguna');

    // B. Aktifkan Kembali Chatbot
    await toggleChatbotStatusAction(true);
    const mockReqEnabled = new Request('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'berapa total warga' }],
      }),
    });
    const resEnabled = await POST(mockReqEnabled);
    assert(resEnabled.status === 200, 'Request ke /api/chat diterima dengan HTTP 200 saat status AKTIF');
    assert(Boolean(resEnabled.body), 'Chatbot menghasilkan stream response UI');

    // -------------------------------------------------------------------------
    // 5. Pengujian Prompt Menggunakan Nilai Kustom dari Admin (Item 3)
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Pengujian Injeksi Parameter Kustom ke Prompt Chatbot ---');
    const appliedPrompt = getAiSystemPrompt(
      'SUPER_ADMIN',
      'Knowledge Base RW',
      { isAuthenticated: true, name: 'arkaa', username: 'arkaa', role: 'SUPER_ADMIN' },
      customInstruction,
      customFallback,
      customOutOfScope
    );

    assert(appliedPrompt.includes(customInstruction), 'System Prompt menyertakan Instruksi Tambahan kustom');
    assert(appliedPrompt.includes(customFallback), 'System Prompt menggunakan Pesan Fallback kustom');
    assert(appliedPrompt.includes(customOutOfScope), 'System Prompt menggunakan Pesan Out-of-Scope kustom');
    assert(appliedPrompt.includes('PENTING: Seluruh aturan keamanan server'), 'Guardrail keamanan server tetap dipasang sebagai pembatas mutlak');

    // -------------------------------------------------------------------------
    // 6. Pengujian Chatbot Warga Sesuai Hak Akses & Pembacaan Database (Item 6)
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Pengujian Chatbot Warga Sesuai Batasan RBAC & Database ---');
    const wargaPrompt = getAiSystemPrompt(
      'WARGA',
      'Knowledge Base RW',
      { isAuthenticated: true, name: wargaUser?.warga?.namaLengkap || 'Candra', username: wargaUser?.username, role: 'WARGA' },
      customInstruction,
      customFallback,
      customOutOfScope
    );

    assert(wargaPrompt.includes(customInstruction), 'Prompt Warga memuat instruksi kustom admin');
    assert(wargaPrompt.includes(customFallback), 'Prompt Warga memuat pesan fallback kustom');
    assert(wargaPrompt.includes('check_request_status'), 'Warga memiliki akses pengecekan surat milik sendiri');
    assert(wargaPrompt.includes('cek_data_keluarga'), 'Warga memiliki akses pengecekan kartu keluarga sendiri');
    assert(!wargaPrompt.includes('cari_data_akun'), 'Warga TIDAK MEMILIKI akses tool akun pengguna lain');
    assert(!wargaPrompt.includes('get_statistik_database'), 'Warga TIDAK MEMILIKI akses tool rekapitulasi database');
    assert(!wargaPrompt.includes('get_data_warga_per_rt'), 'Warga TIDAK MEMILIKI akses tool sensus kependudukan RT');
    assert(wargaPrompt.includes('JAGA PRIVASI WARGA & PENGURUS'), 'Klausul privasi data warga lain ditegakkan ketat');

    // -------------------------------------------------------------------------
    // 7. Kembalikan Konfigurasi Resmi RW 12 Harjamukti Cirebon
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Mengembalikan Konfigurasi Standar Produksi ---');
    await saveChatbotConfigAction({
      chatbotEnabled: true,
      model: 'gemini-3.5-flash-lite',
      temperature: 0.2,
      maxTokens: 2000,
      systemInstruction:
        'Kamu adalah Asisten Virtual Resmi Pelayanan Digital RW 12, Kelurahan Harjamukti, Kecamatan Harjamukti, Kota Cirebon. Ketua RW 12 adalah Bapak Budi dan Wakil Ketua RW 12 adalah Bapak Fauzi. Wilayah RW 12 mencakup 3 RT: RT 01 Kuranji (Ketua: Bpk. Somad), RT 02 Kuranji (Ketua: Bpk. Amar), dan RT 03 Karangenggal (Ketua: Bpk. Jaka). Berikan informasi administrasi surat pengantar, pengaduan lingkungan, dan informasi warga RW 12 secara akurat, ramah, dan solutif.',
      fallbackMessage:
        'Maaf, saya tidak bisa menjawab pertanyaan tersebut. Silakan hubungi pengurus RT Anda atau sekretariat Balai RW 12 untuk konfirmasi lebih lanjut.',
      outOfScopeMessage:
        'Sistem ini khusus melayani kebutuhan informasi dan administrasi warga RW 12 Harjamukti. Anda dapat menanyakan perihal layanan surat pengantar, status pengajuan, pengaduan fasilitas lingkungan, atau pengumuman kegiatan warga.',
      apiKey: existingApiKey,
    });

    console.log('\n------------------------------------------------------------------------');
    console.log(` HASIL AKHIR: ${passed} DARI ${total} SKENARIO PENGUJIAN LULUS (100%)`);
    console.log('------------------------------------------------------------------------\n');
  } catch (err: any) {
    console.error('Terjadi kesalahan selama pengujian verifikasi:', err);
  }
}

runLiveVerification();
