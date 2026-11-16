'use client';

import React, { useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import { retryNotificationAction } from '@/app/dashboard/notifikasi/actions';

export interface NotificationLogItem {
  id: string;
  type: string;
  channel: string;
  recipient: string;
  recipientName: string | null;
  subject: string;
  content: string;
  status: string;
  errorMessage: string | null;
  actionUrl?: string | null;
  isRead?: boolean;
  retryCount: number;
  sentAt: Date | string | null;
  createdAt: Date | string;
}

interface StatsData {
  total: number;
  sent: number;
  failed: number;
  pending: number;
}

export default function NotificationHistoryClientView({
  initialLogs,
  stats,
  role,
}: {
  initialLogs: NotificationLogItem[];
  stats: StatsData;
  role: string;
}) {
  const [logs, setLogs] = useState(initialLogs);
  const [filterChannel, setFilterChannel] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<NotificationLogItem | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Helper masker email & nomor telepon untuk privasi
  const maskRecipient = (recipient: string, channel: string) => {
    if (!recipient || recipient === '(tidak tersedia)') return '-';
    if (channel === 'EMAIL' && recipient.includes('@')) {
      const [name, domain] = recipient.split('@');
      if (name.length <= 2) return `${name[0]}*@${domain}`;
      return `${name.slice(0, 2)}***${name.slice(-1)}@${domain}`;
    }
    // Mask phone number
    if (recipient.length > 7) {
      return `${recipient.slice(0, 4)}••••${recipient.slice(-4)}`;
    }
    return recipient;
  };

  // Format tanggal id-ID
  const formatDateTime = (dateInput?: Date | string | null) => {
    if (!dateInput) return '-';
    try {
      const d = new Date(dateInput);
      return d.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).replace(/\./g, ':') + ' WIB';
    } catch {
      return String(dateInput);
    }
  };

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (filterChannel !== 'ALL' && log.channel !== filterChannel) return false;
      if (filterStatus !== 'ALL' && log.status !== filterStatus) return false;
      if (filterType !== 'ALL' && log.type !== filterType) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSubject = log.subject.toLowerCase().includes(query);
        const matchesName = (log.recipientName || '').toLowerCase().includes(query);
        const matchesRecipient = log.recipient.toLowerCase().includes(query);
        if (!matchesSubject && !matchesName && !matchesRecipient) return false;
      }
      return true;
    });
  }, [logs, filterChannel, filterStatus, filterType, searchQuery]);

  // Handler retry pengiriman notifikasi
  const handleRetry = (logId: string) => {
    setRetryingId(logId);
    setFeedback(null);

    startTransition(async () => {
      const res = await retryNotificationAction(logId);
      setRetryingId(null);

      if (res.success) {
        setFeedback({
          type: 'success',
          message: 'Notifikasi berhasil dikirim ulang!',
        });
        // Perbarui status log di state lokal
        setLogs((prev) =>
          prev.map((l) =>
            l.id === logId
              ? { ...l, status: 'SENT', errorMessage: null, sentAt: new Date(), retryCount: l.retryCount + 1 }
              : l
          )
        );
        if (selectedLog?.id === logId) {
          setSelectedLog((prev) => (prev ? { ...prev, status: 'SENT', errorMessage: null, sentAt: new Date() } : null));
        }
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Pengiriman ulang gagal. Periksa konfigurasi API/SMTP.',
        });
        setLogs((prev) =>
          prev.map((l) =>
            l.id === logId ? { ...l, errorMessage: res.error || l.errorMessage, retryCount: l.retryCount + 1 } : l
          )
        );
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT':
        return { label: 'Terkirim', bg: '#dcfce7', color: '#16a34a', dotColor: '#16a34a' };
      case 'FAILED':
        return { label: 'Gagal', bg: '#fee2e2', color: '#b91c1c', dotColor: '#dc2626' };
      default:
        return { label: 'Menunggu', bg: '#fef3c7', color: '#b45309', dotColor: '#d97706' };
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'PENGUMUMAN':
        return { label: 'Pengumuman', bg: '#eff6ff', color: '#2563eb' };
      case 'PENGAJUAN_SURAT':
        return { label: 'Pengajuan Surat', bg: '#dcfce7', color: '#16a34a' };
      case 'PENGADUAN':
        return { label: 'Pengaduan', bg: '#fef3c7', color: '#b45309' };
      case 'INFORMASI_LAYANAN':
        return { label: 'Info & Pengingat', bg: '#eff6ff', color: '#1e40af' };
      default:
        return { label: type, bg: '#f1f5f9', color: '#475569' };
    }
  };

  let backLink = '/dashboard/admin';
  let backLabel = 'Dashboard';
  if (role === 'KETUA_RT') {
    backLink = '/dashboard/rt';
    backLabel = 'Dashboard RT';
  } else if (role === 'KETUA_RW' || role === 'ADMIN_RW') {
    backLink = '/dashboard/rw';
    backLabel = 'Dashboard RW';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* Header & Breadcrumb */}
      <div>
        <Link
          href={backLink}
          style={{
            fontSize: '0.875rem',
            color: 'var(--primary)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            marginBottom: '0.5rem',
            fontWeight: 500,
          }}
        >
          &larr; Kembali ke {backLabel}
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--foreground)', margin: 0 }}>
              Riwayat & Monitoring Notifikasi
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--secondary-foreground)', margin: '0.25rem 0 0 0' }}>
              Pemantauan pengiriman notifikasi otomatis via Email dan WhatsApp untuk warga lingkungan.
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="btn"
            style={{ border: '1px solid var(--border)', background: 'var(--surface)', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6"></path>
              <path d="M1 20v-6h6"></path>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            Segarkan Data
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            background: feedback.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: feedback.type === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${feedback.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.9rem',
          }}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
          >
            &times;
          </button>
        </div>
      )}

      {/* Metrics Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #3b82f6' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--secondary-foreground)', fontWeight: 600 }}>TOTAL NOTIFIKASI</span>
          <p style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: '0.35rem 0 0 0' }}>{stats.total}</p>
        </div>
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #22c55e' }}>
          <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600 }}>BERHASIL TERKIRIM</span>
          <p style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: '0.35rem 0 0 0', color: '#16a34a' }}>{stats.sent}</p>
        </div>
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #ef4444' }}>
          <span style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 600 }}>GAGAL / PERLU CEK</span>
          <p style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: '0.35rem 0 0 0', color: '#dc2626' }}>{stats.failed}</p>
        </div>
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
          <span style={{ fontSize: '0.8rem', color: '#d97706', fontWeight: 600 }}>DALAM ANTRIAN</span>
          <p style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: '0.35rem 0 0 0', color: '#d97706' }}>{stats.pending}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        className="card"
        style={{
          padding: '1.25rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', flex: 1, minWidth: '280px' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <input
              type="text"
              placeholder="Cari nama penerima atau judul..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--foreground)',
                fontSize: '0.875rem',
              }}
            />
          </div>

          {/* Filter Kanal */}
          <select
            value={filterChannel}
            onChange={(e) => setFilterChannel(e.target.value)}
            style={{
              padding: '0.55rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--foreground)',
              fontSize: '0.875rem',
            }}
          >
            <option value="ALL">Semua Kanal</option>
            <option value="EMAIL">Email</option>
            <option value="WHATSAPP">WhatsApp</option>
          </select>

          {/* Filter Status */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '0.55rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--foreground)',
              fontSize: '0.875rem',
            }}
          >
            <option value="ALL">Semua Status</option>
            <option value="SENT">Terkirim</option>
            <option value="FAILED">Gagal</option>
            <option value="PENDING">Menunggu</option>
          </select>

          {/* Filter Jenis */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              padding: '0.55rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--foreground)',
              fontSize: '0.875rem',
            }}
          >
            <option value="ALL">Semua Jenis</option>
            <option value="PENGUMUMAN">Pengumuman</option>
            <option value="PENGAJUAN_SURAT">Pengajuan Surat</option>
            <option value="PENGADUAN">Pengaduan Warga</option>
          </select>
        </div>

        <span style={{ fontSize: '0.85rem', color: 'var(--secondary-foreground)' }}>
          Menampilkan <strong>{filteredLogs.length}</strong> catatan
        </span>
      </div>

      {/* Main Table Card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--secondary)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>Waktu</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>Jenis</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>Kanal</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>Penerima</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>Subjek / Judul</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 600, textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--secondary-foreground)' }}>
                    Tidak ada catatan pengiriman notifikasi yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const statusInfo = getStatusBadge(log.status);
                  const typeInfo = getTypeBadge(log.type);
                  const isRetrying = retryingId === log.id;

                  return (
                    <tr
                      key={log.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap', color: 'var(--secondary-foreground)', fontSize: '0.8rem' }}>
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background: typeInfo.bg,
                            color: typeInfo.color,
                          }}
                        >
                          {typeInfo.label}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '9999px',
                            background: log.channel === 'EMAIL' ? 'rgba(37, 99, 235, 0.08)' : 'rgba(22, 163, 74, 0.08)',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            color: log.channel === 'EMAIL' ? '#2563eb' : '#16a34a',
                          }}
                        >
                          {log.channel === 'EMAIL' ? (
                            <>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                <polyline points="22,6 12,13 2,6"></polyline>
                              </svg>
                              Email
                            </>
                          ) : (
                            <>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                              </svg>
                              WhatsApp
                            </>
                          )}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>
                          {log.recipientName || 'Warga'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--secondary-foreground)', fontFamily: 'monospace' }}>
                          {maskRecipient(log.recipient, log.channel)}
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', maxWidth: '300px' }}>
                        <div
                          style={{
                            fontWeight: 500,
                            color: 'var(--foreground)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={log.subject}
                        >
                          {log.subject}
                        </div>
                        {log.errorMessage && (
                          <div
                            style={{
                              fontSize: '0.75rem',
                              color: '#dc2626',
                              marginTop: '0.2rem',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={log.errorMessage}
                          >
                            <span style={{ color: '#dc2626', fontWeight: 600 }}>Gagal:</span> {log.errorMessage}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            padding: '0.25rem 0.65rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background: statusInfo.bg,
                            color: statusInfo.color,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                          }}
                        >
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: statusInfo.dotColor }} />
                          <span>{statusInfo.label}</span>
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="btn"
                            style={{
                              padding: '0.3rem 0.6rem',
                              fontSize: '0.75rem',
                              border: '1px solid var(--border)',
                              background: 'var(--surface)',
                            }}
                          >
                            Rincian
                          </button>
                          {log.status === 'FAILED' && (
                            <button
                              onClick={() => handleRetry(log.id)}
                              disabled={isRetrying || isPending}
                              className="btn btn-primary"
                              style={{
                                padding: '0.3rem 0.6rem',
                                fontSize: '0.75rem',
                                background: '#dc2626',
                                borderColor: '#dc2626',
                              }}
                            >
                              {isRetrying ? 'Mengirim...' : 'Kirim Ulang'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLog && (
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
              onClick={() => setSelectedLog(null)}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'rgba(0,0,0,0.05)',
                border: 'none',
                cursor: 'pointer',
                width: '30px',
                height: '30px',
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

            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.25rem' }}>
              Rincian Notifikasi Pengiriman
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--secondary-foreground)', textTransform: 'uppercase' }}>
                  Subjek Pesan
                </span>
                <p style={{ fontSize: '1rem', fontWeight: 600, margin: '0.2rem 0 0 0' }}>{selectedLog.subject}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--secondary-foreground)', textTransform: 'uppercase' }}>
                    Jenis Notifikasi
                  </span>
                  <p style={{ fontSize: '0.9rem', fontWeight: 500, margin: '0.2rem 0 0 0' }}>{selectedLog.type}</p>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--secondary-foreground)', textTransform: 'uppercase' }}>
                    Kanal Pengiriman
                  </span>
                  <p style={{ fontSize: '0.9rem', fontWeight: 600, margin: '0.2rem 0 0 0' }}>
                    {selectedLog.channel === 'EMAIL' ? 'Email Resmi' : 'WhatsApp'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--secondary-foreground)', textTransform: 'uppercase' }}>
                    Nama Penerima
                  </span>
                  <p style={{ fontSize: '0.9rem', fontWeight: 500, margin: '0.2rem 0 0 0' }}>
                    {selectedLog.recipientName || '-'}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--secondary-foreground)', textTransform: 'uppercase' }}>
                    Kontak Tujuan
                  </span>
                  <p style={{ fontSize: '0.9rem', fontWeight: 500, margin: '0.2rem 0 0 0', fontFamily: 'monospace' }}>
                    {maskRecipient(selectedLog.recipient, selectedLog.channel)}
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--secondary-foreground)', textTransform: 'uppercase' }}>
                    Status Pengiriman
                  </span>
                  <div style={{ marginTop: '0.2rem' }}>
                    <span
                      style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: getStatusBadge(selectedLog.status).bg,
                        color: getStatusBadge(selectedLog.status).color,
                      }}
                    >
                      {getStatusBadge(selectedLog.status).label}
                    </span>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--secondary-foreground)', textTransform: 'uppercase' }}>
                    Waktu Berhasil Kirim
                  </span>
                  <p style={{ fontSize: '0.85rem', fontWeight: 500, margin: '0.2rem 0 0 0' }}>
                    {formatDateTime(selectedLog.sentAt)}
                  </p>
                </div>
              </div>

              {selectedLog.errorMessage && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '0.85rem', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#991b1b', fontWeight: 700, textTransform: 'uppercase' }}>
                    Penyebab Kesalahan (Debugging)
                  </span>
                  <p style={{ fontSize: '0.85rem', color: '#b91c1c', margin: '0.25rem 0 0 0', wordBreak: 'break-word' }}>
                    {selectedLog.errorMessage}
                  </p>
                </div>
              )}

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--secondary-foreground)', textTransform: 'uppercase' }}>
                  Ringkasan Konten Pesan
                </span>
                <div
                  style={{
                    marginTop: '0.35rem',
                    padding: '0.85rem',
                    background: 'var(--secondary)',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    maxHeight: '160px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.5,
                  }}
                >
                  {selectedLog.content}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="btn"
                  style={{ border: '1px solid var(--border)', background: 'transparent' }}
                >
                  Tutup
                </button>
                {selectedLog.actionUrl && (
                  <Link
                    href={selectedLog.actionUrl}
                    className="btn"
                    style={{
                      background: '#1e3a8a',
                      color: '#ffffff',
                      textDecoration: 'none',
                      fontWeight: 600,
                    }}
                  >
                    Lihat Detail &rarr;
                  </Link>
                )}
                {selectedLog.status === 'FAILED' && (
                  <button
                    type="button"
                    onClick={() => handleRetry(selectedLog.id)}
                    disabled={retryingId === selectedLog.id || isPending}
                    className="btn btn-primary"
                    style={{ background: '#dc2626', borderColor: '#dc2626' }}
                  >
                    {retryingId === selectedLog.id ? 'Mengirim...' : 'Kirim Ulang Notifikasi'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
