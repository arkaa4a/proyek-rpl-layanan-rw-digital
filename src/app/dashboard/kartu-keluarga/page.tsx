import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';

export default async function KartuKeluargaPage() {
  const session = await getSession();

  // 1. Guard Autentikasi & Role (Khusus WARGA)
  if (!session) {
    redirect('/login');
  }

  if (session.role !== 'WARGA' || !session.wargaId) {
    redirect('/unauthorized');
  }

  // 2. Query data KK scoped aman melalui session.wargaId
  const wargaData = await prisma.warga.findUnique({
    where: { id: session.wargaId },
    include: {
      keluarga: {
        include: {
          warga: {
            where: { isActive: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      },
      rt: {
        include: {
          rw: true,
        },
      },
    },
  });

  const keluarga = wargaData?.keluarga;

  // 3. Helper Masking Data Sensitif
  const maskNomorKk = (kk: string | undefined | null) => {
    if (!kk) return '-';
    if (kk.length < 8) return kk;
    return `${kk.slice(0, 4)}********${kk.slice(-4)}`;
  };

  const maskNik = (nik: string | undefined | null) => {
    if (!nik) return '-';
    if (nik.length < 8) return nik;
    return `${nik.slice(0, 4)}********${nik.slice(-4)}`;
  };

  const formatTanggalLahir = (date: Date | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header Halaman */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <Link 
            href="/dashboard/warga" 
            style={{ fontSize: '0.875rem', color: 'var(--primary)', textDecoration: 'none' }}
          >
            &larr; Dashboard Warga
          </Link>
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '0.25rem' }}>
          Kartu Keluarga
        </h1>
        <p style={{ color: 'var(--secondary-foreground)', fontSize: '0.95rem' }}>
          Informasi data Kartu Keluarga dan daftar anggota keluarga yang terhubung dengan akun Anda.
        </p>
      </div>

      {/* 4. Empty State jika KK belum terhubung */}
      {!keluarga ? (
        <div className="card glass" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--secondary-foreground)' }}>
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
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: 'inherit' }}>
            Kartu Keluarga Belum Terhubung
          </h2>
          <p style={{ fontSize: '0.875rem', maxWidth: '460px', margin: '0 auto 1.5rem auto', lineHeight: '1.6' }}>
            Data Kartu Keluarga Anda belum terhubung dengan data warga pada sistem.
            Silakan hubungi pengurus RT/RW untuk melakukan pembaruan data kependudukan Anda.
          </p>
          <Link href="/dashboard/warga" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            Kembali ke Dashboard
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* 5. Card Data Kartu Keluarga */}
          <div className="card glass" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                Data Kartu Keluarga
              </h2>
              <span 
                style={{ 
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.8rem', 
                  fontWeight: 600, 
                  padding: '0.25rem 0.75rem', 
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'rgba(37, 99, 235, 0.1)',
                  color: 'var(--primary)',
                  border: '1px solid rgba(37, 99, 235, 0.25)'
                }}
              >
                ● Terdaftar di Sistem
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--secondary-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                  Nomor Kartu Keluarga
                </span>
                <p style={{ fontSize: '1.2rem', fontWeight: 'bold', fontFamily: 'monospace', marginTop: '0.25rem' }}>
                  {maskNomorKk(keluarga.nomorKk)}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--secondary-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                  Alamat Domisili
                </span>
                <p style={{ fontSize: '0.95rem', fontWeight: 500, marginTop: '0.25rem' }}>
                  {keluarga.alamat || '-'}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--secondary-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                  Wilayah RT / RW
                </span>
                <p style={{ fontSize: '0.95rem', fontWeight: 500, marginTop: '0.25rem' }}>
                  {wargaData.rt ? `RT ${wargaData.rt.nomor}` : '-'} / {wargaData.rt?.rw ? `RW ${wargaData.rt.rw.nomor}` : '-'}
                </p>
                {wargaData.rt?.rw?.kelurahan && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--secondary-foreground)', marginTop: '0.1rem' }}>
                    Kelurahan {wargaData.rt.rw.kelurahan}
                    {wargaData.rt.rw.kecamatan ? `, Kec. ${wargaData.rt.rw.kecamatan}` : ''}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 6. Card Anggota Keluarga */}
          <div className="card" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                Anggota Keluarga ({keluarga.warga.length})
              </h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--secondary-foreground)' }}>
                Hanya menampilkan anggota aktif
              </span>
            </div>

            {/* Tabel Anggota Keluarga (Responsive) */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--secondary-foreground)' }}>
                    <th style={{ padding: '0.75rem 0.5rem', width: '40px' }}>No</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Nama Lengkap</th>
                    <th style={{ padding: '0.75rem 1rem' }}>NIK</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Tempat / Tgl Lahir</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Agama</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Pekerjaan</th>
                  </tr>
                </thead>
                <tbody>
                  {keluarga.warga.map((anggota, index) => {
                    const isCurrentUser = anggota.id === session.wargaId;

                    return (
                      <tr 
                        key={anggota.id}
                        style={{ 
                          borderBottom: '1px solid var(--border)',
                          backgroundColor: isCurrentUser ? 'rgba(37, 99, 235, 0.04)' : 'transparent',
                        }}
                      >
                        <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>
                          {index + 1}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>{anggota.namaLengkap}</span>
                            {isCurrentUser && (
                              <span 
                                style={{ 
                                  fontSize: '0.65rem', 
                                  fontWeight: 600, 
                                  backgroundColor: 'var(--primary)', 
                                  color: 'white', 
                                  padding: '0.1rem 0.4rem', 
                                  borderRadius: 'var(--radius-full)' 
                                }}
                              >
                                Anda
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', letterSpacing: '0.03em' }}>
                          {maskNik(anggota.nik)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          {anggota.tempatLahir ? `${anggota.tempatLahir}, ` : ''}
                          {formatTanggalLahir(anggota.tanggalLahir)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          {anggota.agama || '-'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          {anggota.pekerjaan || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
