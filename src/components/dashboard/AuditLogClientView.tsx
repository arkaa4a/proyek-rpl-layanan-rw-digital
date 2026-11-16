'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';

type AuditLogItem = {
  id: string;
  action: string;
  userId: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: Date | string;
  user?: {
    id: string;
    username: string;
    role?: {
      name: string;
    } | null;
  } | null;
};

type AuditLogStats = {
  totalLogs: number;
  loginCount: number;
  todayCount: number;
  activeUsersCount: number;
};

type Props = {
  initialLogs: AuditLogItem[];
  stats: AuditLogStats;
};

export default function AuditLogClientView({ initialLogs, stats }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedActionType, setSelectedActionType] = useState('ALL');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Format date helper
  const formatDate = (dateInput: Date | string) => {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).replace(/\./g, ':') + ' WIB';
  };

  const getRelativeTime = (dateInput: Date | string) => {
    const d = new Date(dateInput);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Baru saja';
    if (diffMin < 60) return `${diffMin} menit yang lalu`;
    if (diffHour < 24) return `${diffHour} jam yang lalu`;
    if (diffDay < 7) return `${diffDay} hari yang lalu`;
    return d.toLocaleDateString('id-ID');
  };

  const getActionBadge = (action: string) => {
    if (action.includes('LOGIN_SUCCESS')) {
      return {
        bg: '#dcfce7',
        text: '#15803d',
        border: '#86efac',
        label: 'Login Berhasil',
      };
    }
    if (action.includes('LOGIN_FAILED')) {
      return {
        bg: '#fee2e2',
        text: '#b91c1c',
        border: '#fca5a5',
        label: 'Login Gagal',
      };
    }
    if (action.includes('LOGOUT')) {
      return {
        bg: '#ffedd5',
        text: '#c2410c',
        border: '#fdba74',
        label: 'Logout',
      };
    }
    if (action.includes('CREATE')) {
      return {
        bg: '#dbeafe',
        text: '#1d4ed8',
        border: '#93c5fd',
        label: action.replace('CREATE_', 'Buat '),
      };
    }
    if (action.includes('EDIT') || action.includes('UPDATE')) {
      return {
        bg: '#fef3c7',
        text: '#b45309',
        border: '#fde68a',
        label: action.replace('EDIT_', 'Ubah ').replace('UPDATE_', 'Ubah '),
      };
    }
    if (action.includes('DELETE') || action.includes('DEACTIVATE')) {
      return {
        bg: '#f1f5f9',
        text: '#dc2626',
        border: '#fca5a5',
        label: action.replace('DELETE_', 'Hapus ').replace('DEACTIVATE_', 'Nonaktifkan '),
      };
    }

    return {
      bg: '#f1f5f9',
      text: '#475569',
      border: '#cbd5e1',
      label: action,
    };
  };

  const getRoleBadge = (roleName?: string | null) => {
    switch (roleName) {
      case 'SUPER_ADMIN':
        return { bg: '#ede9fe', text: '#6d28d9', label: 'Super Admin' };
      case 'ADMIN_RW':
        return { bg: '#e0e7ff', text: '#4338ca', label: 'Admin RW' };
      case 'KETUA_RW':
        return { bg: '#dcfce7', text: '#15803d', label: 'Ketua RW' };
      case 'KETUA_RT':
        return { bg: '#fef3c7', text: '#b45309', label: 'Ketua RT' };
      case 'WARGA':
        return { bg: '#f1f5f9', text: '#334155', label: 'Warga' };
      default:
        return { bg: '#f3f4f6', text: '#6b7280', label: roleName || 'Sistem' };
    }
  };

  const parseDetailsSummary = (details: string | null) => {
    if (!details) return '-';
    try {
      const parsed = JSON.parse(details);
      if (typeof parsed !== 'object' || parsed === null) return details;
      
      const parts: string[] = [];
      if (parsed.role) parts.push(`Role: ${parsed.role}`);
      if (parsed.judul) parts.push(`Judul: "${parsed.judul}"`);
      if (parsed.kategori) parts.push(`Kategori: ${parsed.kategori}`);
      if (parsed.wargaId) parts.push(`Warga ID: ${parsed.wargaId.slice(0, 8)}...`);
      if (parsed.pengumumanId) parts.push(`Pengumuman: ${parsed.pengumumanId.slice(0, 8)}...`);

      if (parts.length > 0) return parts.join(' | ');
      return JSON.stringify(parsed);
    } catch {
      return details;
    }
  };

  // Filter logs
  const filteredLogs = useMemo(() => {
    return initialLogs.filter((log) => {
      // Search filter
      const search = searchTerm.toLowerCase();
      const usernameMatch = log.user?.username?.toLowerCase().includes(search);
      const actionMatch = log.action.toLowerCase().includes(search);
      const detailsMatch = log.details?.toLowerCase().includes(search);
      const ipMatch = log.ipAddress?.toLowerCase().includes(search);
      const matchesSearch = !search || usernameMatch || actionMatch || detailsMatch || ipMatch;

      // Action type filter
      let matchesAction = true;
      if (selectedActionType === 'AUTH') {
        matchesAction = log.action.includes('LOGIN') || log.action.includes('LOGOUT');
      } else if (selectedActionType === 'PENGUMUMAN') {
        matchesAction = log.action.includes('PENGUMUMAN');
      } else if (selectedActionType === 'WARGA') {
        matchesAction = log.action.includes('WARGA');
      } else if (selectedActionType !== 'ALL') {
        matchesAction = log.action === selectedActionType;
      }

      // Role filter
      let matchesRole = true;
      if (selectedRole !== 'ALL') {
        matchesRole = log.user?.role?.name === selectedRole;
      }

      return matchesSearch && matchesAction && matchesRole;
    });
  }, [initialLogs, searchTerm, selectedActionType, selectedRole]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header & Back link */}
      <div>
        <div style={{ marginBottom: '1rem' }}>
          <Link
            href="/dashboard/admin"
            className="btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              fontSize: '0.875rem',
            }}
          >
            ← Kembali ke Dashboard Admin
          </Link>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--foreground)', margin: 0 }}>
                  Log Aktivitas Sistem (Audit Trail)
                </h1>
              </div>
              <span
                style={{
                  background: '#ede9fe',
                  color: '#6d28d9',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: '1px solid #ddd6fe',
                }}
              >
                Super Admin Only
              </span>
            </div>
            <p style={{ color: 'var(--secondary-foreground)', fontSize: '0.925rem' }}>
              Pantau seluruh rekam jejak autentikasi, aksi pengurus, dan riwayat modifikasi sistem secara transparan dan akurat.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--secondary-foreground)' }}>Total Log Tersimpan</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--primary)' }}>
            {stats.totalLogs.toLocaleString('id-ID')}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Seluruh jejak audit di sistem</div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--secondary-foreground)' }}>Aktivitas Hari Ini</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#10b981' }}>
            {stats.todayCount.toLocaleString('id-ID')}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Log tercatat sejak 00:00 WIB</div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--secondary-foreground)' }}>Riwayat Autentikasi</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#8b5cf6' }}>
            {stats.loginCount.toLocaleString('id-ID')}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Event login / akses masuk</div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--secondary-foreground)' }}>Aktor Teridentifikasi</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#f59e0b' }}>
            {stats.activeUsersCount.toLocaleString('id-ID')}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Pengguna yang beraktivitas</div>
        </div>
      </div>

      {/* Filter and Search Card */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: '1 1 320px', position: 'relative' }}>
            <input
              type="text"
              placeholder="Cari username, aksi, IP, atau rincian..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--foreground)',
                fontSize: '0.875rem',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Action Filter */}
            <select
              value={selectedActionType}
              onChange={(e) => {
                setSelectedActionType(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--foreground)',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">Semua Kategori Aksi</option>
              <option value="AUTH">Autentikasi (Login/Logout)</option>
              <option value="PENGUMUMAN">Pengumuman (Buat/Edit/Hapus)</option>
              <option value="WARGA">Manajemen Data Warga</option>
              <option value="LOGIN_SUCCESS">Login Berhasil</option>
              <option value="LOGOUT">Logout</option>
            </select>

            {/* Role Filter */}
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--foreground)',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">Semua Role</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="ADMIN_RW">Admin RW</option>
              <option value="KETUA_RW">Ketua RW</option>
              <option value="KETUA_RT">Ketua RT</option>
              <option value="WARGA">Warga</option>
            </select>

            {(searchTerm || selectedActionType !== 'ALL' || selectedRole !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedActionType('ALL');
                  setSelectedRole('ALL');
                  setCurrentPage(1);
                }}
                className="btn"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  fontSize: '0.875rem',
                  color: 'var(--error)',
                }}
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', background: 'rgba(0,0,0,0.02)' }}>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--secondary-foreground)' }}>WAKTU</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--secondary-foreground)' }}>PENGGUNA / AKTOR</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--secondary-foreground)' }}>AKSI / EVENT</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--secondary-foreground)' }}>RINCIAN</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--secondary-foreground)' }}>IP / OPS</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--secondary-foreground)' }}>
                    Tidak ada aktivitas yang sesuai dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  const badge = getActionBadge(log.action);
                  const roleBadge = getRoleBadge(log.user?.role?.name);

                  return (
                    <tr
                      key={log.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      {/* Waktu */}
                      <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)' }}>
                          {formatDate(log.createdAt)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {getRelativeTime(log.createdAt)}
                        </div>
                      </td>

                      {/* Pengguna / Aktor */}
                      <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              backgroundColor: roleBadge.bg,
                              color: roleBadge.text,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 'bold',
                              fontSize: '0.8125rem',
                              border: `1px solid ${roleBadge.text}33`,
                            }}
                          >
                            {log.user?.username ? log.user.username.charAt(0).toUpperCase() : '?'}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                              {log.user?.username || 'Sistem / Tamu'}
                            </div>
                            <span
                              style={{
                                display: 'inline-block',
                                fontSize: '0.6875rem',
                                fontWeight: 600,
                                padding: '2px 8px',
                                borderRadius: '9999px',
                                backgroundColor: roleBadge.bg,
                                color: roleBadge.text,
                              }}
                            >
                              {roleBadge.label}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Aksi / Event */}
                      <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.45rem',
                            padding: '0.35rem 0.75rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            backgroundColor: badge.bg,
                            color: badge.text,
                            border: `1px solid ${badge.border}`,
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: badge.text,
                              display: 'inline-block',
                            }}
                          />
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      {/* Rincian */}
                      <td style={{ padding: '1rem', maxWidth: '320px' }}>
                        <div
                          style={{
                            fontSize: '0.8125rem',
                            color: 'var(--foreground)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={log.details || ''}
                        >
                          {parseDetailsSummary(log.details)}
                        </div>
                      </td>

                      {/* IP / Detail button */}
                      <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            {log.ipAddress || 'Internal'}
                          </span>
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="btn"
                            style={{
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.75rem',
                              border: '1px solid var(--border)',
                              background: 'var(--surface)',
                              borderRadius: 'var(--radius-sm)',
                            }}
                          >
                            Detail
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', paddingTop: '0.5rem' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--secondary-foreground)' }}>
            Menampilkan {filteredLogs.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} -{' '}
            {Math.min(currentPage * pageSize, filteredLogs.length)} dari {filteredLogs.length} aktivitas
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="btn"
              style={{
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                fontSize: '0.875rem',
                opacity: currentPage === 1 ? 0.5 : 1,
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              }}
            >
              ← Sebelumnya
            </button>
            <span style={{ fontSize: '0.875rem', padding: '0 0.5rem' }}>
              Halaman {currentPage} dari {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage >= totalPages}
              className="btn"
              style={{
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                fontSize: '0.875rem',
                opacity: currentPage >= totalPages ? 0.5 : 1,
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              Selanjutnya →
            </button>
          </div>
        </div>
      </div>

      {/* Modal Detail Log */}
      {selectedLog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '560px',
              backgroundColor: 'var(--surface)',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: 'var(--shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', margin: 0 }}>Detail Entri Log Aktivitas</h3>
              <button
                onClick={() => setSelectedLog(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem', color: 'var(--secondary-foreground)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                aria-label="Tutup"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', fontSize: '0.875rem' }}>
              <div>
                <strong style={{ display: 'block', color: 'var(--secondary-foreground)', fontSize: '0.75rem' }}>ID LOG</strong>
                <span style={{ fontFamily: 'monospace' }}>{selectedLog.id}</span>
              </div>

              <div>
                <strong style={{ display: 'block', color: 'var(--secondary-foreground)', fontSize: '0.75rem' }}>WAKTU LENGKAP</strong>
                <span>{formatDate(selectedLog.createdAt)} ({new Date(selectedLog.createdAt).toISOString()})</span>
              </div>

              <div>
                <strong style={{ display: 'block', color: 'var(--secondary-foreground)', fontSize: '0.75rem' }}>AKTOR / PENGGUNA</strong>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <span>{selectedLog.user?.username || 'Tidak Diketahui'}</span>
                  {selectedLog.user?.role && (
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: getRoleBadge(selectedLog.user.role.name).bg,
                        color: getRoleBadge(selectedLog.user.role.name).text,
                      }}
                    >
                      {selectedLog.user.role.name}
                    </span>
                  )}
                  {selectedLog.userId && (
                    <span style={{ fontSize: '0.75rem', color: '#6b7280', fontFamily: 'monospace' }}>
                      (User ID: {selectedLog.userId.slice(0, 8)}...)
                    </span>
                  )}
                </div>
              </div>

              <div>
                <strong style={{ display: 'block', color: 'var(--secondary-foreground)', fontSize: '0.75rem' }}>AKSI TERCATAT</strong>
                <span style={{ fontWeight: 600 }}>{selectedLog.action}</span>
              </div>

              <div>
                <strong style={{ display: 'block', color: 'var(--secondary-foreground)', fontSize: '0.75rem' }}>IP ADDRESS</strong>
                <span>{selectedLog.ipAddress || 'Internal Server / Local'}</span>
              </div>

              <div>
                <strong style={{ display: 'block', color: 'var(--secondary-foreground)', fontSize: '0.75rem', marginBottom: '0.35rem' }}>DATA RINCIAN (PAYLOAD)</strong>
                <pre
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.04)',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8125rem',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    border: '1px solid var(--border)',
                  }}
                >
                  {selectedLog.details
                    ? (() => {
                        try {
                          return JSON.stringify(JSON.parse(selectedLog.details), null, 2);
                        } catch {
                          return selectedLog.details;
                        }
                      })()
                    : 'Tidak ada data tambahan.'}
                </pre>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button
                onClick={() => setSelectedLog(null)}
                className="btn btn-primary"
                style={{ padding: '0.5rem 1.25rem' }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
