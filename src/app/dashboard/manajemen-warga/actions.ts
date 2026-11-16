'use server';

import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const wargaSchema = z.object({
  nik: z.string().trim().regex(/^\d{16}$/, 'NIK harus berupa 16 digit angka'),
  namaLengkap: z.string().trim().min(2, 'Nama lengkap minimal 2 karakter').max(100, 'Nama lengkap maksimal 100 karakter'),
  tempatLahir: z.string().trim().max(100).optional().nullable().or(z.literal('')),
  tanggalLahir: z.string().optional().nullable().or(z.literal('')),
  agama: z.string().trim().optional().nullable().or(z.literal('')),
  pekerjaan: z.string().trim().max(100).optional().nullable().or(z.literal('')),
  email: z.string().trim().email('Format email tidak valid').optional().nullable().or(z.literal('')),
  noWhatsapp: z.string().trim().max(25).optional().nullable().or(z.literal('')),
  rtId: z.string().min(1, 'RT wajib dipilih'),
  keluargaId: z.string().optional().nullable().or(z.literal('')),
  nomorKkBaru: z.string().trim().optional().nullable().or(z.literal('')),
  alamatKkBaru: z.string().trim().optional().nullable().or(z.literal('')),
});

export type WargaFormData = z.infer<typeof wargaSchema>;

export async function editWargaAction(wargaId: string, data: WargaFormData) {
  const session = await getSession();
  if (!session || !['SUPER_ADMIN', 'ADMIN_RW', 'KETUA_RT'].includes(session.role)) {
    return { error: 'Anda tidak memiliki wewenang untuk mengubah data warga.' };
  }

  const parsed = wargaSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Data yang dimasukkan tidak valid.' };
  }

  try {
    const targetWarga = await prisma.warga.findUnique({
      where: { id: wargaId },
      include: { rt: true, user: true }
    });

    if (!targetWarga) {
      return { error: 'Data warga tidak ditemukan.' };
    }

    // RBAC check on target
    if (session.role === 'ADMIN_RW' && targetWarga.rt?.rwId !== session.rwId) {
      return { error: 'Unauthorized: Warga berada di luar cakupan RW Anda.' };
    }
    if (session.role === 'KETUA_RT' && targetWarga.rtId !== session.rtId) {
      return { error: 'Unauthorized: Warga berada di luar cakupan RT Anda.' };
    }

    // Check if NIK already used by another warga
    if (parsed.data.nik !== targetWarga.nik) {
      const duplicateNik = await prisma.warga.findUnique({
        where: { nik: parsed.data.nik }
      });
      if (duplicateNik) {
        return { error: 'NIK tersebut sudah digunakan oleh warga lain.' };
      }
    }

    // Verify chosen RT is in caller scope
    const targetRt = await prisma.rt.findUnique({
      where: { id: parsed.data.rtId }
    });
    if (!targetRt) {
      return { error: 'Data RT yang dipilih tidak valid.' };
    }
    if (session.role === 'ADMIN_RW' && targetRt.rwId !== session.rwId) {
      return { error: 'RT yang dipilih berada di luar wilayah RW Anda.' };
    }
    if (session.role === 'KETUA_RT' && targetRt.id !== session.rtId) {
      return { error: 'Anda hanya dapat menetapkan warga pada RT Anda sendiri.' };
    }

    // Handle Kartu Keluarga
    let finalKeluargaId = parsed.data.keluargaId ? parsed.data.keluargaId : null;
    if (parsed.data.nomorKkBaru && parsed.data.nomorKkBaru.trim().length >= 10) {
      const cleanKk = parsed.data.nomorKkBaru.trim();
      let existingKk = await prisma.keluarga.findUnique({
        where: { nomorKk: cleanKk }
      });
      if (!existingKk) {
        existingKk = await prisma.keluarga.create({
          data: {
            nomorKk: cleanKk,
            alamat: parsed.data.alamatKkBaru?.trim() || 'Lingkungan RT/RW'
          }
        });
      }
      finalKeluargaId = existingKk.id;
    }

    const parsedDate = parsed.data.tanggalLahir ? new Date(parsed.data.tanggalLahir) : null;

    // Update warga
    await prisma.warga.update({
      where: { id: wargaId },
      data: {
        nik: parsed.data.nik,
        namaLengkap: parsed.data.namaLengkap,
        tempatLahir: parsed.data.tempatLahir || null,
        tanggalLahir: parsedDate,
        agama: parsed.data.agama || null,
        pekerjaan: parsed.data.pekerjaan || null,
        email: parsed.data.email || null,
        noWhatsapp: parsed.data.noWhatsapp || null,
        rtId: parsed.data.rtId,
        keluargaId: finalKeluargaId,
      }
    });

    // Synchronize to linked User if exists
    if (targetWarga.user) {
      await prisma.user.update({
        where: { id: targetWarga.user.id },
        data: {
          email: parsed.data.email || null,
          noWhatsapp: parsed.data.noWhatsapp || null,
        }
      });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_WARGA',
        userId: session.id,
        details: JSON.stringify({
          wargaId,
          nik: parsed.data.nik,
          namaLengkap: parsed.data.namaLengkap,
        })
      }
    });

    revalidatePath('/dashboard/manajemen-warga');
    revalidatePath('/dashboard/rt');
    revalidatePath('/dashboard/rw');
    revalidatePath('/dashboard/admin');
    revalidatePath('/dashboard/manajemen-akun');
    return { success: true, message: 'Data warga berhasil diperbarui.' };
  } catch (error: any) {
    return { error: error.message || 'Terjadi kesalahan saat memperbarui data warga.' };
  }
}

export async function createWargaAction(data: WargaFormData) {
  const session = await getSession();
  if (!session || !['SUPER_ADMIN', 'ADMIN_RW', 'KETUA_RT'].includes(session.role)) {
    return { error: 'Anda tidak memiliki wewenang untuk menambahkan warga.' };
  }

  const parsed = wargaSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Data yang dimasukkan tidak valid.' };
  }

  try {
    // Check NIK uniqueness
    const existing = await prisma.warga.findUnique({
      where: { nik: parsed.data.nik }
    });
    if (existing) {
      return { error: 'NIK sudah terdaftar dalam sistem.' };
    }

    // Verify chosen RT is in caller scope
    const targetRt = await prisma.rt.findUnique({
      where: { id: parsed.data.rtId }
    });
    if (!targetRt) {
      return { error: 'Data RT yang dipilih tidak valid.' };
    }
    if (session.role === 'ADMIN_RW' && targetRt.rwId !== session.rwId) {
      return { error: 'RT yang dipilih berada di luar wilayah RW Anda.' };
    }
    if (session.role === 'KETUA_RT' && targetRt.id !== session.rtId) {
      return { error: 'Anda hanya dapat mendaftarkan warga pada RT Anda sendiri.' };
    }

    // Handle Kartu Keluarga
    let finalKeluargaId = parsed.data.keluargaId ? parsed.data.keluargaId : null;
    if (parsed.data.nomorKkBaru && parsed.data.nomorKkBaru.trim().length >= 10) {
      const cleanKk = parsed.data.nomorKkBaru.trim();
      let existingKk = await prisma.keluarga.findUnique({
        where: { nomorKk: cleanKk }
      });
      if (!existingKk) {
        existingKk = await prisma.keluarga.create({
          data: {
            nomorKk: cleanKk,
            alamat: parsed.data.alamatKkBaru?.trim() || 'Lingkungan RT/RW'
          }
        });
      }
      finalKeluargaId = existingKk.id;
    }

    const parsedDate = parsed.data.tanggalLahir ? new Date(parsed.data.tanggalLahir) : null;

    const newWarga = await prisma.warga.create({
      data: {
        nik: parsed.data.nik,
        namaLengkap: parsed.data.namaLengkap,
        tempatLahir: parsed.data.tempatLahir || null,
        tanggalLahir: parsedDate,
        agama: parsed.data.agama || null,
        pekerjaan: parsed.data.pekerjaan || null,
        email: parsed.data.email || null,
        noWhatsapp: parsed.data.noWhatsapp || null,
        rtId: parsed.data.rtId,
        keluargaId: finalKeluargaId,
        isActive: true,
      }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'CREATE_WARGA',
        userId: session.id,
        details: JSON.stringify({
          wargaId: newWarga.id,
          nik: newWarga.nik,
          namaLengkap: newWarga.namaLengkap,
        })
      }
    });

    revalidatePath('/dashboard/manajemen-warga');
    revalidatePath('/dashboard/rt');
    revalidatePath('/dashboard/rw');
    revalidatePath('/dashboard/admin');
    revalidatePath('/dashboard/manajemen-akun');
    return { success: true, message: 'Warga baru berhasil ditambahkan.' };
  } catch (error: any) {
    return { error: error.message || 'Terjadi kesalahan saat menambahkan data warga.' };
  }
}

export async function deactivateWargaAction(wargaId: string) {
  const session = await getSession();
  if (!session || !['SUPER_ADMIN', 'ADMIN_RW', 'KETUA_RT'].includes(session.role)) {
    return { error: 'Unauthorized' };
  }

  try {
    const targetWarga = await prisma.warga.findUnique({
      where: { id: wargaId },
      include: { rt: true }
    });

    if (!targetWarga) {
      return { error: 'Warga tidak ditemukan' };
    }

    if (session.role === 'ADMIN_RW') {
      if (targetWarga.rt?.rwId !== session.rwId) {
        return { error: 'Unauthorized: Warga berada di luar cakupan RW Anda' };
      }
    } else if (session.role === 'KETUA_RT') {
      if (targetWarga.rtId !== session.rtId) {
        return { error: 'Unauthorized: Warga berada di luar cakupan RT Anda' };
      }
    }

    await prisma.warga.update({
      where: { id: wargaId },
      data: { isActive: false }
    });

    // Sinkronkan status akun user terkait menjadi nonaktif
    const linkedUser = await prisma.user.findFirst({
      where: { wargaId },
    });
    if (linkedUser) {
      await prisma.user.update({
        where: { id: linkedUser.id },
        data: { isActive: false },
      });
    }
    
    await prisma.auditLog.create({
      data: {
        action: 'DEACTIVATE_WARGA',
        userId: session.id,
        details: JSON.stringify({ wargaId, namaLengkap: targetWarga.namaLengkap })
      }
    });

    revalidatePath('/dashboard/manajemen-warga');
    revalidatePath('/dashboard/rt');
    revalidatePath('/dashboard/rw');
    revalidatePath('/dashboard/admin');
    revalidatePath('/dashboard/manajemen-akun');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteWargaAction(wargaId: string) {
  const session = await getSession();
  if (!session || !['SUPER_ADMIN', 'ADMIN_RW', 'KETUA_RT'].includes(session.role)) {
    return { error: 'Anda tidak memiliki wewenang untuk menghapus data warga.' };
  }

  try {
    const targetWarga = await prisma.warga.findUnique({
      where: { id: wargaId },
      include: { rt: true, user: true }
    });

    if (!targetWarga) {
      return { error: 'Data warga tidak ditemukan.' };
    }

    if (session.role === 'ADMIN_RW' && targetWarga.rt?.rwId !== session.rwId) {
      return { error: 'Unauthorized: Warga berada di luar cakupan RW Anda.' };
    }
    if (session.role === 'KETUA_RT' && targetWarga.rtId !== session.rtId) {
      return { error: 'Unauthorized: Warga berada di luar cakupan RT Anda.' };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Hapus request & history pemohon
      const userRequests = await tx.request.findMany({
        where: { applicantId: wargaId },
        select: { id: true }
      });
      const reqIds = userRequests.map(r => r.id);
      if (reqIds.length > 0) {
        await tx.requestHistory.deleteMany({
          where: { requestId: { in: reqIds } }
        });
        await tx.request.deleteMany({
          where: { id: { in: reqIds } }
        });
      }

      // 2. Hapus pengaduan & history pelapor
      const userPengaduans = await tx.pengaduan.findMany({
        where: { pelaporId: wargaId },
        select: { id: true }
      });
      const pengaduanIds = userPengaduans.map(p => p.id);
      if (pengaduanIds.length > 0) {
        await tx.pengaduanHistory.deleteMany({
          where: { pengaduanId: { in: pengaduanIds } }
        });
        await tx.pengaduan.deleteMany({
          where: { id: { in: pengaduanIds } }
        });
      }

      // 3. Nullify notification logs
      await tx.notificationLog.updateMany({
        where: { wargaId },
        data: { wargaId: null }
      });

      // 4. Hapus Akun User terkait jika ada
      if (targetWarga.user) {
        await tx.auditLog.updateMany({
          where: { userId: targetWarga.user.id },
          data: { userId: null }
        });
        await tx.request.updateMany({
          where: { createdById: targetWarga.user.id },
          data: { createdById: null }
        });
        await tx.requestHistory.updateMany({
          where: { createdById: targetWarga.user.id },
          data: { createdById: null }
        });
        await tx.user.delete({
          where: { id: targetWarga.user.id }
        });
      }

      // 5. Hapus Warga
      await tx.warga.delete({
        where: { id: wargaId }
      });

      // 6. Audit Log
      await tx.auditLog.create({
        data: {
          action: 'DELETE_WARGA',
          userId: session.id,
          details: JSON.stringify({
            wargaId,
            namaLengkap: targetWarga.namaLengkap,
            nik: targetWarga.nik,
            hadLinkedUser: Boolean(targetWarga.user),
            source: 'MANAJEMEN_WARGA_DELETE',
          })
        }
      });
    });

    revalidatePath('/dashboard/manajemen-warga');
    revalidatePath('/dashboard/rt');
    revalidatePath('/dashboard/rw');
    revalidatePath('/dashboard/admin');
    revalidatePath('/dashboard/manajemen-akun');

    return { 
      success: true, 
      message: `Data warga "${targetWarga.namaLengkap}"${targetWarga.user ? ' dan akun terkait' : ''} berhasil dihapus, total warga otomatis ter-update.` 
    };
  } catch (error: any) {
    return { error: error.message || 'Gagal menghapus data warga.' };
  }
}
