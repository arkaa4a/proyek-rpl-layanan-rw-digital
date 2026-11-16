'use server';

import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

import { notifyPengumumanCreated } from '@/lib/notification/notificationTriggers';
import { NotificationChannel } from '@/lib/notification/types';

export async function createPengumumanAction(formData: FormData) {
  const session = await getSession();
  if (!session || !['SUPER_ADMIN', 'ADMIN_RW', 'KETUA_RW', 'KETUA_RT'].includes(session.role)) {
    return { error: 'Unauthorized: Anda tidak memiliki akses untuk membuat pengumuman.' };
  }

  const judul = formData.get('judul') as string;
  const konten = formData.get('konten') as string;
  const kategori = formData.get('kategori') as string;
  const prioritas = formData.get('prioritas') === 'true';
  const tanggalKegiatan = (formData.get('tanggalKegiatan') as string) || null;
  const lokasiKegiatan = (formData.get('lokasiKegiatan') as string) || null;
  const isPublished = formData.get('isPublished') !== 'false'; // default true
  const sendNotification = formData.get('sendNotification') === 'true';
  const notificationChannelRaw = (formData.get('notificationChannel') as string) || 'BOTH';
  let targetRtId = (formData.get('targetRtId') as string) || null;

  if (!judul || !konten || !kategori) {
    return { error: 'Judul, konten, dan kategori wajib diisi.' };
  }

  try {
    let rwId = session.rwId;

    // Role Enforcement Scoping
    if (session.role === 'KETUA_RT') {
      const rtInfo = await prisma.rt.findUnique({ where: { id: session.rtId! } });
      rwId = rtInfo?.rwId || null;
      // Ketua RT hanya berhak mengirim pengumuman untuk RT-nya sendiri
      targetRtId = session.rtId || null;
    } else if (['ADMIN_RW', 'KETUA_RW'].includes(session.role)) {
      rwId = session.rwId;
      // Jika menargetkan RT tertentu, pastikan RT berada di dalam RW miliknya
      if (targetRtId) {
        const rtInfo = await prisma.rt.findUnique({ where: { id: targetRtId } });
        if (!rtInfo || rtInfo.rwId !== rwId) {
          return { error: 'Unauthorized: RT yang dituju berada di luar cakupan RW Anda.' };
        }
      }
    }

    const pengumuman = await prisma.pengumuman.create({
      data: {
        judul,
        konten,
        kategori,
        prioritas,
        tanggalKegiatan,
        lokasiKegiatan,
        authorId: session.id,
        authorRole: session.role,
        rwId,
        targetRtId,
        isPublished,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'CREATE_PENGUMUMAN',
        userId: session.id,
        details: JSON.stringify({ judul, kategori, prioritas, isPublished, targetRtId, sendNotification }),
      },
    });

    // Jalankan pengiriman notifikasi jika dipublikasikan dan opsi dicentang
    if (isPublished && sendNotification) {
      let channels: NotificationChannel[] = ['EMAIL', 'WHATSAPP'];
      if (notificationChannelRaw === 'EMAIL') channels = ['EMAIL'];
      else if (notificationChannelRaw === 'WHATSAPP') channels = ['WHATSAPP'];

      try {
        await notifyPengumumanCreated({
          pengumumanId: pengumuman.id,
          judul,
          konten,
          kategori,
          tanggalKegiatan,
          lokasiKegiatan,
          rwId,
          targetRtId,
          channels,
          isPublished: true,
        });
      } catch (notifyErr) {
        console.warn('Gagal memproses pengiriman notifikasi pengumuman:', notifyErr);
      }
    }

    revalidatePath('/');
    revalidatePath('/pengumuman');
    revalidatePath('/dashboard/warga');
    return { success: true, id: pengumuman.id };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function editPengumumanAction(id: string, formData: FormData) {
  const session = await getSession();
  if (!session || !['SUPER_ADMIN', 'ADMIN_RW', 'KETUA_RW', 'KETUA_RT'].includes(session.role)) {
    return { error: 'Unauthorized: Anda tidak memiliki akses untuk mengedit pengumuman.' };
  }

  const judul = formData.get('judul') as string;
  const konten = formData.get('konten') as string;
  const kategori = formData.get('kategori') as string;
  const prioritas = formData.get('prioritas') === 'true';
  const tanggalKegiatan = formData.get('tanggalKegiatan') as string || null;
  const lokasiKegiatan = formData.get('lokasiKegiatan') as string || null;

  try {
    const existing = await prisma.pengumuman.findUnique({ where: { id } });
    if (!existing) return { error: 'Pengumuman tidak ditemukan.' };

    await prisma.pengumuman.update({
      where: { id },
      data: {
        judul, konten, kategori, prioritas, tanggalKegiatan, lokasiKegiatan
      }
    });

    await prisma.auditLog.create({
      data: {
        action: 'EDIT_PENGUMUMAN',
        userId: session.id,
        details: JSON.stringify({ pengumumanId: id, judul, kategori })
      }
    });

    revalidatePath('/');
    revalidatePath('/pengumuman');
    revalidatePath('/dashboard/warga');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deletePengumumanAction(id: string) {
  const session = await getSession();
  if (!session || !['SUPER_ADMIN', 'ADMIN_RW', 'KETUA_RW', 'KETUA_RT'].includes(session.role)) {
    return { error: 'Unauthorized: Anda tidak memiliki akses.' };
  }

  try {
    const existing = await prisma.pengumuman.findUnique({ where: { id } });
    if (!existing) return { error: 'Pengumuman tidak ditemukan.' };

    await prisma.pengumuman.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        action: 'DELETE_PENGUMUMAN',
        userId: session.id,
        details: JSON.stringify({ pengumumanId: id, judul: existing.judul })
      }
    });

    revalidatePath('/');
    revalidatePath('/pengumuman');
    revalidatePath('/dashboard/warga');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteAllPengumumanAction() {
  const session = await getSession();
  if (!session || !['SUPER_ADMIN', 'ADMIN_RW', 'KETUA_RW', 'KETUA_RT'].includes(session.role)) {
    return { error: 'Unauthorized: Anda tidak memiliki akses untuk menghapus pengumuman.' };
  }

  try {
    let deleteWhere: any = {};
    if (session.role === 'KETUA_RT') {
      deleteWhere = {
        OR: [
          { authorId: session.id },
          { targetRtId: session.rtId }
        ]
      };
    } else if (['ADMIN_RW', 'KETUA_RW'].includes(session.role) && session.rwId) {
      deleteWhere = {
        OR: [
          { rwId: session.rwId },
          { rwId: null }
        ]
      };
    }

    const count = await prisma.pengumuman.count({ where: deleteWhere });
    if (count === 0) {
      return { error: 'Tidak ada pengumuman yang dapat dihapus.' };
    }

    await prisma.pengumuman.deleteMany({ where: deleteWhere });

    await prisma.auditLog.create({
      data: {
        action: 'DELETE_ALL_PENGUMUMAN',
        userId: session.id,
        details: JSON.stringify({ deletedCount: count, role: session.role })
      }
    });

    revalidatePath('/');
    revalidatePath('/pengumuman');
    revalidatePath('/dashboard/warga');
    return { success: true, count };
  } catch (error: any) {
    return { error: error.message || 'Gagal menghapus semua pengumuman.' };
  }
}

export async function getPengumumanList(rwId?: string, isPengurus = false) {
  try {
    const data = await prisma.pengumuman.findMany({
      where: {
        ...(rwId ? { OR: [{ rwId }, { rwId: null }] } : {}),
        ...(!isPengurus ? { isPublished: true } : {}),
      },
      orderBy: [
        { prioritas: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        author: { select: { username: true } },
        targetRt: { select: { id: true, nomor: true } },
      },
    });
    return data;
  } catch (error) {
    console.error(error);
    return [];
  }
}
