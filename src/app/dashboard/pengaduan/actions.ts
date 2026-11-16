'use server';

import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { notifyPengaduanStatusChanged } from '@/lib/notification/notificationTriggers';
import {
  PENGADUAN_KATEGORI,
  PENGADUAN_STATUS_UPDATE,
  CreatePengaduanInput,
} from './types';

export type {
  PengaduanKategoriType,
  PengaduanStatusUpdateType,
  CreatePengaduanInput,
} from './types';

// ==========================================
// ZOD SCHEMAS (Compatible with Zod v4)
// ==========================================
const createPengaduanSchema = z.object({
  judul: z
    .string()
    .trim()
    .min(5, 'Judul minimal 5 karakter')
    .max(100, 'Judul maksimal 100 karakter'),
  kategori: z.enum(PENGADUAN_KATEGORI, {
    message:
      'Kategori tidak valid. Pilih: FASILITAS_UMUM, KEBERSIHAN, KEAMANAN, DRAINASE, JALAN, atau LAINNYA',
  }),
  deskripsi: z
    .string()
    .trim()
    .min(20, 'Deskripsi minimal 20 karakter')
    .max(1000, 'Deskripsi maksimal 1000 karakter'),
  lokasi: z
    .string()
    .trim()
    .min(5, 'Lokasi minimal 5 karakter')
    .max(300, 'Lokasi maksimal 300 karakter'),
});

const updatePengaduanStatusSchema = z.object({
  pengaduanId: z
    .string()
    .trim()
    .min(1, 'ID Pengaduan tidak boleh kosong'),
  status: z.enum(PENGADUAN_STATUS_UPDATE, {
    message:
      'Status hanya boleh: DITINJAU, DIPROSES, SELESAI, atau DITOLAK',
  }),
  catatan: z
    .string()
    .trim()
    .max(500, 'Catatan maksimal 500 karakter')
    .optional()
    .nullable(),
});


// ==========================================
// 1. CREATE PENGADUAN ACTION (Role: WARGA)
// ==========================================
export async function createPengaduanAction(
  input: CreatePengaduanInput | FormData
) {
  // Authorization: Khusus role WARGA
  const session = await getSession();
  if (!session || session.role !== 'WARGA' || !session.wargaId) {
    return { error: 'Unauthorized: Hanya warga yang dapat membuat pengaduan.' };
  }

  // Parse & validasi input Zod (trim & reject empty)
  let rawData: Record<string, unknown>;
  if (input instanceof FormData) {
    rawData = {
      judul: input.get('judul'),
      kategori: input.get('kategori'),
      deskripsi: input.get('deskripsi'),
      lokasi: input.get('lokasi'),
    };
  } else {
    rawData = input;
  }

  const parseResult = createPengaduanSchema.safeParse(rawData);
  if (!parseResult.success) {
    return {
      error: parseResult.error.issues.map((i) => i.message).join(', '),
    };
  }

  const validated = parseResult.data;

  try {
    // Ambil identitas domisili hanya dari database warga aktif (Server-side lookup)
    const warga = await prisma.warga.findUnique({
      where: { id: session.wargaId },
      select: {
        id: true,
        isActive: true,
        rtId: true,
        rt: {
          select: {
            id: true,
            rwId: true,
          },
        },
      },
    });

    if (!warga || !warga.isActive) {
      return {
        error: 'Profil warga tidak ditemukan atau akun sedang dinonaktifkan.',
      };
    }

    if (!warga.rtId || !warga.rt?.rwId) {
      return {
        error: 'Data wilayah domisili (RT/RW) belum terhubung ke akun warga Anda.',
      };
    }

    // Atomic Prisma Transaction: Buat Pengaduan + History Pertama
    const result = await prisma.$transaction(async (tx) => {
      const pengaduan = await tx.pengaduan.create({
        data: {
          judul: validated.judul,
          kategori: validated.kategori,
          deskripsi: validated.deskripsi,
          lokasi: validated.lokasi,
          status: 'DILAPORKAN',
          pelaporId: warga.id, // Berasal dari session.wargaId
          rtId: warga.rtId!, // Berasal dari data Warga aktif
          rwId: warga.rt!.rwId, // Berasal dari relasi RT
        },
      });

      await tx.pengaduanHistory.create({
        data: {
          pengaduanId: pengaduan.id,
          status: 'DILAPORKAN',
          catatan: 'Pengaduan baru diajukan oleh warga',
          authorId: session.id, // Berasal dari session.id
        },
      });

      return pengaduan;
    });

    revalidatePath('/dashboard/pengaduan');
    revalidatePath('/dashboard/warga');

    // Kirim notifikasi konfirmasi bahwa pengaduan diterima ke pelapor
    try {
      await notifyPengaduanStatusChanged({
        pengaduanId: result.id,
        status: 'DILAPORKAN',
        catatan: 'Laporan pengaduan baru berhasil didaftarkan.',
      });
    } catch (notifErr) {
      console.warn('Gagal memicu notifikasi pengaduan baru:', notifErr);
    }

    return { success: true, data: result };
  } catch (error: any) {
    return { error: error.message || 'Gagal menyimpan pengaduan.' };
  }
}

// ==========================================
// 2. GET MY PENGADUAN (Role: WARGA)
// ==========================================
export async function getMyPengaduan() {
  const session = await getSession();
  if (!session || session.role !== 'WARGA' || !session.wargaId) {
    return { error: 'Unauthorized: Akses dibatasi khusus warga.' };
  }

  try {
    // Query wajib menggunakan pelaporId: session.wargaId
    const list = await prisma.pengaduan.findMany({
      where: {
        pelaporId: session.wargaId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        judul: true,
        kategori: true,
        deskripsi: true,
        lokasi: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        rt: {
          select: {
            nomor: true,
          },
        },
        rw: {
          select: {
            nomor: true,
          },
        },
        _count: {
          select: {
            history: true,
          },
        },
      },
    });

    return { success: true, data: list };
  } catch (error: any) {
    return { error: error.message || 'Gagal memuat riwayat pengaduan.' };
  }
}

// ==========================================
// 3. GET MY PENGADUAN DETAIL (Role: WARGA)
// ==========================================
export async function getMyPengaduanDetail(pengaduanId: string) {
  const session = await getSession();
  if (!session || session.role !== 'WARGA' || !session.wargaId) {
    return { error: 'Unauthorized: Akses dibatasi khusus warga.' };
  }

  if (!pengaduanId || typeof pengaduanId !== 'string') {
    return { error: 'ID Pengaduan tidak valid.' };
  }

  try {
    // Query wajib menggabungkan id & pelaporId untuk mencegah IDOR
    const pengaduan = await prisma.pengaduan.findFirst({
      where: {
        id: pengaduanId,
        pelaporId: session.wargaId,
      },
      select: {
        id: true,
        judul: true,
        kategori: true,
        deskripsi: true,
        lokasi: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        rt: {
          select: {
            id: true,
            nomor: true,
          },
        },
        rw: {
          select: {
            id: true,
            nomor: true,
          },
        },
        history: {
          orderBy: {
            createdAt: 'asc',
          },
          select: {
            id: true,
            status: true,
            catatan: true,
            createdAt: true,
            author: {
              select: {
                id: true,
                username: true,
                role: {
                  select: {
                    name: true,
                    description: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!pengaduan) {
      return {
        error:
          'Pengaduan tidak ditemukan atau Anda tidak memiliki izin untuk melihat pengaduan ini.',
      };
    }

    return { success: true, data: pengaduan };
  } catch (error: any) {
    return { error: error.message || 'Gagal memuat detail pengaduan.' };
  }
}

// ==========================================
// 4. UPDATE PENGADUAN STATUS ACTION
// (Role: KETUA_RT, KETUA_RW, ADMIN_RW, SUPER_ADMIN)
// ==========================================
export async function updatePengaduanStatusAction(
  param1:
    | string
    | FormData
    | {
        pengaduanId: string;
        status: string;
        catatan?: string | null;
      },
  param2?: string,
  param3?: string | null
) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  // Khusus role yang diizinkan (WARGA dilarang mengubah status)
  const ALLOWED_ROLES = ['KETUA_RT', 'KETUA_RW', 'ADMIN_RW', 'SUPER_ADMIN'];
  if (!ALLOWED_ROLES.includes(session.role)) {
    return {
      error:
        'Forbidden: Anda tidak memiliki wewenang untuk memperbarui status pengaduan.',
    };
  }

  // Normalisasi input
  let rawData: Record<string, unknown>;
  if (typeof param1 === 'string') {
    rawData = {
      pengaduanId: param1,
      status: param2,
      catatan: param3,
    };
  } else if (param1 instanceof FormData) {
    rawData = {
      pengaduanId: param1.get('pengaduanId'),
      status: param1.get('status'),
      catatan: param1.get('catatan'),
    };
  } else {
    rawData = param1;
  }

  const parseResult = updatePengaduanStatusSchema.safeParse(rawData);
  if (!parseResult.success) {
    return {
      error: parseResult.error.issues.map((i) => i.message).join(', '),
    };
  }

  const { pengaduanId, status, catatan } = parseResult.data;

  try {
    // 1. Ambil data pengaduan untuk validasi scoping wilayah
    const target = await prisma.pengaduan.findUnique({
      where: { id: pengaduanId },
      select: {
        id: true,
        rtId: true,
        rwId: true,
        status: true,
      },
    });

    if (!target) {
      return { error: 'Pengaduan tidak ditemukan.' };
    }

    // 2. Authorization Scoping
    if (session.role === 'KETUA_RT') {
      if (!session.rtId || target.rtId !== session.rtId) {
        return {
          error:
            'Forbidden: Anda hanya berhak memproses pengaduan di wilayah RT Anda.',
        };
      }
    } else if (session.role === 'KETUA_RW' || session.role === 'ADMIN_RW') {
      if (!session.rwId || target.rwId !== session.rwId) {
        return {
          error:
            'Forbidden: Anda hanya berhak memproses pengaduan di wilayah RW Anda.',
        };
      }
    } else if (session.role === 'SUPER_ADMIN') {
      // Akses global diizinkan
    } else {
      return { error: 'Forbidden: Akses ditolak.' };
    }

    // 3. Atomic Transaction: Update status pengaduan + buat history log
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.pengaduan.update({
        where: { id: pengaduanId },
        data: {
          status,
        },
      });

      await tx.pengaduanHistory.create({
        data: {
          pengaduanId,
          status,
          catatan: catatan || null,
          authorId: session.id, // Pencatat status adalah user pengurus yang login
        },
      });

      return updated;
    });

    revalidatePath('/dashboard/pengaduan');
    revalidatePath(`/dashboard/pengaduan/${pengaduanId}`);
    revalidatePath('/dashboard/rt');
    revalidatePath('/dashboard/rw');

    // Kirim notifikasi perubahan status pengaduan ke pelapor
    try {
      await notifyPengaduanStatusChanged({
        pengaduanId,
        status,
        catatan,
      });
    } catch (notifErr) {
      console.warn('Gagal memicu notifikasi perubahan status pengaduan:', notifErr);
    }

    return { success: true, data: result };
  } catch (error: any) {
    return {
      error: error.message || 'Gagal memperbarui status pengaduan.',
    };
  }
}
