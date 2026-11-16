import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { id } = await params;

  // Validate request exists and check authorization
  const request = await prisma.request.findUnique({
    where: { id },
    include: { applicant: { include: { rt: true } } }
  });

  if (!request || !request.pdfUrl) {
    return new NextResponse('Document not found', { status: 404 });
  }

  if (session.role !== 'SUPER_ADMIN') {
    if (session.role === 'WARGA' && request.applicantId !== session.wargaId) {
      return new NextResponse('Document not found', { status: 404 });
    }
    if (['ADMIN_RW', 'KETUA_RW'].includes(session.role) && request.applicant.rt?.rwId !== session.rwId) {
      return new NextResponse('Document not found', { status: 404 });
    }
    if (session.role === 'KETUA_RT' && request.applicant.rtId !== session.rtId) {
      return new NextResponse('Document not found', { status: 404 });
    }
  }

  // File serving
  const fileName = `doc-${id}.pdf`;
  const filePath = path.join(process.cwd(), 'storage', 'documents', fileName);

  if (!fs.existsSync(filePath)) {
    return new NextResponse('File missing from storage', { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);

  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${fileName}"`,
    }
  });
}
