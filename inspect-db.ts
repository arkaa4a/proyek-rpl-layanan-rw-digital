import prisma from './src/lib/db';

async function main() {
  const users = await prisma.user.findMany({
    include: {
      role: true,
      rt: true,
      rw: true,
      warga: {
        include: {
          rt: true,
          keluarga: true,
        },
      },
    },
  });

  console.log('=== USERS & ROLES ===');
  for (const u of users) {
    console.log({
      id: u.id,
      username: u.username,
      role: u.role.name,
      rtId: u.rtId,
      rtNomor: u.rt?.nomor,
      rwId: u.rwId,
      rwNomor: u.rw?.nomor,
      wargaId: u.wargaId,
      wargaNama: u.warga?.namaLengkap,
      wargaRt: u.warga?.rt?.nomor,
    });
  }

  const rts = await prisma.rt.findMany({
    include: {
      rw: true,
      _count: { select: { warga: true, users: true } },
    },
  });
  console.log('\n=== RTS ===');
  console.log(rts.map(r => ({ id: r.id, nomor: r.nomor, rwNomor: r.rw.nomor, totalWarga: r._count.warga })));

  const warga = await prisma.warga.findMany({
    include: { rt: true, keluarga: true, user: true },
  });
  console.log('\n=== WARGA ===');
  console.log(warga.map(w => ({ id: w.id, nama: w.namaLengkap, nik: w.nik, rt: w.rt?.nomor, user: w.user?.username, noKk: w.keluarga?.nomorKk })));
}

main().catch(console.error);
