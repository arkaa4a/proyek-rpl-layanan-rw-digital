'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import StatCard from '@/components/ui/StatCard';
import DataTable from '@/components/ui/DataTable';

export type PengurusPengaduanItem = {
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
  _count?: {
    history: number;
  };
};

interface PengaduanPengurusClientProps {
  initialData: PengurusPengaduanItem[];
  stats: {
    total: number;
    perluDitinjau: number;
    diproses: number;
    selesai: number;
  };
  scopeDescription: string;
  backLink?: string;
}

import { getStatusBadge } from '@/app/dashboard/pengaduan/types';
export { getStatusBadge };

export default function PengaduanPengurusClient({
  initialData,
  stats,
  scopeDescription,
  backLink = '/dashboard/admin',
}: PengaduanPengurusClientProps) {
  const [statusFilter, setStatusFilter] = useState<string>('SEMUA');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filter Data
  const filteredData = useMemo(() => {
    return initialData.filter((item) => {
      // Filter Status
      if (statusFilter === 'PERLU_DITINJAU') {
        if (!['DILAPORKAN', 'DITINJAU'].includes(item.status)) return false;
      } else if (statusFilter !== 'SEMUA') {
        if (item.status !== statusFilter) return false;
      }

      // Filter Search (Judul atau Lokasi atau Nama Pelapor)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchJudul = item.judul.toLowerCase().includes(query);
        const matchLokasi = item.lokasi.toLowerCase().includes(query);
        const matchPelapor = item.pelapor?.namaLengkap?.toLowerCase().includes(query);
        if (!matchJudul && !matchLokasi && !matchPelapor) return false;
      }

      return true;
    });
  }, [initialData, statusFilter, searchQuery]);

  const columns = [
    {
      header: 'Judul Pengaduan',
      accessor: 'judul',
      render: (val: string, row: PengurusPengaduanItem) => (
        <Link
          href={`/dashboard/pengaduan-warga/${row.id}`}
          style={{
            fontWeight: 600,
            color: 'var(--primary)',
            textDecoration: 'none',
            display: 'block',
            lineHeight: 1.4,
          }}
        >
          {val}
        </Link>
      ),
    },
    {
      header: 'Kategori',
      accessor: 'kategori',
      render: (val: string) => (
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            padding: '0.2rem 0.5rem',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--secondary)',
            color: 'var(--secondary-foreground)',
            whiteSpace: 'nowrap',
          }}
        >
          {val.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      header: 'Lokasi',
      accessor: 'lokasi',
      render: (val: string) => (
        <span style={{ fontSize: '0.85rem', color: 'var(--foreground)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span>{val}</span>
        </span>
      ),
    },
    {
      header: 'RT / RW',
      accessor: 'rt',
      render: (_: any, row: PengurusPengaduanItem) => (
        <span style={{ fontSize: '0.825rem', whiteSpace: 'nowrap' }}>
          RT {row.rt?.nomor || '-'} / RW {row.rw?.nomor || '-'}
        </span>
      ),
    },
    {
      header: 'Tanggal',
      accessor: 'createdAt',
      render: (val: string | Date) => (
        <span style={{ fontSize: '0.825rem', color: 'var(--secondary-foreground)', whiteSpace: 'nowrap' }}>
          {new Date(val).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (val: string) => {
        const b = getStatusBadge(val);
        return (
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '0.2rem 0.6rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: b.bg,
              color: b.color,
              border: `1px solid ${b.border}`,
              whiteSpace: 'nowrap',
            }}
          >
            {b.label}
          </span>
        );
      },
    },
    {
      header: 'Aksi',
      accessor: 'id',
      render: (val: string) => (
        <Link
          href={`/dashboard/pengaduan-warga/${val}`}
          className="btn btn-primary"
          style={{
            padding: '0.35rem 0.75rem',
            fontSize: '0.75rem',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Tindak Lanjut &rarr;
        </Link>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header Halaman */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: 'var(--primary)',
              marginBottom: '0.25rem',
            }}
          >
            Kelola Pengaduan Warga
          </h1>
          <p style={{ color: 'var(--secondary-foreground)', fontSize: '0.9rem' }}>
            {scopeDescription}
          </p>
        </div>

        {backLink && (
          <Link
            href={backLink}
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
        )}
      </div>

      {/* Grid StatCard */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
        }}
      >
        <StatCard title="Total Pengaduan" value={stats.total} />
        <StatCard
          title="Perlu Ditinjau"
          value={stats.perluDitinjau}
          trend={stats.perluDitinjau > 0 ? 'down' : 'neutral'}
          subtitle="Status DILAPORKAN & DITINJAU"
        />
        <StatCard
          title="Sedang Diproses"
          value={stats.diproses}
          trend="neutral"
          subtitle="Status DIPROSES"
        />
        <StatCard
          title="Pengaduan Selesai"
          value={stats.selesai}
          trend="up"
          subtitle="Status SELESAI"
        />
      </div>

      {/* Kontainer Tabel & Filter */}
      <div className="card glass">
        {/* Baris Filter Status Sederhana & Search */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.5rem',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '1.25rem',
          }}
        >
          {/* Tabs Filter Status */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {[
              { id: 'SEMUA', label: 'Semua Status' },
              { id: 'PERLU_DITINJAU', label: 'Perlu Ditinjau' },
              { id: 'DIPROSES', label: 'Sedang Diproses' },
              { id: 'SELESAI', label: 'Selesai' },
              { id: 'DITOLAK', label: 'Ditolak' },
            ].map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.825rem',
                    fontWeight: active ? 600 : 500,
                    cursor: 'pointer',
                    border: active ? '1px solid var(--primary)' : '1px solid var(--border)',
                    backgroundColor: active ? 'var(--primary)' : 'var(--surface)',
                    color: active ? 'white' : 'inherit',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div style={{ minWidth: '240px', flex: '0 1 300px' }}>
            <input
              type="text"
              placeholder="Cari judul atau lokasi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.45rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface)',
                color: 'inherit',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Tabel Data */}
        <DataTable
          columns={columns}
          data={filteredData}
          emptyMessage="Tidak ada data pengaduan yang sesuai dengan filter saat ini."
        />
      </div>
    </div>
  );
}
