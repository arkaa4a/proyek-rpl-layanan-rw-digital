'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { updatePengaduanStatusAction } from '@/app/dashboard/pengaduan/actions';
import { getStatusBadge } from '../PengaduanPengurusClient';

interface PengaduanDetailClientProps {
  pengaduan: {
    id: string;
    judul: string;
    kategori: string;
    deskripsi: string;
    lokasi: string;
    status: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    pelapor: {
      id: string;
      namaLengkap: string;
    };
    rt: {
      id: string;
      nomor: string;
    } | null;
    rw: {
      id: string;
      nomor: string;
    } | null;
    history: Array<{
      id: string;
      status: string;
      catatan: string | null;
      createdAt: string | Date;
      author: {
        id: string;
        username: string;
        role: {
          name: string;
          description: string | null;
        } | null;
      };
    }>;
  };
  userRole: string;
}

export default function PengaduanPengurusDetailClient({
  pengaduan,
  userRole,
}: PengaduanDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('DIPROSES');
  const [catatan, setCatatan] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const statusBadge = getStatusBadge(pengaduan.status);

  const handleOpenModal = (newStatus: string) => {
    setSelectedStatus(newStatus);
    setCatatan('');
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleUpdateStatus = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    startTransition(async () => {
      const res = await updatePengaduanStatusAction(
        pengaduan.id,
        selectedStatus,
        catatan.trim() || null
      );

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(`Status pengaduan berhasil diperbarui menjadi ${selectedStatus}.`);
        setIsModalOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
        maxWidth: '850px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* Navigasi Kembali */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Link
          href="/dashboard/pengaduan-warga"
          style={{
            color: 'var(--primary)',
            fontWeight: 500,
            fontSize: '0.875rem',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          &larr; Kembali ke Kelola Pengaduan
        </Link>
      </div>

      {/* Alert Sukses */}
      {successMsg && (
        <div
          className="card"
          style={{
            backgroundColor: 'rgba(34, 197, 94, 0.08)',
            borderColor: 'rgba(34, 197, 94, 0.3)',
            color: '#16a34a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2px',
            }}
            aria-label="Tutup pesan sukses"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Card Utama: Informasi Pengaduan */}
      <div className="card glass">
        {/* Header Rincian */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '1rem',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '1.25rem',
            marginBottom: '1.5rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '0.2rem 0.55rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--secondary)',
                  color: 'var(--secondary-foreground)',
                }}
              >
                Kategori: {pengaduan.kategori.replace('_', ' ')}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--secondary-foreground)' }}>
                ID: {pengaduan.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: 'var(--foreground)',
                lineHeight: 1.3,
              }}
            >
              {pengaduan.judul}
            </h1>
          </div>

          <span
            style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              padding: '0.35rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: statusBadge.bg,
              color: statusBadge.color,
              border: `1px solid ${statusBadge.border}`,
            }}
          >
            {statusBadge.label}
          </span>
        </div>

        {/* Metadata Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.25rem',
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
          }}
        >
          <div>
            <p style={{ color: 'var(--secondary-foreground)', fontSize: '0.8rem', marginBottom: '0.2rem' }}>
              Nama Pelapor
            </p>
            <p style={{ fontWeight: 600 }}>{pengaduan.pelapor.namaLengkap}</p>
          </div>

          <div>
            <p style={{ color: 'var(--secondary-foreground)', fontSize: '0.8rem', marginBottom: '0.2rem' }}>
              Wilayah Domisili
            </p>
            <p style={{ fontWeight: 600 }}>
              RT {pengaduan.rt?.nomor || '-'} / RW {pengaduan.rw?.nomor || '-'}
            </p>
          </div>

          <div>
            <p style={{ color: 'var(--secondary-foreground)', fontSize: '0.8rem', marginBottom: '0.2rem' }}>
              Tanggal Laporan
            </p>
            <p style={{ fontWeight: 600 }}>
              {new Date(pengaduan.createdAt).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              WIB
            </p>
          </div>
        </div>

        {/* Lokasi */}
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ color: 'var(--secondary-foreground)', fontSize: '0.825rem', marginBottom: '0.35rem', fontWeight: 600 }}>
            Lokasi Kejadian / Titik Fasilitas
          </p>
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--background)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
              fontSize: '0.9rem',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span style={{ fontWeight: 500 }}>{pengaduan.lokasi}</span>
          </div>
        </div>

        {/* Deskripsi */}
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ color: 'var(--secondary-foreground)', fontSize: '0.825rem', marginBottom: '0.35rem', fontWeight: 600 }}>
            Deskripsi Pengaduan
          </p>
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'var(--background)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              fontSize: '0.9rem',
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
            }}
          >
            {pengaduan.deskripsi}
          </div>
        </div>

        {/* Tombol Tindak Lanjut Pengurus */}
        <div
          style={{
            borderTop: '1px solid var(--border)',
            paddingTop: '1.5rem',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '0.875rem', fontWeight: 600, marginRight: '0.5rem' }}>
            Tindak Lanjut Pengurus ({userRole}):
          </span>

          {pengaduan.status === 'DILAPORKAN' && (
            <button
              type="button"
              onClick={() => handleOpenModal('DITINJAU')}
              className="btn"
              style={{ backgroundColor: '#eab308', color: 'white' }}
            >
              Tandai Ditinjau
            </button>
          )}

          {['DILAPORKAN', 'DITINJAU'].includes(pengaduan.status) && (
            <button
              type="button"
              onClick={() => handleOpenModal('DIPROSES')}
              className="btn btn-primary"
            >
              Mulai Proses Penanganan
            </button>
          )}

          {pengaduan.status === 'DIPROSES' && (
            <button
              type="button"
              onClick={() => handleOpenModal('SELESAI')}
              className="btn"
              style={{ backgroundColor: 'var(--success)', color: 'white' }}
            >
              Selesaikan Laporan
            </button>
          )}

          {pengaduan.status !== 'SELESAI' && pengaduan.status !== 'DITOLAK' && (
            <button
              type="button"
              onClick={() => handleOpenModal('DITOLAK')}
              className="btn"
              style={{ backgroundColor: 'var(--error)', color: 'white' }}
            >
              Tolak Pengaduan
            </button>
          )}
        </div>
      </div>

      {/* Card Timeline Riwayat & Tanggapan */}
      <div className="card glass">
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
            Timeline Riwayat & Tanggapan
          </h2>
          <p style={{ color: 'var(--secondary-foreground)', fontSize: '0.85rem' }}>
            Log kronologis penanganan laporan pengaduan oleh jajaran pengurus.
          </p>
        </div>

        {pengaduan.history.length === 0 ? (
          <p style={{ color: 'var(--secondary-foreground)', fontSize: '0.875rem' }}>
            Belum ada catatan riwayat penanganan.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {pengaduan.history.map((hist, index) => {
              const hBadge = getStatusBadge(hist.status);
              const isLast = index === pengaduan.history.length - 1;

              return (
                <div key={hist.id} style={{ display: 'flex', gap: '1rem', position: 'relative' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        backgroundColor: hBadge.color,
                        boxShadow: `0 0 0 3px ${hBadge.bg}`,
                        marginTop: '4px',
                        zIndex: 1,
                      }}
                    />
                    {!isLast && (
                      <div
                        style={{
                          width: '2px',
                          background: 'var(--border)',
                          flexGrow: 1,
                          minHeight: '40px',
                          margin: '4px 0',
                        }}
                      />
                    )}
                  </div>

                  <div style={{ flex: 1, paddingBottom: isLast ? 0 : '1.25rem' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                        marginBottom: '0.35rem',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '0.15rem 0.5rem',
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: hBadge.bg,
                          color: hBadge.color,
                          border: `1px solid ${hBadge.border}`,
                        }}
                      >
                        {hBadge.label}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--secondary-foreground)' }}>
                        {new Date(hist.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        WIB
                      </span>
                    </div>

                    <p style={{ fontSize: '0.8rem', color: 'var(--secondary-foreground)', marginBottom: '0.35rem' }}>
                      Oleh: <strong>{hist.author.username}</strong>{' '}
                      {hist.author.role?.description
                        ? `(${hist.author.role.description})`
                        : hist.author.role?.name
                        ? `(${hist.author.role.name})`
                        : ''}
                    </p>

                    {hist.catatan && (
                      <div
                        style={{
                          padding: '0.75rem 1rem',
                          backgroundColor: 'var(--background)',
                          borderRadius: 'var(--radius-md)',
                          borderLeft: `3px solid ${hBadge.color}`,
                          fontSize: '0.875rem',
                          color: 'var(--foreground)',
                          marginTop: '0.5rem',
                          lineHeight: 1.6,
                        }}
                      >
                        {hist.catatan}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Dialog Tindak Lanjut */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card glass"
            style={{
              maxWidth: '500px',
              width: '100%',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
          >
            <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              Tindak Lanjut Pengaduan
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--secondary-foreground)', marginBottom: '1.25rem' }}>
              Ubah status pengaduan ke <strong>{selectedStatus}</strong> dan tambahkan catatan penjelasan.
            </p>

            {errorMsg && (
              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#dc2626',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleUpdateStatus} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Status Baru
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface)',
                    color: 'inherit',
                  }}
                >
                  <option value="DITINJAU">DITINJAU (Tinjauan Lapangan)</option>
                  <option value="DIPROSES">DIPROSES (Sedang Ditangani)</option>
                  <option value="SELESAI">SELESAI (Perbaikan/Masalah Selesai)</option>
                  <option value="DITOLAK">DITOLAK (Tidak Valid / Di Luar Wewenang)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Catatan / Tanggapan Pengurus (Opsional)
                </label>
                <textarea
                  rows={3}
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Misal: Sudah dikoordinasikan dengan petugas kebersihan..."
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface)',
                    color: 'inherit',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn"
                  style={{ backgroundColor: 'var(--secondary)' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn btn-primary"
                >
                  {isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
