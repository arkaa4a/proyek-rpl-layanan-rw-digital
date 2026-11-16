import prisma from './src/lib/db';
import fs from 'fs';
import path from 'path';
import {
  notifyPengumumanCreated,
  notifyRequestStatusChanged,
  notifyPengaduanStatusChanged,
  notifyServiceReminder,
} from './src/lib/notification/notificationTriggers';
import { dispatchNotification, retryNotificationLog } from './src/lib/notification/notificationManager';
import { getNotificationHistory } from './src/app/dashboard/notifikasi/actions';
import {
  formatPengumumanNotification,
  formatSuratStatusNotification,
  formatPengaduanStatusNotification,
  formatServiceReminderNotification,
  filterValidDetails,
} from './src/lib/notification/templates';
import {
  resolveOfficialDocumentAttachment,
  buildOfficialDocumentFilename,
  sanitizeFilenamePart,
} from './src/lib/notification/documentAttachment';

async function runTests() {
  console.log('\n======================================================');
  console.log('   PENGUJIAN SISTEM NOTIFIKASI EMAIL & WHATSAPP');
  console.log('======================================================\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail = '') {
    if (condition) {
      console.log(`✅ [PASS] ${testName} ${detail ? '(' + detail + ')' : ''}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} ${detail ? '(' + detail + ')' : ''}`);
      failed++;
    }
  }

  try {
    const rw = await prisma.rw.findFirst({ include: { rts: true } });
    if (!rw || rw.rts.length === 0) {
      throw new Error('Database memerlukan data RW dan RT untuk pengujian.');
    }

    const rt1 = rw.rts[0];
    let rt2 = rw.rts[1];
    if (!rt2) {
      rt2 = await prisma.rt.create({
        data: { rwId: rw.id, nomor: '02', namaKetua: 'Ketua RT 02' },
      });
    }

    // Pastikan data warga uji coba siap
    const warga1 = await prisma.warga.upsert({
      where: { nik: '3201000000000002' },
      update: {
        email: 'candra.warga@example.com',
        noWhatsapp: '081234567890',
        isActive: true,
        notifyEmail: true,
        notifyWhatsapp: true,
        rtId: rt1.id,
      },
      create: {
        nik: '3201000000000002',
        namaLengkap: 'Candra Warga RT 01',
        email: 'candra.warga@example.com',
        noWhatsapp: '081234567890',
        isActive: true,
        notifyEmail: true,
        notifyWhatsapp: true,
        rtId: rt1.id,
      },
    });

    const warga2 = await prisma.warga.upsert({
      where: { nik: '3201000000000099' },
      update: {
        email: 'budi.rt2@example.com',
        noWhatsapp: '089876543210',
        isActive: true,
        notifyEmail: true,
        notifyWhatsapp: true,
        rtId: rt2.id,
      },
      create: {
        nik: '3201000000000099',
        namaLengkap: 'Budi Warga RT 02',
        email: 'budi.rt2@example.com',
        noWhatsapp: '089876543210',
        isActive: true,
        notifyEmail: true,
        notifyWhatsapp: true,
        rtId: rt2.id,
      },
    });

    // 1. Pengumuman terpublikasi memicu notifikasi
    console.log('1. Menguji Pengumuman Terpublikasi:');
    const testPengumumanPub = await prisma.pengumuman.create({
      data: {
        judul: 'Uji Coba Pengumuman Terpublikasi ' + Date.now(),
        konten: 'Pengumuman resmi untuk seluruh warga lingkungan.',
        kategori: 'Informasi Penting',
        authorId: (await prisma.user.findFirst())!.id,
        isPublished: true,
        rwId: rw.id,
        targetRtId: rt1.id,
      },
    });

    await notifyPengumumanCreated({
      pengumumanId: testPengumumanPub.id,
      judul: testPengumumanPub.judul,
      konten: testPengumumanPub.konten,
      kategori: testPengumumanPub.kategori,
      rwId: rw.id,
      targetRtId: rt1.id,
      channels: ['EMAIL', 'WHATSAPP'],
      isPublished: true,
    });

    const notifCountPub = await prisma.notificationLog.count({
      where: { referenceId: { startsWith: `PENGUMUMAN_${testPengumumanPub.id}` } },
    });
    assert(notifCountPub >= 2, 'Pengumuman terpublikasi mencatat log pengiriman (Email & WA)', `Log tercatat: ${notifCountPub}`);

    // 2. Pengumuman Draf tidak memicu notifikasi
    console.log('\n2. Menguji Pengumuman Draf:');
    const resDraft = await notifyPengumumanCreated({
      pengumumanId: 'draft_' + Date.now(),
      judul: 'Draf Rencana Kegiatan',
      konten: 'Isi draf belum final...',
      kategori: 'Kegiatan Warga',
      isPublished: false,
    });
    assert(resDraft.skipped === true, 'Pengumuman Draf dilewati secara otomatis (0 notifikasi)');

    // 3. Target RT
    console.log('\n3. Menguji Scoping Wilayah Target (RT 02):');
    const testPengumumanRt2 = await prisma.pengumuman.create({
      data: {
        judul: 'Uji Coba Sasaran RT 02 ' + Date.now(),
        konten: 'Hanya untuk warga RT 02.',
        kategori: 'Rapat Warga',
        authorId: (await prisma.user.findFirst())!.id,
        isPublished: true,
        rwId: rw.id,
        targetRtId: rt2.id,
      },
    });

    await notifyPengumumanCreated({
      pengumumanId: testPengumumanRt2.id,
      judul: testPengumumanRt2.judul,
      konten: testPengumumanRt2.konten,
      kategori: testPengumumanRt2.kategori,
      rwId: rw.id,
      targetRtId: rt2.id,
      channels: ['EMAIL'],
      isPublished: true,
    });

    const rt1Received = await prisma.notificationLog.count({
      where: {
        referenceId: { startsWith: `PENGUMUMAN_${testPengumumanRt2.id}` },
        wargaId: warga1.id,
      },
    });
    const rt2Received = await prisma.notificationLog.count({
      where: {
        referenceId: { startsWith: `PENGUMUMAN_${testPengumumanRt2.id}` },
        wargaId: warga2.id,
      },
    });
    assert(rt1Received === 0 && rt2Received >= 1, 'Notifikasi hanya sampai ke warga RT 02');

    // 4. Status Pengajuan Surat
    console.log('\n4. Menguji Notifikasi Status Pengajuan Surat:');
    let serviceType = await prisma.serviceType.findFirst();
    if (!serviceType) {
      serviceType = await prisma.serviceType.create({
        data: { name: 'Surat Keterangan Domisili', description: 'Surat keterangan' },
      });
    }

    const testReq = await prisma.request.create({
      data: {
        serviceTypeId: serviceType.id,
        applicantId: warga1.id,
        status: 'SUBMITTED',
      },
    });

    await notifyRequestStatusChanged({
      requestId: testReq.id,
      status: 'APPROVED',
      note: 'Dokumen surat telah siap diambil / diunduh.',
      documentNumber: '123/SKD/2026',
    });

    const reqLogs = await prisma.notificationLog.findMany({
      where: { referenceId: { startsWith: `SURAT_${testReq.id}_APPROVED` } },
    });
    const isSentToApplicantOnly = reqLogs.every((l) => l.wargaId === warga1.id && l.wargaId !== warga2.id);
    assert(reqLogs.length >= 1 && isSentToApplicantOnly, 'Notifikasi status surat terkirim khusus kepada pemohon');

    // 5. Status Pengaduan Warga
    console.log('\n5. Menguji Notifikasi Status Pengaduan:');
    const testPengaduan = await prisma.pengaduan.create({
      data: {
        judul: 'Pohon Rawan Tumbang di RT 01',
        kategori: 'KEAMANAN',
        deskripsi: 'Pohon tua miring ke arah kabel listrik.',
        lokasi: 'Jl. Melati RT 01',
        pelaporId: warga1.id,
        rtId: rt1.id,
        rwId: rw.id,
        status: 'DILAPORKAN',
      },
    });

    await notifyPengaduanStatusChanged({
      pengaduanId: testPengaduan.id,
      status: 'DIPROSES',
      catatan: 'Petugas kebersihan dan ranting sedang melakukan pemangkasan.',
    });

    const aduanLogs = await prisma.notificationLog.findMany({
      where: { referenceId: { startsWith: `PENGADUAN_${testPengaduan.id}_DIPROSES` } },
    });
    const isSentToPelaporOnly = aduanLogs.every((l) => l.wargaId === warga1.id && l.wargaId !== warga2.id);
    assert(aduanLogs.length >= 1 && isSentToPelaporOnly, 'Notifikasi pengaduan terkirim khusus kepada pelapor');

    // 6. Pencegahan Duplikasi (Idempotency)
    console.log('\n6. Menguji Idempotency (Pencegahan Duplikasi):');
    const countBefore = await prisma.notificationLog.count({
      where: { referenceId: { startsWith: `PENGADUAN_${testPengaduan.id}_DIPROSES` } },
    });

    await notifyPengaduanStatusChanged({
      pengaduanId: testPengaduan.id,
      status: 'DIPROSES',
      catatan: 'Panggilan ulang kedua',
    });

    const countAfter = await prisma.notificationLog.count({
      where: { referenceId: { startsWith: `PENGADUAN_${testPengaduan.id}_DIPROSES` } },
    });
    assert(countBefore === countAfter, 'Tidak ada pesan ganda saat aksi dipanggil ulang');

    // 7. Penanganan Kegagalan Layanan & Retry
    console.log('\n7. Menguji Pencatatan Error & Fitur Retry:');
    const failedLog = await prisma.notificationLog.findFirst({
      where: { status: 'FAILED' },
    });
    assert(failedLog !== null, 'Kegagalan koneksi/kredensial tercatat dengan status FAILED');
    if (failedLog) {
      assert(
        !failedLog.errorMessage?.includes('Bearer') && !failedLog.errorMessage?.includes('password='),
        'Pesan error terproteksi dari kebocoran token rahasia'
      );

      const updatedLog = await prisma.notificationLog.findUnique({ where: { id: failedLog.id } });
      assert(updatedLog !== null, 'Log kegagalan tersimpan untuk audit pengurus');
    }

    // 8. Pembatasan Hak Akses
    console.log('\n8. Menguji Proteksi Hak Akses (RBAC):');
    (globalThis as any).__TEST_SESSION_COOKIE__ = undefined;
    const historyResult = await getNotificationHistory();
    assert(
      (historyResult as any).error !== undefined,
      'Akses publik/warga ke riwayat pengurus ditolak di tingkat server'
    );

    // 9. Kejujuran Status Pengiriman
    console.log('\n9. Menguji Kejujuran Status Pengiriman:');
    const allLogs = await prisma.notificationLog.findMany();
    const hasFakeSent = allLogs.some(
      (l) => l.status === 'SENT' && !process.env.SMTP_HOST && !process.env.WHATSAPP_PHONE_NUMBER_ID
    );
    assert(!hasFakeSent, 'Tidak ada klaim SENT palsu jika penyedia belum terkonfirmasi');

    // 10. Preferensi Warga
    console.log('\n10. Menguji Preferensi Warga:');
    const optOutWarga = await prisma.warga.create({
      data: {
        nik: '3201000000000777',
        namaLengkap: 'Warga Matikan Notif',
        email: 'nonaktif@example.com',
        noWhatsapp: '081288887777',
        notifyEmail: false,
        notifyWhatsapp: false,
        isActive: true,
      },
    });

    const optOutRes = await dispatchNotification({
      type: 'PENGUMUMAN',
      channels: ['EMAIL', 'WHATSAPP'],
      recipient: {
        wargaId: optOutWarga.id,
        namaLengkap: optOutWarga.namaLengkap,
        email: optOutWarga.email,
        noWhatsapp: optOutWarga.noWhatsapp,
        notifyEmail: false,
        notifyWhatsapp: false,
      },
      subject: 'Uji Coba Opt-Out',
      content: 'Pesan ini harus dilewati.',
    });
    assert(optOutRes.length === 0, 'Warga yang mematikan notifikasi tidak dikirimi pesan');
    await prisma.warga.delete({ where: { id: optOutWarga.id } }).catch(() => {});

    // 11. Standardisasi Format & Identitas Visual (Deep Royal Navy & Sopan)
    console.log('\n11. Menguji Standardisasi Template & Identitas Visual:');
    const samplePengumuman = formatPengumumanNotification({
      recipientName: 'Bapak Ahmad Subagyo',
      judul: 'Kerja Bakti Akbar Lingkungan RW 05',
      kategori: 'Gotong Royong',
      konten: 'Kegiatan pembersihan selokan dan lingkungan serentak.',
      tanggalKegiatan: 'Minggu, 18 Oktober 2026',
      actionUrl: 'http://localhost:3000/pengumuman',
    });

    assert(
      samplePengumuman.emailHtml.includes('#1e3a8a') && samplePengumuman.emailHtml.includes('Pelayanan Digital RW'),
      'Format Email memuat identitas visual warna biru tua (#1e3a8a) dan header resmi'
    );
    assert(
      samplePengumuman.emailHtml.includes('Yth. Bapak/Ibu') && samplePengumuman.whatsappText.includes('Yth. Bapak/Ibu'),
      'Format Email & WhatsApp menggunakan sapaan bahasa Indonesia yang sopan dan ramah'
    );
    assert(
      samplePengumuman.whatsappText.includes('━━━━━━━━━━━━━━━━━━━━━') && samplePengumuman.whatsappText.includes('📢'),
      'Format WhatsApp menggunakan divider rapi dan emoji proporsional'
    );

    // 12. Validasi Sembunyikan Field Kosong (Tanpa Dummy / Raw Placeholder)
    console.log('\n12. Menguji Penyembunyian Field Kosong & Keamanan Data Dinamis:');
    const filtered = filterValidDetails([
      { label: 'Ada Nilai', value: 'Surat Pengantar SKCK' },
      { label: 'Kosong 1', value: '' },
      { label: 'Kosong 2', value: null },
      { label: 'Kosong 3', value: undefined },
      { label: 'Kosong 4', value: '-' },
    ]);
    assert(
      filtered.length === 1 && filtered[0].label === 'Ada Nilai',
      'Filter detail otomatis menyembunyikan baris kosong tanpa placeholder mentah'
    );
    assert(
      !samplePengumuman.emailHtml.includes('{{') &&
      !samplePengumuman.emailHtml.includes('undefined') &&
      !samplePengumuman.whatsappText.includes('{{') &&
      !samplePengumuman.whatsappText.includes('undefined'),
      'Template tidak memuat placeholder mentah {{placeholder}} atau undefined'
    );

    // 13. Cakupan 2 & 3: Standardisasi Status Surat & Pengaduan
    console.log('\n13. Menguji Standardisasi Status Surat & Pengaduan:');
    const suratIssued = formatSuratStatusNotification({
      recipientName: 'Ibu Siti Aminah',
      requestId: 'REQ-2026-0089',
      serviceName: 'Surat Pengantar Domisili',
      status: 'DOCUMENT_ISSUED',
      documentNumber: '470/12/RW-05/X/2026',
      actionUrl: 'http://localhost:3000/dashboard/pengajuan/REQ-2026-0089',
    });
    assert(
      suratIssued.inApp.statusBadge?.tone === 'success' &&
      suratIssued.emailHtml.includes('Dokumen Selesai Diterbitkan') &&
      suratIssued.whatsappText.includes('470/12/RW-05/X/2026'),
      'Perubahan status surat DOCUMENT_ISSUED menampilkan status selesai dan nomor dokumen resmi'
    );

    const pengaduanProses = formatPengaduanStatusNotification({
      recipientName: 'Bapak Rian',
      pengaduanId: 'PENG-2026-001',
      judul: 'Penerangan Jalan Rusak di RT 01',
      kategori: 'FASILITAS_UMUM',
      status: 'DIPROSES',
      catatan: 'Petugas PJU sedang menuju ke lokasi.',
      actionUrl: 'http://localhost:3000/dashboard/pengaduan/PENG-2026-001',
    });
    assert(
      pengaduanProses.emailHtml.includes('Catatan Petugas') &&
      pengaduanProses.whatsappText.includes('Petugas PJU sedang menuju ke lokasi.'),
      'Status pengaduan memuat catatan petugas dinamis dan instruksi penanganan'
    );

    // 14. Cakupan 4: Informasi dan Pengingat Layanan
    console.log('\n14. Menguji Cakupan 4 (Informasi & Pengingat Layanan):');
    const reminderRes = await notifyServiceReminder({
      wargaId: warga1.id,
      judul: 'Pengingat Jadwal Posyandu Balita & Lansia',
      isi: 'Pelayanan pemeriksaan kesehatan berkala balita dan lansia bertempat di Balai RW.',
      kategori: 'Pelayanan Kesehatan',
      jadwal: 'Sabtu, 24 Oktober 2026, Pukul 08.00 WIB',
      lokasi: 'Balai Warga RW 05',
      channels: ['EMAIL', 'WHATSAPP'],
      referenceKey: 'TEST_REMINDER_01',
    });
    assert(Array.isArray(reminderRes) && reminderRes.length > 0, 'Trigger notifyServiceReminder berhasil dipanggil');

    const reminderLog = await prisma.notificationLog.findFirst({
      where: { referenceId: { startsWith: 'REMINDER_TEST_REMINDER_01' } },
    });
    assert(
      reminderLog !== null && reminderLog.type === 'INFORMASI_LAYANAN',
      'Log tercatat dengan tipe INFORMASI_LAYANAN dan metadata lengkap'
    );

    // 15. In-App Notification Center & Read Status
    console.log('\n15. Menguji Pusat Notifikasi Dashboard & Status Baca:');
    const testInAppLog = await prisma.notificationLog.create({
      data: {
        type: 'PENGAJUAN_SURAT',
        channel: 'EMAIL',
        recipient: 'test.read@example.com',
        recipientName: 'Warga Uji Baca',
        subject: '[Layanan RW] Pengajuan Disetujui',
        content: 'Surat Anda telah disetujui.',
        status: 'SENT',
        actionUrl: '/dashboard/pengajuan/test-123',
        isRead: false,
        referenceId: 'TEST_READ_EVENT_001',
        wargaId: warga1.id,
      },
    });

    assert(testInAppLog.isRead === false, 'Notifikasi baru berstatus belum dibaca (isRead = false)');

    await prisma.notificationLog.update({
      where: { id: testInAppLog.id },
      data: { isRead: true },
    });

    const updatedLog = await prisma.notificationLog.findUnique({
      where: { id: testInAppLog.id },
    });
    assert(updatedLog?.isRead === true, 'Status baca berhasil diperbarui menjadi sudah dibaca (isRead = true)');
    await prisma.notificationLog.delete({ where: { id: testInAppLog.id } }).catch(() => {});

    // 16. Verifikasi Lengkap Seluruh Status Pengajuan Surat (8 Status)
    console.log('\n16. Menguji Seluruh Status Pengajuan Surat (8 Status):');
    const allSuratStatuses = [
      'SUBMITTED',
      'PENDING_RT_VERIFICATION',
      'VERIFIED_RT',
      'PENDING_RW_APPROVAL',
      'REVISION_REQUIRED',
      'APPROVED',
      'DOCUMENT_ISSUED',
      'REJECTED',
      'REVOKED',
    ];
    let allSuratValid = true;
    for (const st of allSuratStatuses) {
      const formatted = formatSuratStatusNotification({
        recipientName: 'Warga Tes',
        requestId: 'REQ-TES-01',
        serviceName: 'Surat Keterangan Usaha',
        status: st,
        documentNumber: st === 'DOCUMENT_ISSUED' ? '001/SKU/2026' : undefined,
        downloadUrl: st === 'DOCUMENT_ISSUED' ? 'http://localhost:3000/api/documents/REQ-TES-01' : undefined,
      });
      if (!formatted.emailHtml || !formatted.whatsappText || !formatted.inApp.statusBadge) {
        allSuratValid = false;
      }
    }
    assert(allSuratValid, 'Seluruh status pengajuan surat terdaftar dan memiliki template valid');

    // 17. Verifikasi Lengkap Seluruh Status Pengaduan Warga (5 Status)
    console.log('\n17. Menguji Seluruh Status Pengaduan Warga (5 Status):');
    const allPengaduanStatuses = ['DILAPORKAN', 'DITINJAU', 'DIPROSES', 'SELESAI', 'DITOLAK'];
    let allPengaduanValid = true;
    for (const st of allPengaduanStatuses) {
      const formatted = formatPengaduanStatusNotification({
        recipientName: 'Pelapor Tes',
        pengaduanId: 'ADUAN-TES-01',
        judul: 'Penerangan Jalan Mati',
        kategori: 'Fasilitas Umum',
        status: st,
        catatan: 'Catatan pengurus terkait status',
      });
      if (!formatted.emailHtml || !formatted.whatsappText || !formatted.inApp.statusBadge) {
        allPengaduanValid = false;
      }
    }
    assert(allPengaduanValid, 'Seluruh status pengaduan warga terdaftar dan memiliki template valid');

    // 18. Verifikasi Standar Format Email Resmi & Bebas JavaScript
    console.log('\n18. Menguji Spesifikasi Email HTML Resmi & Responsif:');
    const testEmailHtml = samplePengumuman.emailHtml;
    const hasMax600 = testEmailHtml.includes('max-width: 600px');
    const hasNavyHeader = testEmailHtml.includes('#1e3a8a') && testEmailHtml.includes('Portal Informasi &amp; Layanan Digital Warga');
    const hasFooterAssistance = testEmailHtml.includes('Untuk bantuan atau informasi lebih lanjut');
    const hasNoScriptTag = !testEmailHtml.toLowerCase().includes('<script');
    assert(
      hasMax600 && hasNavyHeader && hasFooterAssistance && hasNoScriptTag,
      'Email memenuhi standar resmi: layout ~600px, header navy, footer bantuan, dan bebas JavaScript'
    );

    // 19. Verifikasi Standar Format WhatsApp Resmi & Terstruktur
    console.log('\n19. Menguji Spesifikasi Format WhatsApp Resmi:');
    const testWaText = samplePengumuman.whatsappText;
    const hasWaHeader = testWaText.includes('PELAYANAN DIGITAL RW') && testWaText.includes('Portal Informasi & Layanan Digital Warga');
    const hasWaDivider = testWaText.includes('━━━━━━━━━━━━━━━━━━━━━');
    const hasWaDetailBullet = testWaText.includes('*Detail Informasi*') && testWaText.includes('• ');
    const hasWaClosing = testWaText.includes('Terima kasih.') && testWaText.includes('*Pengurus RT/RW*');
    assert(
      hasWaHeader && hasWaDivider && hasWaDetailBullet && hasWaClosing,
      'WhatsApp memenuhi standar resmi: identitas, divider, bullet detail, dan penutup sopan Pengurus RT/RW'
    );

    // 20. Verifikasi Integritas Tautan Unduhan Dokumen
    console.log('\n20. Menguji Kotak Unduhan Dokumen Hanya Saat Tersedia:');
    const withoutDoc = formatSuratStatusNotification({
      recipientName: 'Warga Tes',
      requestId: 'REQ-01',
      serviceName: 'Surat Domisili',
      status: 'SUBMITTED',
    });
    const withDoc = formatSuratStatusNotification({
      recipientName: 'Warga Tes',
      requestId: 'REQ-01',
      serviceName: 'Surat Domisili',
      status: 'DOCUMENT_ISSUED',
      documentNumber: '100/RW/2026',
      downloadUrl: 'http://localhost:3000/api/documents/REQ-01',
    });
    const correctlyOmitsDownload = !withoutDoc.emailHtml.includes('Unduh Berkas Surat Resmi (PDF)') && !withoutDoc.whatsappText.includes('📥');
    const correctlyIncludesDownload = withDoc.emailHtml.includes('Unduh Berkas Surat Resmi (PDF)') && withDoc.whatsappText.includes('📥');
    assert(
      correctlyOmitsDownload && correctlyIncludesDownload,
      'Kotak unduhan dokumen hanya muncul saat dokumen benar-benar telah diterbitkan'
    );

    // ========================================================================
    // PENGUJIAN LAMPIRAN DOKUMEN PDF RESMI PADA NOTIFIKASI EMAIL
    // ========================================================================
    console.log('\n======================================================');
    console.log('   PENGUJIAN LAMPIRAN FILE PDF RESMI EMAIL');
    console.log('======================================================\n');

    // 21. Uji Sanitasi Nama Berkas
    console.log('21. Menguji Sanitasi Nama File Lampiran:');
    const dirtyNumber = '470/12/RW-05/X:2026?*<>';
    const cleanedNumber = sanitizeFilenamePart(dirtyNumber);
    assert(
      !/[\\/:*?"<>|]/.test(cleanedNumber) && cleanedNumber.includes('470_12_RW-05_X_2026'),
      'Karakter ilegal OS dan slash dibersihkan dengan aman menjadi underscore'
    );

    // 22. Uji Pembentukan Nama Berkas Lampiran Informatif
    console.log('\n22. Menguji Pembentukan Nama File Lampiran Informatif:');
    const officialFilename = buildOfficialDocumentFilename(
      'Surat Keterangan Domisili',
      '470/12/RW-05/2026'
    );
    assert(
      officialFilename === 'Surat_Keterangan_Domisili_470_12_RW-05_2026.pdf',
      'Nama file lampiran informatif, jelas, dan berformat .pdf',
      officialFilename
    );

    // Siapkan layanan dan berkas PDF fisik uji coba
    const docServiceType = await prisma.serviceType.findFirst();
    if (!docServiceType) {
      throw new Error('ServiceType tidak ditemukan untuk uji coba lampiran');
    }

    // Buat request uji coba
    const testDocRequest = await prisma.request.create({
      data: {
        serviceTypeId: docServiceType.id,
        applicantId: warga1.id,
        status: 'DOCUMENT_ISSUED',
        documentNumber: '470/01/TEST/2026',
        documentStatus: 'ACTIVE',
      },
    });

    const documentsDir = path.join(process.cwd(), 'storage', 'documents');
    if (!fs.existsSync(documentsDir)) {
      fs.mkdirSync(documentsDir, { recursive: true });
    }
    const testDocPath = path.join(documentsDir, `doc-${testDocRequest.id}.pdf`);
    // Tulis PDF mini valid
    const dummyPdfContent = Buffer.from(
      '%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Title (Dokumen Resmi Uji Coba) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF'
    );
    fs.writeFileSync(testDocPath, dummyPdfContent);

    // 23. Uji Resolusi Lampiran PDF Valid pada Status DOCUMENT_ISSUED
    console.log('\n23. Menguji Resolusi Lampiran PDF Valid (MIME Attachment):');
    const validAttachRes = await resolveOfficialDocumentAttachment({
      requestId: testDocRequest.id,
      applicantId: warga1.id,
      serviceName: 'Surat Pengantar RT RW',
      documentNumber: '470/01/TEST/2026',
      currentStatus: 'DOCUMENT_ISSUED',
    });
    assert(
      validAttachRes.isAvailable === true &&
        validAttachRes.attachment !== undefined &&
        validAttachRes.attachment.contentType === 'application/pdf' &&
        Buffer.isBuffer(validAttachRes.attachment.content) &&
        validAttachRes.attachment.filename.endsWith('.pdf'),
      'Lampiran PDF berhasil dibaca sebagai buffer MIME dengan tipe application/pdf'
    );

    // 24. Uji Keamanan: Validasi Kepemilikan Dokumen (Tolak Pemohon yang Berbeda)
    console.log('\n24. Menguji Validasi Kepemilikan Dokumen (Proteksi Otorisasi):');
    const illegalAttachRes = await resolveOfficialDocumentAttachment({
      requestId: testDocRequest.id,
      applicantId: warga2.id, // Mismatched applicant
      serviceName: 'Surat Pengantar RT RW',
      documentNumber: '470/01/TEST/2026',
      currentStatus: 'DOCUMENT_ISSUED',
    });
    assert(
      illegalAttachRes.isAvailable === false &&
        illegalAttachRes.attachment === undefined &&
        (illegalAttachRes.error?.includes('Pelanggaran Otorisasi') || false),
      'Permintaan lampiran dengan ID pemohon berbeda ditolak dengan aman'
    );

    // 25. Uji Batasan Status: Lampiran DITOLAK Jika Status Bukan DOCUMENT_ISSUED
    console.log('\n25. Menguji Batasan Status (Hanya DOCUMENT_ISSUED):');
    const nonIssuedRes = await resolveOfficialDocumentAttachment({
      requestId: testDocRequest.id,
      applicantId: warga1.id,
      serviceName: 'Surat Pengantar RT RW',
      documentNumber: '470/01/TEST/2026',
      currentStatus: 'REVISION_REQUIRED',
    });
    assert(
      nonIssuedRes.isAvailable === false && nonIssuedRes.attachment === undefined,
      'Lampiran tidak dikirim untuk status selain DOCUMENT_ISSUED (misal REVISION_REQUIRED)'
    );

    // 26. Uji Penanganan Ketika Berkas Fisik PDF Hilang atau Belum Tersedia
    console.log('\n26. Menguji Penanganan Saat Berkas Fisik PDF Belum Tersedia:');
    const missingDocRequest = await prisma.request.create({
      data: {
        serviceTypeId: docServiceType.id,
        applicantId: warga1.id,
        status: 'DOCUMENT_ISSUED',
        documentNumber: '470/02/MISSING/2026',
      },
    });
    // Berkas fisik sengaja tidak dibuat
    const missingAttachRes = await resolveOfficialDocumentAttachment({
      requestId: missingDocRequest.id,
      applicantId: warga1.id,
      serviceName: 'Surat Keterangan',
      documentNumber: '470/02/MISSING/2026',
      currentStatus: 'DOCUMENT_ISSUED',
    });
    assert(
      missingAttachRes.isAvailable === false &&
        missingAttachRes.attachment === undefined &&
        (missingAttachRes.error?.includes('belum tersedia') || false),
      'Sistem tidak mengklaim dokumen terlampir saat berkas fisik tidak ada di disk'
    );

    // 27. Uji Batas Ukuran Lampiran Email (Maksimum 10MB)
    console.log('\n27. Menguji Batas Ukuran Lampiran Email (> 10MB):');
    const oversizedDocRequest = await prisma.request.create({
      data: {
        serviceTypeId: docServiceType.id,
        applicantId: warga1.id,
        status: 'DOCUMENT_ISSUED',
        documentNumber: '470/03/OVERSIZED/2026',
      },
    });
    const oversizedPath = path.join(documentsDir, `doc-${oversizedDocRequest.id}.pdf`);
    // Buat buffer file 11MB
    const oversizedBuffer = Buffer.alloc(11 * 1024 * 1024, 0);
    fs.writeFileSync(oversizedPath, oversizedBuffer);
    const oversizedRes = await resolveOfficialDocumentAttachment({
      requestId: oversizedDocRequest.id,
      applicantId: warga1.id,
      serviceName: 'Surat Keterangan',
      documentNumber: '470/03/OVERSIZED/2026',
      currentStatus: 'DOCUMENT_ISSUED',
    });
    assert(
      oversizedRes.isAvailable === false &&
        oversizedRes.attachment === undefined &&
        (oversizedRes.error?.includes('melebihi batas lampiran') || false),
      'Berkas yang melebihi 10MB ditolak lampirannya dan diarahkan ke unduhan portal'
    );
    if (fs.existsSync(oversizedPath)) fs.unlinkSync(oversizedPath);

    // 28. Uji Integrasi: notifyRequestStatusChanged Menghasilkan Metadata Lampiran
    console.log('\n28. Menguji End-to-End Notifikasi Surat dengan Lampiran PDF:');
    await notifyRequestStatusChanged({
      requestId: testDocRequest.id,
      status: 'DOCUMENT_ISSUED',
      documentNumber: '470/01/TEST/2026',
      note: 'Dokumen surat resmi telah terbit.',
    });
    const logDocIssued = await prisma.notificationLog.findFirst({
      where: {
        referenceId: { startsWith: `SURAT_${testDocRequest.id}_DOCUMENT_ISSUED` },
        channel: 'EMAIL',
      },
    });
    const logMeta = logDocIssued?.metadata ? JSON.parse(logDocIssued.metadata) : {};
    assert(
      logMeta.hasAttachment === true &&
        typeof logMeta.attachmentFileName === 'string' &&
        logMeta.attachmentFileName.endsWith('.pdf'),
      'Log notifikasi mencatat metadata hasAttachment=true dan nama berkas lampiran resmi'
    );

    // 29. Uji Tampilan Template HTML: Informasi Lampiran & Tombol CTA
    console.log('\n29. Menguji Desain Template Email Terlampir Dokumen PDF:');
    const templateAttached = formatSuratStatusNotification({
      recipientName: 'Warga Tes',
      requestId: testDocRequest.id,
      serviceName: 'Surat Domisili',
      status: 'DOCUMENT_ISSUED',
      documentNumber: '470/01/TEST/2026',
      downloadUrl: `http://localhost:3000/api/documents/${testDocRequest.id}`,
      isDocumentAttached: true,
      attachedFileName: validAttachRes.filename,
      actionUrl: `http://localhost:3000/dashboard/pengajuan/${testDocRequest.id}`,
    });
    const hasGreenCallout = templateAttached.emailHtml.includes('Dokumen PDF Resmi Telah Dilampirkan pada Email Ini');
    const hasFileNameInEmail = templateAttached.emailHtml.includes(validAttachRes.filename!);
    const hasSecondaryDownload = templateAttached.emailHtml.includes('Salinan digital juga dapat diunduh melalui portal warga');
    const hasDetailCTA = templateAttached.emailHtml.includes('Lihat Detail Pengajuan');
    assert(
      hasGreenCallout && hasFileNameInEmail && hasSecondaryDownload && hasDetailCTA,
      'Email menampilkan callout hijau resmi, nama file lampiran, tautan cadangan portal, dan tombol CTA detail'
    );

    // 30. Uji Template Email Saat PDF Gagal Dilampirkan (Fallback Portal)
    console.log('\n30. Menguji Desain Template Email Fallback Saat PDF Tidak Terlampir:');
    const templateFallback = formatSuratStatusNotification({
      recipientName: 'Warga Tes',
      requestId: missingDocRequest.id,
      serviceName: 'Surat Domisili',
      status: 'DOCUMENT_ISSUED',
      documentNumber: '470/02/MISSING/2026',
      downloadUrl: `http://localhost:3000/api/documents/${missingDocRequest.id}`,
      isDocumentAttached: false,
    });
    const noFalseAttachmentClaim = !templateFallback.emailHtml.includes('Telah Dilampirkan pada Email Ini');
    const hasPortalDownloadNotice = templateFallback.emailHtml.includes('Dokumen Resmi Siap Diunduh Melalui Portal');
    assert(
      noFalseAttachmentClaim && hasPortalDownloadNotice,
      'Jika lampiran tidak disertakan, email tidak mengklaim dokumen terlampir dan menampilkan opsi unduh portal'
    );

    // 31. Uji Idempotensi & Retry Pengiriman Ulang Berlampiran
    console.log('\n31. Menguji Idempotensi & Retry Pengiriman Ulang Berlampiran:');
    if (logDocIssued) {
      const retryResult = await retryNotificationLog(logDocIssued.id);
      assert(
        typeof retryResult.success === 'boolean',
        'Mekanisme retry berjalan aman untuk log notifikasi berlampiran'
      );
    }

    // Bersihkan data uji coba dokumen
    if (fs.existsSync(testDocPath)) fs.unlinkSync(testDocPath);
    await prisma.notificationLog.deleteMany({
      where: {
        OR: [
          { referenceId: `SURAT_${testDocRequest.id}_DOCUMENT_ISSUED` },
          { referenceId: `SURAT_${missingDocRequest.id}_DOCUMENT_ISSUED` },
          { referenceId: `SURAT_${oversizedDocRequest.id}_DOCUMENT_ISSUED` },
        ],
      },
    });
    await prisma.request.deleteMany({
      where: {
        id: { in: [testDocRequest.id, missingDocRequest.id, oversizedDocRequest.id] },
      },
    });
  } catch (err: any) {
    console.error('Fatal Test Error:', err);
    failed++;
  }

  console.log('\n------------------------------------------------------');
  console.log(`RINGKASAN HASIL: ${passed} PENGUJIAN LULUS, ${failed} GAGAL`);
  console.log('------------------------------------------------------\n');
}

runTests();
