'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { updateWilayahAction } from '@/app/dashboard/profil/actions';

interface WilayahData {
  role: string;
  user: {
    username: string;
    rwId?: string | null;
    rtId?: string | null;
  };
  rwList: {
    id: string;
    nomor: string;
    namaKetua: string | null;
    kelurahan: string | null;
    kecamatan: string | null;
    rts: {
      id: string;
      nomor: string;
      namaKetua: string | null;
      namaWilayah: string | null;
      _count?: {
        warga: number;
      };
    }[];
  }[];
}

export default function WilayahClientView({ data }: { data: WilayahData }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Selected RW & RT for editing
  const primaryRw = data.rwList[0] || null;
  const primaryRt = primaryRw?.rts[0] || null;

  const [selectedRwId, setSelectedRwId] = useState(data.user.rwId || primaryRw?.id || '');
  const currentRw = data.rwList.find((r) => r.id === selectedRwId) || primaryRw;

  const [selectedRtId, setSelectedRtId] = useState(data.user.rtId || currentRw?.rts[0]?.id || '');
  const currentRt = currentRw?.rts.find((rt) => rt.id === selectedRtId) || currentRw?.rts[0] || null;

  // Form State
  const [namaKetuaRw, setNamaKetuaRw] = useState(currentRw?.namaKetua || '');
  const [kelurahan, setKelurahan] = useState(currentRw?.kelurahan || '');
  const [kecamatan, setKecamatan] = useState(currentRw?.kecamatan || '');
  const [nomorRw, setNomorRw] = useState(currentRw?.nomor || '12');

  const [namaKetuaRt, setNamaKetuaRt] = useState(currentRt?.namaKetua || '');
  const [namaWilayah, setNamaWilayah] = useState(currentRt?.namaWilayah || '');
  const [nomorRt, setNomorRt] = useState(currentRt?.nomor || '01');

  // Handle RW change
  const handleSelectRw = (rwId: string) => {
    setSelectedRwId(rwId);
    const foundRw = data.rwList.find((r) => r.id === rwId);
    if (foundRw) {
      setNamaKetuaRw(foundRw.namaKetua || '');
      setKelurahan(foundRw.kelurahan || '');
      setKecamatan(foundRw.kecamatan || '');
      setNomorRw(foundRw.nomor || '12');
      if (foundRw.rts.length > 0) {
        setSelectedRtId(foundRw.rts[0].id);
        setNamaKetuaRt(foundRw.rts[0].namaKetua || '');
        setNamaWilayah(foundRw.rts[0].namaWilayah || '');
        setNomorRt(foundRw.rts[0].nomor || '01');
      }
    }
  };

  // Handle RT change
  const handleSelectRt = (rtId: string) => {
    setSelectedRtId(rtId);
    const foundRt = currentRw?.rts.find((rt) => rt.id === rtId);
    if (foundRt) {
      setNamaKetuaRt(foundRt.namaKetua || '');
      setNamaWilayah(foundRt.namaWilayah || '');
      setNomorRt(foundRt.nomor || '01');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    startTransition(async () => {
      const res = await updateWilayahAction({
        rtId: selectedRtId || currentRt?.id,
        rwId: selectedRwId || currentRw?.id,
        namaKetuaRt,
        namaKetuaRw,
        kelurahan,
        kecamatan,
        namaWilayah,
        nomorRt,
        nomorRw,
      });

      if (res.success) {
        setMessage({ type: 'success', text: res.message || 'Data wilayah berhasil disimpan!' });
      } else {
        setMessage({ type: 'error', text: res.error || 'Gagal menyimpan data wilayah.' });
      }
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Toast Feedback */}
      {message && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            background: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: message.type === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.9rem',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <span>{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 'bold' }}
          >
            &times;
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '0.25rem' }}>
            Kelola Wilayah & Domisili
          </h1>
          <p style={{ color: 'var(--secondary-foreground)', fontSize: '0.9rem' }}>
            Atur dan perbarui informasi administrasi Rukun Warga (RW), Rukun Tetangga (RT), Kelurahan, dan Kecamatan.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link
            href="/dashboard/profil"
            className="btn"
            style={{
              padding: '0.4rem 0.85rem',
              fontSize: '0.85rem',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
            }}
          >
            &larr; Lihat di Profil
          </Link>
        </div>
      </div>

      {/* Selection Filter if Super Admin or multiple RW */}
      {data.rwList.length > 1 && (
        <div
          className="card"
          style={{
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Pilih Wilayah RW:</span>
          <select
            value={selectedRwId}
            onChange={(e) => handleSelectRw(e.target.value)}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--foreground)',
              fontSize: '0.875rem',
            }}
          >
            {data.rwList.map((rw) => (
              <option key={rw.id} value={rw.id}>
                RW {rw.nomor} - Ketua: {rw.namaKetua || 'Belum diisi'}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Main Form Card */}
      <form onSubmit={handleSave} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', padding: '2rem' }}>
        
        {/* Section 1: Informasi RW & Kecamatan */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(37, 99, 235, 0.1)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 'bold' }}>Tingkat Rukun Warga (RW) & Pemerintahan</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Nomor RW
              </label>
              <input
                type="text"
                value={nomorRw}
                onChange={(e) => setNomorRw(e.target.value)}
                placeholder="01"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--foreground)',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Nama Ketua RW
              </label>
              <input
                type="text"
                value={namaKetuaRw}
                onChange={(e) => setNamaKetuaRw(e.target.value)}
                placeholder="Contoh: Bapak Ahmad"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--foreground)',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Kelurahan / Desa
              </label>
              <input
                type="text"
                value={kelurahan}
                onChange={(e) => setKelurahan(e.target.value)}
                placeholder="Contoh: Sukamaju"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--foreground)',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Kecamatan
              </label>
              <input
                type="text"
                value={kecamatan}
                onChange={(e) => setKecamatan(e.target.value)}
                placeholder="Contoh: Cibinong"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--foreground)',
                  fontSize: '0.9rem',
                }}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Informasi RT */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 'bold' }}>Tingkat Rukun Tetangga (RT)</h2>
            </div>

            {currentRw && currentRw.rts.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--secondary-foreground)' }}>Pilih RT:</span>
                <select
                  value={selectedRtId}
                  onChange={(e) => handleSelectRt(e.target.value)}
                  style={{
                    padding: '0.35rem 0.65rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--foreground)',
                    fontSize: '0.85rem',
                  }}
                >
                  {currentRw.rts.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      RT {rt.nomor} ({rt.namaKetua || 'Belum diisi'})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Nomor RT
              </label>
              <input
                type="text"
                value={nomorRt}
                onChange={(e) => setNomorRt(e.target.value)}
                placeholder="01"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--foreground)',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Nama Ketua RT
              </label>
              <input
                type="text"
                value={namaKetuaRt}
                onChange={(e) => setNamaKetuaRt(e.target.value)}
                placeholder="Contoh: Bapak Budi"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--foreground)',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Nama Wilayah / Dusun (Opsional)
              </label>
              <input
                type="text"
                value={namaWilayah}
                onChange={(e) => setNamaWilayah(e.target.value)}
                placeholder="Contoh: Lingkungan Flamboyan"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--foreground)',
                  fontSize: '0.9rem',
                }}
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isPending}
            style={{
              padding: '0.65rem 1.5rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.95rem',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {isPending ? (
              <>
                <span
                  style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid white',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    display: 'inline-block',
                  }}
                />
                Menyimpan...
              </>
            ) : (
              <>
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Simpan Perubahan Wilayah
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
