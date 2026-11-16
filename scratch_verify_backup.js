const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function verifyBackup(backupPath) {
  const absolutePath = path.resolve(backupPath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`Backup file tidak ditemukan di: ${absolutePath}`);
    process.exit(1);
  }

  console.log(`Menghubungkan ke backup: ${absolutePath}`);
  
  // Override database url to the backup file
  const prismaBackup = new PrismaClient({
    datasources: {
      db: {
        url: `file:${absolutePath}`
      }
    }
  });

  try {
    // Gunakan queryRawUnsafe agar tidak terhambat oleh perbedaan skema Prisma (misal: kolom isActive yang belum di-push)
    const rwCount = await prismaBackup.$queryRawUnsafe('SELECT COUNT(*) as count FROM Rw');
    const rtCount = await prismaBackup.$queryRawUnsafe('SELECT COUNT(*) as count FROM Rt');
    const userCount = await prismaBackup.$queryRawUnsafe('SELECT COUNT(*) as count FROM User');
    const wargaCount = await prismaBackup.$queryRawUnsafe('SELECT COUNT(*) as count FROM Warga');
    const requestCount = await prismaBackup.$queryRawUnsafe('SELECT COUNT(*) as count FROM Request');
    const historyCount = await prismaBackup.$queryRawUnsafe('SELECT COUNT(*) as count FROM RequestHistory');
    
    console.log(`Verifikasi sukses. Backup dapat dibaca secara fisik.`);
    console.log(`- Tabel Rw            : ${Number(rwCount[0].count)} baris`);
    console.log(`- Tabel Rt            : ${Number(rtCount[0].count)} baris`);
    console.log(`- Tabel User          : ${Number(userCount[0].count)} baris`);
    console.log(`- Tabel Warga         : ${Number(wargaCount[0].count)} baris`);
    console.log(`- Tabel Request       : ${Number(requestCount[0].count)} baris`);
    console.log(`- Tabel RequestHistory: ${Number(historyCount[0].count)} baris`);
  } catch (err) {
    console.error(`Verifikasi gagal. Backup mungkin korup atau format tidak dikenali:`, err.message);
  } finally {
    await prismaBackup.$disconnect();
  }
}

const target = process.argv[2];
if (!target) {
  console.error('Harap berikan path file backup sebagai argumen.');
  process.exit(1);
}
verifyBackup(target);
