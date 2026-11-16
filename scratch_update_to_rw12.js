const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function update() {
  const rw = await prisma.rw.findFirst();
  console.log('Current RW:', rw);
  if (rw) {
    await prisma.rw.update({
      where: { id: rw.id },
      data: { nomor: '12' },
    });
    console.log('Updated RW nomor to 12');
  }

  const infos = await prisma.lingkunganInfo.findMany();
  for (const info of infos) {
    let newJudul = info.judul.replace(/RW 01/g, 'RW 12');
    let newKonten = info.konten.replace(/RW 01/g, 'RW 12');
    if (newJudul !== info.judul || newKonten !== info.konten) {
      await prisma.lingkunganInfo.update({
        where: { id: info.id },
        data: { judul: newJudul, konten: newKonten },
      });
      console.log('Updated info:', newJudul);
    }
  }

  const keluargas = await prisma.keluarga.findMany();
  for (const k of keluargas) {
    if (k.alamat.includes('RW 01')) {
      const newAlamat = k.alamat.replace(/RW 01/g, 'RW 12');
      await prisma.keluarga.update({
        where: { id: k.id },
        data: { alamat: newAlamat },
      });
      console.log('Updated keluarga alamat:', newAlamat);
    }
  }

  const rts = await prisma.rt.findMany();
  console.log('RTs count:', rts.length);

  const updatedRw = await prisma.rw.findFirst({
    include: {
      rts: true,
      lingkunganInfos: true,
    },
  });
  console.log('Updated RW:', updatedRw.nomor);
  console.log('LingkunganInfos:', updatedRw.lingkunganInfos.map(i => ({ judul: i.judul, konten: i.konten })));
  console.log('Done!');
}

update()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
