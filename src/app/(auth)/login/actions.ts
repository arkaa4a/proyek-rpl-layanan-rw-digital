'use server';

import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { createSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function loginAction(prevState: any, formData: FormData) {
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;

  if (!username || !password) {
    return { error: 'Username dan Password harus diisi.' };
  }

  // Cari user (include role)
  const user = await prisma.user.findUnique({
    where: { username },
    include: { role: true },
  });

  if (!user) {
    return { error: 'Username atau password salah.' };
  }

  // Cek Status Akun Aktif
  if (!user.isActive) {
    await prisma.auditLog.create({
      data: {
        action: 'LOGIN_BLOCKED_INACTIVE',
        userId: user.id,
        details: JSON.stringify({ reason: 'Account deactivated', username }),
      },
    });
    return { error: 'Akun Anda telah dinonaktifkan. Silakan hubungi Administrator.' };
  }

  // Verifikasi Password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    // Audit Log: Login Gagal
    await prisma.auditLog.create({
      data: {
        action: 'LOGIN_FAILED',
        details: JSON.stringify({ reason: 'Invalid password', username }),
      },
    });
    return { error: 'Username atau password salah.' };
  }

  // Audit Log: Login Berhasil
  await prisma.auditLog.create({
    data: {
      action: 'LOGIN_SUCCESS',
      userId: user.id,
      details: JSON.stringify({ role: user.role.name }),
    },
  });

  // Buat Session
  await createSession({
    id: user.id,
    username: user.username,
    role: user.role.name,
    rwId: user.rwId,
    rtId: user.rtId,
    wargaId: user.wargaId,
  });

  const role = user.role.name;
  if (role === 'SUPER_ADMIN') {
    redirect('/dashboard/admin');
  } else if (['ADMIN_RW', 'KETUA_RW'].includes(role)) {
    redirect('/dashboard/rw');
  } else if (role === 'KETUA_RT') {
    redirect('/dashboard/rt');
  } else {
    redirect('/dashboard/warga');
  }
}

export async function logoutAction() {
  try {
    const { deleteSession, getSession } = await import('@/lib/auth');
    
    try {
      const session = await getSession();
      if (session?.id) {
        await prisma.auditLog.create({
          data: { action: 'LOGOUT', userId: session.id as string },
        });
      }
    } catch (auditErr) {
      console.warn('Gagal mencatat audit log logout:', auditErr);
    }

    await deleteSession();
  } catch (error) {
    console.warn('logoutAction error:', error);
    try {
      const { deleteSession } = await import('@/lib/auth');
      await deleteSession();
    } catch {}
  }

  redirect('/login');
}

