'use client';

import React, { useState } from 'react';
import { updateRequestStatusAction, revokeDocumentAction } from '../../layanan/actions';
import { useRouter } from 'next/navigation';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';

export default function RequestDetailClient({ request, userRole }: { request: any, userRole: string }) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState(''); // 'APPROVE', 'REJECT', 'REVISION'
  const [note, setNote] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [isRevokePending, setIsRevokePending] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canApproveRT = userRole === 'KETUA_RT' && ['SUBMITTED', 'REVISION_REQUIRED'].includes(request.status);
  const canApproveRW = ['KETUA_RW', 'ADMIN_RW', 'SUPER_ADMIN'].includes(userRole) && request.status === 'VERIFIED_RT';
  
  const handleActionClick = (action: string) => {
    setModalAction(action);
    setNote('');
    setIsModalOpen(true);
  };

  const handleSubmitAction = async () => {
    setIsPending(true);
    setError(null);
    let newStatus = '';
    
    if (modalAction === 'APPROVE') {
      newStatus = userRole === 'KETUA_RT' ? 'VERIFIED_RT' : 'APPROVED';
    } else if (modalAction === 'REJECT') {
      newStatus = 'REJECTED';
    } else if (modalAction === 'REVISION') {
      newStatus = 'REVISION_REQUIRED';
    }

    const res = await updateRequestStatusAction(request.id, newStatus, note);
    setIsPending(false);
    
    if (res.error) {
      setError(res.error);
    } else {
      setIsModalOpen(false);
      router.refresh();
    }
  };

  const handleConfirmRevoke = async () => {
    setIsRevokePending(true);
    setRevokeError(null);
    const res = await revokeDocumentAction(request.id);
    setIsRevokePending(false);
    if (res?.error) {
      setRevokeError(res.error);
    } else {
      setIsRevokeModalOpen(false);
      router.refresh();
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'SUBMITTED': return <span style={{ padding: '0.25rem 0.5rem', background: 'var(--primary)', color: 'white', borderRadius: '4px', fontSize: '0.75rem' }}>Diajukan</span>;
      case 'VERIFIED_RT': return <span style={{ padding: '0.25rem 0.5rem', background: '#eab308', color: 'white', borderRadius: '4px', fontSize: '0.75rem' }}>Verifikasi RT</span>;
      case 'APPROVED': return <span style={{ padding: '0.25rem 0.5rem', background: '#22c55e', color: 'white', borderRadius: '4px', fontSize: '0.75rem' }}>Disetujui RW</span>;
      case 'REJECTED': return <span style={{ padding: '0.25rem 0.5rem', background: 'var(--error)', color: 'white', borderRadius: '4px', fontSize: '0.75rem' }}>Ditolak</span>;
      case 'REVISION_REQUIRED': return <span style={{ padding: '0.25rem 0.5rem', background: '#f97316', color: 'white', borderRadius: '4px', fontSize: '0.75rem' }}>Perlu Revisi</span>;
      default: return <span style={{ padding: '0.25rem 0.5rem', background: 'var(--secondary-foreground)', color: 'white', borderRadius: '4px', fontSize: '0.75rem' }}>{status}</span>;
    }
  };

  const formData = request.formData ? JSON.parse(request.formData) : {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="card glass">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Detail Pengajuan</h2>
            <p style={{ color: 'var(--secondary-foreground)', fontSize: '0.875rem' }}>Nomor: {request.id.split('-')[0].toUpperCase()}</p>
          </div>
          <div>{getStatusBadge(request.status)}</div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          <div>
            <p style={{ color: 'var(--secondary-foreground)', marginBottom: '0.25rem' }}>Layanan</p>
            <p style={{ fontWeight: 500 }}>{request.serviceType.name}</p>
          </div>
          <div>
            <p style={{ color: 'var(--secondary-foreground)', marginBottom: '0.25rem' }}>Pemohon</p>
            <p style={{ fontWeight: 500 }}>{request.applicant.namaLengkap} (NIK: {request.applicant.nik})</p>
          </div>
          <div>
            <p style={{ color: 'var(--secondary-foreground)', marginBottom: '0.25rem' }}>RT / RW</p>
            <p style={{ fontWeight: 500 }}>RT {request.applicant.rt?.nomor || '-'} / RW {request.applicant.rt?.rw?.nomor || '-'}</p>
          </div>
          <div>
            <p style={{ color: 'var(--secondary-foreground)', marginBottom: '0.25rem' }}>Tanggal Pengajuan</p>
            <p style={{ fontWeight: 500 }}>{new Date(request.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>

        {request.pdfUrl && (
          <div style={{ padding: '1rem', background: request.documentStatus === 'REVOKED' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)', border: `1px solid ${request.documentStatus === 'REVOKED' ? '#ef4444' : '#22c55e'}`, borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h4 style={{ fontWeight: 'bold', color: request.documentStatus === 'REVOKED' ? '#991b1b' : '#166534', marginBottom: '0.25rem' }}>Dokumen Telah Terbit</h4>
              <p style={{ fontSize: '0.875rem', color: request.documentStatus === 'REVOKED' ? '#7f1d1d' : '#14532d' }}>No. Surat: {request.documentNumber}</p>
              {request.documentStatus === 'REVOKED' && (
                <p style={{ fontSize: '0.875rem', color: '#dc2626', fontWeight: 'bold', marginTop: '0.5rem' }}>STATUS: DICABUT (REVOKED)</p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {request.documentStatus !== 'REVOKED' && ['SUPER_ADMIN', 'ADMIN_RW', 'KETUA_RW'].includes(userRole) && (
                <button
                  type="button"
                  onClick={() => {
                    setIsRevokeModalOpen(true);
                    setRevokeError(null);
                  }}
                  disabled={isRevokePending}
                  className="btn"
                  style={{ background: 'var(--error)', color: 'white' }}
                >
                  {isRevokePending ? 'Memproses...' : 'Cabut Dokumen'}
                </button>
              )}
              <a href={request.pdfUrl} target="_blank" className="btn btn-primary" rel="noreferrer">
                Lihat Dokumen (PDF)
              </a>
            </div>
          </div>
        )}

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Data Formulir</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', fontSize: '0.875rem' }}>
            {Object.keys(formData).map(key => (
              <div key={key}>
                <p style={{ color: 'var(--secondary-foreground)', marginBottom: '0.25rem', textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                <p style={{ fontWeight: 500, padding: '0.75rem', background: 'var(--background)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  {formData[key]}
                </p>
              </div>
            ))}
          </div>
        </div>

        {(canApproveRT || canApproveRW) && (
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
            <button onClick={() => handleActionClick('APPROVE')} className="btn btn-primary">Verifikasi / Setujui</button>
            <button onClick={() => handleActionClick('REVISION')} className="btn" style={{ background: '#f97316', color: 'white' }}>Minta Revisi</button>
            <button onClick={() => handleActionClick('REJECT')} className="btn" style={{ background: 'var(--error)', color: 'white' }}>Tolak</button>
          </div>
        )}
      </div>

      <div className="card glass">
        <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Timeline Riwayat</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {request.histories.map((hist: any) => (
            <div key={hist.id} style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--primary)', marginTop: '4px' }}></div>
                <div style={{ width: '2px', height: '100%', background: 'var(--border)', flexGrow: 1, minHeight: '30px' }}></div>
              </div>
              <div style={{ paddingBottom: '1rem' }}>
                <p style={{ fontWeight: 'bold', fontSize: '0.875rem', marginBottom: '0.25rem' }}>{getStatusBadge(hist.status)}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--secondary-foreground)', marginBottom: '0.25rem' }}>
                  {new Date(hist.createdAt).toLocaleString('id-ID')} - Oleh: {hist.createdBy?.username || 'Sistem'}
                </p>
                {hist.note && <p style={{ fontSize: '0.875rem', marginTop: '0.5rem', fontStyle: 'italic', color: 'var(--secondary-foreground)' }}>"{hist.note}"</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div onClick={(e) => e.stopPropagation()} className="card glass" style={{ width: '100%', maxWidth: '400px', background: 'var(--card)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              {modalAction === 'APPROVE' ? 'Konfirmasi Persetujuan' : modalAction === 'REJECT' ? 'Tolak Pengajuan' : 'Minta Revisi'}
            </h3>
            {error && <p style={{ color: 'var(--error)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</p>}
            
            <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>Catatan / Alasan (Opsional untuk Setuju)</label>
            <textarea 
              value={note} 
              onChange={e => setNote(e.target.value)}
              rows={3}
              required={modalAction !== 'APPROVE'}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--background)', marginBottom: '1.5rem' }}
              placeholder="Masukkan alasan atau instruksi revisi..."
            ></textarea>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button onClick={() => setIsModalOpen(false)} className="btn" disabled={isPending}>Batal</button>
              <button onClick={handleSubmitAction} className="btn btn-primary" disabled={isPending}>
                {isPending ? 'Memproses...' : 'Konfirmasi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog Pencabutan Dokumen */}
      <ConfirmationDialog
        isOpen={isRevokeModalOpen}
        title="Cabut Keabsahan Dokumen?"
        message="Apakah Anda yakin ingin mencabut dokumen resmi ini? Dokumen yang telah dicabut tidak lagi sah untuk keperluan administratif dan tindakan ini tidak dapat dibatalkan."
        itemName={request.documentNumber ? `No. Dokumen: ${request.documentNumber}` : request.serviceType?.name}
        confirmText="Ya, Cabut Dokumen"
        cancelText="Batal"
        isDestructive={true}
        isLoading={isRevokePending}
        error={revokeError}
        onConfirm={handleConfirmRevoke}
        onCancel={() => {
          if (!isRevokePending) {
            setIsRevokeModalOpen(false);
            setRevokeError(null);
          }
        }}
      />
    </div>
  );
}
