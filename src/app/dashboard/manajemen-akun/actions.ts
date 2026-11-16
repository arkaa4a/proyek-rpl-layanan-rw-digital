'use server';

import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// ==========================================
// VALIDATION SCHEMAS
// ==========================================

const createAccountSchema = z.object({
  username: z.string().trim().min(3, 'Username minimal 3 karakter').max(30, 'Username maksimal 30 karakter')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Username hanya boleh mengandung huruf, angka, titik, strip, dan underscore'),
  password: z.string().min(6, 'Kata sandi minimal 6 karakter'),
  confirmPassword: z.string().min(6, 'Konfirmasi kata sandi minimal 6 karakter'),
  roleId: z.string().min(1, 'Role harus dipilih'),
  email: z.string().trim().email('Format email tidak valid').optional().or(z.literal('')),
  noWhatsapp: z.string().trim().max(20, 'Nomor WhatsApp maksimal 20 digit').optional().or(z.literal('')),
  wargaId: z.string().optional().nullable().or(z.literal('')),
  rwId: z.string().optional().nullable().or(z.literal('')),
  rtId: z.string().optional().nullable().or(z.literal('')),
  isActive: z.boolean().default(true),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Konfirmasi kata sandi tidak cocok dengan kata sandi baru',
  path: ['confirmPassword'],
});

const updateAccountSchema = z.object({
  username: z.string().trim().min(3, 'Username minimal 3 karakter').max(30, 'Username maksimal 30 karakter')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Username hanya boleh mengandung huruf, angka, titik, strip, dan underscore'),
  roleId: z.string().min(1, 'Role harus dipilih'),
  email: z.string().trim().email('Format email tidak valid').optional().or(z.literal('')),
  noWhatsapp: z.string().trim().max(20, 'Nomor WhatsApp maksimal 20 digit').optional().or(z.literal('')),
  wargaId: z.string().optional().nullable().or(z.literal('')),
  rwId: z.string().optional().nullable().or(z.literal('')),
  rtId: z.string().optional().nullable().or(z.literal('')),
  isActive: z.boolean(),
  newPassword: z.string().optional().or(z.literal('')),
  confirmNewPassword: z.string().optional().or(z.literal('')),
}).refine((data) => {
  if (data.newPassword && data.newPassword.length > 0) {
    return data.newPassword.length >= 6;
  }
  return true;
}, {
  message: 'Kata sandi baru minimal 6 karakter',
  path: ['newPassword'],
}).refine((data) => {
  if (data.newPassword && data.newPassword.length > 0) {
    return data.newPassword === data.confirmNewPassword;
  }
  return true;
}, {
  message: 'Konfirmasi kata sandi baru tidak cocok',
  path: ['confirmNewPassword'],
});

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
    revalidatePath('/dashboard/admin');
    revalidatePath('/dashboard/rt');
    revalidatePath('/dashboard/rw');
    revalidatePath('/dashboard/manajemen-warga');
  } catch {
    // Abaikan jika dijalankan di luar konteks request (misal pengujian mandiri)
  }
}

// Helper otorisasi SUPER_ADMIN
async function requireSuperAdmin() {
  const session = await getSession();
  if (!session || session.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized: Hanya SUPER_ADMIN yang berhak mengakses fitur Manajemen Akun.');
  }
  return session;
}

// ==========================================
// 1. GET ACCOUNTS (WITH SEARCH, FILTER, PAGINATION)
// ==========================================
export async function getAccountsAction(options: {
  search?: string;
  roleFilter?: string;
  statusFilter?: string;
  page?: number;
  limit?: number;
}) {
  try {
    const session = await requireSuperAdmin();

    const page = Math.max(1, options.page || 1);
    const limit = Math.min(50, Math.max(1, options.limit || 10));
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    // Search filter
    if (options.search && options.search.trim() !== '') {
      const q = options.search.trim();
      whereClause.OR = [
        { username: { contains: q } },
        { email: { contains: q } },
        { noWhatsapp: { contains: q } },
        { warga: { namaLengkap: { contains: q } } },
      ];
    }

    // Role filter
    if (options.roleFilter && options.roleFilter !== 'ALL') {
      whereClause.role = { name: options.roleFilter };
    }

    // Status filter
    if (options.statusFilter === 'ACTIVE') {
      whereClause.isActive = true;
    } else if (options.statusFilter === 'INACTIVE') {
      whereClause.isActive = false;
    }

    const [totalItems, users, statsRaw] = await Promise.all([
      prisma.user.count({ where: whereClause }),
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          username: true,
          email: true,
          noWhatsapp: true,
          roleId: true,
          role: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
          isActive: true,
          createdAt: true,
          updatedAt: true,
          wargaId: true,
          warga: {
            select: {
              id: true,
              namaLengkap: true,
              nik: true,
              email: true,
              noWhatsapp: true,
            },
          },
          rwId: true,
          rw: {
            select: {
              id: true,
              nomor: true,
              namaKetua: true,
            },
          },
          rtId: true,
          rt: {
            select: {
              id: true,
              nomor: true,
              namaKetua: true,
              rw: {
                select: {
                  nomor: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.user.count({ where: { isActive: false } }),
        prisma.user.count({ where: { role: { name: 'SUPER_ADMIN' } } }),
        prisma.user.count({ where: { role: { name: 'WARGA' } } }),
        prisma.user.count({ where: { role: { name: { in: ['ADMIN_RW', 'KETUA_RW', 'KETUA_RT'] } } } }),
      ]),
    ]);

    const totalPages = Math.ceil(totalItems / limit) || 1;

    return {
      success: true,
      currentUserId: session.id,
      users,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
      },
      stats: {
        total: statsRaw[0],
        active: statsRaw[1],
        inactive: statsRaw[2],
        superAdmin: statsRaw[3],
        warga: statsRaw[4],
        pengurus: statsRaw[5],
      },
    };
  } catch (error: any) {
    return { error: error.message || 'Gagal mengambil data akun.' };
  }
}

// ==========================================
// 2. GET ACCOUNT DETAIL
// ==========================================
export async function getAccountDetailAction(userId: string) {
  try {
    await requireSuperAdmin();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        noWhatsapp: true,
        roleId: true,
        role: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        isActive: true,
        createdAt: true,
        updatedAt: true,
        wargaId: true,
        warga: {
          select: {
            id: true,
            nik: true,
            namaLengkap: true,
            tempatLahir: true,
            tanggalLahir: true,
            pekerjaan: true,
            keluarga: {
              select: {
                nomorKk: true,
                alamat: true,
              },
            },
            rt: {
              select: {
                nomor: true,
                rw: {
                  select: {
                    nomor: true,
                  },
                },
              },
            },
          },
        },
        rwId: true,
        rw: {
          select: {
            id: true,
            nomor: true,
            namaKetua: true,
          },
        },
        rtId: true,
        rt: {
          select: {
            id: true,
            nomor: true,
            namaKetua: true,
            rw: {
              select: {
                nomor: true,
              },
            },
          },
        },
        _count: {
          select: {
            createdRequests: true,
            requestHistories: true,
            auditLogs: true,
            lingkunganInfos: true,
            pengumuman: true,
            pengaduanHistory: true,
          },
        },
      },
    });

    if (!user) {
      return { error: 'Akun tidak ditemukan.' };
    }

    // Masking data sensitif
    const maskedUser = {
      ...user,
      warga: user.warga
        ? {
            ...user.warga,
            nik: user.warga.nik ? `${user.warga.nik.slice(0, 4)}********${user.warga.nik.slice(-4)}` : null,
            keluarga: user.warga.keluarga
              ? {
                  ...user.warga.keluarga,
                  nomorKk: user.warga.keluarga.nomorKk
                    ? `${user.warga.keluarga.nomorKk.slice(0, 4)}********${user.warga.keluarga.nomorKk.slice(-4)}`
                    : null,
                }
              : null,
          }
        : null,
    };

    return { success: true, data: maskedUser };
  } catch (error: any) {
    return { error: error.message || 'Gagal memuat detail akun.' };
  }
}

// ==========================================
// 3. CREATE ACCOUNT
// ==========================================
export async function createAccountAction(rawInput: any) {
  try {
    const session = await requireSuperAdmin();

    const parsed = createAccountSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message || 'Input form tidak valid.',
        details: parsed.error.issues,
      };
    }

    const {
      username,
      password,
      roleId,
      email,
      noWhatsapp,
      wargaId,
      rwId,
      rtId,
      isActive,
    } = parsed.data;

    // Cek duplikasi username
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });
    if (existingUser) {
      return { error: `Username "${username}" sudah digunakan. Silakan pilih username lain.` };
    }

    // Validasi role
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });
    if (!role) {
      return { error: 'Role yang dipilih tidak valid.' };
    }

    // Validasi wargaId jika ditautkan
    let finalWargaId: string | null = wargaId || null;
    let finalEmail: string | null = email ? email.trim() : null;
    let finalNoWhatsapp: string | null = noWhatsapp ? noWhatsapp.trim() : null;

    if (finalWargaId) {
      const warga = await prisma.warga.findUnique({
        where: { id: finalWargaId },
        include: { user: true, rt: true },
      });
      if (!warga) {
        return { error: 'Data Warga yang dipilih tidak ditemukan.' };
      }
      if (warga.user) {
        return { error: 'Warga tersebut sudah memiliki akun terkait.' };
      }

      // Fallback: Jika email / noWhatsapp di form kosong tapi ada di profil warga, gunakan dari warga
      if (!finalEmail && warga.email) {
        finalEmail = warga.email;
      }
      if (!finalNoWhatsapp && warga.noWhatsapp) {
        finalNoWhatsapp = warga.noWhatsapp;
      }
    }

    // Penanganan wilayah berdasarkan role (opsional / fallback otomatis)
    let finalRwId: string | null = rwId || null;
    let finalRtId: string | null = rtId || null;

    if (role.name === 'KETUA_RT') {
      if (!finalRtId) {
        const defaultRt = await prisma.rt.findFirst();
        finalRtId = defaultRt?.id || null;
      }
      if (finalRtId) {
        const rt = await prisma.rt.findUnique({
          where: { id: finalRtId },
          select: { rwId: true },
        });
        finalRwId = rt?.rwId || null;
      }
    } else if (['KETUA_RW', 'ADMIN_RW'].includes(role.name)) {
      if (!finalRwId) {
        const defaultRw = await prisma.rw.findFirst();
        finalRwId = defaultRw?.id || null;
      }
      finalRtId = null;
    } else if (role.name === 'SUPER_ADMIN') {
      finalRwId = null;
      finalRtId = null;
      finalWargaId = null;
    } else if (role.name === 'WARGA') {
      if (finalWargaId) {
        const existingWarga = await prisma.warga.findUnique({
          where: { id: finalWargaId },
          include: { rt: true },
        });
        if (existingWarga) {
          finalRtId = existingWarga.rtId;
          finalRwId = existingWarga.rt?.rwId || null;
        }
      } else {
        // Buat data Warga otomatis agar akun dan data warga terhubung 100% dan total warga bertambah
        const defaultRt = finalRtId 
          ? await prisma.rt.findUnique({ where: { id: finalRtId }, select: { id: true, rwId: true } })
          : await prisma.rt.findFirst({ select: { id: true, rwId: true } });

        const autoNik = `3201${Date.now().toString().slice(-6)}${Math.floor(100000 + Math.random() * 900000)}`;

        const newWarga = await prisma.warga.create({
          data: {
            nik: autoNik,
            namaLengkap: username.charAt(0).toUpperCase() + username.slice(1),
            email: finalEmail,
            noWhatsapp: finalNoWhatsapp,
            rtId: defaultRt?.id || null,
            isActive,
          },
        });

        finalWargaId = newWarga.id;
        finalRtId = defaultRt?.id || null;
        finalRwId = defaultRt?.rwId || null;
      }
    }

    // Hash kata sandi
    const hashedPassword = await bcrypt.hash(password, 10);

    // Simpan akun baru
    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        roleId,
        email: finalEmail,
        noWhatsapp: finalNoWhatsapp,
        wargaId: finalWargaId,
        rwId: finalRwId,
        rtId: finalRtId,
        isActive,
      },
    });

    // Sinkronkan email dan noWhatsapp ke profil warga jika akun ditautkan
    if (finalWargaId && (finalEmail || finalNoWhatsapp)) {
      await prisma.warga.update({
        where: { id: finalWargaId },
        data: {
          ...(finalEmail ? { email: finalEmail } : {}),
          ...(finalNoWhatsapp ? { noWhatsapp: finalNoWhatsapp } : {}),
        },
      });
    }

    // Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'CREATE_USER',
        userId: session.id,
        details: JSON.stringify({
          createdUserId: newUser.id,
          username: newUser.username,
          role: role.name,
          isActive,
        }),
      },
    });

    safeRevalidatePath('/dashboard/manajemen-akun');
    return {
      success: true,
      message: `Akun "${username}" dengan role ${role.name} berhasil dibuat.`,
    };
  } catch (error: any) {
    return { error: error.message || 'Gagal membuat akun.' };
  }
}

// ==========================================
// 4. UPDATE ACCOUNT (WITH PASSWORD RESET)
// ==========================================
export async function updateAccountAction(userId: string, rawInput: any) {
  try {
    const session = await requireSuperAdmin();

    const parsed = updateAccountSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message || 'Input form tidak valid.',
        details: parsed.error.issues,
      };
    }

    const {
      username,
      roleId,
      email,
      noWhatsapp,
      wargaId,
      rwId,
      rtId,
      isActive,
      newPassword,
    } = parsed.data;

    // Ambil target user
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    if (!targetUser) {
      return { error: 'Akun yang akan diubah tidak ditemukan.' };
    }

    // Cek Role baru
    const newRole = await prisma.role.findUnique({
      where: { id: roleId },
    });
    if (!newRole) {
      return { error: 'Role yang dipilih tidak valid.' };
    }

    // 1. CEK KEAMANAN SELF-EDIT:
    // Super Admin yang sedang login tidak boleh menonaktifkan dirinya sendiri atau mendemote role-nya
    if (userId === session.id) {
      if (!isActive) {
        return { error: 'Anda tidak dapat menonaktifkan akun Super Admin Anda sendiri yang sedang aktif.' };
      }
      if (newRole.name !== 'SUPER_ADMIN') {
        return { error: 'Anda tidak dapat mengubah role akun Anda sendiri menjadi bukan SUPER_ADMIN.' };
      }
    }

    // 2. CEK PERLINDUNGAN SUPER ADMIN TERAKHIR:
    // Jika target akun adalah SUPER_ADMIN aktif, dan akan dinonaktifkan atau diubah role-nya,
    // pastikan masih ada minimal 1 SUPER_ADMIN aktif lainnya!
    if (targetUser.role.name === 'SUPER_ADMIN' && targetUser.isActive) {
      const isDemotingOrDeactivating = !isActive || newRole.name !== 'SUPER_ADMIN';
      if (isDemotingOrDeactivating) {
        const activeSuperAdminCount = await prisma.user.count({
          where: {
            role: { name: 'SUPER_ADMIN' },
            isActive: true,
          },
        });
        if (activeSuperAdminCount <= 1) {
          return {
            error: 'Tidak dapat menonaktifkan atau mengubah role Super Admin terakhir yang masih aktif. Sistem wajib memiliki minimal satu Super Admin aktif.',
          };
        }
      }
    }

    // 3. Cek duplikasi username (jika username diubah)
    if (username !== targetUser.username) {
      const duplicate = await prisma.user.findUnique({
        where: { username },
      });
      if (duplicate) {
        return { error: `Username "${username}" sudah digunakan oleh akun lain.` };
      }
    }

    // 4. Validasi wargaId jika diubah (pertahankan yang sudah ada jika tidak dikirim dalam payload)
    let finalWargaId: string | null = wargaId !== undefined ? (wargaId || null) : (targetUser.wargaId || null);
    if (finalWargaId && finalWargaId !== targetUser.wargaId) {
      const warga = await prisma.warga.findUnique({
        where: { id: finalWargaId },
        include: { user: true },
      });
      if (!warga) {
        return { error: 'Data Warga yang dipilih tidak ditemukan.' };
      }
      if (warga.user && warga.user.id !== userId) {
        return { error: 'Warga tersebut sudah ditautkan ke akun lain.' };
      }
    }

    // 5. Penanganan wilayah (opsional / fallback otomatis)
    let finalRwId: string | null = rwId || null;
    let finalRtId: string | null = rtId || null;

    if (newRole.name === 'KETUA_RT') {
      if (!finalRtId) {
        finalRtId = targetUser.rtId || (await prisma.rt.findFirst())?.id || null;
      }
      if (finalRtId) {
        const rt = await prisma.rt.findUnique({
          where: { id: finalRtId },
          select: { rwId: true },
        });
        finalRwId = rt?.rwId || null;
      }
    } else if (['KETUA_RW', 'ADMIN_RW'].includes(newRole.name)) {
      if (!finalRwId) {
        finalRwId = targetUser.rwId || (await prisma.rw.findFirst())?.id || null;
      }
      finalRtId = null;
    } else if (newRole.name === 'SUPER_ADMIN') {
      finalRwId = null;
      finalRtId = null;
      finalWargaId = null;
    }

    // Siapkan data pembaruan
    const updateData: any = {
      username,
      roleId,
      email: email || null,
      noWhatsapp: noWhatsapp || null,
      wargaId: finalWargaId,
      rwId: finalRwId,
      rtId: finalRtId,
      isActive,
    };

    // 6. Ganti Kata Sandi (HANYA jika newPassword diisi)
    let passwordChanged = false;
    if (newPassword && newPassword.trim() !== '') {
      updateData.password = await bcrypt.hash(newPassword, 10);
      passwordChanged = true;
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // Sinkronkan email dan noWhatsapp ke data Warga jika akun terhubung ke profil warga
    if (finalWargaId) {
      await prisma.warga.update({
        where: { id: finalWargaId },
        data: {
          email: email || null,
          noWhatsapp: noWhatsapp || null,
        },
      });
    }

    // Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_USER',
        userId: session.id,
        details: JSON.stringify({
          updatedUserId: userId,
          username,
          roleChanged: targetUser.roleId !== roleId,
          newRole: newRole.name,
          isActiveChanged: targetUser.isActive !== isActive,
          newIsActive: isActive,
          passwordChanged,
        }),
      },
    });

    safeRevalidatePath('/dashboard/manajemen-akun');
    return {
      success: true,
      message: `Akun "${username}" berhasil diperbarui.${passwordChanged ? ' Kata sandi berhasil di-reset.' : ''}`,
    };
  } catch (error: any) {
    return { error: error.message || 'Gagal memperbarui akun.' };
  }
}

// ==========================================
// 5. TOGGLE STATUS (QUICK ACTIVATE / DEACTIVATE)
// ==========================================
export async function toggleAccountStatusAction(userId: string, targetStatus: boolean) {
  try {
    const session = await requireSuperAdmin();

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, warga: true },
    });
    if (!targetUser) {
      return { error: 'Akun tidak ditemukan.' };
    }

    if (userId === session.id && !targetStatus) {
      return { error: 'Anda tidak dapat menonaktifkan akun Anda sendiri yang sedang aktif.' };
    }

    if (targetUser.role.name === 'SUPER_ADMIN' && targetUser.isActive && !targetStatus) {
      const activeSuperAdminCount = await prisma.user.count({
        where: {
          role: { name: 'SUPER_ADMIN' },
          isActive: true,
        },
      });
      if (activeSuperAdminCount <= 1) {
        return { error: 'Tidak dapat menonaktifkan Super Admin terakhir yang masih aktif.' };
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isActive: targetStatus },
    });

    // Sinkronkan status aktif/nonaktif ke data Warga terkait
    const targetWargaId = targetUser.wargaId || targetUser.warga?.id;
    if (targetWargaId) {
      await prisma.warga.update({
        where: { id: targetWargaId },
        data: { isActive: targetStatus },
      });
    }

    await prisma.auditLog.create({
      data: {
        action: targetStatus ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
        userId: session.id,
        details: JSON.stringify({ targetUserId: userId, username: targetUser.username, wargaId: targetWargaId || null }),
      },
    });

    safeRevalidatePath('/dashboard/manajemen-akun');
    safeRevalidatePath('/dashboard/manajemen-warga');
    safeRevalidatePath('/dashboard/admin');
    safeRevalidatePath('/dashboard/rt');
    safeRevalidatePath('/dashboard/rw');
    return {
      success: true,
      message: `Akun "${targetUser.username}" berhasil ${targetStatus ? 'diaktifkan' : 'dinonaktifkan'}.`,
    };
  } catch (error: any) {
    return { error: error.message || 'Gagal mengubah status akun.' };
  }
}

// ==========================================
// 6. DELETE ACCOUNT (SAFE DETACH & HARD DELETE)
// ==========================================
export async function deleteAccountAction(userId: string) {
  try {
    const session = await requireSuperAdmin();

    // 1. Dilarang menghapus akun sendiri
    if (userId === session.id) {
      return { error: 'Anda tidak dapat menghapus akun Anda sendiri yang sedang digunakan untuk login.' };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, warga: true },
    });
    if (!targetUser) {
      return { error: 'Akun tidak ditemukan.' };
    }

    // 2. Dilarang menghapus Super Admin terakhir yang aktif
    if (targetUser.role.name === 'SUPER_ADMIN' && targetUser.isActive) {
      const activeSuperAdminCount = await prisma.user.count({
        where: {
          role: { name: 'SUPER_ADMIN' },
          isActive: true,
        },
      });
      if (activeSuperAdminCount <= 1) {
        return { error: 'Tidak dapat menghapus Super Admin terakhir yang masih aktif dalam sistem.' };
      }
    }

    let deletedWargaNama: string | null = null;

    // 3. Lepaskan seluruh relasi foreign key secara aman di dalam transaksi, lalu hapus user & warga terkait
    await prisma.$transaction(async (tx) => {
      // Cari ID warga yang terhubung
      let targetWargaId = targetUser.wargaId || targetUser.warga?.id || null;

      // Fallback: Jika role WARGA namun wargaId null, cek Warga berdasarkan email atau WhatsApp
      if (!targetWargaId && targetUser.role.name === 'WARGA') {
        if (targetUser.email) {
          const matchedByEmail = await tx.warga.findFirst({
            where: { email: targetUser.email },
          });
          if (matchedByEmail) targetWargaId = matchedByEmail.id;
        }
        if (!targetWargaId && targetUser.noWhatsapp) {
          const matchedByWa = await tx.warga.findFirst({
            where: { noWhatsapp: targetUser.noWhatsapp },
          });
          if (matchedByWa) targetWargaId = matchedByWa.id;
        }
      }

      // Jika ada data warga terkait, hapus tuntas seluruh relasinya beserta entitas warga
      if (targetWargaId) {
        const wargaRecord = await tx.warga.findUnique({
          where: { id: targetWargaId },
          select: { id: true, namaLengkap: true, nik: true },
        });

        if (wargaRecord) {
          deletedWargaNama = wargaRecord.namaLengkap;

          // Hapus seluruh permohonan surat warga (requestHistory -> request)
          const userRequests = await tx.request.findMany({
            where: { applicantId: targetWargaId },
            select: { id: true },
          });
          const requestIds = userRequests.map((r) => r.id);
          if (requestIds.length > 0) {
            await tx.requestHistory.deleteMany({
              where: { requestId: { in: requestIds } },
            });
            await tx.request.deleteMany({
              where: { id: { in: requestIds } },
            });
          }

          // Hapus seluruh pengaduan warga (pengaduanHistory -> pengaduan)
          const userPengaduans = await tx.pengaduan.findMany({
            where: { pelaporId: targetWargaId },
            select: { id: true },
          });
          const pengaduanIds = userPengaduans.map((p) => p.id);
          if (pengaduanIds.length > 0) {
            await tx.pengaduanHistory.deleteMany({
              where: { pengaduanId: { in: pengaduanIds } },
            });
            await tx.pengaduan.deleteMany({
              where: { id: { in: pengaduanIds } },
            });
          }

          // Lepaskan log notifikasi terkait warga
          await tx.notificationLog.updateMany({
            where: { wargaId: targetWargaId },
            data: { wargaId: null },
          });

          // Putuskan hubungan wargaId pada akun user sebelum menghapus Warga
          await tx.user.update({
            where: { id: userId },
            data: { wargaId: null },
          });

          // Hapus entitas warga secara permanen
          await tx.warga.delete({
            where: { id: targetWargaId },
          });

          // Catat audit log penghapusan data warga
          await tx.auditLog.create({
            data: {
              action: 'DELETE_WARGA',
              userId: session.id,
              details: JSON.stringify({
                wargaId: targetWargaId,
                namaLengkap: wargaRecord.namaLengkap,
                nik: wargaRecord.nik,
                deletedVia: 'MANAJEMEN_AKUN_CASCADE',
              }),
            },
          });
        }
      }

      // Lepaskan audit log lama user
      await tx.auditLog.updateMany({
        where: { userId },
        data: { userId: null },
      });

      // Lepaskan createdById pada pengajuan surat dan riwayat
      await tx.request.updateMany({
        where: { createdById: userId },
        data: { createdById: null },
      });
      await tx.requestHistory.updateMany({
        where: { createdById: userId },
        data: { createdById: null },
      });

      // Lepaskan authorId pada info lingkungan
      await tx.lingkunganInfo.updateMany({
        where: { authorId: userId },
        data: { authorId: null },
      });

      // Alihkan author pengumuman & riwayat pengaduan ke admin yang menghapus
      await tx.pengumuman.updateMany({
        where: { authorId: userId },
        data: { authorId: session.id },
      });
      await tx.pengaduanHistory.updateMany({
        where: { authorId: userId },
        data: { authorId: session.id },
      });

      // Hapus akun pengguna secara permanen
      await tx.user.delete({
        where: { id: userId },
      });

      // Catat audit log penghapusan akun
      await tx.auditLog.create({
        data: {
          action: 'DELETE_USER',
          userId: session.id,
          details: JSON.stringify({
            deletedUserId: userId,
            deletedUsername: targetUser.username,
            deletedRole: targetUser.role.name,
            deletedWargaNama: deletedWargaNama || null,
          }),
        },
      });
    });

    safeRevalidatePath('/dashboard/manajemen-akun');
    safeRevalidatePath('/dashboard/manajemen-warga');
    safeRevalidatePath('/dashboard/admin');
    safeRevalidatePath('/dashboard/rt');
    safeRevalidatePath('/dashboard/rw');

    const successMessage = deletedWargaNama
      ? `Akun "${targetUser.username}" dan data kependudukan warga "${deletedWargaNama}" berhasil dihapus, total warga otomatis diperbarui.`
      : `Akun "${targetUser.username}" berhasil dihapus dari sistem.`;

    return {
      success: true,
      isDeleted: true,
      message: successMessage,
    };
  } catch (error: any) {
    return { error: error.message || 'Gagal menghapus akun.' };
  }
}

// ==========================================
// 7. GET REFERENCE DATA (ROLES, RWS, RTS, WARGA)
// ==========================================
export async function getReferenceDataAction() {
  try {
    await requireSuperAdmin();

    const [roles, rws, rts, unlinkedWarga] = await Promise.all([
      prisma.role.findMany({
        select: { id: true, name: true, description: true },
        orderBy: { name: 'asc' },
      }),
      prisma.rw.findMany({
        select: { id: true, nomor: true, namaKetua: true },
        orderBy: { nomor: 'asc' },
      }),
      prisma.rt.findMany({
        select: {
          id: true,
          nomor: true,
          rwId: true,
          namaKetua: true,
          rw: { select: { nomor: true } },
        },
        orderBy: [{ rw: { nomor: 'asc' } }, { nomor: 'asc' }],
      }),
      prisma.warga.findMany({
        where: { user: null, isActive: true },
        select: {
          id: true,
          namaLengkap: true,
          nik: true,
          email: true,
          noWhatsapp: true,
          rtId: true,
          rt: { select: { id: true, nomor: true, rwId: true, rw: { select: { id: true, nomor: true } } } },
        },
        orderBy: { namaLengkap: 'asc' },
        take: 200,
      }),
    ]);

    return {
      success: true,
      data: {
        roles,
        rws,
        rts,
        unlinkedWarga,
      },
    };
  } catch (error: any) {
    return { error: error.message || 'Gagal mengambil data referensi.' };
  }
}
