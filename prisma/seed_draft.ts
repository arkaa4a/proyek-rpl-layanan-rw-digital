import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Memulai seeder transisi wilayah dan akun baru...');

  // 1. Validasi Environment Variables sebelum melakukan operasi apapun
  const passwordSecret = process.env.SEEDER_ADMIN_PASSWORD;
  if (!passwordSecret) {
    throw new Error('SEEDER_ADMIN_PASSWORD belum disetel di environment. Hentikan eksekusi untuk keamanan.');
  }

  const u_fauzi = process.env.USER_FAUZI || 'fauzi_admin';
  const u_budi = process.env.USER_BUDI || 'budi_rw';
  const u_somad = process.env.USER_SOMAD || 'somad_rt1';
  const u_amar = process.env.USER_AMAR || 'amar_rt2';
  const u_jaka = process.env.USER_JAKA || 'jaka_rt3';

  const usernamesToCreate = [u_fauzi, u_budi, u_somad, u_amar, u_jaka];

  // 2. Pre-flight check: Pastikan Role tersedia
  const adminRwRole = await prisma.role.findUnique({ where: { name: 'ADMIN_RW' } });
  const ketuaRwRole = await prisma.role.findUnique({ where: { name: 'KETUA_RW' } });
  const ketuaRtRole = await prisma.role.findUnique({ where: { name: 'KETUA_RT' } });

  if (!adminRwRole || !ketuaRwRole || !ketuaRtRole) {
    throw new Error('Role belum lengkap di database (ADMIN_RW, KETUA_RW, KETUA_RT).');
  }

  // 3. Pre-flight check: Konflik Username
  // Kita pastikan tidak ada username yang bentrok secara diam-diam.
  const existingUsers = await prisma.user.findMany({
    where: { username: { in: usernamesToCreate } },
    include: { role: true }
  });

  if (existingUsers.length > 0) {
    console.warn('Peringatan: Ditemukan username yang sudah ada di database.');
    for (const user of existingUsers) {
      // Jika Anda tidak ingin mengambil alih, pastikan kita berhenti jika bukan karena kita menjalankan ulang seeder ini dengan konfigurasi yang tepat.
      throw new Error(`Konflik username terdeteksi untuk: ${user.username}. Harap hapus, nonaktifkan, atau gunakan username lain untuk menghindari pengambilalihan akun yang tidak disengaja.`);
    }
  }

  const hashedPassword = bcrypt.hashSync(passwordSecret, 10);

  // 4. Mulai Transaksi
  await prisma.$transaction(async (tx) => {
    // A. Data Wilayah (RW 01 & RT 01-03)
    const rw01 = await tx.rw.upsert({
      where: { nomor: '01' },
      update: {
        namaKetua: 'Bapak Budi',
        kelurahan: 'Harjamukti',
        kecamatan: 'Harjamukti',
      },
      create: {
        nomor: '01',
        namaKetua: 'Bapak Budi',
        kelurahan: 'Harjamukti',
        kecamatan: 'Harjamukti',
      },
    });

    const rt01 = await tx.rt.upsert({
      where: { rwId_nomor: { rwId: rw01.id, nomor: '01' } },
      update: {
        namaKetua: 'Bapak Somad',
        namaWilayah: 'Kuranji',
      },
      create: {
        rwId: rw01.id,
        nomor: '01',
        namaKetua: 'Bapak Somad',
        namaWilayah: 'Kuranji',
      },
    });

    const rt02 = await tx.rt.upsert({
      where: { rwId_nomor: { rwId: rw01.id, nomor: '02' } },
      update: {
        namaKetua: 'Bapak Amar',
        namaWilayah: 'Kuranji',
      },
      create: {
        rwId: rw01.id,
        nomor: '02',
        namaKetua: 'Bapak Amar',
        namaWilayah: 'Kuranji',
      },
    });

    const rt03 = await tx.rt.upsert({
      where: { rwId_nomor: { rwId: rw01.id, nomor: '03' } },
      update: {
        namaKetua: 'Bapak Jaka',
        namaWilayah: 'Karangenggal',
      },
      create: {
        rwId: rw01.id,
        nomor: '03',
        namaKetua: 'Bapak Jaka',
        namaWilayah: 'Karangenggal',
      },
    });

    // B. Kredensial Akun (Akun baru saja, tidak menyentuh akun lama)
    await tx.user.create({
      data: { username: u_fauzi, password: hashedPassword, roleId: adminRwRole.id, rwId: rw01.id, isActive: true }
    });

    await tx.user.create({
      data: { username: u_budi, password: hashedPassword, roleId: ketuaRwRole.id, rwId: rw01.id, isActive: true }
    });

    await tx.user.create({
      data: { username: u_somad, password: hashedPassword, roleId: ketuaRtRole.id, rtId: rt01.id, isActive: true }
    });

    await tx.user.create({
      data: { username: u_amar, password: hashedPassword, roleId: ketuaRtRole.id, rtId: rt02.id, isActive: true }
    });

    await tx.user.create({
      data: { username: u_jaka, password: hashedPassword, roleId: ketuaRtRole.id, rtId: rt03.id, isActive: true }
    });
  });

  console.log('Seeder wilayah dan akun baru selesai dengan aman.');
}

main()
  .catch((e) => {
    console.error('Terjadi kesalahan seeder:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
