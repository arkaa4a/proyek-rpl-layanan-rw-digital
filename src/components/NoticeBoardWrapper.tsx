import React from 'react';
import { getPengumumanList } from '@/app/dashboard/pengumuman/actions';
import NoticeBoardList from './ui/NoticeBoardList';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';

export default async function NoticeBoardWrapper() {
  const session = await getSession();
  let rwId = session?.rwId;
  
  if (!rwId && session?.rtId) {
    const rtInfo = await prisma.rt.findUnique({ where: { id: session.rtId } });
    rwId = rtInfo?.rwId || null;
  }

  // To keep it simple and global across the app (or scoped to the current user's RW if they are logged in and have an RW context)
  const canManage = session ? ['SUPER_ADMIN', 'ADMIN_RW', 'KETUA_RW', 'KETUA_RT'].includes(session.role) : false;
  const notices = await getPengumumanList(rwId || undefined, canManage);

  let rtOptions: { id: string; nomor: string }[] = [];
  if (canManage && rwId) {
    rtOptions = await prisma.rt.findMany({
      where: { rwId },
      select: { id: true, nomor: true },
      orderBy: { nomor: 'asc' },
    });
  }

  return (
    <NoticeBoardList
      initialNotices={notices}
      canManage={canManage}
      userRole={session?.role}
      userRtId={session?.rtId}
      rtOptions={rtOptions}
    />
  );
}
