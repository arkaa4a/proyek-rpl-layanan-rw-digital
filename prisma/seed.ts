import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding data...');

  // 1. Create Roles
  const roles = ['SUPER_ADMIN', 'ADMIN_RW', 'KETUA_RW', 'KETUA_RT', 'WARGA'];
  const roleMap: Record<string, string> = {};
  
  for (const roleName of roles) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName, description: `Role untuk ${roleName}` },
    });
    roleMap[roleName] = role.id;
  }
  
  console.log('Roles created.');

  // 2. Create RW & RT
  const rw = await prisma.rw.upsert({
    where: { nomor: '01' },
    update: {},
    create: { nomor: '01', namaKetua: 'Bapak Ahmad' },
  });

  const rt01 = await prisma.rt.upsert({
    where: { rwId_nomor: { rwId: rw.id, nomor: '01' } },
    update: {},
    create: { nomor: '01', rwId: rw.id, namaKetua: 'Bapak Budi' },
  });

  console.log('RW & RT created.');

  // 3. Create Keluarga & Warga
  const keluarga = await prisma.keluarga.upsert({
    where: { nomorKk: '3201000000000001' },
    update: {},
    create: { nomorKk: '3201000000000001', alamat: 'Jl. Merdeka No 1, RT 01/RW 01' },
  });

  const warga = await prisma.warga.upsert({
    where: { nik: '3201000000000002' },
    update: {},
    create: {
      nik: '3201000000000002',
      namaLengkap: 'Candra Warga',
      keluargaId: keluarga.id,
      rtId: rt01.id,
    },
  });

  console.log('Keluarga & Warga created.');

  // 4. Create Dummy Users
  const password = await bcrypt.hash('password123', 10);

  const users = [
    {
      username: 'superadmin',
      password,
      roleId: roleMap['SUPER_ADMIN'],
    },
    {
      username: 'adminrw',
      password,
      roleId: roleMap['ADMIN_RW'],
      rwId: rw.id,
    },
    {
      username: 'ketuarw',
      password,
      roleId: roleMap['KETUA_RW'],
      rwId: rw.id,
    },
    {
      username: 'ketuart',
      password,
      roleId: roleMap['KETUA_RT'],
      rtId: rt01.id,
    },
    {
      username: 'warga1',
      password,
      roleId: roleMap['WARGA'],
      wargaId: warga.id,
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: u,
    });
  }

  console.log('Dummy users created:');
  console.log('- superadmin (password123)');
  console.log('- adminrw (password123)');
  console.log('- ketuarw (password123)');
  console.log('- ketuart (password123)');
  console.log('- warga1 (password123)');
  console.log('Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
