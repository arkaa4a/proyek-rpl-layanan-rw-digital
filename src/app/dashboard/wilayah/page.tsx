import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { Prisma } from '@prisma/client';
import { redirect } from 'next/navigation';
import WilayahClientView from '@/components/dashboard/WilayahClientView';

type RwWithRts = Prisma.RwGetPayload<{
  include: {
    rts: {
      include: {
        _count: {
          select: { warga: true };
        };
      };
    };
  };
}>;

export default async function WilayahPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  // Warga dilarang mengakses manajemen wilayah
  if (session.role === 'WARGA') {
    redirect('/dashboard/warga');
  }

  // Query data RW & RT berdasarkan role
  let rwList: RwWithRts[] = [];

  if (session.role === 'SUPER_ADMIN') {
    rwList = await prisma.rw.findMany({
      include: {
        rts: {
          include: {
            _count: {
              select: { warga: true },
            },
          },
          orderBy: { nomor: 'asc' },
        },
      },
      orderBy: { nomor: 'asc' },
    });
  } else if (session.rwId) {
    rwList = await prisma.rw.findMany({
      where: { id: session.rwId },
      include: {
        rts: {
          include: {
            _count: {
              select: { warga: true },
            },
          },
          orderBy: { nomor: 'asc' },
        },
      },
    });
  } else if (session.rtId) {
    const rt = await prisma.rt.findUnique({
      where: { id: session.rtId },
      include: {
        rw: {
          include: {
            rts: {
              include: {
                _count: {
                  select: { warga: true },
                },
              },
              orderBy: { nomor: 'asc' },
            },
          },
        },
      },
    });

    if (rt?.rw) {
      rwList = [rt.rw];
    }
  }

  // Fallback jika belum ter-link
  if (rwList.length === 0) {
    rwList = await prisma.rw.findMany({
      include: {
        rts: {
          include: {
            _count: {
              select: { warga: true },
            },
          },
          orderBy: { nomor: 'asc' },
        },
      },
      take: 5,
    });
  }

  const wilayahData = {
    role: session.role,
    user: {
      username: session.username,
      rwId: session.rwId,
      rtId: session.rtId,
    },
    rwList: rwList.map((rw) => ({
      id: rw.id,
      nomor: rw.nomor,
      namaKetua: rw.namaKetua,
      kelurahan: rw.kelurahan,
      kecamatan: rw.kecamatan,
      rts: rw.rts.map((rt) => ({
        id: rt.id,
        nomor: rt.nomor,
        namaKetua: rt.namaKetua,
        namaWilayah: rt.namaWilayah,
        _count: rt._count,
      })),
    })),
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>
      <WilayahClientView data={wilayahData} />
    </div>
  );
}
