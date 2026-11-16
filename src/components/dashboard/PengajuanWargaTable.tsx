'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';

export interface PengajuanItem {
  id: string;
  createdAt: Date | string;
  status: string;
  serviceType: {
    id: string;
    name: string;
  };
  applicant: {
    id: string;
    namaLengkap: string;
    nik?: string;
    rt?: {
      nomor: string;
      rw?: {
        nomor: string;
      } | null;
    } | null;
  };
}

interface PengajuanWargaTableProps {
  requests: PengajuanItem[];
  title?: string;
  description?: string;
  role?: string;
}

export default function PengajuanWargaTable({
  requests,
  title = 'Daftar Pengajuan Surat Warga',
  description = 'Kelola dan pantau seluruh permohonan surat administrasi warga.',
  role = 'PENGURUS',
}: PengajuanWargaTableProps) {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const statusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return {
          label: 'Menunggu Verifikasi RT',
          bg: '#fef3c7',
          color: '#92400e',
          border: '#fde68a',
        };
      case 'VERIFIED_RT':
        return {
          label: 'Menunggu Persetujuan RW',
          bg: '#e0e7ff',
          color: '#3730a3',
          border: '#c7d2fe',
        };
      case 'REVISION_REQUIRED':
        return {
          label: 'Perlu Revisi',
          bg: '#ffedd5',
          color: '#9a3412',
          border: '#fed7aa',
        };
      case 'APPROVED':
      case 'COMPLETED':
        return {
          label: 'Disetujui / Selesai',
          bg: '#dcfce7',
          color: '#166534',
          border: '#bbf7d0',
        };
      case 'DOCUMENT_ISSUED':
        return {
          label: 'Dokumen Terbit',
          bg: '#d1fae5',
          color: '#065f46',
          border: '#a7f3d0',
        };
      case 'REJECTED':
        return {
          label: 'Ditolak',
          bg: '#fee2e2',
          color: '#991b1b',
          border: '#fecaca',
        };
      default:
        return {
          label: status,
          bg: 'var(--secondary)',
          color: 'var(--secondary-foreground)',
          border: 'var(--border)',
        };
    }
  };

  const countPerluTindakan = useMemo(() => {
    return requests.filter((r) =>
      ['SUBMITTED', 'VERIFIED_RT', 'REVISION_REQUIRED'].includes(r.status)
    ).length;
  }, [requests]);

  const countSelesai = useMemo(() => {
    return requests.filter((r) =>
      ['APPROVED', 'COMPLETED', 'DOCUMENT_ISSUED'].includes(r.status)
    ).length;
  }, [requests]);

  const countDitolak = useMemo(() => {
    return requests.filter((r) => r.status === 'REJECTED').length;
  }, [requests]);

  const filteredRequests = useMemo(() => {
    return requests.filter((item) => {
      // 1. Filter status
      if (filterStatus === 'ACTION_NEEDED') {
        if (!['SUBMITTED', 'VERIFIED_RT', 'REVISION_REQUIRED'].includes(item.status)) {
          return false;
        }
      } else if (filterStatus === 'SELESAI') {
        if (!['APPROVED', 'COMPLETED', 'DOCUMENT_ISSUED'].includes(item.status)) {
          return false;
        }
      } else if (filterStatus === 'DITOLAK') {
        if (item.status !== 'REJECTED') {
          return false;
        }
      }

      // 2. Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const idMatch = item.id.toLowerCase().includes(query);
        const serviceMatch = item.serviceType?.name?.toLowerCase().includes(query);
        const nameMatch = item.applicant?.namaLengkap?.toLowerCase().includes(query);
        const nikMatch = item.applicant?.nik?.includes(query);
        const rtMatch = item.applicant?.rt?.nomor?.includes(query);
        return idMatch || serviceMatch || nameMatch || nikMatch || rtMatch;
      }

      return true;
    });
  }, [requests, filterStatus, searchQuery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--foreground)' }}>
            {title}
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--secondary-foreground)' }}>
            {description}
          </p>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setFilterStatus('ALL')}
            className="btn"
            style={{
              padding: '0.4rem 0.8rem',
              fontSize: '0.8rem',
              backgroundColor: filterStatus === 'ALL' ? 'var(--primary)' : 'var(--surface)',
              color: filterStatus === 'ALL' ? 'var(--primary-foreground)' : 'inherit',
              border: '1px solid var(--border)',
            }}
          >
            Semua ({requests.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('ACTION_NEEDED')}
            className="btn"
            style={{
              padding: '0.4rem 0.8rem',
              fontSize: '0.8rem',
              backgroundColor: filterStatus === 'ACTION_NEEDED' ? '#d97706' : 'var(--surface)',
              color: filterStatus === 'ACTION_NEEDED' ? 'white' : 'inherit',
              border: '1px solid var(--border)',
            }}
          >
            Perlu Tindakan ({countPerluTindakan})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('SELESAI')}
            className="btn"
            style={{
              padding: '0.4rem 0.8rem',
              fontSize: '0.8rem',
              backgroundColor: filterStatus === 'SELESAI' ? '#16a34a' : 'var(--surface)',
              color: filterStatus === 'SELESAI' ? 'white' : 'inherit',
              border: '1px solid var(--border)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: filterStatus === 'SELESAI' ? 'white' : '#16a34a',
                display: 'inline-block',
              }}
            />
            Selesai / Terbit ({countSelesai})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('DITOLAK')}
            className="btn"
            style={{
              padding: '0.4rem 0.8rem',
              fontSize: '0.8rem',
              backgroundColor: filterStatus === 'DITOLAK' ? '#dc2626' : 'var(--surface)',
              color: filterStatus === 'DITOLAK' ? 'white' : 'inherit',
              border: '1px solid var(--border)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: filterStatus === 'DITOLAK' ? 'white' : '#dc2626',
                display: 'inline-block',
              }}
            />
            Ditolak ({countDitolak})
          </button>
        </div>
      </div>

      {/* Search Input & Info Counter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '420px' }}>
          <span
            style={{
              position: 'absolute',
              left: '0.8rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--secondary-foreground)',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </span>
          <input
            type="text"
            placeholder="Cari pemohon, NIK, jenis layanan, atau ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 2rem 0.55rem 2.3rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              background: 'var(--background)',
              color: 'inherit',
              fontSize: '0.875rem',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Hapus pencarian"
              style={{
                position: 'absolute',
                right: '0.65rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: 'var(--secondary-foreground)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '0.2rem',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>

        <div style={{ fontSize: '0.8rem', color: 'var(--secondary-foreground)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span>
            Menampilkan <strong>{filteredRequests.length}</strong> dari <strong>{requests.length}</strong> pengajuan
          </span>
          {(filterStatus !== 'ALL' || searchQuery.trim()) && (
            <button
              type="button"
              onClick={() => {
                setFilterStatus('ALL');
                setSearchQuery('');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                fontSize: '0.8rem',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: 0,
              }}
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Table Data */}
      {filteredRequests.length === 0 ? (
        <div
          style={{
            padding: '2.5rem 1rem',
            textAlign: 'center',
            color: 'var(--secondary-foreground)',
            border: '1px dashed var(--border)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--surface)',
          }}
        >
          <p style={{ fontWeight: 500 }}>Tidak ada pengajuan warga yang sesuai kriteria.</p>
          <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
            Coba ubah tab filter atau kata kunci pencarian Anda.
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--secondary-foreground)', fontWeight: 600, fontSize: '0.825rem' }}>
                  ID Pengajuan
                </th>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--secondary-foreground)', fontWeight: 600, fontSize: '0.825rem' }}>
                  Layanan
                </th>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--secondary-foreground)', fontWeight: 600, fontSize: '0.825rem' }}>
                  Pemohon
                </th>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--secondary-foreground)', fontWeight: 600, fontSize: '0.825rem' }}>
                  Wilayah
                </th>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--secondary-foreground)', fontWeight: 600, fontSize: '0.825rem' }}>
                  Tanggal
                </th>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--secondary-foreground)', fontWeight: 600, fontSize: '0.825rem' }}>
                  Status
                </th>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--secondary-foreground)', fontWeight: 600, fontSize: '0.825rem', textAlign: 'center' }}>
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((req) => {
                const badge = statusBadge(req.status);
                const rtNomor = req.applicant?.rt?.nomor || '-';
                const rwNomor = req.applicant?.rt?.rw?.nomor || '-';

                return (
                  <tr
                    key={req.id}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      transition: 'background 0.2s',
                    }}
                  >
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem' }}>
                      <Link
                        href={`/dashboard/pengajuan/${req.id}`}
                        style={{ color: 'var(--primary)', fontWeight: 600 }}
                      >
                        #{req.id.slice(0, 8).toUpperCase()}
                      </Link>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', fontWeight: 500 }}>
                      {req.serviceType?.name || 'Surat Pengantar'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem' }}>
                      <div style={{ fontWeight: 500 }}>{req.applicant?.namaLengkap}</div>
                      {req.applicant?.nik && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--secondary-foreground)' }}>
                          NIK: {req.applicant.nik}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem' }}>
                      RT {rtNomor} / RW {rwNomor}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.825rem', color: 'var(--secondary-foreground)' }}>
                      {new Date(req.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.6rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <Link
                        href={`/dashboard/pengajuan/${req.id}`}
                        className="btn"
                        style={{
                          fontSize: '0.775rem',
                          padding: '0.3rem 0.65rem',
                          backgroundColor: 'var(--primary)',
                          color: 'var(--primary-foreground)',
                          textDecoration: 'none',
                        }}
                      >
                        Tinjau
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
