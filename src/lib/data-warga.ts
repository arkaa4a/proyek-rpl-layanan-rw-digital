import prisma from './db';

export async function getWargaList(role: string, rtId?: string | null, rwId?: string | null, search?: string) {
  let whereClause: any = { isActive: true };

  // RBAC Filter
  if (role === 'KETUA_RT' && rtId) {
    whereClause.rtId = rtId;
  } else if (['KETUA_RW', 'ADMIN_RW'].includes(role) && rwId) {
    whereClause.rt = { rwId };
  } else if (role === 'WARGA') {
    // Warga tidak berhak melihat list, hanya profil sendiri (dihandle di halaman lain)
    return [];
  }

  // Search Filter
  if (search) {
    whereClause.OR = [
      { namaLengkap: { contains: search } },
      { nik: { contains: search } }
    ];
  }

  return await prisma.warga.findMany({
    where: whereClause,
    include: {
      rt: { select: { id: true, nomor: true, rwId: true, rw: { select: { id: true, nomor: true } } } },
      keluarga: { select: { id: true, nomorKk: true, alamat: true } }
    },
    orderBy: { namaLengkap: 'asc' }
  });
}
