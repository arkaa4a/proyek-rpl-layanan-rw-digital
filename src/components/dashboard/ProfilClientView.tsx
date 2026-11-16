'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { updateProfileContactAction } from '@/app/dashboard/profil/actions';

interface ProfilData {
  user: {
    id: string;
    username: string;
    role: string;
    email: string | null;
    noWhatsapp: string | null;
    notifyEmail?: boolean;
    notifyWhatsapp?: boolean;
    isActive: boolean;
    createdAt: string;
  };
  warga: {
    id: string;
    nik: string;
    namaLengkap: string;
    tempatLahir: string | null;
    tanggalLahir: string | null;
    agama: string | null;
    pekerjaan: string | null;
    email: string | null;
    noWhatsapp: string | null;
    notifyEmail?: boolean;
    notifyWhatsapp?: boolean;
    isActive: boolean;
    keluarga: {
      id: string;
      nomorKk: string;
      alamat: string;
    } | null;
    rt: {
      id: string;
      nomor: string;
      namaKetua: string | null;
      namaWilayah: string | null;
      rw: {
        id: string;
        nomor: string;
        namaKetua: string | null;
        kelurahan: string | null;
        kecamatan: string | null;
      } | null;
    } | null;
  } | null;
  rtScope?: {
    id?: string;
    nomor: string;
    namaKetua: string | null;
    namaWilayah?: string | null;
    rw?: {
      id?: string;
      nomor: string;
      namaKetua?: string | null;
      kelurahan: string | null;
      kecamatan: string | null;
    } | null;
  } | null;
  rwScope?: {
    id?: string;
    nomor: string;
    namaKetua: string | null;
    kelurahan: string | null;
    kecamatan: string | null;
  } | null;
}

export default function ProfilClientView({ data }: { data: ProfilData }) {
  const [isPending, startTransition] = useTransition();

  // Modal / Form States
  const [isEditingContact, setIsEditingContact] = useState(false);

  // Privasi Data State
  const [showNik, setShowNik] = useState(false);
  const [showKk, setShowKk] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const initialEmail = data.warga?.email || data.user.email || '';
  const initialWhatsapp = data.warga?.noWhatsapp || data.user.noWhatsapp || '';
  const initialPekerjaan = data.warga?.pekerjaan || '';
  const initialNotifyEmail = data.warga?.notifyEmail !== false && data.user.notifyEmail !== false;
  const initialNotifyWhatsapp = data.warga?.notifyWhatsapp !== false && data.user.notifyWhatsapp !== false;

  const [email, setEmail] = useState(initialEmail);
  const [noWhatsapp, setNoWhatsapp] = useState(initialWhatsapp);
  const [pekerjaan, setPekerjaan] = useState(initialPekerjaan);
  const [notifyEmail, setNotifyEmail] = useState(initialNotifyEmail);
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(initialNotifyWhatsapp);

  const displayNomorRt = data.warga?.rt?.nomor || data.rtScope?.nomor || '01';
  const displayNomorRw = data.warga?.rt?.rw?.nomor || data.rwScope?.nomor || data.rtScope?.rw?.nomor || '12';


  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const namaDisplay = data.warga?.namaLengkap || data.user.username;
  const initialLetter = (namaDisplay.charAt(0) || 'U').toUpperCase();

  // Helper mask
  const maskText = (text?: string | null) => {
    if (!text) return '-';
    if (text.length < 8) return text;
    return `${text.slice(0, 4)}••••••••${text.slice(-4)}`;
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Simpan Kontak
  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    startTransition(async () => {
      const res = await updateProfileContactAction({
        email,
        noWhatsapp,
        pekerjaan,
        notifyEmail,
        notifyWhatsapp,
      });

      if (res.success) {
        setMessage({ type: 'success', text: res.message || 'Kontak berhasil diperbarui!' });
        setIsEditingContact(false);
      } else {
        setMessage({ type: 'error', text: res.error || 'Gagal menyimpan data.' });
      }
    });
  };


  // WhatsApp Link generator
  const getWhatsAppLink = (phone: string) => {
    let cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.slice(1);
    }
    return `https://wa.me/${cleaned}`;
  };

  // Format Tanggal
  const formatTanggal = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Friendly role name
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return { label: 'Super Admin', bg: '#4f46e5', color: '#fff' };
      case 'ADMIN_RW':
        return { label: 'Admin RW', bg: '#0284c7', color: '#fff' };
      case 'KETUA_RW':
        return { label: 'Ketua RW', bg: '#0d9488', color: '#fff' };
      case 'KETUA_RT':
        return { label: 'Ketua RT', bg: '#d97706', color: '#fff' };
      default:
        return { label: 'Warga', bg: 'var(--primary)', color: '#fff' };
    }
  };

  const roleInfo = getRoleBadge(data.user.role);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1000px', margin: '0 auto', position: 'relative' }}>
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
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {message.type === 'success' ? (
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span>{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              fontWeight: 'bold',
            }}
          >
            &times;
          </button>
        </div>
      )}

      {/* Hero Header Card */}
      <div
        className="card glass"
        style={{
          background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(56, 189, 248, 0.04) 100%)',
          border: '1px solid var(--border)',
          padding: '2rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '1.75rem',
            flexWrap: 'wrap',
          }}
        >
          {/* Avatar Section */}
          <div style={{ position: 'relative' }}>
            <div
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary) 0%, #38bdf8 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.75rem',
                fontWeight: 700,
                boxShadow: '0 8px 16px -4px rgba(37, 99, 235, 0.35)',
                border: '4px solid var(--surface)',
              }}
            >
              {initialLetter}
            </div>
            {/* Status dot */}
            <div
              title="Akun Aktif"
              style={{
                position: 'absolute',
                bottom: '4px',
                right: '4px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: '#22c55e',
                border: '3px solid var(--surface)',
              }}
            />
          </div>

          {/* User Info Overview */}
          <div style={{ flex: 1, minWidth: '240px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
              <h1 style={{ fontSize: '1.65rem', fontWeight: 'bold', color: 'var(--foreground)' }}>
                {namaDisplay}
              </h1>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '0.2rem 0.65rem',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: roleInfo.bg,
                  color: roleInfo.color,
                }}
              >
                {roleInfo.label}
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '0.2rem 0.65rem',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: '#dcfce7',
                  color: '#15803d',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
                Status Aktif
              </span>
            </div>

            <p style={{ color: 'var(--secondary-foreground)', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
              @{data.user.username} &bull; Terdaftar sejak{' '}
              {new Date(data.user.createdAt).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
            </p>

            {/* Quick badges */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div
                style={{
                  fontSize: '0.8rem',
                  padding: '0.25rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--secondary-foreground)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                RT {displayNomorRt} / RW {displayNomorRw}
              </div>

              {initialEmail && (
                <div
                  style={{
                    fontSize: '0.8rem',
                    padding: '0.25rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--secondary-foreground)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {initialEmail}
                </div>
              )}

              {initialWhatsapp && (
                <div
                  style={{
                    fontSize: '0.8rem',
                    padding: '0.25rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--secondary-foreground)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <span style={{ color: '#22c55e', fontWeight: 'bold' }}>WA:</span> {initialWhatsapp}
                </div>
              )}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                setIsEditingContact(!isEditingContact);
                setMessage(null);
              }}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {isEditingContact ? 'Tutup Edit Kontak' : 'Edit Kontak & Profil'}
            </button>

          </div>
        </div>
      </div>

      {/* Form Edit Kontak Modal / Inline Accordion */}
      {isEditingContact && (
        <div
          className="card"
          style={{
            border: '2px solid var(--primary)',
            background: 'var(--surface)',
            padding: '1.75rem',
            animation: 'fadeIn 0.25s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                Perbarui Informasi Kontak & Profil
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--secondary-foreground)' }}>
                Tambahkan atau ubah alamat email, nomor WhatsApp aktif, dan pekerjaan Anda.
              </p>
            </div>
            <button
              onClick={() => setIsEditingContact(false)}
              className="btn"
              style={{
                padding: '0.35rem 0.65rem',
                fontSize: '0.8rem',
                border: '1px solid var(--border)',
                background: 'transparent',
              }}
            >
              Batal
            </button>
          </div>

          <form onSubmit={handleSaveContact} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {/* Field Email */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Alamat Email
                </label>
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--secondary-foreground)',
                      pointerEvents: 'none',
                    }}
                  >
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama.warga@contoh.com"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem 0.65rem 2.5rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--foreground)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--secondary-foreground)', marginTop: '0.35rem' }}>
                  Digunakan untuk menerima notifikasi status pengajuan surat dan dokumen.
                </p>
              </div>

              {/* Field Nomor WhatsApp */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Nomor WhatsApp / HP Aktif
                </label>
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#22c55e',
                      pointerEvents: 'none',
                    }}
                  >
                    <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.149.929 3.182 0 5.767-2.587 5.768-5.766 0-3.18-2.586-5.771-5.768-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.941-.708-1.792s.448-1.27.607-1.444c.159-.175.348-.218.464-.218.116 0 .232.001.333.006.107.005.25-.041.391.298.145.348.492 1.2.535 1.288.043.087.072.189.014.305-.058.116-.087.189-.174.29-.087.102-.183.227-.261.305-.087.087-.178.182-.076.357.101.174.453.748.973 1.211.669.596 1.232.781 1.406.868.174.087.276.073.377-.044.101-.116.435-.508.551-.682.116-.174.232-.145.391-.087s1.014.478 1.188.565c.174.087.29.131.333.203.043.073.043.421-.101.826z" />
                    </svg>
                  </div>
                  <input
                    type="tel"
                    value={noWhatsapp}
                    onChange={(e) => setNoWhatsapp(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem 0.65rem 2.5rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--foreground)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--secondary-foreground)', marginTop: '0.35rem' }}>
                  Digunakan untuk kontak pengurus RT/RW dan pengiriman dokumen via WhatsApp.
                </p>
              </div>

              {/* Field Pekerjaan (jika role Warga) */}
              {data.warga && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                    Pekerjaan / Profesi
                  </label>
                  <input
                    type="text"
                    value={pekerjaan}
                    onChange={(e) => setPekerjaan(e.target.value)}
                    placeholder="Contoh: Karyawan Swasta, Wiraswasta, PNS, Guru"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--foreground)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--secondary-foreground)', marginTop: '0.35rem' }}>
                    Data pekerjaan sesuai data KTP/identitas diri.
                  </p>
                </div>
              )}
            </div>

            {/* Preferensi Notifikasi */}
            <div
              style={{
                marginTop: '0.5rem',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--secondary)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>
                  Pengaturan Preferensi Notifikasi
                </h3>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--secondary-foreground)', margin: 0 }}>
                Pilih saluran pengiriman pemberitahuan untuk pengumuman lingkungan, status permohonan surat, dan pengaduan warga.
              </p>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.checked)}
                    style={{ width: '1.1rem', height: '1.1rem' }}
                  />
                  <span>Aktifkan Notifikasi Email</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={notifyWhatsapp}
                    onChange={(e) => setNotifyWhatsapp(e.target.checked)}
                    style={{ width: '1.1rem', height: '1.1rem' }}
                  />
                  <span>Aktifkan Notifikasi WhatsApp</span>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setIsEditingContact(false)}
                className="btn"
                style={{ border: '1px solid var(--border)', background: 'transparent' }}
                disabled={isPending}
              >
                Batal
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isPending}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {isPending ? (
                  <>
                    <span
                      style={{
                        width: '14px',
                        height: '14px',
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
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Simpan Perubahan
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Grid: Data Identitas & Data Domisili */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        
        {/* Card 1: Data Identitas Warga */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(37, 99, 235, 0.1)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7 7z" />
                </svg>
              </div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 'bold' }}>Identitas Kependudukan</h2>
            </div>
            {data.warga && (
              <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600, background: '#dcfce7', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)' }}>
                Terverifikasi Dukcapil
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Nama Lengkap */}
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--secondary-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Nama Lengkap Warga
              </span>
              <p style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--foreground)' }}>
                {namaDisplay}
              </p>
            </div>

            {/* NIK */}
            {data.warga && (
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--secondary-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Nomor Induk Kependudukan (NIK)
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem' }}>
                  <span style={{ fontSize: '1rem', fontFamily: 'monospace', fontWeight: 600, letterSpacing: '0.05em' }}>
                    {showNik ? data.warga.nik : maskText(data.warga.nik)}
                  </span>
                  <button
                    onClick={() => setShowNik(!showNik)}
                    title={showNik ? 'Sembunyikan NIK' : 'Tampilkan NIK'}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--secondary-foreground)',
                      padding: '0.2rem',
                    }}
                  >
                    {showNik ? (
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => copyToClipboard(data.warga!.nik, 'nik')}
                    title="Salin NIK"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: copiedField === 'nik' ? '#16a34a' : 'var(--secondary-foreground)',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    {copiedField === 'nik' ? (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Tersalin
                      </>
                    ) : (
                      'Salin'
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Nomor KK */}
            {data.warga?.keluarga && (
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--secondary-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Nomor Kartu Keluarga (KK)
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem' }}>
                  <span style={{ fontSize: '1rem', fontFamily: 'monospace', fontWeight: 600, letterSpacing: '0.05em' }}>
                    {showKk ? data.warga.keluarga.nomorKk : maskText(data.warga.keluarga.nomorKk)}
                  </span>
                  <button
                    onClick={() => setShowKk(!showKk)}
                    title={showKk ? 'Sembunyikan KK' : 'Tampilkan KK'}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--secondary-foreground)',
                      padding: '0.2rem',
                    }}
                  >
                    {showKk ? (
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                  <Link
                    href="/dashboard/kartu-keluarga"
                    style={{ fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'underline' }}
                  >
                    Lihat KK &rarr;
                  </Link>
                </div>
              </div>
            )}

            {/* Tempat & Tanggal Lahir */}
            {data.warga && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--secondary-foreground)', textTransform: 'uppercase' }}>
                    Tempat Lahir
                  </span>
                  <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                    {data.warga.tempatLahir || '-'}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--secondary-foreground)', textTransform: 'uppercase' }}>
                    Tanggal Lahir
                  </span>
                  <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                    {formatTanggal(data.warga.tanggalLahir)}
                  </p>
                </div>
              </div>
            )}

            {/* Agama & Pekerjaan */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--secondary-foreground)', textTransform: 'uppercase' }}>
                  Agama
                </span>
                <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                  {data.warga?.agama || '-'}
                </p>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--secondary-foreground)', textTransform: 'uppercase' }}>
                  Pekerjaan
                </span>
                <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                  {data.warga?.pekerjaan || initialPekerjaan || 'Belum diisi'}
                </p>
              </div>
            </div>
          </div>
        </div>


      {/* Card 3: Kontak & Komunikasi Warga */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(56, 189, 248, 0.1)',
                color: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 'bold' }}>Kontak & Saluran Komunikasi</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--secondary-foreground)' }}>
                Informasi nomor WhatsApp dan alamat email yang dapat dihubungi pengurus lingkungan
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setIsEditingContact(true);
              window.scrollTo({ top: 150, behavior: 'smooth' });
            }}
            className="btn"
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.8rem',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
            }}
          >
            Ubah Kontak
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          {/* Email Item */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '1rem',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(37, 99, 235, 0.1)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--secondary-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Alamat Email
              </span>
              {initialEmail ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--foreground)', wordBreak: 'break-all', margin: 0 }}>
                      {initialEmail}
                    </p>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '0.2rem 0.55rem',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: initialNotifyEmail ? '#dcfce7' : '#fee2e2',
                        color: initialNotifyEmail ? '#15803d' : '#991b1b',
                      }}
                    >
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: initialNotifyEmail ? '#15803d' : '#991b1b',
                          display: 'inline-block',
                        }}
                      />
                      {initialNotifyEmail ? 'Notifikasi Aktif' : 'Notifikasi Nonaktif'}
                    </span>
                  </div>
                  <div style={{ marginTop: '0.5rem' }}>
                    <a
                      href={`mailto:${initialEmail}`}
                      className="btn"
                      style={{
                        padding: '0.25rem 0.65rem',
                        fontSize: '0.75rem',
                        background: 'rgba(37, 99, 235, 0.1)',
                        color: 'var(--primary)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      Kirim Pesan
                    </a>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: '0.25rem' }}>
                  <p style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>
                    Belum ditambahkan
                  </p>
                  <button
                    onClick={() => {
                      setIsEditingContact(true);
                      window.scrollTo({ top: 150, behavior: 'smooth' });
                    }}
                    style={{
                      marginTop: '0.4rem',
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      fontWeight: 600,
                      padding: 0,
                    }}
                  >
                    + Tambahkan Email
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* WhatsApp Item */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '1rem',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(34, 197, 94, 0.1)',
                color: '#22c55e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.149.929 3.182 0 5.767-2.587 5.768-5.766 0-3.18-2.586-5.771-5.768-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.941-.708-1.792s.448-1.27.607-1.444c.159-.175.348-.218.464-.218.116 0 .232.001.333.006.107.005.25-.041.391.298.145.348.492 1.2.535 1.288.043.087.072.189.014.305-.058.116-.087.189-.174.29-.087.102-.183.227-.261.305-.087.087-.178.182-.076.357.101.174.453.748.973 1.211.669.596 1.232.781 1.406.868.174.087.276.073.377-.044.101-.116.435-.508.551-.682.116-.174.232-.145.391-.087s1.014.478 1.188.565c.174.087.29.131.333.203.043.073.043.421-.101.826z" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--secondary-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Nomor WhatsApp
              </span>
              {initialWhatsapp ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--foreground)', margin: 0 }}>
                      {initialWhatsapp}
                    </p>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '0.2rem 0.55rem',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: initialNotifyWhatsapp ? '#dcfce7' : '#fee2e2',
                        color: initialNotifyWhatsapp ? '#15803d' : '#991b1b',
                      }}
                    >
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: initialNotifyWhatsapp ? '#15803d' : '#991b1b',
                          display: 'inline-block',
                        }}
                      />
                      {initialNotifyWhatsapp ? 'Notifikasi Aktif' : 'Notifikasi Nonaktif'}
                    </span>
                  </div>
                  <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                    <a
                      href={getWhatsAppLink(initialWhatsapp)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn"
                      style={{
                        padding: '0.25rem 0.65rem',
                        fontSize: '0.75rem',
                        background: '#22c55e',
                        color: 'white',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      Buka WhatsApp &rarr;
                    </a>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: '0.25rem' }}>
                  <p style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>
                    Belum ditambahkan
                  </p>
                  <button
                    onClick={() => {
                      setIsEditingContact(true);
                      window.scrollTo({ top: 150, behavior: 'smooth' });
                    }}
                    style={{
                      marginTop: '0.4rem',
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      fontWeight: 600,
                      padding: 0,
                    }}
                  >
                    + Tambahkan No. WhatsApp
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
}
