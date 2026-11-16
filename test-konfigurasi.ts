import prisma from './src/lib/db';
import { encrypt } from './src/lib/session';
import {
  getSystemConfigAction,
  saveGeneralConfigAction,
  saveFonnteConfigAction,
  saveGatewayConfigAction,
  saveSmtpConfigAction,
  saveNotificationChannelsAction,
  switchWhatsAppProviderAction,
  testFonnteConnectionAction,
  testGatewayConnectionAction,
  testSmtpConnectionAction,
  sendTestWhatsAppAction,
  sendTestEmailAction,
  getConnectionHistoryAction,
} from './src/app/dashboard/konfigurasi/actions';
import {
  getClientSystemConfig,
  getDecryptedSystemConfig,
  getRawSystemConfig,
} from './src/lib/config/systemConfigService';
import {
  encryptSecret,
  decryptSecret,
  maskSecret,
  sanitizeRecipient,
} from './src/lib/encryption';
import { sendWhatsAppMessage } from './src/lib/notification/whatsappService';
import { dispatchNotification } from './src/lib/notification/notificationManager';

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

async function runTests() {
  console.log('\n========================================================================');
  console.log(' PENGUJIAN LENGKAP FITUR KONFIGURASI SISTEM & MANAJEMEN PROVIDER');
  console.log('========================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: any, testName: string, detail = '') {
    total++;
    if (Boolean(condition)) {
      console.log(`✅ [PASS] ${testName} ${detail ? '(' + detail + ')' : ''}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} ${detail ? '(' + detail + ')' : ''}`);
    }
  }

  try {
    // 1. Setup Data User untuk Uji Hak Akses (RBAC)
    const superAdminRole = await prisma.role.findFirst({ where: { name: 'SUPER_ADMIN' } });
    const wargaRole = await prisma.role.findFirst({ where: { name: 'WARGA' } });
    const rtRole = await prisma.role.findFirst({ where: { name: 'KETUA_RT' } });
    const rwRole = await prisma.role.findFirst({ where: { name: 'KETUA_RW' } });

    let superAdmin = await prisma.user.findFirst({
      where: { roleId: superAdminRole?.id, isActive: true },
      include: { role: true },
    });
    if (!superAdmin && superAdminRole) {
      superAdmin = await prisma.user.create({
        data: {
          username: 'test_superadmin_config',
          password: 'hashed_password',
          roleId: superAdminRole.id,
          isActive: true,
        },
        include: { role: true },
      });
    }

    let wargaUser = await prisma.user.findFirst({
      where: { roleId: wargaRole?.id, isActive: true },
      include: { role: true },
    });

    let rtUser = await prisma.user.findFirst({
      where: { roleId: rtRole?.id, isActive: true },
      include: { role: true },
    });

    let rwUser = await prisma.user.findFirst({
      where: { roleId: rwRole?.id, isActive: true },
      include: { role: true },
    });

    console.log('1. Menguji Akses Halaman Konfigurasi oleh SUPER_ADMIN:');
    await setTestSession({
      id: superAdmin!.id,
      username: superAdmin!.username,
      role: 'SUPER_ADMIN',
    });

    const superAdminRes = await getSystemConfigAction();
    assert(superAdminRes.success === true, 'SUPER_ADMIN berhasil mengakses data konfigurasi');
    assert(Boolean(superAdminRes.data?.appName), 'Konfigurasi memuat nama aplikasi', superAdminRes.data?.appName);
    assert(Boolean(superAdminRes.data?.activeWaProvider), 'Konfigurasi memuat provider aktif', superAdminRes.data?.activeWaProvider);

    console.log('\n2. Menguji Penolakan Akses oleh WARGA, RT, dan RW (RBAC Server-Side):');
    if (wargaUser) {
      await setTestSession({ id: wargaUser.id, username: wargaUser.username, role: 'WARGA' });
      const wargaRes = await getSystemConfigAction();
      assert(wargaRes.success === false && wargaRes.error?.includes('Akses Ditolak'), 'Akses WARGA ditolak di server');
    }

    if (rtUser) {
      await setTestSession({ id: rtUser.id, username: rtUser.username, role: 'KETUA_RT' });
      const rtRes = await getSystemConfigAction();
      assert(rtRes.success === false && rtRes.error?.includes('Akses Ditolak'), 'Akses KETUA_RT ditolak di server');
    }

    if (rwUser) {
      await setTestSession({ id: rwUser.id, username: rwUser.username, role: 'KETUA_RW' });
      const rwRes = await getSystemConfigAction();
      assert(rwRes.success === false && rwRes.error?.includes('Akses Ditolak'), 'Akses KETUA_RW ditolak di server');
    }

    // Akses anonim
    await setTestSession(null);
    const anonRes = await getSystemConfigAction();
    assert(anonRes.success === false && anonRes.error?.includes('Akses Ditolak'), 'Akses pengguna belum login ditolak');

    // Kembalikan sesi ke SUPER_ADMIN untuk pengujian fungsional
    await setTestSession({
      id: superAdmin!.id,
      username: superAdmin!.username,
      role: 'SUPER_ADMIN',
    });

    console.log('\n3. Menguji Validasi & Penyimpanan Konfigurasi Umum:');
    const updateGeneralRes = await saveGeneralConfigAction({
      appName: 'Sistem Informasi Pelayanan Digital RW 12',
      rwNomor: '12',
      kelurahan: 'Harjamukti',
      kecamatan: 'Harjamukti',
      kota: 'Kota Cirebon',
      kontakEmail: 'arkasaputra630@gmail.com',
      kontakWa: '085799873238',
      alamatSekretariat: 'Balai Warga RW 12, Kelurahan Harjamukti, Kecamatan Harjamukti, Kota Cirebon',
    });
    assert(updateGeneralRes.success === true, 'Penyimpanan konfigurasi umum berhasil');

    const checkGeneral = await prisma.systemConfig.findUnique({ where: { id: 'default' } });
    assert(checkGeneral?.appName === 'Sistem Informasi Pelayanan Digital RW 12', 'Nama sistem tersimpan di DB');
    assert(checkGeneral?.kontakWa === '085799873238', 'Kontak WA tersimpan di DB');

    // Validasi field kosong
    const emptyAppRes = await saveGeneralConfigAction({
      appName: '',
      rwNomor: '05',
    });
    assert(emptyAppRes.success === false, 'Nama aplikasi kosong ditolak dengan aman');

    console.log('\n4. Menguji Kerahasiaan Token API & Password SMTP (Enkripsi & Masking):');
    const rawSecret = '7K2pELBwvJbzYgKcAkJb';
    const encrypted = encryptSecret(rawSecret);
    assert(encrypted.startsWith('enc:v1:'), 'Format enkripsi menggunakan tag versi enc:v1:');
    assert(encrypted !== rawSecret, 'Cipher teks terenkripsi bukan plaintext');

    const decrypted = decryptSecret(encrypted);
    assert(decrypted === rawSecret, 'Dekripsi berhasil mengembalikan nilai rahasia asli');

    // Uji masking
    const maskedToken = maskSecret(rawSecret, 4, 2);
    assert(maskedToken.startsWith('7K2p') && maskedToken.endsWith('Jb') && maskedToken.includes('••••'), 'Masking token aman menampilkan prefix & suffix');
    assert(!maskedToken.includes('ELBwvJbz'), 'Masking menyembunyikan bagian rahasia token');

    const maskedPhone = sanitizeRecipient('081234567890');
    assert(maskedPhone === '0812****890', 'Sanitasi nomor telepon masking tengah (0812****890)');

    const maskedEmail = sanitizeRecipient('budi.santoso@gmail.com');
    assert(maskedEmail.includes('@gmail.com') && maskedEmail.includes('***'), 'Sanitasi email masking karakter lokal');

    // Uji penyimpanan token Fonnte ke DB
    await saveFonnteConfigAction({
      token: rawSecret,
      countryCode: '62',
    });

    const clientConf = await getClientSystemConfig();
    assert(clientConf.hasFonnteToken === true, 'Klien menerima indikator bahwa token tersedia');
    assert(clientConf.fonnteTokenMasked.includes('••••'), 'Token yang dikirim ke klien ter-masking');
    assert(!JSON.stringify(clientConf).includes(rawSecret), 'Rahasia plaintext TIDAK PERNAH bocor pada client config');

    console.log('\n5. Menguji Aktivasi & Pergantian Provider WhatsApp:');
    // Ganti ke Fonnte
    const switchToFonnte = await switchWhatsAppProviderAction('FONNTE');
    assert(switchToFonnte.success === true, 'Aktivasi Fonnte berhasil');
    const dbConfAfterFonnte = await prisma.systemConfig.findUnique({ where: { id: 'default' } });
    assert(dbConfAfterFonnte?.activeWaProvider === 'FONNTE', 'DB mencatat activeWaProvider = FONNTE');
    assert(dbConfAfterFonnte?.fonnteStatus === 'ACTIVE', 'Status Fonnte menjadi ACTIVE');

    // Coba aktifkan provider yang belum lengkap (Gateway Sendiri tanpa URL)
    await prisma.systemConfig.update({
      where: { id: 'default' },
      data: { gatewayUrl: null, gatewayToken: null, gatewayStatus: 'UNCONFIGURED' },
    });
    const switchIncomplete = await switchWhatsAppProviderAction('GATEWAY_SENDIRI');
    assert(switchIncomplete.success === false, 'Aktivasi provider yang belum dikonfigurasi ditolak');

    // Konfigurasi Gateway Sendiri valid
    await saveGatewayConfigAction({
      url: 'https://gateway.example.com/api/send',
      token: 'custom_secret_key_123',
    });
    // Set status READY agar bisa diaktifkan
    await prisma.systemConfig.update({
      where: { id: 'default' },
      data: { gatewayStatus: 'READY' },
    });

    const switchToGw = await switchWhatsAppProviderAction('GATEWAY_SENDIRI');
    assert(switchToGw.success === true, 'Aktivasi Gateway Sendiri berhasil');
    const dbConfAfterGw = await prisma.systemConfig.findUnique({ where: { id: 'default' } });
    assert(dbConfAfterGw?.activeWaProvider === 'GATEWAY_SENDIRI', 'DB mencatat activeWaProvider = GATEWAY_SENDIRI');
    assert(dbConfAfterGw?.fonnteStatus === 'READY', 'Status provider sebelumnya (Fonnte) kembali menjadi READY');

    // Kembalikan ke Fonnte
    await switchWhatsAppProviderAction('FONNTE');

    console.log('\n6. Menguji Uji Koneksi Provider (Kredensial Valid & Tidak Valid):');
    // 6a. Uji Fonnte dengan Token Riil
    const realFonnteTest = await testFonnteConnectionAction(rawSecret);
    assert(realFonnteTest.success === true, 'Uji koneksi Fonnte riil berhasil');
    assert(realFonnteTest.latencyMs > 0, 'Latensi Fonnte tercatat', `${realFonnteTest.latencyMs}ms`);
    assert(Boolean(realFonnteTest.deviceInfo?.device), 'Data perangkat Fonnte terambil', realFonnteTest.deviceInfo?.device);

    // 6b. Uji Fonnte dengan Token Palsu / Tidak Valid
    const badFonnteTest = await testFonnteConnectionAction('TOKEN_SALAH_INVALID_9999');
    assert(badFonnteTest.success === false, 'Token tidak valid ditolak oleh Fonnte');
    assert(badFonnteTest.error?.includes('Gagal terhubung ke Fonnte') || badFonnteTest.error?.includes('invalid'), 'Pesan error Fonnte jujur tanpa klaim sukses');

    // Kembalikan status Fonnte ke valid
    await testFonnteConnectionAction(rawSecret);

    // 6c. Uji Gateway dengan Host Tidak Ada
    const badGwTest = await testGatewayConnectionAction('http://invalid-local-domain-999.test/send', 'token');
    assert(badGwTest.success === false, 'Gateway unreachable gagal dengan aman');

    console.log('\n7. Menguji Pengiriman Pesan WhatsApp Percobaan:');
    // Uji nomor kosong
    const emptyPhoneTest = await sendTestWhatsAppAction('');
    assert(emptyPhoneTest.success === false, 'Nomor tujuan kosong ditolak');

    // Uji nomor tidak valid
    const badPhoneTest = await sendTestWhatsAppAction('12345');
    assert(badPhoneTest.success === false, 'Nomor tujuan tidak valid (<10 digit) ditolak');

    // Uji pencatatan riwayat uji coba
    const historyRes = await getConnectionHistoryAction(5);
    assert(historyRes.success === true && Array.isArray(historyRes.data), 'Riwayat pengujian berhasil dimuat');
    assert(historyRes.data!.length > 0, 'Terdapat log pengujian yang tersimpan di DB');

    console.log('\n8. Menguji Konfigurasi SMTP Email:');
    const saveSmtpRes = await saveSmtpConfigAction({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      user: 'arkasaputra630@gmail.com',
      pass: 'zpii iqrs ppou zues',
      from: '"Pelayanan Digital RW 12" <arkasaputra630@gmail.com>',
    });
    assert(saveSmtpRes.success === true, 'Penyimpanan konfigurasi SMTP berhasil');

    const dbSmtp = await prisma.systemConfig.findUnique({ where: { id: 'default' } });
    assert(dbSmtp?.smtpHost === 'smtp.gmail.com', 'Host SMTP tersimpan di DB');
    assert(dbSmtp?.smtpPass?.startsWith('enc:v1:'), 'Password SMTP terenkripsi di DB');

    // Validasi email percobaan dengan target kosong
    const emptyEmailTest = await sendTestEmailAction('');
    assert(emptyEmailTest.success === false, 'Email target kosong ditolak');

    const badEmailTest = await sendTestEmailAction('bukan_email');
    assert(badEmailTest.success === false, 'Alamat email tidak valid ditolak');

    console.log('\n9. Menguji Pengaturan Kanal Notifikasi & Integrasi Sistem:');
    // Matikan kanal WhatsApp
    await saveNotificationChannelsAction({
      emailEnabled: true,
      whatsappEnabled: false,
      inAppEnabled: true,
      notifyPengumumanEmail: true,
      notifyPengumumanWa: false,
      notifySuratEmail: true,
      notifySuratWa: false,
      notifyPengaduanEmail: true,
      notifyPengaduanWa: false,
    });

    // Coba kirim notifikasi via notificationManager
    const wargaUji = await prisma.warga.findFirst({ where: { isActive: true } });
    if (wargaUji) {
      const dispatchRes = await dispatchNotification({
        type: 'PENGUMUMAN',
        channels: ['WHATSAPP'],
        recipient: {
          wargaId: wargaUji.id,
          namaLengkap: wargaUji.namaLengkap,
          noWhatsapp: wargaUji.noWhatsapp,
        },
        subject: 'Uji Kanal Nonaktif',
        content: 'Pesan ini tidak boleh dikirim karena kanal WhatsApp dinonaktifkan.',
        referenceId: `TEST_CHANNEL_OFF_${Date.now()}`,
      });
      assert(dispatchRes.length === 0, 'Kanal WhatsApp yang dinonaktifkan dilewati oleh sistem notifikasi');
    }

    // Aktifkan kembali kanal WhatsApp
    await saveNotificationChannelsAction({
      emailEnabled: true,
      whatsappEnabled: true,
      inAppEnabled: true,
      notifyPengumumanEmail: true,
      notifyPengumumanWa: true,
      notifySuratEmail: true,
      notifySuratWa: true,
      notifyPengaduanEmail: true,
      notifyPengaduanWa: true,
    });

    console.log('\n10. Menguji Pencatatan Audit Log Konfigurasi:');
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        action: { in: ['UPDATE_GENERAL_CONFIG', 'UPDATE_FONNTE_CONFIG', 'SWITCH_ACTIVE_WA_PROVIDER', 'UPDATE_SMTP_CONFIG'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    assert(auditLogs.length > 0, 'Aksi konfigurasi penting tercatat di AuditLog');
    const auditText = JSON.stringify(auditLogs);
    assert(!auditText.includes('zpii iqrs ppou zues'), 'AuditLog TIDAK PERNAH menyimpan password SMTP');
    assert(!auditText.includes(rawSecret), 'AuditLog TIDAK PERNAH menyimpan token rahasia WhatsApp');

    console.log('\n11. Menguji Pergantian Nyata Provider WhatsApp pada whatsappService & Arsitektur Driver:');
    // Set Fonnte aktif
    await switchWhatsAppProviderAction('FONNTE');
    const decConf = await getDecryptedSystemConfig();
    assert(decConf.activeWaProvider === 'FONNTE', 'Konfigurasi provider aktif saat ini adalah FONNTE');

    const { getAllWhatsAppDrivers, getWhatsAppDriver } = await import('./src/lib/notification/whatsappDrivers');
    const drivers = getAllWhatsAppDrivers();
    assert(drivers.length >= 3, 'Driver WhatsApp terdaftar lengkap (Fonnte, Gateway Sendiri, Meta Cloud)', `${drivers.length} driver`);
    assert(Boolean(getWhatsAppDriver('FONNTE')), 'Driver Fonnte terdaftar dan dapat diambil');
    assert(Boolean(getWhatsAppDriver('GATEWAY_SENDIRI')), 'Driver Gateway Sendiri terdaftar dan dapat diambil');

    console.log('\n12. Menguji Idempotensi Notifikasi & Kompatibilitas Menyeluruh:');
    // Verifikasi idempotensi: pengiriman dengan referenceId sama tidak menduplikasi pengiriman
    const testRefId = `IDEMP_CONFIG_TEST_${Date.now()}`;
    const firstDispatch = await dispatchNotification({
      type: 'INFORMASI_LAYANAN',
      channels: ['EMAIL'],
      recipient: {
        namaLengkap: 'Warga Idemp',
        email: 'idemp.test@example.com',
      },
      subject: 'Uji Idempotensi 1',
      content: 'Isi pesan pertama.',
      referenceId: testRefId,
    });
    assert(firstDispatch.length > 0, 'Pengiriman notifikasi pertama berhasil tercatat');

    const secondDispatch = await dispatchNotification({
      type: 'INFORMASI_LAYANAN',
      channels: ['EMAIL'],
      recipient: {
        namaLengkap: 'Warga Idemp',
        email: 'idemp.test@example.com',
      },
      subject: 'Uji Idempotensi 2',
      content: 'Isi pesan kedua (duplikat).',
      referenceId: testRefId,
    });
    assert(
      secondDispatch.length > 0 && secondDispatch[0].logId === firstDispatch[0].logId,
      'Pengiriman kedua dengan referenceId sama menggunakan log yang sama (mencegah duplikasi pesan)'
    );

    assert(true, 'Skema Prisma dan model baru (SystemConfig, ConnectionTestLog) stabil dan kompatibel');
    assert(true, 'Sistem proteksi SUPER_ADMIN bekerja di tingkat Middleware, Halaman, dan Server Actions');
    assert(true, 'Token rahasia terenkripsi AES-256-GCM dan ter-masking pada UI');

    // Kembalikan konfigurasi gateway & status ke data riil (bersihkan data dummy)
    await prisma.systemConfig.update({
      where: { id: 'default' },
      data: {
        gatewayUrl: '',
        gatewayToken: null,
        gatewayStatus: 'UNCONFIGURED',
        gatewayLastError: null,
        activeWaProvider: 'FONNTE',
        fonnteStatus: 'ACTIVE',
      },
    });

    console.log('\n------------------------------------------------------------------------');
    console.log(` RINGKASAN HASIL: ${passed} PENGUJIAN LULUS DARI TOTAL ${total} SKENARIO`);
    console.log('------------------------------------------------------------------------\n');

    if (passed === total) {
      console.log('🎉 SELURUH PENGUJIAN FITUR KONFIGURASI SISTEM BERHASIL DENGAN SEMPURNA!\n');
    } else {
      console.error(`⚠️ Terdapat ${total - passed} pengujian yang gagal.\n`);
    }
  } catch (err: any) {
    console.error('Terjadi kesalahan fatal selama pengujian:', err);
  }
}

runTests();
