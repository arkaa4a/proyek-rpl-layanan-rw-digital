import React from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getMyPengaduanDetail } from '../actions';
import { getStatusBadge } from '../types';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PengaduanDetailPage({ params }: PageProps) {
  const session = await getSession();

  // 1. Guard Autentikasi
  if (!session) {
    redirect('/login');
  }

  // Khusus POV WARGA
  if (session.role !== 'WARGA' || !session.wargaId) {
    redirect('/unauthorized');
  }

  const resolvedParams = await params;
  const id = resolvedParams.id;

  if (!id) {
    notFound();
  }

  // 2. Query aman server-side dengan anti-IDOR scoping (id + pelaporId)
  const result = await getMyPengaduanDetail(id);

  if (result.error || !result.data) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        <div className="card glass" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem auto',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            Pengaduan Tidak Ditemukan
          </h2>
          <p style={{ color: 'var(--secondary-foreground)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            {result.error || 'Anda tidak memiliki hak akses untuk melihat pengaduan ini.'}
          </p>
          <Link href="/dashboard/pengaduan" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            &larr; Kembali ke Daftar Pengaduan
          </Link>
        </div>
      </div>
    );
  }

  const p = result.data;
  const statusBadge = getStatusBadge(p.status);

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
          href="/dashboard/pengaduan"
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
          &larr; Kembali ke Daftar Pengaduan
        </Link>
      </div>

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
                Kategori: {p.kategori.replace('_', ' ')}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--secondary-foreground)' }}>
                ID: {p.id.split('-')[0].toUpperCase()}
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
              {p.judul}
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
              Wilayah Terdaftar
            </p>
            <p style={{ fontWeight: 600 }}>
              RT {p.rt?.nomor || '-'} / RW {p.rw?.nomor || '-'}
            </p>
          </div>

          <div>
            <p style={{ color: 'var(--secondary-foreground)', fontSize: '0.8rem', marginBottom: '0.2rem' }}>
              Waktu Pelaporan
            </p>
            <p style={{ fontWeight: 600 }}>
              {new Date(p.createdAt).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              WIB
            </p>
          </div>

          <div>
            <p style={{ color: 'var(--secondary-foreground)', fontSize: '0.8rem', marginBottom: '0.2rem' }}>
              Terakhir Diperbarui
            </p>
            <p style={{ fontWeight: 600 }}>
              {new Date(p.updatedAt).toLocaleDateString('id-ID', {
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
            Lokasi Kejadian / Titik Kerusakan
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
            <span style={{ fontWeight: 500 }}>{p.lokasi}</span>
          </div>
        </div>

        {/* Deskripsi */}
        <div>
          <p style={{ color: 'var(--secondary-foreground)', fontSize: '0.825rem', marginBottom: '0.35rem', fontWeight: 600 }}>
            Uraian Deskripsi
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
            {p.deskripsi}
          </div>
        </div>
      </div>

      {/* Card Timeline Riwayat & Tanggapan */}
      <div className="card glass">
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
            Timeline & Riwayat Penanganan
          </h2>
          <p style={{ color: 'var(--secondary-foreground)', fontSize: '0.85rem' }}>
            Catatan progres dan tanggapan dari jajaran pengurus RT/RW terhadap laporan Anda.
          </p>
        </div>

        {p.history.length === 0 ? (
          <p style={{ color: 'var(--secondary-foreground)', fontSize: '0.875rem' }}>
            Belum ada catatan riwayat penanganan.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {p.history.map((hist, index) => {
              const hBadge = getStatusBadge(hist.status);
              const isLast = index === p.history.length - 1;

              return (
                <div key={hist.id} style={{ display: 'flex', gap: '1rem', position: 'relative' }}>
                  {/* Timeline Node & Connector Line */}
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

                  {/* Timeline Content */}
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
                      Ditangani oleh: <strong>{hist.author.username}</strong>{' '}
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
    </div>
  );
}
