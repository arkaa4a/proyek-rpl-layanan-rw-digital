'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createPengaduanAction } from './actions';
import { PENGADUAN_KATEGORI, PengaduanKategoriType, getStatusBadge } from './types';

export type PengaduanItem = {
  id: string;
  judul: string;
  kategori: string;
  deskripsi: string;
  lokasi: string;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  rt: { nomor: string } | null;
  rw: { nomor: string } | null;
  _count?: { history: number };
};

interface PengaduanClientViewProps {
  initialPengaduan: PengaduanItem[];
}

export function renderKategoriIcon(kat: string, color = 'currentColor', size = 18) {
  switch (kat) {
    case 'FASILITAS_UMUM':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
          <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
          <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
        </svg>
      );
    case 'KEBERSIHAN':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18" />
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </svg>
      );
    case 'KEAMANAN':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
        </svg>
      );
    case 'DRAINASE':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
        </svg>
      );
    case 'JALAN':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="m9 3 3 18" />
          <path d="m15 3-3 18" />
        </svg>
      );
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" x2="8" y1="13" y2="13" />
        </svg>
      );
  }
}

const KATEGORI_META: Record<
  PengaduanKategoriType,
  { label: string; desc: string }
> = {
  FASILITAS_UMUM: {
    label: 'Fasilitas Umum',
    desc: 'Taman, pos ronda, gapura, lampu jalan, dll.',
  },
  KEBERSIHAN: {
    label: 'Kebersihan & Sampah',
    desc: 'Sampah menumpuk, jadwal angkut sampah, kebersihan lingkungan.',
  },
  KEAMANAN: {
    label: 'Ketertiban & Keamanan',
    desc: 'Gangguan kamtibmas, kebisingan, tamu tak dikenal, dll.',
  },
  DRAINASE: {
    label: 'Saluran Air & Drainase',
    desc: 'Saluran tersumbat, genangan air, bau selokan, tanggul rusak.',
  },
  JALAN: {
    label: 'Jalan & Trotoar',
    desc: 'Jalan berlubang, paving rusak, marka, pembatas jalan.',
  },
  LAINNYA: {
    label: 'Lainnya',
    desc: 'Laporan atau keluhan lain seputar lingkungan warga.',
  },
};

export default function PengaduanClientView({
  initialPengaduan,
}: PengaduanClientViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form State
  const [judul, setJudul] = useState('');
  const [kategori, setKategori] = useState<PengaduanKategoriType>('FASILITAS_UMUM');
  const [lokasi, setLokasi] = useState('');
  const [deskripsi, setDeskripsi] = useState('');

  // UI Notification States
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Client-side quick validation feedback
    if (!judul.trim() || judul.trim().length < 5) {
      setErrorMsg('Judul pengaduan minimal 5 karakter.');
      return;
    }
    if (!lokasi.trim() || lokasi.trim().length < 5) {
      setErrorMsg('Lokasi kejadian/kondisi minimal 5 karakter.');
      return;
    }
    if (!deskripsi.trim() || deskripsi.trim().length < 20) {
      setErrorMsg('Deskripsi pengaduan minimal 20 karakter agar pengurus memahami rincian masalah.');
      return;
    }

    startTransition(async () => {
      const res = await createPengaduanAction({
        judul: judul.trim(),
        kategori,
        lokasi: lokasi.trim(),
        deskripsi: deskripsi.trim(),
      });

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(
          'Laporan pengaduan Anda berhasil dikirim! Pengurus RT/RW akan segera meninjau dan menindaklanjuti.'
        );
        // Reset form
        setJudul('');
        setKategori('FASILITAS_UMUM');
        setLokasi('');
        setDeskripsi('');
        setIsFormOpen(false);
        // Refresh server data
        router.refresh();
      }
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header Halaman */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 'bold',
              color: 'var(--primary)',
              marginBottom: '0.25rem',
            }}
          >
            Pengaduan Warga
          </h1>
          <p
            style={{
              color: 'var(--secondary-foreground)',
              fontSize: '0.95rem',
              maxWidth: '650px',
            }}
          >
            Sampaikan laporan kerusakan fasilitas, kebersihan, ketertiban, atau
            kendala lingkungan langsung ke pengurus RT dan RW secara transparan.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link
            href="/dashboard/warga"
            className="btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--foreground)',
              fontSize: '0.875rem',
              fontWeight: 500,
              textDecoration: 'none',
              padding: '0.5rem 0.9rem',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Kembali ke Dashboard
          </Link>

          <button
            type="button"
            onClick={() => {
              setIsFormOpen(!isFormOpen);
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className="btn btn-primary"
            style={{ textDecoration: 'none' }}
          >
            {isFormOpen ? 'Tutup Formulir' : '+ Buat Pengaduan Baru'}
          </button>
        </div>
      </div>

      {/* Notifikasi Global */}
      {successMsg && (
        <div
          className="card"
          style={{
            backgroundColor: 'rgba(34, 197, 94, 0.08)',
            borderColor: 'rgba(34, 197, 94, 0.3)',
            color: '#16a34a',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            padding: '1rem 1.25rem',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Berhasil Terkirim</div>
            <div style={{ fontSize: '0.875rem', marginTop: '0.15rem' }}>{successMsg}</div>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#16a34a',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.2rem',
            }}
            aria-label="Tutup"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      )}

      {/* Formulir Pengaduan (Accordion / Card) */}
      {isFormOpen && (
        <div className="card glass" style={{ border: '1px solid var(--border)' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.25rem',
              borderBottom: '1px solid var(--border)',
              paddingBottom: '0.75rem',
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--primary)' }}>
                Formulir Pengaduan Baru
              </h2>
              <p style={{ fontSize: '0.825rem', color: 'var(--secondary-foreground)' }}>
                Identitas pelapor dan domisili RT/RW terverifikasi otomatis dari akun Anda.
              </p>
            </div>
            <span
              style={{
                fontSize: '0.75rem',
                padding: '0.25rem 0.6rem',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                color: 'var(--primary)',
                fontWeight: 600,
              }}
            >
              POV Warga
            </span>
          </div>

          {errorMsg && (
            <div
              style={{
                padding: '0.875rem 1rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#dc2626',
                fontSize: '0.875rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
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

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Input Judul */}
            <div>
              <label
                htmlFor="judul"
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  marginBottom: '0.35rem',
                }}
              >
                Judul Pengaduan <span style={{ color: 'var(--error)' }}>*</span>
              </label>
              <input
                id="judul"
                type="text"
                required
                minLength={5}
                maxLength={100}
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                placeholder="Contoh: Lampu Penerangan Jalan Padam di Depan Pos RT 02"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface)',
                  color: 'inherit',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--secondary-foreground)' }}>
                5–100 karakter. ({judul.length}/100)
              </span>
            </div>

            {/* Input Kategori */}
            <div>
              <label
                htmlFor="kategori"
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  marginBottom: '0.35rem',
                }}
              >
                Kategori Masalah <span style={{ color: 'var(--error)' }}>*</span>
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '0.75rem',
                }}
              >
                {PENGADUAN_KATEGORI.map((kat) => {
                  const meta = KATEGORI_META[kat];
                  const isSelected = kategori === kat;
                  return (
                    <div
                      key={kat}
                      onClick={() => setKategori(kat)}
                      style={{
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                        backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.05)' : 'var(--surface)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.65rem',
                      }}
                    >
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.1)' : 'var(--secondary)',
                          color: isSelected ? 'var(--primary)' : 'var(--secondary-foreground)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {renderKategoriIcon(kat, isSelected ? 'var(--primary)' : 'currentColor', 16)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: isSelected ? 'var(--primary)' : 'inherit' }}>
                          {meta.label}
                        </div>
                        <div style={{ fontSize: '0.725rem', color: 'var(--secondary-foreground)', marginTop: '0.15rem' }}>
                          {meta.desc}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Input Lokasi */}
            <div>
              <label
                htmlFor="lokasi"
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  marginBottom: '0.35rem',
                }}
              >
                Lokasi Kejadian / Fasilitas <span style={{ color: 'var(--error)' }}>*</span>
              </label>
              <input
                id="lokasi"
                type="text"
                required
                minLength={5}
                maxLength={300}
                value={lokasi}
                onChange={(e) => setLokasi(e.target.value)}
                placeholder="Contoh: Jl. Anggrek No. 15, depan gerbang lapangan RT 02"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface)',
                  color: 'inherit',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--secondary-foreground)' }}>
                Sebutkan patokan atau alamat spesifik agar pengurus mudah meninjau lokasi.
              </span>
            </div>

            {/* Input Deskripsi */}
            <div>
              <label
                htmlFor="deskripsi"
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  marginBottom: '0.35rem',
                }}
              >
                Deskripsi Lengkap <span style={{ color: 'var(--error)' }}>*</span>
              </label>
              <textarea
                id="deskripsi"
                rows={4}
                required
                minLength={20}
                maxLength={1000}
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                placeholder="Jelaskan kondisi permasalahan secara jelas, kronologi kejadian, dan dampak yang dialami lingkungan..."
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface)',
                  color: 'inherit',
                  fontSize: '0.875rem',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.75rem',
                  color: 'var(--secondary-foreground)',
                }}
              >
                <span>Minimal 20 karakter agar laporan jelas dan dapat ditindaklanjuti.</span>
                <span>{deskripsi.length}/1000</span>
              </div>
            </div>

            {/* Tombol Aksi */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="btn"
                style={{
                  backgroundColor: 'var(--secondary)',
                  color: 'var(--secondary-foreground)',
                }}
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="btn btn-primary"
                style={{
                  opacity: isPending ? 0.7 : 1,
                  cursor: isPending ? 'not-allowed' : 'pointer',
                }}
              >
                {isPending ? 'Mengirimkan Laporan...' : 'Kirim Pengaduan Sekarang'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Daftar Pengaduan Milik Warga */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
          }}
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'inherit' }}>
            Riwayat Pengaduan Saya
          </h2>
          <span
            style={{
              fontSize: '0.8rem',
              color: 'var(--secondary-foreground)',
              padding: '0.2rem 0.6rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--secondary)',
            }}
          >
            {initialPengaduan.length} Laporan
          </span>
        </div>

        {initialPengaduan.length === 0 ? (
          <div
            className="card glass"
            style={{
              textAlign: 'center',
              padding: '3.5rem 1.5rem',
              color: 'var(--secondary-foreground)',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                backgroundColor: 'rgba(37, 99, 235, 0.08)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem auto',
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h3
              style={{
                fontSize: '1.125rem',
                fontWeight: 600,
                marginBottom: '0.5rem',
                color: 'inherit',
              }}
            >
              Belum Ada Pengaduan
            </h3>
            <p
              style={{
                fontSize: '0.875rem',
                maxWidth: '440px',
                margin: '0 auto 1.5rem auto',
                lineHeight: 1.6,
              }}
            >
              Anda belum pernah menyampaikan pengaduan atau keluhan lingkungan.
              Bila terdapat fasilitas yang perlu diperbaiki atau masalah kebersihan,
              klik tombol di bawah untuk membuat laporan.
            </p>
            <button
              type="button"
              onClick={() => setIsFormOpen(true)}
              className="btn btn-primary"
            >
              + Buat Pengaduan Sekarang
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {initialPengaduan.map((item) => {
              const statusBadge = getStatusBadge(item.status);
              const katMeta =
                KATEGORI_META[item.kategori as PengaduanKategoriType] || {
                  label: item.kategori,
                };
              const dateFormatted = new Date(item.createdAt).toLocaleDateString(
                'id-ID',
                {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }
              );

              return (
                <Link
                  key={item.id}
                  href={`/dashboard/pengaduan/${item.id}`}
                  className="card glass"
                  style={{
                    textDecoration: 'none',
                    display: 'block',
                    transition: 'transform 0.15s ease, border-color 0.15s ease',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '6px',
                          backgroundColor: 'var(--secondary)',
                          color: 'var(--secondary-foreground)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {renderKategoriIcon(item.kategori, 'currentColor', 15)}
                      </div>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '0.2rem 0.5rem',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--secondary)',
                          color: 'var(--secondary-foreground)',
                        }}
                      >
                        {katMeta.label}
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '0.25rem 0.65rem',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: statusBadge.bg,
                        color: statusBadge.color,
                        border: `1px solid ${statusBadge.border}`,
                      }}
                    >
                      {statusBadge.label}
                    </span>
                  </div>

                  <h3
                    style={{
                      fontSize: '1.05rem',
                      fontWeight: 600,
                      color: 'var(--foreground)',
                      marginBottom: '0.5rem',
                    }}
                  >
                    {item.judul}
                  </h3>

                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '1.25rem',
                      fontSize: '0.825rem',
                      color: 'var(--secondary-foreground)',
                      marginTop: '0.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      <span>{item.lokasi}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span>{dateFormatted} WIB</span>
                    </div>
                    {item.rt && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                          <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                        <span>
                          RT {item.rt.nomor || '-'} / RW {item.rw?.nomor || '-'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      borderTop: '1px solid var(--border)',
                      marginTop: '0.85rem',
                      paddingTop: '0.65rem',
                      display: 'flex',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                      fontSize: '0.825rem',
                      color: 'var(--primary)',
                      fontWeight: 600,
                    }}
                  >
                    Lihat Rincian & Riwayat Tanggapan &rarr;
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
