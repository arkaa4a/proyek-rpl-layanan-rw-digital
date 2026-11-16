import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const domisili = await prisma.serviceType.create({
    data: {
      name: 'Surat Pengantar Domisili',
      description: 'Layanan untuk warga yang membutuhkan surat pengantar keterangan domisili dari RT/RW.',
      requirements: JSON.stringify(['Foto KTP/KK', 'Pas Foto 3x4']),
      formFields: JSON.stringify([
        { name: 'keperluan', label: 'Keperluan Pembuatan Surat', type: 'text', required: true },
        { name: 'alamatTujuan', label: 'Alamat Tujuan Pengiriman (opsional)', type: 'text', required: false }
      ]),
      isActive: true
    }
  });

  const usaha = await prisma.serviceType.create({
    data: {
      name: 'Surat Keterangan Usaha (SKU)',
      description: 'Surat keterangan untuk keperluan izin usaha kecil dan menengah.',
      requirements: JSON.stringify(['Foto KTP', 'Foto Usaha/Tempat Usaha']),
      formFields: JSON.stringify([
        { name: 'namaUsaha', label: 'Nama Usaha', type: 'text', required: true },
        { name: 'bidangUsaha', label: 'Bidang Usaha', type: 'text', required: true },
        { name: 'alamatUsaha', label: 'Alamat Tempat Usaha', type: 'text', required: true }
      ]),
      isActive: true
    }
  });

  console.log('Seeded services:', domisili.name, usaha.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
