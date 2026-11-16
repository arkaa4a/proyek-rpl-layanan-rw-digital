import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import ProfilClientView from '@/components/dashboard/ProfilClientView';

export default async function ProfilPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  // Fetch data profil lengkap pengguna dan entitas warga terkait
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    include: {
      role: true,
      warga: {
        include: {
          keluarga: true,
          rt: {
            include: {
              rw: true,
            },
          },
        },
      },
      rt: {
        include: {
          rw: true,
        },
      },
      rw: true,
    },
  });

  if (!user) {
    redirect('/login');
  }

  // Tentukan link kembali berdasarkan role
  let backLink = '/dashboard/warga';
  let backLabel = 'Dashboard Warga';

  if (session.role === 'KETUA_RT') {
    backLink = '/dashboard/rt';
    backLabel = 'Dashboard RT';
  } else if (session.role === 'KETUA_RW') {
    backLink = '/dashboard/rw';
    backLabel = 'Dashboard RW';
  } else if (['ADMIN_RW', 'SUPER_ADMIN'].includes(session.role)) {
    backLink = '/dashboard/admin';
    backLabel = 'Dashboard Admin';
  }

  // Siapkan payload data yang serializable untuk client component
  const profileData = {
    user: {
      id: user.id,
      username: user.username,
      role: user.role.name,
      email: user.email || user.warga?.email || null,
      noWhatsapp: user.noWhatsapp || user.warga?.noWhatsapp || null,
      notifyEmail: user.notifyEmail,
      notifyWhatsapp: user.notifyWhatsapp,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
    },
    warga: user.warga
      ? {
          id: user.warga.id,
          nik: user.warga.nik,
          namaLengkap: user.warga.namaLengkap,
          tempatLahir: user.warga.tempatLahir,
          tanggalLahir: user.warga.tanggalLahir ? user.warga.tanggalLahir.toISOString() : null,
          agama: user.warga.agama,
          pekerjaan: user.warga.pekerjaan,
          email: user.warga.email || user.email || null,
          noWhatsapp: user.warga.noWhatsapp || user.noWhatsapp || null,
          notifyEmail: user.warga.notifyEmail,
          notifyWhatsapp: user.warga.notifyWhatsapp,
          isActive: user.warga.isActive,
          keluarga: user.warga.keluarga
            ? {
                id: user.warga.keluarga.id,
                nomorKk: user.warga.keluarga.nomorKk,
                alamat: user.warga.keluarga.alamat,
              }
            : null,
          rt: user.warga.rt
            ? {
                id: user.warga.rt.id,
                nomor: user.warga.rt.nomor,
                namaKetua: user.warga.rt.namaKetua,
                namaWilayah: user.warga.rt.namaWilayah,
                rw: user.warga.rt.rw
                  ? {
                      id: user.warga.rt.rw.id,
                      nomor: user.warga.rt.rw.nomor,
                      namaKetua: user.warga.rt.rw.namaKetua,
                      kelurahan: user.warga.rt.rw.kelurahan,
                      kecamatan: user.warga.rt.rw.kecamatan,
                    }
                  : null,
              }
            : null,
        }
      : null,
    rtScope: user.rt
      ? {
          id: user.rt.id,
          nomor: user.rt.nomor,
          namaKetua: user.rt.namaKetua,
          namaWilayah: user.rt.namaWilayah,
          rw: user.rt.rw
            ? {
                id: user.rt.rw.id,
                nomor: user.rt.rw.nomor,
                namaKetua: user.rt.rw.namaKetua,
                kelurahan: user.rt.rw.kelurahan,
                kecamatan: user.rt.rw.kecamatan,
              }
            : null,
        }
      : null,
    rwScope: user.rw
      ? {
          id: user.rw.id,
          nomor: user.rw.nomor,
          namaKetua: user.rw.namaKetua,
          kelurahan: user.rw.kelurahan,
          kecamatan: user.rw.kecamatan,
        }
      : null,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>
      {/* Breadcrumb / Navigasi Balik */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Link
          href={backLink}
          style={{
            fontSize: '0.875rem',
            color: 'var(--primary)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontWeight: 500,
          }}
        >
          &larr; {backLabel}
        </Link>
      </div>

      {/* View Interaktif Profil */}
      <ProfilClientView data={profileData} />
    </div>
  );
}
