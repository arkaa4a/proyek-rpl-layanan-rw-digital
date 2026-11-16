import prisma from '@/lib/db';
import RegisterClient from './RegisterClient';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Daftar Akun Warga - Pelayanan Digital RW',
  description: 'Pendaftaran akun warga mandiri untuk layanan surat pengantar dan administrasi lingkungan RW.',
};

export default async function RegisterPage() {
  const rts = await prisma.rt.findMany({
    select: {
      id: true,
      nomor: true,
      namaKetua: true,
      namaWilayah: true,
      rw: {
        select: {
          nomor: true,
        },
      },
    },
    orderBy: [
      { rw: { nomor: 'asc' } },
      { nomor: 'asc' },
    ],
  });

  return <RegisterClient rts={rts} />;
}
