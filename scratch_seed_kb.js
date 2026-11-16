const { PrismaClient } = require('@prisma/client');

async function seed() {
  const prisma = new PrismaClient();
  
  try {
    const rw = await prisma.rw.findFirst({ where: { nomor: '12' } }) || await prisma.rw.findFirst();
    if (!rw) {
      console.error('ERROR: RW tidak ditemukan!');
      process.exit(1);
    }
    
    console.log('RW yang digunakan:', rw.id, 'nomor:', rw.nomor);
    
    const countBefore = await prisma.lingkunganInfo.count();
    console.log('Jumlah LingkunganInfo sebelum:', countBefore);
    
    const dataToSeed = [
      {
        kategori: 'Wilayah',
        judul: 'Informasi Wilayah RW 12',
        konten: 'Wilayah berada di Kelurahan Harjamukti, Kecamatan Harjamukti.'
      },
      {
        kategori: 'Kepengurusan RW',
        judul: 'Pengurus RW 12',
        konten: 'Ketua RW 12 adalah Bapak Budi. Wakil RW 12 adalah Bapak Fauzi.'
      },
      {
        kategori: 'Kepengurusan RT',
        judul: 'RT 01 - Kuranji',
        konten: 'RT 01 berada di wilayah Kuranji. Ketua RT 01 adalah Bapak Somad.'
      },
      {
        kategori: 'Kepengurusan RT',
        judul: 'RT 02 - Kuranji',
        konten: 'RT 02 berada di wilayah Kuranji. Ketua RT 02 adalah Bapak Amar.'
      },
      {
        kategori: 'Kepengurusan RT',
        judul: 'RT 03 - Karangenggal',
        konten: 'RT 03 berada di wilayah Karangenggal. Ketua RT 03 adalah Bapak Jaka.'
      }
    ];

    for (const data of dataToSeed) {
      const existing = await prisma.lingkunganInfo.findFirst({
        where: {
          judul: data.judul,
          rwId: rw.id
        }
      });
      
      if (existing) {
        await prisma.lingkunganInfo.update({
          where: { id: existing.id },
          data: {
            kategori: data.kategori,
            konten: data.konten,
            isPublished: true
          }
        });
      } else {
        await prisma.lingkunganInfo.create({
          data: {
            ...data,
            rwId: rw.id,
            isPublished: true
          }
        });
      }
    }
    
    const countAfter = await prisma.lingkunganInfo.count();
    console.log('Jumlah LingkunganInfo sesudah:', countAfter);
    
    const allInfos = await prisma.lingkunganInfo.findMany({
      where: { rwId: rw.id }
    });
    
    console.log('Data yang berhasil di-load:');
    allInfos.forEach(info => {
      console.log(`- Kategori: ${info.kategori}`);
      console.log(`  Judul: ${info.judul}`);
      console.log(`  rwId: ${info.rwId}`);
      console.log(`  isPublished: ${info.isPublished}`);
      console.log(`  Konten: ${info.konten}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
