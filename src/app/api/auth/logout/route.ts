import { NextResponse } from 'next/server';
import { deleteSession, getSession } from '@/lib/auth';
import prisma from '@/lib/db';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (session?.id) {
      try {
        await prisma.auditLog.create({
          data: { action: 'LOGOUT', userId: session.id as string },
        });
      } catch (logErr) {
        console.warn('Gagal mencatat audit log logout API:', logErr);
      }
    }
  } catch (sessionErr) {
    console.warn('Gagal membaca sesi saat logout API:', sessionErr);
  }

  try {
    await deleteSession();
  } catch (err) {
    console.error('Gagal menghapus session cookie:', err);
  }

  // Cek apakah request dari form HTML standar (native submit)
  const acceptHeader = req.headers.get('accept') || '';
  if (acceptHeader.includes('text/html')) {
    return NextResponse.redirect(new URL('/login', req.url), 303);
  }

  return NextResponse.json({ success: true, redirectUrl: '/login' });
}

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (session?.id) {
      try {
        await prisma.auditLog.create({
          data: { action: 'LOGOUT', userId: session.id as string },
        });
      } catch {}
    }
  } catch {}

  try {
    await deleteSession();
  } catch {}

  return NextResponse.redirect(new URL('/login', req.url), 303);
}
