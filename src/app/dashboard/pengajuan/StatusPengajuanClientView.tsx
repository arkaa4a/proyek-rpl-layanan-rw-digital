'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';

export interface RequestHistoryItem {
  id: string;
  note?: string | null;
  status: string;
  createdAt: Date | string;
}

export interface ServiceTypeItem {
  id: string;
  name: string;
  code?: string | null;
}

export interface UserRequestItem {
  id: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  status: string;
  documentNumber?: string | null;
  documentStatus?: string | null;
  pdfUrl?: string | null;
  serviceType: ServiceTypeItem;
  histories: RequestHistoryItem[];
}

interface StatusPengajuanClientViewProps {
  requests: UserRequestItem[];
}

export default function StatusPengajuanClientView({ requests }: StatusPengajuanClientViewProps) {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedService, setSelectedService] = useState<string>('ALL');

  // Format label status
  const formatStatusLabel = (val: string) => {
    switch (val) {
      case 'DOCUMENT_ISSUED': return 'Dokumen PDF Terbit';
      case 'APPROVED':
      case 'COMPLETED': return 'Selesai';
      case 'REJECTED': return 'Ditolak';
      case 'SUBMITTED':
      case 'PENDING_RT_VERIFICATION': return 'Menunggu Verifikasi RT';
      case 'VERIFIED_RT':
      case 'PENDING_RW_APPROVAL': return 'Menunggu Persetujuan RW';
      case 'REVISION_REQUIRED': return 'Revisi Diperlukan';
      default: return 'Sedang Diproses';
    }
  };

  // Format warna status
  const formatStatusColor = (val: string) => {
    switch (val) {
      case 'DOCUMENT_ISSUED':
      case 'APPROVED': 
      case 'COMPLETED': return '#16a34a'; // Green
      case 'REJECTED': return '#dc2626'; // Red
      case 'SUBMITTED':
      case 'PENDING_RT_VERIFICATION': return '#d97706'; // Amber
      case 'VERIFIED_RT':
      case 'PENDING_RW_APPROVAL': return '#4f46e5'; // Indigo
      case 'REVISION_REQUIRED': return '#ea580c'; // Orange
      default: return '#2563eb'; // Blue
    }
  };

  // Kategori unik layanan untuk filter dropdown
  const uniqueServices = useMemo(() => {
    const map = new Map<string, string>();
    requests.forEach((r) => {
      if (r.serviceType?.id && r.serviceType?.name) {
        map.set(r.serviceType.id, r.serviceType.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [requests]);

  // Hitungan untuk masing-masing tab filter
  const countAll = requests.length;

  const countSelesai = useMemo(() => {
    return requests.filter((r) => ['DOCUMENT_ISSUED', 'APPROVED', 'COMPLETED'].includes(r.status)).length;
  }, [requests]);

  const countProses = useMemo(() => {
    return requests.filter((r) =>
      ['SUBMITTED', 'PENDING_RT_VERIFICATION', 'VERIFIED_RT', 'PENDING_RW_APPROVAL', 'DRAFT'].includes(r.status)
    ).length;
  }, [requests]);

  const countRevisi = useMemo(() => {
    return requests.filter((r) => r.status === 'REVISION_REQUIRED').length;
  }, [requests]);

  const countDitolak = useMemo(() => {
    return requests.filter((r) => r.status === 'REJECTED').length;
  }, [requests]);

  // Logika Filter dan Search
  const filteredRequests = useMemo(() => {
    return requests.filter((item) => {
      // 1. Filter status utama (selesai vs belum / ditolak)
      if (filterStatus === 'SELESAI') {
        if (!['DOCUMENT_ISSUED', 'APPROVED', 'COMPLETED'].includes(item.status)) return false;
      } else if (filterStatus === 'PROSES') {
        if (!['SUBMITTED', 'PENDING_RT_VERIFICATION', 'VERIFIED_RT', 'PENDING_RW_APPROVAL', 'DRAFT'].includes(item.status)) return false;
      } else if (filterStatus === 'REVISI') {
        if (item.status !== 'REVISION_REQUIRED') return false;
      } else if (filterStatus === 'DITOLAK') {
        if (item.status !== 'REJECTED') return false;
      }

      // 2. Filter tipe layanan
      if (selectedService !== 'ALL') {
        if (item.serviceType?.id !== selectedService) return false;
      }

      // 3. Pencarian teks
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const idMatch = item.id.toLowerCase().includes(query);
        const serviceNameMatch = item.serviceType?.name?.toLowerCase().includes(query);
        const docNumberMatch = item.documentNumber?.toLowerCase().includes(query);
        const noteMatch = item.histories?.[0]?.note?.toLowerCase().includes(query);
        const statusLabelMatch = formatStatusLabel(item.status).toLowerCase().includes(query);

        if (!idMatch && !serviceNameMatch && !docNumberMatch && !noteMatch && !statusLabelMatch) {
          return false;
        }
      }

      return true;
    });
  }, [requests, filterStatus, selectedService, searchQuery]);

  const resetFilters = () => {
    setFilterStatus('ALL');
    setSelectedService('ALL');
    setSearchQuery('');
  };

  const isFiltered = filterStatus !== 'ALL' || selectedService !== 'ALL' || searchQuery.trim().length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header Halaman */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <Link 
              href="/dashboard/warga" 
              style={{ fontSize: '0.875rem', color: 'var(--primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              Dashboard Warga
            </Link>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '0.25rem' }}>
            Status Pengajuan Surat
          </h1>
          <p style={{ color: 'var(--secondary-foreground)', fontSize: '0.95rem' }}>
            Pantau seluruh riwayat dan progres verifikasi permohonan surat Anda secara real-time.
          </p>
        </div>

        <Link href="/dashboard/layanan" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Ajukan Surat Baru
        </Link>
      </div>

      {/* Jika memang belum pernah ada pengajuan sama sekali dari akun ini */}
      {requests.length === 0 ? (
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
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" x2="8" y1="13" y2="13" />
              <line x1="16" x2="8" y1="17" y2="17" />
            </svg>
          </div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem', color: 'inherit' }}>
            Belum Ada Pengajuan Surat
          </h3>
          <p style={{ fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto 1.5rem auto' }}>
            Anda belum pernah mengajukan permohonan surat administrasi. Silakan pilih layanan yang tersedia untuk memulai pengajuan baru.
          </p>
          <Link href="/dashboard/layanan" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            Pilih Layanan Surat
          </Link>
        </div>
      ) : (
        <>
          {/* PANEL KONTROL PENCARIAN & FILTER */}
          <div
            className="card"
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            {/* Baris 1: Kotak Pencarian & Dropdown Jenis Surat */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 300px', position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '0.85rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--secondary-foreground)',
                    display: 'flex',
                    alignItems: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Cari ID permohonan, nama surat (SKU, Domisili...), atau catatan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 2.25rem 0.65rem 2.5rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    color: 'var(--foreground)',
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
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--secondary-foreground)',
                      cursor: 'pointer',
                      padding: '0.2rem',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                )}
              </div>

              {/* Dropdown Filter Jenis Surat */}
              {uniqueServices.length > 1 && (
                <div style={{ flex: '0 1 240px' }}>
                  <select
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      background: 'var(--background)',
                      color: 'var(--foreground)',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="ALL">Semua Jenis Layanan ({countAll})</option>
                    {uniqueServices.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Baris 2: Tab Filter Status Cepat (Selesai vs Proses vs Ditolak) */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setFilterStatus('ALL')}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '9999px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: filterStatus === 'ALL' ? '1px solid var(--primary)' : '1px solid var(--border)',
                  backgroundColor: filterStatus === 'ALL' ? 'var(--primary)' : 'var(--background)',
                  color: filterStatus === 'ALL' ? 'var(--primary-foreground)' : 'var(--foreground)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.15s ease',
                }}
              >
                Semua
                <span
                  style={{
                    fontSize: '0.7rem',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '9999px',
                    backgroundColor: filterStatus === 'ALL' ? 'rgba(255,255,255,0.2)' : 'var(--secondary)',
                    color: 'inherit',
                  }}
                >
                  {countAll}
                </span>
              </button>

              {/* Tab: Selesai / Dokumen Terbit */}
              <button
                type="button"
                onClick={() => setFilterStatus('SELESAI')}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '9999px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: filterStatus === 'SELESAI' ? '1px solid #16a34a' : '1px solid var(--border)',
                  backgroundColor: filterStatus === 'SELESAI' ? '#16a34a' : 'var(--background)',
                  color: filterStatus === 'SELESAI' ? '#ffffff' : 'var(--foreground)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.15s ease',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: filterStatus === 'SELESAI' ? '#ffffff' : '#16a34a',
                    display: 'inline-block',
                  }}
                />
                Selesai (PDF Terbit)
                <span
                  style={{
                    fontSize: '0.7rem',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '9999px',
                    backgroundColor: filterStatus === 'SELESAI' ? 'rgba(255,255,255,0.2)' : 'rgba(22, 163, 74, 0.1)',
                    color: filterStatus === 'SELESAI' ? '#ffffff' : '#16a34a',
                  }}
                >
                  {countSelesai}
                </span>
              </button>

              {/* Tab: Sedang Diproses */}
              <button
                type="button"
                onClick={() => setFilterStatus('PROSES')}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '9999px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: filterStatus === 'PROSES' ? '1px solid #d97706' : '1px solid var(--border)',
                  backgroundColor: filterStatus === 'PROSES' ? '#d97706' : 'var(--background)',
                  color: filterStatus === 'PROSES' ? '#ffffff' : 'var(--foreground)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.15s ease',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: filterStatus === 'PROSES' ? '#ffffff' : '#d97706',
                    display: 'inline-block',
                  }}
                />
                Sedang Diproses
                <span
                  style={{
                    fontSize: '0.7rem',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '9999px',
                    backgroundColor: filterStatus === 'PROSES' ? 'rgba(255,255,255,0.2)' : 'rgba(217, 119, 6, 0.1)',
                    color: filterStatus === 'PROSES' ? '#ffffff' : '#d97706',
                  }}
                >
                  {countProses}
                </span>
              </button>

              {/* Tab: Perlu Tindakan / Revisi (Jika ada) */}
              {countRevisi > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterStatus('REVISI')}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: '9999px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: filterStatus === 'REVISI' ? '1px solid #ea580c' : '1px solid var(--border)',
                    backgroundColor: filterStatus === 'REVISI' ? '#ea580c' : 'var(--background)',
                    color: filterStatus === 'REVISI' ? '#ffffff' : 'var(--foreground)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: filterStatus === 'REVISI' ? '#ffffff' : '#ea580c',
                      display: 'inline-block',
                    }}
                  />
                  Perlu Revisi
                  <span
                    style={{
                      fontSize: '0.7rem',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '9999px',
                      backgroundColor: filterStatus === 'REVISI' ? 'rgba(255,255,255,0.2)' : 'rgba(234, 88, 12, 0.1)',
                      color: filterStatus === 'REVISI' ? '#ffffff' : '#ea580c',
                    }}
                  >
                    {countRevisi}
                  </span>
                </button>
              )}

              {/* Tab: Ditolak */}
              {countDitolak > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterStatus('DITOLAK')}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: '9999px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: filterStatus === 'DITOLAK' ? '1px solid #dc2626' : '1px solid var(--border)',
                    backgroundColor: filterStatus === 'DITOLAK' ? '#dc2626' : 'var(--background)',
                    color: filterStatus === 'DITOLAK' ? '#ffffff' : 'var(--foreground)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: filterStatus === 'DITOLAK' ? '#ffffff' : '#dc2626',
                      display: 'inline-block',
                    }}
                  />
                  Ditolak
                  <span
                    style={{
                      fontSize: '0.7rem',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '9999px',
                      backgroundColor: filterStatus === 'DITOLAK' ? 'rgba(255,255,255,0.2)' : 'rgba(220, 38, 38, 0.1)',
                      color: filterStatus === 'DITOLAK' ? '#ffffff' : '#dc2626',
                    }}
                  >
                    {countDitolak}
                  </span>
                </button>
              )}

              {/* Tombol Reset jika filter aktif */}
              {isFiltered && (
                <button
                  type="button"
                  onClick={resetFilters}
                  style={{
                    padding: '0.45rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    border: '1px dashed var(--border)',
                    background: 'transparent',
                    color: 'var(--secondary-foreground)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                  }}
                  title="Kembalikan ke semua permohonan"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                  Reset Filter
                </button>
              )}
            </div>

            {/* Keterangan Jumlah Hasil */}
            <div style={{ fontSize: '0.8rem', color: 'var(--secondary-foreground)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '0.6rem' }}>
              <span>
                Menampilkan <strong>{filteredRequests.length}</strong> dari <strong>{countAll}</strong> permohonan surat
              </span>
              {isFiltered && (
                <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 500 }}>
                  Filter sedang aktif
                </span>
              )}
            </div>
          </div>

          {/* LIST KARTU PENGAJUAN */}
          {filteredRequests.length === 0 ? (
            <div
              className="card glass"
              style={{
                textAlign: 'center',
                padding: '3rem 1.5rem',
                color: 'var(--secondary-foreground)',
                border: '1px dashed var(--border)',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--secondary)',
                  color: 'var(--secondary-foreground)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem auto',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--foreground)' }}>
                Tidak Ada Surat yang Cocok
              </h3>
              <p style={{ fontSize: '0.85rem', maxWidth: '380px', margin: '0 auto 1.25rem auto' }}>
                Tidak ditemukan permohonan surat yang sesuai dengan kata kunci &ldquo;{searchQuery}&rdquo; atau filter yang dipilih.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="btn"
                style={{ border: '1px solid var(--border)', background: 'var(--surface)', fontSize: '0.85rem' }}
              >
                Tampilkan Semua Surat
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredRequests.map((req) => {
                const latestHistory = req.histories?.[0];
                const formattedDate = new Date(req.createdAt).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                });

                return (
                  <div 
                    key={req.id} 
                    className="card"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '1.25rem 1.5rem',
                      gap: '1.5rem',
                      flexWrap: 'wrap',
                      borderLeft: `4px solid ${formatStatusColor(req.status)}`,
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    }}
                  >
                    {/* Info Utama Pengajuan */}
                    <div style={{ flex: '1 1 300px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold' }}>
                          {req.serviceType.name}
                        </h3>
                        <span 
                          style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: 600, 
                            padding: '0.2rem 0.6rem', 
                            borderRadius: 'var(--radius-full)',
                            backgroundColor: `${formatStatusColor(req.status)}18`,
                            color: formatStatusColor(req.status),
                            border: `1px solid ${formatStatusColor(req.status)}40`,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                          }}
                        >
                          <span
                            style={{
                              width: '5px',
                              height: '5px',
                              borderRadius: '50%',
                              backgroundColor: formatStatusColor(req.status),
                              display: 'inline-block',
                            }}
                          />
                          {formatStatusLabel(req.status)}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.85rem', color: 'var(--secondary-foreground)', display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                        <span>
                          Diajukan: <strong>{formattedDate}</strong>
                        </span>
                        <span>
                          ID: <span style={{ fontFamily: 'monospace' }}>{req.id.slice(0, 8).toUpperCase()}</span>
                        </span>
                        {req.documentNumber && (
                          <span>
                            No. Surat: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{req.documentNumber}</span>
                          </span>
                        )}
                      </div>

                      {latestHistory?.note && (
                        <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--secondary-foreground)', fontStyle: 'italic', background: 'var(--secondary)', padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-sm)', display: 'inline-block' }}>
                          Catatan: &ldquo;{latestHistory.note}&rdquo;
                        </p>
                      )}
                    </div>

                    {/* Tombol Aksi */}
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <Link 
                        href={`/dashboard/pengajuan/${req.id}`} 
                        className="btn"
                        style={{ 
                          padding: '0.5rem 1rem', 
                          fontSize: '0.875rem', 
                          border: '1px solid var(--border)', 
                          background: 'var(--surface)',
                          textDecoration: 'none',
                          color: 'inherit',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        Lihat Detail
                      </Link>

                      {req.status === 'DOCUMENT_ISSUED' && req.pdfUrl && (
                        <a 
                          href={req.pdfUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="btn btn-primary"
                          style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                          </svg>
                          Unduh PDF
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
