'use server';

import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

interface UpdateProfileContactInput {
  email?: string;
  noWhatsapp?: string;
  pekerjaan?: string;
  notifyEmail?: boolean;
  notifyWhatsapp?: boolean;
}

export async function updateProfileContactAction(input: UpdateProfileContactInput) {
  const session = await getSession();
  if (!session) {
    return { success: false, error: 'Sesi telah berakhir. Silakan login kembali.' };
  }

  const email = input.email?.trim() || '';
  const noWhatsapp = input.noWhatsapp?.trim() || '';
  const pekerjaan = input.pekerjaan?.trim() || '';

  // Validasi format email jika diisi
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: 'Format email tidak valid (contoh: warga@gmail.com).' };
  }

  // Validasi nomor WhatsApp jika diisi (minimal 9 digit angka, bisa diawali 08 atau 62 atau +62)
  if (noWhatsapp) {
    const cleanedPhone = noWhatsapp.replace(/[\s-]/g, '');
    if (!/^\+?[0-9]{9,15}$/.test(cleanedPhone)) {
      return { success: false, error: 'Format nomor WhatsApp tidak valid. Masukkan 9-15 digit angka (contoh: 081234567890).' };
    }
  }

  try {
    const userUpdateData: any = {
      email: email || null,
      noWhatsapp: noWhatsapp || null,
    };
    if (input.notifyEmail !== undefined) userUpdateData.notifyEmail = input.notifyEmail;
    if (input.notifyWhatsapp !== undefined) userUpdateData.notifyWhatsapp = input.notifyWhatsapp;

    // 1. Update ke User
    await prisma.user.update({
      where: { id: session.id },
      data: userUpdateData,
    });

    // 2. Jika akun terhubung ke entitas fisik Warga, sinkronkan ke Warga
    if (session.wargaId) {
      const wargaUpdateData: any = {
        email: email || null,
        noWhatsapp: noWhatsapp || null,
        ...(pekerjaan ? { pekerjaan } : {}),
      };
      if (input.notifyEmail !== undefined) wargaUpdateData.notifyEmail = input.notifyEmail;
      if (input.notifyWhatsapp !== undefined) wargaUpdateData.notifyWhatsapp = input.notifyWhatsapp;

      await prisma.warga.update({
        where: { id: session.wargaId },
        data: wargaUpdateData,
      });
    }

    // 3. Catat ke Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          action: 'UPDATE_PROFILE_CONTACT',
          userId: session.id,
          details: JSON.stringify({
            email: email || null,
            noWhatsapp: noWhatsapp || null,
            pekerjaan: pekerjaan || null,
          }),
        },
      });
    } catch (logErr) {
      console.warn('Gagal mencatat audit log profil:', logErr);
    }

    revalidatePath('/dashboard/profil');
    return { success: true, message: 'Informasi kontak dan profil berhasil diperbarui!' };
  } catch (error: any) {
    console.error('Gagal memperbarui profil:', error);
    return { success: false, error: error.message || 'Terjadi kesalahan saat menyimpan data.' };
  }
}

export interface UpdateWilayahInput {
  rtId?: string;
  rwId?: string;
  keluargaId?: string;
  alamat?: string;
  namaKetuaRt?: string;
  namaKetuaRw?: string;
  kelurahan?: string;
  kecamatan?: string;
  namaWilayah?: string;
  nomorRt?: string;
  nomorRw?: string;
}

export async function updateWilayahAction(input: UpdateWilayahInput) {
  const session = await getSession();
  if (!session) {
    return { success: false, error: 'Sesi telah berakhir. Silakan login kembali.' };
  }

  // Khusus: Warga TIDAK diizinkan mengubah wilayah
  if (session.role === 'WARGA') {
    return {
      success: false,
      error: 'Akses ditolak: Hanya pengurus wilayah (RT, RW, Admin) yang memiliki izin mengubah data wilayah dan domisili.',
    };
  }

  const {
    rtId: targetRtId,
    rwId: targetRwId,
    keluargaId,
    alamat,
    namaKetuaRt,
    namaKetuaRw,
    kelurahan,
    kecamatan,
    namaWilayah,
    nomorRt,
    nomorRw,
  } = input;

  try {
    // 1. Tentukan RT & RW yang menjadi target
    let resolvedRtId = targetRtId || session.rtId;
    let resolvedRwId = targetRwId || session.rwId;

    // Jika RT belum ada tapi ada RW, cari RT pertama di bawah RW
    if (!resolvedRtId && resolvedRwId) {
      const firstRt = await prisma.rt.findFirst({ where: { rwId: resolvedRwId } });
      if (firstRt) resolvedRtId = firstRt.id;
    }

    // Jika RW belum ada tapi ada RT, cari rwId dari RT
    if (!resolvedRwId && resolvedRtId) {
      const rtObj = await prisma.rt.findUnique({ where: { id: resolvedRtId } });
      if (rtObj) resolvedRwId = rtObj.rwId;
    }

    // Jika Super Admin tanpa rtId/rwId di session, ambil RT dan RW pertama di sistem
    if (!resolvedRwId) {
      const firstRw = await prisma.rw.findFirst();
      if (firstRw) resolvedRwId = firstRw.id;
    }
    if (!resolvedRtId && resolvedRwId) {
      const firstRt = await prisma.rt.findFirst({ where: { rwId: resolvedRwId } });
      if (firstRt) resolvedRtId = firstRt.id;
    }

    // 2. Update data RT (Ketua RT, Nama Wilayah, Nomor RT) jika ada
    if (resolvedRtId) {
      const rtUpdateData: any = {};
      if (namaKetuaRt !== undefined) rtUpdateData.namaKetua = namaKetuaRt.trim() || null;
      if (namaWilayah !== undefined) rtUpdateData.namaWilayah = namaWilayah.trim() || null;
      if (nomorRt !== undefined && nomorRt.trim()) rtUpdateData.nomor = nomorRt.trim();

      if (Object.keys(rtUpdateData).length > 0) {
        await prisma.rt.update({
          where: { id: resolvedRtId },
          data: rtUpdateData,
        });
      }
    }

    // 3. Update data RW (Ketua RW, Kelurahan, Kecamatan, Nomor RW) jika ada
    if (resolvedRwId) {
      const rwUpdateData: any = {};
      if (namaKetuaRw !== undefined) rwUpdateData.namaKetua = namaKetuaRw.trim() || null;
      if (kelurahan !== undefined) rwUpdateData.kelurahan = kelurahan.trim() || null;
      if (kecamatan !== undefined) rwUpdateData.kecamatan = kecamatan.trim() || null;
      if (nomorRw !== undefined && nomorRw.trim()) rwUpdateData.nomor = nomorRw.trim();

      if (Object.keys(rwUpdateData).length > 0) {
        await prisma.rw.update({
          where: { id: resolvedRwId },
          data: rwUpdateData,
        });
      }
    }

    // 4. Update data Alamat Keluarga jika ada
    if (keluargaId && alamat !== undefined) {
      await prisma.keluarga.update({
        where: { id: keluargaId },
        data: {
          alamat: alamat.trim(),
        },
      });
    }

    // 5. Catat ke Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          action: 'UPDATE_WILAYAH',
          userId: session.id,
          details: JSON.stringify({
            rtId: resolvedRtId,
            rwId: resolvedRwId,
            keluargaId,
            alamat,
            namaKetuaRt,
            namaKetuaRw,
            kelurahan,
            kecamatan,
            namaWilayah,
            nomorRt,
            nomorRw,
          }),
        },
      });
    } catch (auditErr) {
      console.warn('Gagal mencatat audit log wilayah:', auditErr);
    }

    // 6. Revalidate cache halaman-halaman terkait
    revalidatePath('/dashboard/profil');
    revalidatePath('/dashboard/wilayah');
    revalidatePath('/dashboard/rt');
    revalidatePath('/dashboard/rw');
    revalidatePath('/dashboard/admin');

    return { success: true, message: 'Data domisili dan wilayah berhasil diperbarui!' };
  } catch (error: any) {
    console.error('Gagal memperbarui data wilayah:', error);
    return { success: false, error: error.message || 'Terjadi kesalahan saat menyimpan data wilayah.' };
  }
}

export interface CreateRtInput {
  rwId: string;
  nomor: string;
  namaKetua?: string;
  namaWilayah?: string;
}

export async function createRtAction(input: CreateRtInput) {
  const session = await getSession();
  if (!session || !['KETUA_RW', 'ADMIN_RW', 'SUPER_ADMIN'].includes(session.role)) {
    return { success: false, error: 'Hanya Pengurus RW atau Super Admin yang dapat menambahkan RT baru.' };
  }

  const { rwId, nomor, namaKetua, namaWilayah } = input;
  const nomorFormatted = nomor.trim();

  if (!nomorFormatted) {
    return { success: false, error: 'Nomor RT wajib diisi (contoh: 02, 03).' };
  }

  try {
    const existing = await prisma.rt.findUnique({
      where: {
        rwId_nomor: {
          rwId,
          nomor: nomorFormatted,
        },
      },
    });

    if (existing) {
      return { success: false, error: `RT ${nomorFormatted} sudah terdaftar di RW ini.` };
    }

    const newRt = await prisma.rt.create({
      data: {
        rwId,
        nomor: nomorFormatted,
        namaKetua: namaKetua?.trim() || null,
        namaWilayah: namaWilayah?.trim() || null,
      },
    });

    try {
      await prisma.auditLog.create({
        data: {
          action: 'CREATE_RT',
          userId: session.id,
          details: JSON.stringify({ rtId: newRt.id, rwId, nomor: nomorFormatted, namaKetua }),
        },
      });
    } catch {}

    revalidatePath('/dashboard/wilayah');
    revalidatePath('/dashboard/profil');
    revalidatePath('/dashboard/rw');

    return { success: true, message: `RT ${nomorFormatted} berhasil ditambahkan ke lingkungan RW!`, rt: newRt };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menambahkan RT baru.' };
  }
}

