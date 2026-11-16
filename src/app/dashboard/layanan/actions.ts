'use server';

import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { notifyRequestStatusChanged } from '@/lib/notification/notificationTriggers';

export async function createRequestAction(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  const serviceTypeId = formData.get('serviceTypeId') as string;
  let applicantId = formData.get('applicantId') as string;
  
  if (!applicantId && session.role === 'WARGA' && session.wargaId) {
    applicantId = session.wargaId;
  }

  if (!applicantId) {
    return { error: 'Pemohon belum ditentukan.' };
  }

  const formFieldsRaw = formData.get('formFieldsJson') as string;
  const jsonFields = formFieldsRaw ? JSON.parse(formFieldsRaw) : {};

  try {
    const applicant = await prisma.warga.findUnique({
      where: { id: applicantId },
      include: { rt: true }
    });

    if (!applicant) {
      return { error: 'Warga tidak ditemukan.' };
    }

    if (session.role !== 'SUPER_ADMIN') {
      if (session.role === 'WARGA' && applicant.id !== session.wargaId) {
        return { error: 'Unauthorized: Anda hanya dapat mengajukan untuk diri sendiri.' };
      }
      if (['ADMIN_RW', 'KETUA_RW'].includes(session.role) && applicant.rt?.rwId !== session.rwId) {
        return { error: 'Unauthorized: Warga berada di luar cakupan RW Anda.' };
      }
      if (session.role === 'KETUA_RT' && applicant.rtId !== session.rtId) {
        return { error: 'Unauthorized: Warga berada di luar cakupan RT Anda.' };
      }
    }

    const newRequest = await prisma.request.create({
      data: {
        serviceTypeId,
        applicantId,
        createdById: session.id, // siapa yang menekan tombol submit (bisa RT/RW untuk inclusive mode)
        formData: JSON.stringify(jsonFields),
        status: 'SUBMITTED',
      }
    });

    // Catat histori
    await prisma.requestHistory.create({
      data: {
        requestId: newRequest.id,
        status: 'SUBMITTED',
        note: 'Pengajuan dibuat',
        createdById: session.id
      }
    });

    // Kirim notifikasi pengajuan dibuat ke pemohon
    try {
      await notifyRequestStatusChanged({
        requestId: newRequest.id,
        status: 'SUBMITTED',
        note: 'Pengajuan surat berhasil didaftarkan.',
      });
    } catch (notifErr) {
      console.warn('Gagal memicu notifikasi pengajuan baru:', notifErr);
    }

    return { success: true, requestId: newRequest.id };
  } catch (error: any) {
    return { error: error.message };
  }
}

import { generateDocumentNumber } from '@/lib/document/numberGenerator';
import { generateQrCode } from '@/lib/document/qrGenerator';
import { generatePdf } from '@/lib/document/pdfGenerator';
import { getRequestDetails } from '@/lib/data-service';
import os from 'os';

function getAppBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  // Deteksi IP aktif di antarmuka jaringan lokal (Wi-Fi / Ethernet)
  const interfaces = os.networkInterfaces();
  let localIp = '';
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        localIp = iface.address;
        break;
      }
    }
    if (localIp) break;
  }

  if (localIp) {
    if (!envUrl || envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
      return `http://${localIp}:3000`;
    }
    const ipMatch = envUrl.match(/http:\/\/(\d+\.\d+\.\d+\.\d+)(:\d+)?/);
    if (ipMatch) {
      const port = ipMatch[2] || ':3000';
      return `http://${localIp}${port}`;
    }
    return envUrl;
  }

  return envUrl || 'http://localhost:3000';
}

const AUTHORIZED_RW_ROLES = ['SUPER_ADMIN', 'ADMIN_RW', 'KETUA_RW'];

export async function updateRequestStatusAction(requestId: string, newStatus: string, note?: string) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  if (session.role === 'WARGA') {
    return { error: 'Hanya pengurus yang dapat memproses pengajuan.' };
  }

  try {
    const reqDetail = await getRequestDetails(requestId);
    if (!reqDetail) throw new Error('Pengajuan tidak ditemukan');

    if (session.role !== 'SUPER_ADMIN') {
      if (['ADMIN_RW', 'KETUA_RW'].includes(session.role) && reqDetail.applicant.rt?.rwId !== session.rwId) {
        throw new Error('Unauthorized: Pengajuan berada di luar cakupan RW Anda');
      }
      if (session.role === 'KETUA_RT' && reqDetail.applicant.rtId !== session.rtId) {
        throw new Error('Unauthorized: Pengajuan berada di luar cakupan RT Anda');
      }
    }

    let finalStatus = newStatus;
    let docNumber = null;
    let qrData = null;
    let pdfUrl = null;
    let documentToken = null;

    // Prevent re-approving already issued documents
    if (newStatus === 'APPROVED' && ['APPROVED', 'DOCUMENT_ISSUED'].includes(reqDetail.status)) {
      throw new Error('Dokumen sudah pernah diterbitkan. Tidak dapat diterbitkan ulang.');
    }

    if (newStatus === 'APPROVED' && AUTHORIZED_RW_ROLES.includes(session.role)) {
      // 2. Generate Nomor Surat
      const rwId = reqDetail.applicant.rt?.rwId;
      const rwNomor = reqDetail.applicant.rt?.rw?.nomor;
      
      if (!rwId || !rwNomor) {
        throw new Error('Data RW pemohon tidak lengkap, tidak dapat menerbitkan nomor surat.');
      }

      docNumber = await generateDocumentNumber(rwId, rwNomor);

      // 3. Generate Secure Token & QR Code
      documentToken = crypto.randomUUID().replace(/-/g, '');
      const baseUrl = getAppBaseUrl();
      const verificationUrl = `${baseUrl.replace(/\/$/, '')}/verify/${documentToken}`;
      qrData = await generateQrCode(verificationUrl);

      // 4. Generate PDF
      const fileName = await generatePdf(reqDetail, docNumber, qrData);
      pdfUrl = `/api/documents/${requestId}`; // Route API yang akan dibuat untuk streaming file
      
      finalStatus = 'DOCUMENT_ISSUED';
    }

    await prisma.$transaction(async (tx) => {
      const updateData: any = { status: finalStatus };
      if (docNumber) updateData.documentNumber = docNumber;
      if (qrData) updateData.qrCode = qrData;
      if (pdfUrl) updateData.pdfUrl = pdfUrl;
      if (documentToken) {
        updateData.documentToken = documentToken;
        updateData.documentStatus = 'ACTIVE';
      }

      await tx.request.update({
        where: { id: requestId },
        data: updateData
      });

      await tx.requestHistory.create({
        data: {
          requestId,
          status: finalStatus,
          note: note || (finalStatus === 'DOCUMENT_ISSUED' ? 'Dokumen berhasil diterbitkan' : ''),
          createdById: session.id
        }
      });
    });

    // Tandai notifikasi pengajuan sebelumnya untuk requestId ini sebagai sudah dibaca
    try {
      await prisma.notificationLog.updateMany({
        where: {
          OR: [
            { referenceId: { startsWith: `SURAT_${requestId}` } },
            { metadata: { contains: `"requestId":"${requestId}"` } },
          ],
          isRead: false,
        },
        data: { isRead: true },
      });
    } catch (cleanErr) {
      console.warn('Gagal membersihkan status notifikasi lama:', cleanErr);
    }

    // Kirim notifikasi perubahan status surat ke pemohon
    try {
      await notifyRequestStatusChanged({
        requestId,
        status: finalStatus,
        note: note || (finalStatus === 'DOCUMENT_ISSUED' ? 'Dokumen berhasil diterbitkan' : undefined),
        documentNumber: docNumber || undefined,
      });
    } catch (notifErr) {
      console.warn('Gagal memicu notifikasi status pengajuan:', notifErr);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error update request:', error);
    return { error: error.message };
  }
}

export async function revokeDocumentAction(requestId: string) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  if (!AUTHORIZED_RW_ROLES.includes(session.role)) {
    return { error: 'Anda tidak memiliki akses untuk mencabut dokumen.' };
  }

  try {
    const req = await prisma.request.findUnique({ 
      where: { id: requestId },
      include: { applicant: { include: { rt: true } } }
    });
    if (!req) return { error: 'Pengajuan tidak ditemukan.' };
    
    if (session.role !== 'SUPER_ADMIN') {
      if (req.applicant.rt?.rwId !== session.rwId) {
        return { error: 'Unauthorized: Pengajuan berada di luar cakupan RW Anda' };
      }
    }
    
    if (req.documentStatus === 'REVOKED') {
      return { error: 'Dokumen sudah dicabut.' };
    }

    await prisma.request.update({
      where: { id: requestId },
      data: { documentStatus: 'REVOKED' }
    });

    await prisma.requestHistory.create({
      data: {
        requestId,
        status: req.status,
        note: 'Dokumen dicabut (Revoked) oleh Admin',
        createdById: session.id
      }
    });

    revalidatePath(`/dashboard/pengajuan/${requestId}`);

    try {
      await notifyRequestStatusChanged({
        requestId,
        status: 'REVOKED',
        note: 'Dokumen dicabut (Revoked) oleh Admin',
      });
    } catch (notifErr) {
      console.warn('Gagal memicu notifikasi pencabutan dokumen:', notifErr);
    }

    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
