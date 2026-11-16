'use server';

import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { createSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const registerSchema = z.object({
  nik: z.string().trim().regex(/^\d{16}$/, 'NIK harus terdiri dari tepat 16 digit angka.'),
  namaLengkap: z.string().trim().min(2, 'Nama lengkap minimal 2 karakter.').max(100, 'Nama lengkap maksimal 100 karakter.'),
  rtId: z.string().min(1, 'Silakan pilih RT domisili Anda.'),
  nomorKk: z.string().trim().optional().or(z.literal('')),
  alamat: z.string().trim().max(255, 'Alamat maksimal 255 karakter.').optional().or(z.literal('')),
  noWhatsapp: z.string().trim().max(25, 'Nomor WhatsApp maksimal 25 digit.').optional().or(z.literal('')),
  email: z.string().trim().email('Format email tidak valid.').optional().or(z.literal('')),
  username: z.string().trim().min(3, 'Username minimal 3 karakter.').max(30, 'Username maksimal 30 karakter.')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Username hanya boleh huruf, angka, titik, strip, dan underscore.'),
  password: z.string().min(6, 'Kata sandi minimal 6 karakter.'),
  confirmPassword: z.string().min(6, 'Konfirmasi kata sandi minimal 6 karakter.'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Konfirmasi kata sandi tidak cocok dengan kata sandi.',
  path: ['confirmPassword'],
}).refine((data) => {
  if (data.nomorKk && data.nomorKk.trim().length > 0) {
    return /^\d{16}$/.test(data.nomorKk.trim());
  }
  return true;
}, {
  message: 'Nomor Kartu Keluarga harus terdiri dari tepat 16 digit angka.',
  path: ['nomorKk'],
});

export type RegisterState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
  message?: string;
} | null;

export async function registerAction(prevState: RegisterState, formData: FormData): Promise<RegisterState> {
  const rawData = {
    nik: (formData.get('nik') as string || '').trim(),
    namaLengkap: (formData.get('namaLengkap') as string || '').trim(),
    rtId: (formData.get('rtId') as string || '').trim(),
    nomorKk: (formData.get('nomorKk') as string || '').trim(),
    alamat: (formData.get('alamat') as string || '').trim(),
    noWhatsapp: (formData.get('noWhatsapp') as string || '').trim(),
    email: (formData.get('email') as string || '').trim(),
    username: (formData.get('username') as string || '').trim(),
    password: (formData.get('password') as string || ''),
    confirmPassword: (formData.get('confirmPassword') as string || ''),
  };

  const parsed = registerSchema.safeParse(rawData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as string;
      if (field && !fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return {
      error: parsed.error.issues[0]?.message || 'Input formulir pendaftaran tidak valid.',
      fieldErrors,
    };
  }

  const {
    nik,
    namaLengkap,
    rtId,
    nomorKk,
    alamat,
    noWhatsapp,
    email,
    username,
    password,
  } = parsed.data;

  try {
    // 1. Cek duplikasi username
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });
    if (existingUser) {
      return {
        error: `Username "${username}" sudah digunakan. Silakan gunakan username lain.`,
        fieldErrors: { username: 'Username sudah digunakan' },
      };
    }

    // 2. Validasi RT
    const selectedRt = await prisma.rt.findUnique({
      where: { id: rtId },
      include: { rw: true },
    });
    if (!selectedRt) {
      return {
        error: 'Pilihan RT tidak valid dalam sistem.',
        fieldErrors: { rtId: 'RT tidak ditemukan' },
      };
    }

    // 3. Cek data Warga berdasarkan NIK
    let finalWargaId: string;
    let finalRtId = selectedRt.id;
    let finalRwId = selectedRt.rwId;

    const existingWarga = await prisma.warga.findUnique({
      where: { nik },
      include: { user: true, rt: true, keluarga: true },
    });

    if (existingWarga) {
      if (existingWarga.user) {
        return {
          error: 'NIK ini sudah terdaftar dan telah memiliki akun aktif. Silakan langsung masuk melalui halaman login.',
          fieldErrors: { nik: 'NIK sudah terdaftar dan memiliki akun' },
        };
      }

      // Warga sudah terdata oleh admin/RT tapi belum memiliki akun login
      // Tautkan akun baru ini ke data warga yang sudah ada
      finalWargaId = existingWarga.id;
      finalRtId = existingWarga.rtId || selectedRt.id;
      finalRwId = existingWarga.rt?.rwId || selectedRt.rwId;

      // Update data kontak jika warga belum memilikinya
      const updateData: { email?: string; noWhatsapp?: string } = {};
      if (!existingWarga.email && email) updateData.email = email;
      if (!existingWarga.noWhatsapp && noWhatsapp) updateData.noWhatsapp = noWhatsapp;
      if (Object.keys(updateData).length > 0) {
        await prisma.warga.update({
          where: { id: existingWarga.id },
          data: updateData,
        });
      }
    } else {
      // Warga belum ada di database, buat entitas Warga baru
      let finalKeluargaId: string | null = null;
      if (nomorKk && nomorKk.length === 16) {
        let existingKeluarga = await prisma.keluarga.findUnique({
          where: { nomorKk },
        });
        if (!existingKeluarga) {
          existingKeluarga = await prisma.keluarga.create({
            data: {
              nomorKk,
              alamat: alamat || `RT ${selectedRt.nomor}/RW ${selectedRt.rw?.nomor || '01'}`,
            },
          });
        }
        finalKeluargaId = existingKeluarga.id;
      }

      const newWarga = await prisma.warga.create({
        data: {
          nik,
          namaLengkap,
          email: email || null,
          noWhatsapp: noWhatsapp || null,
          rtId: selectedRt.id,
          keluargaId: finalKeluargaId,
          isActive: true,
        },
      });

      finalWargaId = newWarga.id;
    }

    // 4. Cari atau pastikan Role WARGA
    let wargaRole = await prisma.role.findUnique({
      where: { name: 'WARGA' },
    });
    if (!wargaRole) {
      wargaRole = await prisma.role.create({
        data: {
          name: 'WARGA',
          description: 'Warga terdaftar di lingkungan RT/RW',
        },
      });
    }

    // 5. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 6. Buat Akun User
    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        roleId: wargaRole.id,
        email: email || null,
        noWhatsapp: noWhatsapp || null,
        wargaId: finalWargaId,
        rtId: finalRtId,
        rwId: finalRwId,
        isActive: true,
      },
    });

    // 7. Catat Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          action: 'REGISTER_SUCCESS',
          userId: newUser.id,
          details: JSON.stringify({
            username: newUser.username,
            nik,
            namaLengkap,
            rtId: finalRtId,
            wargaId: finalWargaId,
            registeredAt: new Date().toISOString(),
          }),
        },
      });
    } catch (auditErr) {
      console.warn('Gagal mencatat audit log registrasi:', auditErr);
    }

    // 8. Kirim Welcome In-App Notification
    try {
      await prisma.notificationLog.create({
        data: {
          type: 'PENGAJUAN_SURAT',
          channel: 'IN_APP',
          recipient: newUser.id,
          recipientName: namaLengkap,
          subject: 'Selamat Datang di Pelayanan Digital RW!',
          content: `Halo ${namaLengkap}, akun warga Anda berhasil didaftarkan. Anda sekarang dapat mengajukan surat pengantar secara mandiri dan memantau status secara langsung.`,
          status: 'SENT',
          referenceId: `WELCOME_${newUser.id}`,
          metadata: JSON.stringify({
            inApp: { read: false },
          }),
          userId: newUser.id,
          wargaId: finalWargaId,
        },
      });
    } catch (notifErr) {
      console.warn('Gagal membuat welcome notification:', notifErr);
    }

    // 9. Otomatis buat sesi login
    await createSession({
      id: newUser.id,
      username: newUser.username,
      role: 'WARGA',
      rwId: finalRwId,
      rtId: finalRtId,
      wargaId: finalWargaId,
    });
  } catch (error: any) {
    if (error?.message === 'NEXT_REDIRECT' || error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    console.error('Error in registerAction:', error);
    return {
      error: error.message || 'Terjadi kesalahan sistem saat mendaftarkan akun. Silakan coba beberapa saat lagi.',
    };
  }

  // 10. Redirect ke dashboard warga
  redirect('/dashboard/warga');
}
