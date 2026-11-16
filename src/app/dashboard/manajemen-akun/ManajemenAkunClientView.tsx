'use client';

import React, { useState, useTransition, useEffect } from 'react';
import Link from 'next/link';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import {
  getAccountsAction,
  getAccountDetailAction,
  createAccountAction,
  updateAccountAction,
  toggleAccountStatusAction,
  deleteAccountAction,
  getReferenceDataAction,
} from './actions';

type UserItem = {
  id: string;
  username: string;
  email: string | null;
  noWhatsapp: string | null;
  roleId: string;
  role: {
    id: string;
    name: string;
    description: string | null;
  };
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  wargaId: string | null;
  warga: {
    id: string;
    namaLengkap: string;
    nik: string;
    email?: string | null;
    noWhatsapp?: string | null;
  } | null;
  rwId: string | null;
  rw: {
    id: string;
    nomor: string;
    namaKetua: string | null;
  } | null;
  rtId: string | null;
  rt: {
    id: string;
    nomor: string;
    namaKetua: string | null;
    rw: {
      nomor: string;
    } | null;
  } | null;
};

type Props = {
  initialData: {
    currentUserId: string;
    users: UserItem[];
    pagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
    };
    stats: {
      total: number;
      active: number;
      inactive: number;
      superAdmin: number;
      warga: number;
      pengurus: number;
    };
  };
  referenceData: {
    roles: { id: string; name: string; description: string | null }[];
    rws: { id: string; nomor: string; namaKetua: string | null }[];
    rts: { id: string; nomor: string; rwId: string; namaKetua: string | null; rw: { nomor: string } | null }[];
    unlinkedWarga: {
      id: string;
      namaLengkap: string;
      nik: string;
      email?: string | null;
      noWhatsapp?: string | null;
      rtId?: string | null;
      rt: { id?: string; nomor: string; rwId?: string; rw: { id?: string; nomor: string } | null } | null;
    }[];
  };
};

export default function ManajemenAkunClientView({ initialData, referenceData }: Props) {
  const [users, setUsers] = useState<UserItem[]>(initialData.users);
  const [pagination, setPagination] = useState(initialData.pagination);
  const [stats, setStats] = useState(initialData.stats);
  const currentUserId = initialData.currentUserId;

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(initialData.pagination.page);

  // Loading & Notification state
  const [isPending, startTransition] = useTransition();
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Target item for view / edit / delete
  const [selectedUserDetail, setSelectedUserDetail] = useState<any | null>(null);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserItem | null>(null);

  // Action dropdown menu state
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('[data-action-menu]')) {
        setActiveActionMenuId(null);
      }
    };
    if (activeActionMenuId) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [activeActionMenuId]);

  // Form states
  const [createForm, setCreateForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    roleId: referenceData.roles[0]?.id || '',
    email: '',
    noWhatsapp: '',
    wargaId: '',
    rwId: referenceData.rws[0]?.id || '',
    rtId: referenceData.rts[0]?.id || '',
    isActive: true,
  });

  const [editForm, setEditForm] = useState({
    username: '',
    roleId: '',
    email: '',
    noWhatsapp: '',
    wargaId: '',
    rwId: '',
    rtId: '',
    isActive: true,
    newPassword: '',
    confirmNewPassword: '',
  });

  // Password visibility toggles
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Auto-dismiss notification after 6 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Fetch / Refresh table data
  const fetchData = (newPage = page, newSearch = search, newRole = roleFilter, newStatus = statusFilter) => {
    startTransition(async () => {
      const res = await getAccountsAction({
        search: newSearch,
        roleFilter: newRole,
        statusFilter: newStatus,
        page: newPage,
        limit: pagination.limit,
      });

      if (res.success && res.users) {
        setUsers(res.users);
        setPagination(res.pagination);
        setStats(res.stats);
      } else if (res.error) {
        setNotification({ type: 'error', message: res.error });
      }
    });
  };

  // Handlers for Filters
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchData(1, search, roleFilter, statusFilter);
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setRoleFilter(val);
    setPage(1);
    fetchData(1, search, val, statusFilter);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setStatusFilter(val);
    setPage(1);
    fetchData(1, search, roleFilter, val);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchData(newPage, search, roleFilter, statusFilter);
  };

  // Open Detail Modal
  const handleOpenDetail = (user: UserItem) => {
    startTransition(async () => {
      const res = await getAccountDetailAction(user.id);
      if (res.success && res.data) {
        setSelectedUserDetail(res.data);
        setIsDetailOpen(true);
      } else {
        setNotification({ type: 'error', message: res.error || 'Gagal memuat detail akun.' });
      }
    });
  };

  // Open Edit Modal
  const handleOpenEdit = (user: UserItem) => {
    setEditingUser(user);
    setEditForm({
      username: user.username,
      roleId: user.roleId,
      email: user.email || '',
      noWhatsapp: user.noWhatsapp || '',
      wargaId: user.wargaId || '',
      rwId: user.rwId || '',
      rtId: user.rtId || '',
      isActive: user.isActive,
      newPassword: '',
      confirmNewPassword: '',
    });
    setShowEditPassword(false);
    setIsEditOpen(true);
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    startTransition(async () => {
      const res = await updateAccountAction(editingUser.id, editForm);
      if (res.success) {
        setNotification({ type: 'success', message: res.message || 'Akun berhasil diperbarui.' });
        setIsEditOpen(false);
        fetchData();
      } else {
        setNotification({ type: 'error', message: res.error || 'Gagal memperbarui akun.' });
      }
    });
  };

  // Handle Create Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      const res = await createAccountAction(createForm);
      if (res.success) {
        setNotification({ type: 'success', message: res.message || 'Akun berhasil dibuat.' });
        setIsCreateOpen(false);
        setCreateForm({
          username: '',
          password: '',
          confirmPassword: '',
          roleId: referenceData.roles[0]?.id || '',
          email: '',
          noWhatsapp: '',
          wargaId: '',
          rwId: referenceData.rws[0]?.id || '',
          rtId: referenceData.rts[0]?.id || '',
          isActive: true,
        });
        fetchData(1);
      } else {
        setNotification({ type: 'error', message: res.error || 'Gagal membuat akun.' });
      }
    });
  };

  // Handle Quick Toggle Status
  const handleToggleStatus = (user: UserItem) => {
    startTransition(async () => {
      const res = await toggleAccountStatusAction(user.id, !user.isActive);
      if (res.success) {
        setNotification({ type: 'success', message: res.message || 'Status akun berhasil diubah.' });
        fetchData();
      } else {
        setNotification({ type: 'error', message: res.error || 'Gagal mengubah status akun.' });
      }
    });
  };

  // Open Delete Confirmation
  const handleOpenDelete = (user: UserItem) => {
    setUserToDelete(user);
    setIsDeleteOpen(true);
  };

  // Handle Confirm Delete
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;

    const deletedId = userToDelete.id;
    const deletedUsername = userToDelete.username;
    const wasActive = userToDelete.isActive;

    startTransition(async () => {
      const res = await deleteAccountAction(deletedId);
      setIsDeleteOpen(false);
      setUserToDelete(null);

      if (res.success) {
        // Hapus langsung dari tampilan tabel agar seketika hilang
        setUsers((prev) => prev.filter((u) => u.id !== deletedId));
        setStats((prev) => ({
          ...prev,
          total: Math.max(0, prev.total - 1),
          active: wasActive ? Math.max(0, prev.active - 1) : prev.active,
          inactive: !wasActive ? Math.max(0, prev.inactive - 1) : prev.inactive,
        }));
        setNotification({
          type: 'success',
          message: res.message || `Akun "${deletedUsername}" berhasil dihapus dari papan manajemen akun.`,
        });
        fetchData();
      } else {
        setNotification({ type: 'error', message: res.error || 'Gagal menghapus akun.' });
      }
    });
  };

  // Format Helper
  const formatDate = (dateInput: string | Date | null | undefined) => {
    if (!dateInput) return '-';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Role Badge Styling
  const getRoleBadge = (roleName: string) => {
    switch (roleName) {
      case 'SUPER_ADMIN':
        return { bg: '#fef2f2', text: '#b91c1c', border: '#fca5a5', label: 'Super Admin' };
      case 'ADMIN_RW':
        return { bg: '#f0fdf4', text: '#15803d', border: '#86efac', label: 'Admin RW' };
      case 'KETUA_RW':
        return { bg: '#eff6ff', text: '#1d4ed8', border: '#93c5fd', label: 'Ketua RW' };
      case 'KETUA_RT':
        return { bg: '#faf5ff', text: '#7e22ce', border: '#d8b4fe', label: 'Ketua RT' };
      case 'WARGA':
        return { bg: '#fffbeb', text: '#b45309', border: '#fde68a', label: 'Warga' };
      default:
        return { bg: 'var(--secondary)', text: 'var(--secondary-foreground)', border: 'var(--border)', label: roleName };
    }
  };

  // Selected role name helper for dynamic form fields
  const getSelectedRoleName = (roleId: string) => {
    const found = referenceData.roles.find((r) => r.id === roleId);
    return found ? found.name : '';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '0.35rem' }}>
            Manajemen Data Akun
          </h1>
          <p style={{ color: 'var(--secondary-foreground)', fontSize: '0.9rem' }}>
            Kelola seluruh akun pengguna, hak akses peran (RBAC), reset kata sandi, dan status akun secara terpusat.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link
            href="/dashboard/admin"
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
              transition: 'all 0.15s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--secondary)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--surface)';
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Kembali ke Dashboard
          </Link>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontWeight: 600 }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Tambah Akun Baru</span>
          </button>
        </div>
      </div>

      {/* NOTIFICATION TOAST */}
      {notification && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: notification.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: notification.type === 'success' ? '#15803d' : '#b91c1c',
            border: `1px solid ${notification.type === 'success' ? '#86efac' : '#fca5a5'}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.9rem',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Tutup notifikasi"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* SUMMARY STAT CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--secondary-foreground)', fontWeight: 500 }}>Total Akun</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: 'var(--primary)', marginTop: '0.25rem' }}>
            {stats.total}
          </div>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--secondary-foreground)', fontWeight: 500 }}>Super Admin</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#b91c1c', marginTop: '0.25rem' }}>
            {stats.superAdmin}
          </div>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--secondary-foreground)', fontWeight: 500 }}>Pengurus RT/RW</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#1d4ed8', marginTop: '0.25rem' }}>
            {stats.pengurus}
          </div>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--secondary-foreground)', fontWeight: 500 }}>Akun Warga</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#b45309', marginTop: '0.25rem' }}>
            {stats.warga}
          </div>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--secondary-foreground)', fontWeight: 500 }}>Akun Aktif</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#16a34a', marginTop: '0.25rem' }}>
            {stats.active}
          </div>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--secondary-foreground)', fontWeight: 500 }}>Akun Nonaktif</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#6b7280', marginTop: '0.25rem' }}>
            {stats.inactive}
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
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
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', flex: '1 1 300px' }}>
          <input
            type="text"
            placeholder="Cari username, nama warga, atau email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              padding: '0.55rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--foreground)',
              fontSize: '0.875rem',
            }}
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '0.55rem 1rem', fontSize: '0.875rem' }}>
            Cari
          </button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setPage(1);
                fetchData(1, '', roleFilter, statusFilter);
              }}
              className="btn"
              style={{ border: '1px solid var(--border)', background: 'var(--surface)', fontSize: '0.875rem' }}
            >
              Reset
            </button>
          )}
        </form>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <select
              value={roleFilter}
              onChange={handleRoleChange}
              style={{
                padding: '0.55rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--foreground)',
                fontSize: '0.875rem',
              }}
            >
              <option value="ALL">Semua Role</option>
              {referenceData.roles.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={handleStatusChange}
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
              <option value="ACTIVE">Hanya Aktif</option>
              <option value="INACTIVE">Hanya Nonaktif</option>
            </select>
          </div>
        </div>
      </div>

      {/* ACCOUNTS TABLE */}
      <div className="card" style={{ padding: 0, overflow: 'visible' }}>
        <div style={{ overflowX: 'auto', minHeight: '340px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--secondary)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '0.85rem 1rem', width: '50px' }}>No</th>
                <th style={{ padding: '0.85rem 1rem' }}>Username & Email</th>
                <th style={{ padding: '0.85rem 1rem' }}>Role</th>
                <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                <th style={{ padding: '0.85rem 1rem' }}>Terdaftar</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right', width: '110px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isPending && users.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--secondary-foreground)' }}>
                    Memuat data akun...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--secondary-foreground)' }}>
                    Tidak ada akun yang ditemukan sesuai filter pencarian.
                  </td>
                </tr>
              ) : (
                users.map((u, idx) => {
                  const roleBadge = getRoleBadge(u.role.name);
                  const isCurrent = u.id === currentUserId;
                  const rowNumber = (pagination.page - 1) * pagination.limit + idx + 1;
                  const isMenuOpen = activeActionMenuId === u.id;
                  const openUpwards = idx >= Math.max(users.length - 2, 1) && users.length > 2;

                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        backgroundColor: isCurrent ? 'rgba(59, 130, 246, 0.03)' : 'transparent',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--secondary-foreground)' }}>
                        {rowNumber}
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              backgroundColor: roleBadge.bg,
                              color: roleBadge.text,
                              border: `1px solid ${roleBadge.border}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 'bold',
                              fontSize: '0.85rem',
                              flexShrink: 0,
                            }}
                          >
                            {u.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>
                              {u.username}
                              {isCurrent && (
                                <span
                                  style={{
                                    marginLeft: '0.4rem',
                                    fontSize: '0.65rem',
                                    padding: '0.1rem 0.35rem',
                                    borderRadius: 'var(--radius-sm)',
                                    backgroundColor: '#dbeafe',
                                    color: '#1e40af',
                                    fontWeight: 700,
                                  }}
                                >
                                  Anda
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--secondary-foreground)' }}>
                              {u.email || u.warga?.namaLengkap || '-'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            backgroundColor: roleBadge.bg,
                            color: roleBadge.text,
                            border: `1px solid ${roleBadge.border}`,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {roleBadge.label}
                        </span>
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            backgroundColor: u.isActive ? '#dcfce7' : '#fee2e2',
                            color: u.isActive ? '#15803d' : '#b91c1c',
                            border: `1px solid ${u.isActive ? '#86efac' : '#fca5a5'}`,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}
                        >
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: u.isActive ? '#16a34a' : '#dc2626' }}></span>
                          {u.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>

                      <td style={{ padding: '0.85rem 1rem', color: 'var(--secondary-foreground)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {formatDate(u.createdAt)}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ position: 'relative', display: 'inline-block' }} data-action-menu>
                          <button
                            type="button"
                            onClick={() => setActiveActionMenuId(isMenuOpen ? null : u.id)}
                            className="btn"
                            style={{
                              padding: '0.35rem 0.75rem',
                              fontSize: '0.8rem',
                              fontWeight: 500,
                              backgroundColor: isMenuOpen ? 'var(--secondary)' : 'var(--surface)',
                              border: '1px solid var(--border)',
                              color: 'var(--foreground)',
                              borderRadius: 'var(--radius-md)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              cursor: 'pointer',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                            }}
                          >
                            <span>Aksi</span>
                            <span
                              style={{
                                fontSize: '0.65rem',
                                transform: isMenuOpen ? 'rotate(180deg)' : 'none',
                                transition: 'transform 0.15s ease',
                              }}
                            >
                              ▼
                            </span>
                          </button>

                          {isMenuOpen && (
                            <div
                              style={{
                                position: 'absolute',
                                right: 0,
                                ...(openUpwards ? { bottom: 'calc(100% + 4px)' } : { top: 'calc(100% + 4px)' }),
                                zIndex: 50,
                                minWidth: '170px',
                                backgroundColor: 'var(--surface)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border)',
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                                padding: '0.35rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.15rem',
                                textAlign: 'left',
                              }}
                            >
                              {/* Lihat Detail */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveActionMenuId(null);
                                  handleOpenDetail(u);
                                }}
                                style={{
                                  width: '100%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  padding: '0.5rem 0.65rem',
                                  borderRadius: 'var(--radius-sm)',
                                  border: 'none',
                                  background: 'transparent',
                                  color: 'var(--foreground)',
                                  fontSize: '0.8rem',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--secondary)')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                                <span>Lihat Detail</span>
                              </button>

                              {/* Edit Akun */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveActionMenuId(null);
                                  handleOpenEdit(u);
                                }}
                                style={{
                                  width: '100%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  padding: '0.5rem 0.65rem',
                                  borderRadius: 'var(--radius-sm)',
                                  border: 'none',
                                  background: 'transparent',
                                  color: '#2563eb',
                                  fontSize: '0.8rem',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.08)')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                </svg>
                                <span>Edit Akun</span>
                              </button>

                              {/* Nonaktifkan / Aktifkan */}
                              <button
                                type="button"
                                disabled={isCurrent && u.isActive}
                                onClick={() => {
                                  if (isCurrent && u.isActive) return;
                                  setActiveActionMenuId(null);
                                  handleToggleStatus(u);
                                }}
                                style={{
                                  width: '100%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  padding: '0.5rem 0.65rem',
                                  borderRadius: 'var(--radius-sm)',
                                  border: 'none',
                                  background: 'transparent',
                                  color: u.isActive ? '#d97706' : '#16a34a',
                                  fontSize: '0.8rem',
                                  cursor: isCurrent && u.isActive ? 'not-allowed' : 'pointer',
                                  opacity: isCurrent && u.isActive ? 0.4 : 1,
                                  textAlign: 'left',
                                }}
                                onMouseEnter={(e) => {
                                  if (!(isCurrent && u.isActive)) {
                                    e.currentTarget.style.backgroundColor = u.isActive ? 'rgba(217, 119, 6, 0.08)' : 'rgba(22, 163, 74, 0.08)';
                                  }
                                }}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                title={isCurrent && u.isActive ? 'Tidak dapat menonaktifkan akun sendiri' : undefined}
                              >
                                {u.isActive ? (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                  </svg>
                                ) : (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                                  </svg>
                                )}
                                <span>{u.isActive ? 'Nonaktifkan' : 'Aktifkan'}</span>
                              </button>

                              <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '0.2rem 0' }} />

                              {/* Hapus Akun */}
                              <button
                                type="button"
                                disabled={isCurrent}
                                onClick={() => {
                                  if (isCurrent) return;
                                  setActiveActionMenuId(null);
                                  handleOpenDelete(u);
                                }}
                                style={{
                                  width: '100%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  padding: '0.5rem 0.65rem',
                                  borderRadius: 'var(--radius-sm)',
                                  border: 'none',
                                  background: 'transparent',
                                  color: '#dc2626',
                                  fontSize: '0.8rem',
                                  cursor: isCurrent ? 'not-allowed' : 'pointer',
                                  opacity: isCurrent ? 0.4 : 1,
                                  textAlign: 'left',
                                }}
                                onMouseEnter={(e) => {
                                  if (!isCurrent) {
                                    e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.08)';
                                  }
                                }}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                title={isCurrent ? 'Tidak dapat menghapus akun sendiri' : undefined}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M3 6h18" />
                                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                </svg>
                                <span>Hapus Akun</span>
                              </button>
                            </div>
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

        {/* PAGINATION BAR */}
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            fontSize: '0.85rem',
            color: 'var(--secondary-foreground)',
          }}
        >
          <div>
            Menampilkan{' '}
            <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>
              {pagination.totalItems === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1}
            </span>{' '}
            hingga{' '}
            <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>
              {Math.min(pagination.page * pagination.limit, pagination.totalItems)}
            </span>{' '}
            dari{' '}
            <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>
              {pagination.totalItems}
            </span>{' '}
            akun
          </div>

          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1 || isPending}
              className="btn"
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.8rem',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                opacity: pagination.page <= 1 ? 0.5 : 1,
              }}
            >
              ← Sebelumnya
            </button>

            <span style={{ padding: '0 0.5rem', fontWeight: 600, color: 'var(--foreground)' }}>
              Halaman {pagination.page} dari {pagination.totalPages}
            </span>

            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || isPending}
              className="btn"
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.8rem',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                opacity: pagination.page >= pagination.totalPages ? 0.5 : 1,
              }}
            >
              Selanjutnya →
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: LIHAT DETAIL AKUN                                                */}
      {/* ========================================================================= */}
      {isDetailOpen && selectedUserDetail && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card"
            style={{
              width: '100%',
              maxWidth: '650px',
              maxHeight: '90vh',
              overflowY: 'auto',
              backgroundColor: 'var(--surface)',
              position: 'relative',
              padding: '1.75rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                  Detail Akun Pengguna
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--secondary-foreground)' }}>
                  Informasi teknis dan profil akun yang terdaftar pada sistem
                </p>
              </div>
              <button
                onClick={() => setIsDetailOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem', color: 'var(--secondary-foreground)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                aria-label="Tutup"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Account Card Header */}
              <div
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--primary)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.35rem',
                    fontWeight: 'bold',
                  }}
                >
                  {selectedUserDetail.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--foreground)' }}>
                    {selectedUserDetail.username}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', alignItems: 'center' }}>
                    <span
                      style={{
                        padding: '0.15rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: getRoleBadge(selectedUserDetail.role.name).bg,
                        color: getRoleBadge(selectedUserDetail.role.name).text,
                        border: `1px solid ${getRoleBadge(selectedUserDetail.role.name).border}`,
                      }}
                    >
                      {selectedUserDetail.role.name}
                    </span>
                    <span
                      style={{
                        padding: '0.15rem 0.5rem',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: selectedUserDetail.isActive ? '#dcfce7' : '#fee2e2',
                        color: selectedUserDetail.isActive ? '#15803d' : '#b91c1c',
                      }}
                    >
                      {selectedUserDetail.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Informasional Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: 'var(--secondary-foreground)' }}>User ID:</span>
                  <div style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.8rem' }}>{selectedUserDetail.id}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--secondary-foreground)' }}>Email:</span>
                  <div style={{ fontWeight: 600 }}>{selectedUserDetail.email || '-'}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--secondary-foreground)' }}>No. WhatsApp:</span>
                  <div style={{ fontWeight: 600 }}>{selectedUserDetail.noWhatsapp || '-'}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--secondary-foreground)' }}>Tanggal Dibuat:</span>
                  <div style={{ fontWeight: 600 }}>{formatDate(selectedUserDetail.createdAt)}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--secondary-foreground)' }}>Terakhir Diperbarui:</span>
                  <div style={{ fontWeight: 600 }}>{formatDate(selectedUserDetail.updatedAt)}</div>
                </div>
              </div>

              {/* Profil Warga Terkait (Jika ada) */}
              {selectedUserDetail.warga ? (
                <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '0.85rem' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--primary)' }}>
                    Profil Data Warga Terkait:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <span style={{ color: 'var(--secondary-foreground)' }}>Nama Lengkap:</span>
                      <div style={{ fontWeight: 600 }}>{selectedUserDetail.warga.namaLengkap}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--secondary-foreground)' }}>NIK (Masked):</span>
                      <div style={{ fontWeight: 600 }}>{selectedUserDetail.warga.nik || '-'}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--secondary-foreground)' }}>Nomor KK (Masked):</span>
                      <div style={{ fontWeight: 600 }}>{selectedUserDetail.warga.keluarga?.nomorKk || '-'}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--secondary-foreground)' }}>Pekerjaan:</span>
                      <div style={{ fontWeight: 600 }}>{selectedUserDetail.warga.pekerjaan || '-'}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--secondary)', fontSize: '0.8rem', color: 'var(--secondary-foreground)' }}>
                  Akun ini tidak tertaut langsung ke profil entitas warga fisik (Akun Pengurus/Staf Sistem).
                </div>
              )}

              {/* Riwayat Integritas Sistem */}
              <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(59, 130, 246, 0.05)', border: '1px solid #bfdbfe', fontSize: '0.8rem' }}>
                <div style={{ fontWeight: 'bold', color: '#1e40af', marginBottom: '0.35rem' }}>
                  Statistik Relasi & Integritas Data Akun:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', color: 'var(--foreground)' }}>
                  <div>Pengajuan Dibuat: <b>{selectedUserDetail._count?.createdRequests || 0}</b></div>
                  <div>Histori Surat: <b>{selectedUserDetail._count?.requestHistories || 0}</b></div>
                  <div>Log Audit: <b>{selectedUserDetail._count?.auditLogs || 0}</b></div>
                  <div>Pengumuman: <b>{selectedUserDetail._count?.pengumuman || 0}</b></div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', gap: '0.75rem' }}>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="btn"
                style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: TAMBAH AKUN BARU                                                 */}
      {/* ========================================================================= */}
      {isCreateOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card"
            style={{
              width: '100%',
              maxWidth: '560px',
              maxHeight: '90vh',
              overflowY: 'auto',
              backgroundColor: 'var(--surface)',
              position: 'relative',
              padding: '1.75rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                Tambah Akun Pengguna Baru
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem', color: 'var(--secondary-foreground)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                aria-label="Tutup"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Username <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: andi_warga"
                  value={createForm.username}
                  onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--foreground)',
                    fontSize: '0.875rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Role Akun <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <select
                  value={createForm.roleId}
                  onChange={(e) => setCreateForm({ ...createForm, roleId: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--foreground)',
                    fontSize: '0.875rem',
                  }}
                >
                  {referenceData.roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} - {r.description}
                    </option>
                  ))}
                </select>
              </div>



              {/* Conditional Field: Tautkan Warga */}
              {getSelectedRoleName(createForm.roleId) === 'WARGA' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Tautkan ke Profil Warga (Opsional)
                  </label>
                  <select
                    value={createForm.wargaId}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      if (!selectedId) {
                        setCreateForm((prev) => ({
                          ...prev,
                          wargaId: '',
                        }));
                        return;
                      }

                      const selectedWarga = referenceData.unlinkedWarga.find((w) => w.id === selectedId);
                      if (selectedWarga) {
                        // Buat rekomendasi username ramah jika username masih kosong
                        const cleanSuggestedUsername = selectedWarga.namaLengkap
                          .toLowerCase()
                          .replace(/[^a-z0-9]/g, '_')
                          .replace(/_+/g, '_')
                          .replace(/^_|_$/g, '')
                          .slice(0, 25);

                        setCreateForm((prev) => ({
                          ...prev,
                          wargaId: selectedId,
                          // Otomatis isi email dari data profil warga jika tersedia
                          email: selectedWarga.email || prev.email || '',
                          // Otomatis isi nomor WhatsApp dari data profil warga jika tersedia
                          noWhatsapp: selectedWarga.noWhatsapp || prev.noWhatsapp || '',
                          // Otomatis isi username dari nama warga jika belum diketik
                          username: prev.username.trim() ? prev.username : cleanSuggestedUsername,
                          // Sinkronkan data RT & RW dari data kependudukan warga
                          rtId: selectedWarga.rtId || prev.rtId,
                          rwId: selectedWarga.rt?.rwId || prev.rwId,
                        }));
                      } else {
                        setCreateForm((prev) => ({
                          ...prev,
                          wargaId: selectedId,
                        }));
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--foreground)',
                      fontSize: '0.875rem',
                    }}
                  >
                    <option value="">-- Belum Ditautkan / Akun Mandiri --</option>
                    {referenceData.unlinkedWarga.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.namaLengkap} (NIK: {w.nik.slice(0, 6)}***, RT {w.rt?.nomor || '-'})
                      </option>
                    ))}
                  </select>

                  {/* Keterangan Status Pengisian Otomatis dari Profil Warga */}
                  {createForm.wargaId && (() => {
                    const w = referenceData.unlinkedWarga.find((x) => x.id === createForm.wargaId);
                    if (!w) return null;
                    const hasEmail = Boolean(w.email);
                    const hasWa = Boolean(w.noWhatsapp);

                    return (
                      <div
                        style={{
                          marginTop: '0.5rem',
                          padding: '0.55rem 0.8rem',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: hasEmail || hasWa ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                          border: `1px solid ${hasEmail || hasWa ? '#86efac' : '#fde047'}`,
                          fontSize: '0.8rem',
                          lineHeight: 1.45,
                          color: hasEmail || hasWa ? '#166534' : '#854d0e',
                        }}
                      >
                        {hasEmail && hasWa ? (
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            <span><strong>Data Terisi Otomatis:</strong> Email (<code>{w.email}</code>) dan No. WhatsApp (<code>{w.noWhatsapp}</code>) berhasil disinkronkan dari profil kependudukan warga.</span>
                          </div>
                        ) : hasEmail ? (
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            <span><strong>Email Terisi Otomatis:</strong> (<code>{w.email}</code>). Nomor WhatsApp belum tercatat di data warga, silakan lengkapi manual.</span>
                          </div>
                        ) : hasWa ? (
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            <span><strong>No. WhatsApp Terisi Otomatis:</strong> (<code>{w.noWhatsapp}</code>). Email belum tercatat di data warga, silakan lengkapi manual.</span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                              <circle cx="12" cy="12" r="10"></circle>
                              <line x1="12" y1="16" x2="12" y2="12"></line>
                              <line x1="12" y1="8" x2="12.01" y2="8"></line>
                            </svg>
                            <span>Data warga ini belum memiliki kontak Email atau WhatsApp di database kependudukan. Anda dapat mengisinya di bawah ini.</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Email (Opsional)
                  </label>
                  <input
                    type="email"
                    placeholder="user@example.com"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--foreground)',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    No. WhatsApp (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="08123456789"
                    value={createForm.noWhatsapp}
                    onChange={(e) => setCreateForm({ ...createForm, noWhatsapp: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--foreground)',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>
              </div>

              {/* Password Section */}
              <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Kredensial Kata Sandi</span>
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    {showCreatePassword ? (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                          <line x1="1" y1="1" x2="23" y2="23"></line>
                        </svg>
                        Sembunyikan
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        Tampilkan
                      </>
                    )}
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                      Kata Sandi <span style={{ color: 'var(--error)' }}>*</span>
                    </label>
                    <input
                      type={showCreatePassword ? 'text' : 'password'}
                      required
                      placeholder="Minimal 6 karakter"
                      value={createForm.password}
                      onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--foreground)',
                        fontSize: '0.85rem',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                      Konfirmasi Sandi <span style={{ color: 'var(--error)' }}>*</span>
                    </label>
                    <input
                      type={showCreatePassword ? 'text' : 'password'}
                      required
                      placeholder="Ketik ulang sandi"
                      value={createForm.confirmPassword}
                      onChange={(e) => setCreateForm({ ...createForm, confirmPassword: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--foreground)',
                        fontSize: '0.85rem',
                      }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input
                    type="checkbox"
                    checked={createForm.isActive}
                    onChange={(e) => setCreateForm({ ...createForm, isActive: e.target.checked })}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span>Akun Aktif (Dapat langsung digunakan untuk login)</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="btn"
                  style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
                >
                  Batal
                </button>
                <button type="submit" disabled={isPending} className="btn btn-primary">
                  {isPending ? 'Menyimpan...' : 'Simpan Akun Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT AKUN & GANTI KATA SANDI                                     */}
      {/* ========================================================================= */}
      {isEditOpen && editingUser && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card"
            style={{
              width: '100%',
              maxWidth: '580px',
              maxHeight: '90vh',
              overflowY: 'auto',
              backgroundColor: 'var(--surface)',
              position: 'relative',
              padding: '1.75rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                  Edit Akun: {editingUser.username}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--secondary-foreground)' }}>
                  Perbarui identitas akun, role, atau ganti kata sandi pengguna
                </p>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem', color: 'var(--secondary-foreground)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                aria-label="Tutup"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Username <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--foreground)',
                    fontSize: '0.875rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Role Akun <span style={{ color: 'var(--error)' }}>*</span>
                  {editingUser.id === currentUserId && (
                    <span style={{ color: 'var(--secondary-foreground)', fontWeight: 400, marginLeft: '0.5rem', fontSize: '0.75rem' }}>
                      (Tidak dapat mengubah role akun sendiri)
                    </span>
                  )}
                </label>
                <select
                  value={editForm.roleId}
                  disabled={editingUser.id === currentUserId}
                  onChange={(e) => setEditForm({ ...editForm, roleId: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: editingUser.id === currentUserId ? 'var(--secondary)' : 'var(--surface)',
                    color: 'var(--foreground)',
                    fontSize: '0.875rem',
                    cursor: editingUser.id === currentUserId ? 'not-allowed' : 'pointer',
                  }}
                >
                  {referenceData.roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} - {r.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Conditional Field: Tautkan Warga di Edit Modal */}
              {getSelectedRoleName(editForm.roleId) === 'WARGA' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Tautkan ke Profil Warga (Opsional)
                  </label>
                  <select
                    value={editForm.wargaId}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      if (!selectedId) {
                        setEditForm((prev) => ({ ...prev, wargaId: '' }));
                        return;
                      }

                      const selectedWarga =
                        referenceData.unlinkedWarga.find((w) => w.id === selectedId) ||
                        (editingUser?.warga?.id === selectedId ? editingUser.warga : null);

                      if (selectedWarga) {
                        setEditForm((prev) => ({
                          ...prev,
                          wargaId: selectedId,
                          email: selectedWarga.email || prev.email || '',
                          noWhatsapp: selectedWarga.noWhatsapp || prev.noWhatsapp || '',
                          rtId: (selectedWarga as any).rtId || prev.rtId,
                          rwId: (selectedWarga as any).rt?.rwId || prev.rwId,
                        }));
                      } else {
                        setEditForm((prev) => ({ ...prev, wargaId: selectedId }));
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--foreground)',
                      fontSize: '0.875rem',
                    }}
                  >
                    <option value="">-- Belum Ditautkan / Akun Mandiri --</option>
                    {editingUser?.warga && (
                      <option value={editingUser.warga.id}>
                        [Terhubung Saat Ini] {editingUser.warga.namaLengkap} (NIK: {editingUser.warga.nik.slice(0, 6)}***)
                      </option>
                    )}
                    {referenceData.unlinkedWarga
                      .filter((w) => w.id !== editingUser?.warga?.id)
                      .map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.namaLengkap} (NIK: {w.nik.slice(0, 6)}***, RT {w.rt?.nomor || '-'})
                        </option>
                      ))}
                  </select>
                </div>
              )}



              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="user@example.com"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--foreground)',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    No. WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="08123456789"
                    value={editForm.noWhatsapp}
                    onChange={(e) => setEditForm({ ...editForm, noWhatsapp: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--foreground)',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: editingUser.id === currentUserId ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}>
                  <input
                    type="checkbox"
                    disabled={editingUser.id === currentUserId}
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span>Akun Aktif</span>
                  {editingUser.id === currentUserId && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--secondary-foreground)' }}>(Akun Anda sendiri harus tetap aktif)</span>
                  )}
                </label>
              </div>

              {/* SECTION: GANTI KATA SANDI */}
              <div
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid #bfdbfe',
                  backgroundColor: 'rgba(59, 130, 246, 0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 2l-2 2m-1.5 1.5L16 7l-1.5-1.5-3.5 3.5a6 6 0 1 0 3.5 3.5L21 6l-2-2 1.5-1.5z"></path>
                        <circle cx="8" cy="16" r="2"></circle>
                      </svg>
                      <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#1e40af' }}>
                        Ganti Kata Sandi (Opsional)
                      </span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--secondary-foreground)', margin: '0.2rem 0 0 0' }}>
                      Kosongkan bagian ini jika tidak ingin mengubah kata sandi akun ini.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    style={{ background: 'transparent', border: 'none', color: '#1d4ed8', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    {showEditPassword ? (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                          <line x1="1" y1="1" x2="23" y2="23"></line>
                        </svg>
                        Sembunyikan
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        Tampilkan
                      </>
                    )}
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                      Kata Sandi Baru
                    </label>
                    <input
                      type={showEditPassword ? 'text' : 'password'}
                      placeholder="Minimal 6 karakter"
                      value={editForm.newPassword}
                      onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--foreground)',
                        fontSize: '0.85rem',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                      Konfirmasi Sandi Baru
                    </label>
                    <input
                      type={showEditPassword ? 'text' : 'password'}
                      placeholder="Ulangi sandi baru"
                      value={editForm.confirmNewPassword}
                      onChange={(e) => setEditForm({ ...editForm, confirmNewPassword: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--foreground)',
                        fontSize: '0.85rem',
                      }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="btn"
                  style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
                >
                  Batal
                </button>
                <button type="submit" disabled={isPending} className="btn btn-primary">
                  {isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: KONFIRMASI HAPUS AKUN                                            */}
      {/* ========================================================================= */}
      <ConfirmationDialog
        isOpen={isDeleteOpen}
        title="Konfirmasi Hapus Akun"
        message={
          userToDelete
            ? `Apakah Anda yakin ingin menghapus akun "${userToDelete.username}"? Akun ini akan dihapus secara permanen dari sistem dan papan manajemen akun.`
            : ''
        }
        confirmText="Ya, Hapus Akun"
        cancelText="Batal"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setIsDeleteOpen(false);
          setUserToDelete(null);
        }}
      />
    </div>
  );
}
