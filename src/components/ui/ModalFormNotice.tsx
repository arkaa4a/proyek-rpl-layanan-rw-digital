'use client';

import React, { useState } from 'react';
import { createPengumumanAction, editPengumumanAction } from '@/app/dashboard/pengumuman/actions';

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  noticeToEdit?: any;
  userRole?: string;
  userRtId?: string | null;
  rtOptions?: { id: string; nomor: string }[];
  onSuccess: () => void;
};

export default function ModalFormNotice({
  isOpen,
  onClose,
  noticeToEdit,
  userRole,
  userRtId,
  rtOptions = [],
  onSuccess,
}: ModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // States untuk notifikasi & publikasi
  const [isPublished, setIsPublished] = useState(noticeToEdit ? noticeToEdit.isPublished !== false : true);
  const [sendNotification, setSendNotification] = useState(true);
  const [notificationChannel, setNotificationChannel] = useState<'BOTH' | 'EMAIL' | 'WHATSAPP'>('BOTH');
  const [selectedTargetRtId, setSelectedTargetRtId] = useState<string>(
    noticeToEdit?.targetRtId || (userRole === 'KETUA_RT' ? userRtId || '' : '')
  );

  if (!isOpen) return null;

  const isKetuaRt = userRole === 'KETUA_RT';

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set('prioritas', (formData.get('prioritas') === 'on').toString());
    formData.set('isPublished', isPublished ? 'true' : 'false');
    formData.set('sendNotification', sendNotification && isPublished ? 'true' : 'false');
    formData.set('notificationChannel', notificationChannel);

    if (isKetuaRt && userRtId) {
      formData.set('targetRtId', userRtId);
    } else if (selectedTargetRtId) {
      formData.set('targetRtId', selectedTargetRtId);
    } else {
      formData.delete('targetRtId');
    }

    let res;
    if (noticeToEdit) {
      res = await editPengumumanAction(noticeToEdit.id, formData);
    } else {
      res = await createPengumumanAction(formData);
    }

    setIsSubmitting(false);

    if (res.error) {
      setError(res.error);
    } else {
      onSuccess();
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.5)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          borderRadius: '1rem',
          width: '90%',
          maxWidth: '560px',
          padding: '2rem',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'rgba(0,0,0,0.04)',
            border: 'none',
            cursor: 'pointer',
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--secondary-foreground)',
          }}
          aria-label="Tutup"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <h2 style={{ fontSize: '1.35rem', fontWeight: 'bold', marginBottom: '1.25rem', color: 'var(--foreground)' }}>
          {noticeToEdit ? 'Edit Pengumuman' : 'Tambah Pengumuman Baru'}
        </h2>

        {error && (
          <div
            style={{
              padding: '0.85rem 1rem',
              background: '#fee2e2',
              color: '#991b1b',
              borderRadius: '8px',
              marginBottom: '1rem',
              fontSize: '0.875rem',
              border: '1px solid #fecaca',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Judul */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Judul Pengumuman</label>
            <input
              name="judul"
              defaultValue={noticeToEdit?.judul}
              placeholder="Contoh: Kerja Bakti Massal Lingkungan RW"
              required
              style={{
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--foreground)',
              }}
            />
          </div>

          {/* Kategori */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Kategori</label>
            <select
              name="kategori"
              defaultValue={noticeToEdit?.kategori || 'Kegiatan Warga'}
              required
              style={{
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--foreground)',
              }}
            >
              <option value="Gotong Royong">Gotong Royong & Kerja Bakti</option>
              <option value="Rapat Warga">Rapat Warga & Pertemuan RT/RW</option>
              <option value="Posyandu">Posyandu & Kesehatan Sosial</option>
              <option value="Informasi Pelayanan">Informasi Jadwal Pelayanan Administrasi</option>
              <option value="Keamanan">Keamanan & Ketertiban Lingkungan</option>
              <option value="Kegiatan Warga">Kegiatan Warga & Lainnya</option>
            </select>
          </div>

          {/* Konten */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Konten / Isi Lengkap</label>
            <textarea
              name="konten"
              defaultValue={noticeToEdit?.konten}
              placeholder="Tuliskan isi pengumuman secara rinci untuk warga..."
              required
              rows={4}
              style={{
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                resize: 'vertical',
                background: 'var(--surface)',
                color: 'var(--foreground)',
              }}
            />
          </div>

          {/* Tanggal & Lokasi (Grid 2 kolom) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Jadwal / Waktu (Opsional)</label>
              <input
                type="datetime-local"
                name="tanggalKegiatan"
                defaultValue={noticeToEdit?.tanggalKegiatan ? (() => {
                  const d = new Date(noticeToEdit.tanggalKegiatan);
                  if (isNaN(d.getTime())) return noticeToEdit.tanggalKegiatan;
                  const pad = (n: number) => String(n).padStart(2, '0');
                  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                })() : ''}
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--foreground)',
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Lokasi Kegiatan (Opsional)</label>
              <input
                name="lokasiKegiatan"
                defaultValue={noticeToEdit?.lokasiKegiatan}
                placeholder="Contoh: Balai Warga RW 01"
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--foreground)',
                }}
              />
            </div>
          </div>

          {/* Target Penerima (Wilayah Scope) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.25rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Target Sasaran Warga</label>
            {isKetuaRt ? (
              <div
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  background: '#f1f5f9',
                  border: '1px solid var(--border)',
                  fontSize: '0.85rem',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>Pengumuman khusus untuk <strong>Warga RT Anda</strong> (Sesuai kewenangan Ketua RT).</span>
              </div>
            ) : (
              <select
                value={selectedTargetRtId}
                onChange={(e) => setSelectedTargetRtId(e.target.value)}
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--foreground)',
                }}
              >
                <option value="">Seluruh Warga Lingkungan RW (Semua RT)</option>
                {rtOptions.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    Khusus Warga RT {rt.nomor}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Status Publikasi: Draf vs Publikasikan */}
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Status Publikasi</span>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="pub_choice"
                    checked={isPublished}
                    onChange={() => setIsPublished(true)}
                  />
                  <span>Publikasikan</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="pub_choice"
                    checked={!isPublished}
                    onChange={() => setIsPublished(false)}
                  />
                  <span style={{ color: '#d97706' }}>Simpan Draf</span>
                </label>
              </div>
            </div>
            {!isPublished && (
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#b45309', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Pengumuman berstatus Draf tidak akan ditampilkan ke warga umum dan tidak memicu pengiriman notifikasi.
              </p>
            )}
          </div>

          {/* Opsi Notifikasi Otomatis (Email & WhatsApp) */}
          {isPublished && !noticeToEdit && (
            <div
              style={{
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid #bfdbfe',
                background: '#eff6ff',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="sendNotification"
                  checked={sendNotification}
                  onChange={(e) => setSendNotification(e.target.checked)}
                  style={{ width: '1.15rem', height: '1.15rem', cursor: 'pointer' }}
                />
                <label htmlFor="sendNotification" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e40af', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                  </svg>
                  Kirim Notifikasi Otomatis ke Warga
                </label>
              </div>

              {sendNotification && (
                <div style={{ paddingLeft: '1.65rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e3a8a' }}>Pilih Kanal Pengiriman:</label>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="notif_channel"
                        checked={notificationChannel === 'BOTH'}
                        onChange={() => setNotificationChannel('BOTH')}
                      />
                      <span>Email & WhatsApp (Keduanya)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="notif_channel"
                        checked={notificationChannel === 'EMAIL'}
                        onChange={() => setNotificationChannel('EMAIL')}
                      />
                      <span>Hanya Email</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="notif_channel"
                        checked={notificationChannel === 'WHATSAPP'}
                        onChange={() => setNotificationChannel('WHATSAPP')}
                      />
                      <span>Hanya WhatsApp</span>
                    </label>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.725rem', color: '#3b82f6' }}>
                    Sistem secara otomatis memvalidasi alamat email dan nomor WhatsApp serta menghormati preferensi warga.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Prioritas */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
            <input
              type="checkbox"
              name="prioritas"
              id="prioritas"
              defaultChecked={noticeToEdit?.prioritas}
              style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer' }}
            />
            <label htmlFor="prioritas" style={{ fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="17" x2="12" y2="22" />
                <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
              </svg>
              Sematkan sebagai Prioritas Utama (Paling Atas)
            </label>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn"
              style={{ flex: 1, border: '1px solid var(--border)', background: 'transparent' }}
            >
              Batal
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isSubmitting}>
              {isSubmitting ? 'Menyimpan & Mengirim...' : isPublished ? 'Publikasikan' : 'Simpan Draf'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
