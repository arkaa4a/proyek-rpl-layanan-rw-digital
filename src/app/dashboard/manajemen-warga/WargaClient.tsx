'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import DataTable from '@/components/ui/DataTable';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import { deactivateWargaAction, deleteWargaAction, editWargaAction, createWargaAction, WargaFormData } from './actions';

type RtOption = {
  id: string;
  nomor: string;
  rwId: string;
  rw: { nomor: string } | null;
};

type KeluargaOption = {
  id: string;
  nomorKk: string;
  alamat: string;
};

type WargaClientProps = {
  wargaData: any[];
  userRole: string;
  rtList?: RtOption[];
  keluargaList?: KeluargaOption[];
};

export default function WargaClient({ wargaData, userRole, rtList = [], keluargaList = [] }: WargaClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  
  // Dialog deactive state & delete state
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedWarga, setSelectedWarga] = useState<any>(null);

  // Modal edit/tambah state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingWarga, setEditingWarga] = useState<any>(null);

  // Form fields state
  const [formData, setFormData] = useState<WargaFormData>({
    nik: '',
    namaLengkap: '',
    tempatLahir: '',
    tanggalLahir: '',
    agama: 'Islam',
    pekerjaan: '',
    email: '',
    noWhatsapp: '',
    rtId: rtList[0]?.id || '',
    keluargaId: '',
    nomorKkBaru: '',
    alamatKkBaru: '',
  });

  const [isNewKk, setIsNewKk] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const canManage = ['ADMIN_RW', 'SUPER_ADMIN', 'KETUA_RT'].includes(userRole);

  const filteredData = wargaData.filter((w) =>
    w.namaLengkap?.toLowerCase().includes(search.toLowerCase()) ||
    w.nik?.includes(search) ||
    w.pekerjaan?.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenCreate = () => {
    setModalMode('create');
    setEditingWarga(null);
    setFormError(null);
    setIsNewKk(false);
    setFormData({
      nik: '',
      namaLengkap: '',
      tempatLahir: '',
      tanggalLahir: '',
      agama: 'Islam',
      pekerjaan: '',
      email: '',
      noWhatsapp: '',
      rtId: rtList[0]?.id || '',
      keluargaId: '',
      nomorKkBaru: '',
      alamatKkBaru: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (warga: any) => {
    setModalMode('edit');
    setEditingWarga(warga);
    setFormError(null);
    setIsNewKk(false);
    setFormData({
      nik: warga.nik || '',
      namaLengkap: warga.namaLengkap || '',
      tempatLahir: warga.tempatLahir || '',
      tanggalLahir: warga.tanggalLahir || '',
      agama: warga.agama || 'Islam',
      pekerjaan: warga.pekerjaan || '',
      email: warga.email || '',
      noWhatsapp: warga.noWhatsapp || '',
      rtId: warga.rtId || warga.rt?.id || rtList[0]?.id || '',
      keluargaId: warga.keluargaId || warga.keluarga?.id || '',
      nomorKkBaru: '',
      alamatKkBaru: '',
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingWarga(null);
    setFormError(null);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validasi sederhana di client sebelum server
    if (!/^\d{16}$/.test(formData.nik)) {
      setFormError('NIK harus berupa 16 digit angka.');
      return;
    }

    if (!formData.namaLengkap.trim()) {
      setFormError('Nama lengkap wajib diisi.');
      return;
    }

    if (!formData.rtId) {
      setFormError('RT wajib dipilih.');
      return;
    }

    if (isNewKk && formData.nomorKkBaru && !/^\d{16}$/.test(formData.nomorKkBaru.trim())) {
      setFormError('Nomor Kartu Keluarga baru harus 16 digit angka.');
      return;
    }

    startTransition(async () => {
      let res;
      const payload: WargaFormData = {
        ...formData,
        keluargaId: isNewKk ? null : formData.keluargaId,
        nomorKkBaru: isNewKk ? formData.nomorKkBaru : undefined,
        alamatKkBaru: isNewKk ? formData.alamatKkBaru : undefined,
      };

      if (modalMode === 'edit' && editingWarga) {
        res = await editWargaAction(editingWarga.id, payload);
      } else {
        res = await createWargaAction(payload);
      }

      if (res.error) {
        setFormError(res.error);
      } else {
        setIsModalOpen(false);
        setNotification({
          type: 'success',
          message: res.message || (modalMode === 'edit' ? 'Data warga berhasil diperbarui.' : 'Warga baru berhasil ditambahkan.'),
        });
        router.refresh();
        setTimeout(() => setNotification(null), 5000);
      }
    });
  };

  const handleDeactivate = () => {
    if (!selectedWarga) return;

    startTransition(async () => {
      const res = await deactivateWargaAction(selectedWarga.id);
      setIsDeactivateOpen(false);
      setSelectedWarga(null);

      if (res.error) {
        setNotification({ type: 'error', message: `Gagal menonaktifkan warga: ${res.error}` });
      } else {
        setNotification({ type: 'success', message: 'Warga berhasil dinonaktifkan.' });
        router.refresh();
        setTimeout(() => setNotification(null), 5000);
      }
    });
  };

  const handleDelete = () => {
    if (!selectedWarga) return;

    startTransition(async () => {
      const res = await deleteWargaAction(selectedWarga.id);
      setIsDeleteOpen(false);
      setSelectedWarga(null);

      if (res.error) {
        setNotification({ type: 'error', message: `Gagal menghapus warga: ${res.error}` });
      } else {
        setNotification({ type: 'success', message: res.message || 'Data warga dan akun terkait berhasil dihapus.' });
        router.refresh();
        setTimeout(() => setNotification(null), 5000);
      }
    });
  };

  const columns: any[] = [
    { header: 'NIK', accessor: 'nik' },
    { header: 'Nama Lengkap', accessor: 'namaLengkap' },
    { 
      header: 'RT/RW', 
      accessor: 'rt', 
      render: (val: any) => `RT ${val?.nomor || '-'} / RW ${val?.rw?.nomor || '-'}` 
    },
    { header: 'Pekerjaan', accessor: 'pekerjaan', render: (val: string) => val || '-' },
  ];

  if (canManage) {
    columns.push({
      header: 'Aksi',
      accessor: 'id',
      render: (id: string, row: any) => (
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn"
            style={{
              padding: '0.3rem 0.65rem',
              fontSize: '0.75rem',
              backgroundColor: 'var(--primary)',
              color: 'white',
              cursor: 'pointer',
              borderRadius: 'var(--radius-sm)',
            }}
            onClick={() => handleOpenEdit(row)}
          >
            Edit
          </button>
          <button
            type="button"
            className="btn"
            style={{
              padding: '0.3rem 0.65rem',
              fontSize: '0.75rem',
              backgroundColor: '#eab308',
              color: '#000',
              cursor: 'pointer',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 500,
            }}
            onClick={() => {
              setSelectedWarga(row);
              setIsDeactivateOpen(true);
            }}
          >
            Nonaktifkan
          </button>
          <button
            type="button"
            className="btn"
            style={{
              padding: '0.3rem 0.65rem',
              fontSize: '0.75rem',
              backgroundColor: '#dc2626',
              color: 'white',
              cursor: 'pointer',
              borderRadius: 'var(--radius-sm)',
            }}
            onClick={() => {
              setSelectedWarga(row);
              setIsDeleteOpen(true);
            }}
          >
            Hapus
          </button>
        </div>
      ),
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Notifikasi feedback */}
      {notification && (
        <div
          style={{
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: notification.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: notification.type === 'success' ? '#166534' : '#991b1b',
            border: `1px solid ${notification.type === 'success' ? '#86efac' : '#fca5a5'}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2px',
              color: 'currentColor',
            }}
            aria-label="Tutup notifikasi"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Banner Informasi Wilayah & Hak Akses */}
      {userRole === 'KETUA_RT' && (
        <div
          style={{
            padding: '0.9rem 1.15rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'var(--primary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--primary)' }}>
                Wilayah Pengelolaan: RT {rtList[0]?.nomor || '01'} / RW {rtList[0]?.rw?.nomor || '12'}
              </div>
              <div style={{ fontSize: '0.825rem', color: 'var(--secondary-foreground)' }}>
                Sesuai aturan hak akses (RBAC), halaman ini hanya menampilkan warga terdaftar di RT Anda ({filteredData.length} warga). Warga di RT lain dikelola oleh Ketua RT masing-masing dan dirangkum lengkap di dashboard RW & Super Admin.
              </div>
            </div>
          </div>
          <div
            style={{
              fontSize: '0.8rem',
              padding: '0.35rem 0.75rem',
              borderRadius: '9999px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              fontWeight: 600,
              color: 'var(--primary)',
            }}
          >
            {filteredData.length} Warga Aktif RT {rtList[0]?.nomor || '01'}
          </div>
        </div>
      )}

      {['KETUA_RW', 'ADMIN_RW'].includes(userRole) && (
        <div
          style={{
            padding: '0.9rem 1.15rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#10b981',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#047857' }}>
                Cakupan Wilayah: Tingkat RW (Mencakup Semua RT)
              </div>
              <div style={{ fontSize: '0.825rem', color: 'var(--secondary-foreground)' }}>
                Menampilkan seluruh warga terdaftar dari semua RT di lingkungan RW Anda (Total {filteredData.length} warga).
              </div>
            </div>
          </div>
          <div
            style={{
              fontSize: '0.8rem',
              padding: '0.35rem 0.75rem',
              borderRadius: '9999px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              fontWeight: 600,
              color: '#047857',
            }}
          >
            {filteredData.length} Warga Terdaftar di RW
          </div>
        </div>
      )}

      {userRole === 'SUPER_ADMIN' && (
        <div
          style={{
            padding: '0.9rem 1.15rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#6366f1',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#4338ca' }}>
                Cakupan Global: Seluruh Wilayah Sistem
              </div>
              <div style={{ fontSize: '0.825rem', color: 'var(--secondary-foreground)' }}>
                Menampilkan seluruh basis data kependudukan lintas semua RT dan RW (Total {filteredData.length} warga). Setiap warga baru yang Anda daftarkan otomatis langsung masuk ke RT dan RW yang Anda pilih.
              </div>
            </div>
          </div>
          <div
            style={{
              fontSize: '0.8rem',
              padding: '0.35rem 0.75rem',
              borderRadius: '9999px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              fontWeight: 600,
              color: '#4338ca',
            }}
          >
            {filteredData.length} Warga Global
          </div>
        </div>
      )}

      {/* Baris Pencarian & Tambah Warga */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <input
          type="text"
          placeholder="Cari NIK, Nama, Pekerjaan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: '0.75rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            width: '100%',
            maxWidth: '320px',
            background: 'var(--surface)',
            color: 'var(--foreground)',
          }}
        />
        {canManage && (
          <button
            type="button"
            className="btn btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              cursor: 'pointer',
            }}
            onClick={handleOpenCreate}
          >
            + Tambah Warga
          </button>
        )}
      </div>

      {/* Tabel Data Warga */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <DataTable columns={columns} data={filteredData} emptyMessage="Data warga tidak ditemukan." />
      </div>

      {/* Modal Dialog Form Tambah / Edit Warga */}
      {isModalOpen && (
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
            padding: '1rem',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--surface)',
              borderRadius: 'var(--radius-lg)',
              width: '100%',
              maxWidth: '620px',
              padding: '1.75rem',
              boxShadow: 'var(--shadow-lg)',
              maxHeight: '90vh',
              overflowY: 'auto',
              position: 'relative',
              border: '1px solid var(--border)',
            }}
          >
            <button
              onClick={handleCloseModal}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                width: '30px',
                height: '30px',
                borderRadius: '6px',
                background: 'rgba(0,0,0,0.04)',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--secondary-foreground)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Tutup Modal"
              aria-label="Tutup Modal"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <h2 style={{ fontSize: '1.35rem', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '0.25rem' }}>
              {modalMode === 'edit' ? 'Edit Data Warga' : 'Tambah Warga Baru'}
            </h2>
            <p style={{ color: 'var(--secondary-foreground)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              {modalMode === 'edit'
                ? 'Perbarui detail data identitas dan kependudukan warga.'
                : 'Daftarkan data warga baru ke dalam basis data RT/RW.'}
            </p>

            {formError && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  background: '#fee2e2',
                  color: '#991b1b',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1.25rem',
                  fontSize: '0.875rem',
                  border: '1px solid #fca5a5',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* NIK & Nama Lengkap */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    NIK (Nomor Induk Kependudukan) <span style={{ color: 'var(--error)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={16}
                    required
                    value={formData.nik}
                    onChange={(e) => setFormData({ ...formData, nik: e.target.value.replace(/\D/g, '') })}
                    placeholder="16 digit angka NIK"
                    style={{
                      padding: '0.65rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--foreground)',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    Nama Lengkap <span style={{ color: 'var(--error)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.namaLengkap}
                    onChange={(e) => setFormData({ ...formData, namaLengkap: e.target.value })}
                    placeholder="Nama sesuai KTP"
                    style={{
                      padding: '0.65rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--foreground)',
                    }}
                  />
                </div>
              </div>

              {/* RT & Agama */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    RT Wilayah <span style={{ color: 'var(--error)' }}>*</span>
                  </label>
                  <select
                    value={formData.rtId}
                    onChange={(e) => setFormData({ ...formData, rtId: e.target.value })}
                    required
                    style={{
                      padding: '0.65rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--foreground)',
                    }}
                  >
                    {rtList.map((rt) => (
                      <option key={rt.id} value={rt.id}>
                        RT {rt.nomor} / RW {rt.rw?.nomor || '-'}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Agama</label>
                  <select
                    value={formData.agama || ''}
                    onChange={(e) => setFormData({ ...formData, agama: e.target.value })}
                    style={{
                      padding: '0.65rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--foreground)',
                    }}
                  >
                    <option value="Islam">Islam</option>
                    <option value="Kristen Protestan">Kristen Protestan</option>
                    <option value="Katolik">Katolik</option>
                    <option value="Hindu">Hindu</option>
                    <option value="Buddha">Buddha</option>
                    <option value="Khonghucu">Khonghucu</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
              </div>

              {/* Kartu Keluarga Selection */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--background)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Kartu Keluarga (KK)</label>
                  <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', color: 'var(--primary)' }}>
                    <input
                      type="checkbox"
                      checked={isNewKk}
                      onChange={(e) => setIsNewKk(e.target.checked)}
                    />
                    Buat/Masukkan No. KK Baru
                  </label>
                </div>

                {!isNewKk ? (
                  <select
                    value={formData.keluargaId || ''}
                    onChange={(e) => setFormData({ ...formData, keluargaId: e.target.value })}
                    style={{
                      padding: '0.6rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--foreground)',
                    }}
                  >
                    <option value="">-- Belum Dihubungkan ke KK --</option>
                    {keluargaList.map((k) => (
                      <option key={k.id} value={k.id}>
                        KK: {k.nomorKk} {k.alamat ? `(${k.alamat})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginTop: '0.25rem' }}>
                    <input
                      type="text"
                      maxLength={16}
                      placeholder="Nomor KK (16 digit angka)"
                      value={formData.nomorKkBaru || ''}
                      onChange={(e) => setFormData({ ...formData, nomorKkBaru: e.target.value.replace(/\D/g, '') })}
                      style={{
                        padding: '0.6rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--foreground)',
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Alamat KK (Contoh: Jl. Mawar No. 12)"
                      value={formData.alamatKkBaru || ''}
                      onChange={(e) => setFormData({ ...formData, alamatKkBaru: e.target.value })}
                      style={{
                        padding: '0.6rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--foreground)',
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Tempat & Tanggal Lahir */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Tempat Lahir</label>
                  <input
                    type="text"
                    value={formData.tempatLahir || ''}
                    onChange={(e) => setFormData({ ...formData, tempatLahir: e.target.value })}
                    placeholder="Kota / Kabupaten lahir"
                    style={{
                      padding: '0.65rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--foreground)',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Tanggal Lahir</label>
                  <input
                    type="date"
                    value={formData.tanggalLahir || ''}
                    onChange={(e) => setFormData({ ...formData, tanggalLahir: e.target.value })}
                    style={{
                      padding: '0.65rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--foreground)',
                    }}
                  />
                </div>
              </div>

              {/* Pekerjaan */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Pekerjaan</label>
                <input
                  type="text"
                  value={formData.pekerjaan || ''}
                  onChange={(e) => setFormData({ ...formData, pekerjaan: e.target.value })}
                  placeholder="Contoh: Karyawan Swasta, Wiraswasta, PNS, Pelajar/Mahasiswa"
                  style={{
                    padding: '0.65rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--foreground)',
                  }}
                />
              </div>

              {/* Kontak: No WhatsApp & Email */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>No. WhatsApp / HP</label>
                  <input
                    type="text"
                    value={formData.noWhatsapp || ''}
                    onChange={(e) => setFormData({ ...formData, noWhatsapp: e.target.value })}
                    placeholder="Contoh: 081234567890"
                    style={{
                      padding: '0.65rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--foreground)',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Email (Opsional)</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="warga@domain.com"
                    style={{
                      padding: '0.65rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--foreground)',
                    }}
                  />
                </div>
              </div>

              {/* Tombol Aksi */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isPending}
                  className="btn"
                  style={{
                    backgroundColor: 'var(--secondary)',
                    color: 'var(--secondary-foreground)',
                    cursor: 'pointer',
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn btn-primary"
                  style={{
                    cursor: isPending ? 'not-allowed' : 'pointer',
                    opacity: isPending ? 0.7 : 1,
                  }}
                >
                  {isPending
                    ? 'Menyimpan...'
                    : modalMode === 'edit'
                    ? 'Simpan Perubahan'
                    : 'Tambah Warga'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dialog Konfirmasi Nonaktifkan */}
      {/* Dialog Konfirmasi Nonaktifkan */}
      <ConfirmationDialog
        isOpen={isDeactivateOpen}
        title="Nonaktifkan Warga"
        message={`Apakah Anda yakin ingin menonaktifkan warga bernama "${selectedWarga?.namaLengkap}"? Warga dan akun terkait tidak akan bisa login atau mengajukan surat/layanan lagi.`}
        onConfirm={handleDeactivate}
        onCancel={() => {
          setIsDeactivateOpen(false);
          setSelectedWarga(null);
        }}
        confirmText={isPending ? 'Memproses...' : 'Ya, Nonaktifkan'}
        isDestructive={true}
      />

      {/* Dialog Konfirmasi Hapus Permanen */}
      <ConfirmationDialog
        isOpen={isDeleteOpen}
        title="Hapus Data Warga Permanen"
        message={`Apakah Anda yakin ingin menghapus data warga "${selectedWarga?.namaLengkap}" secara permanen? Akun login terkait dan seluruh berkas permohonan warga ini akan dihapus tuntas, dan total warga sistem akan otomatis diperbarui.`}
        onConfirm={handleDelete}
        onCancel={() => {
          setIsDeleteOpen(false);
          setSelectedWarga(null);
        }}
        confirmText={isPending ? 'Menghapus...' : 'Ya, Hapus Permanen'}
        isDestructive={true}
      />
    </div>
  );
}
