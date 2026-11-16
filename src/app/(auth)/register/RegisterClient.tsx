'use client';

import { useActionState, useState } from 'react';
import { registerAction, RegisterState } from './actions';
import Link from 'next/link';

interface RtOption {
  id: string;
  nomor: string;
  namaKetua?: string | null;
  namaWilayah?: string | null;
  rw?: {
    nomor: string;
  } | null;
}

interface RegisterClientProps {
  rts: RtOption[];
}

export default function RegisterClient({ rts }: RegisterClientProps) {
  const [state, formAction, isPending] = useActionState(registerAction, null as RegisterState);

  const [nik, setNik] = useState('');
  const [nomorKk, setNomorKk] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleNikChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 16);
    setNik(val);
  };

  const handleKkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 16);
    setNomorKk(val);
  };

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '2rem 1rem' }}>
      <div className="card glass" style={{ width: '100%', maxWidth: '640px', padding: '2.25rem', boxShadow: 'var(--shadow-lg)' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 0.85rem',
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            color: 'var(--primary)',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.75rem',
            fontWeight: 600,
            marginBottom: '0.75rem',
          }}>
            <span>🏛️</span> Layanan Mandiri Warga RW
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--foreground)', marginBottom: '0.5rem' }}>
            Daftar Akun Warga Baru
          </h1>
          <p style={{ color: 'var(--secondary-foreground)', fontSize: '0.875rem', lineHeight: '1.5', maxWidth: '480px', margin: '0 auto' }}>
            Lengkapi data identitas dan akun Anda untuk mengajukan surat pengantar digital, menyampaikan aduan, dan memantau status secara praktis.
          </p>
        </div>

        {/* Global Error Notice */}
        {state?.error && (
          <div style={{
            padding: '0.85rem 1rem',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            color: 'var(--error)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.65rem'
          }}>
            <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>⚠️</span>
            <div>
              <strong>Pendaftaran Belum Berhasil</strong>
              <div style={{ marginTop: '0.2rem' }}>{state.error}</div>
            </div>
          </div>
        )}

        <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          
          {/* SECTION 1: DATA KEPENDUDUKAN */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              paddingBottom: '0.5rem',
              borderBottom: '1px solid var(--border)',
              marginBottom: '1rem',
              color: 'var(--primary)',
              fontWeight: 600,
              fontSize: '0.95rem'
            }}>
              <span>🪪</span>
              <span>1. Identitas Kependudukan Sesuai KTP/KK</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              
              {/* NIK */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label htmlFor="nik" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--foreground)' }}>
                    Nomor Induk Kependudukan (NIK) <span style={{ color: 'var(--error)' }}>*</span>
                  </label>
                  <span style={{ fontSize: '0.75rem', color: nik.length === 16 ? 'var(--success)' : 'var(--secondary-foreground)' }}>
                    {nik.length}/16 digit
                  </span>
                </div>
                <input
                  type="text"
                  id="nik"
                  name="nik"
                  value={nik}
                  onChange={handleNikChange}
                  required
                  placeholder="327401xxxxxxxxxx"
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: state?.fieldErrors?.nik ? '1px solid var(--error)' : '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--foreground)',
                    fontFamily: 'monospace',
                    fontSize: '0.9rem',
                  }}
                />
                {state?.fieldErrors?.nik ? (
                  <div style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    {state.fieldErrors.nik}
                  </div>
                ) : (
                  <div style={{ color: 'var(--secondary-foreground)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    16 digit angka sesuai KTP elektronik.
                  </div>
                )}
              </div>

              {/* Nama Lengkap */}
              <div>
                <label htmlFor="namaLengkap" style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--foreground)' }}>
                  Nama Lengkap Sesuai KTP <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <input
                  type="text"
                  id="namaLengkap"
                  name="namaLengkap"
                  required
                  placeholder="Contoh: Budi Santoso"
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: state?.fieldErrors?.namaLengkap ? '1px solid var(--error)' : '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--foreground)',
                    fontSize: '0.9rem',
                  }}
                />
                {state?.fieldErrors?.namaLengkap && (
                  <div style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    {state.fieldErrors.namaLengkap}
                  </div>
                )}
              </div>

              {/* Pilihan RT */}
              <div>
                <label htmlFor="rtId" style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--foreground)' }}>
                  Wilayah Rukun Tetangga (RT) <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <select
                  id="rtId"
                  name="rtId"
                  required
                  defaultValue=""
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: state?.fieldErrors?.rtId ? '1px solid var(--error)' : '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--foreground)',
                    fontSize: '0.9rem',
                  }}
                >
                  <option value="" disabled>-- Pilih RT Domisili Anda --</option>
                  {rts.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      RT {rt.nomor} {rt.namaWilayah ? `(${rt.namaWilayah})` : ''} - RW {rt.rw?.nomor || '01'} {rt.namaKetua ? `[Ketua: ${rt.namaKetua}]` : ''}
                    </option>
                  ))}
                </select>
                {state?.fieldErrors?.rtId ? (
                  <div style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    {state.fieldErrors.rtId}
                  </div>
                ) : (
                  <div style={{ color: 'var(--secondary-foreground)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    Pilih nomor RT tempat tinggal Anda saat ini.
                  </div>
                )}
              </div>

              {/* Nomor Kartu Keluarga */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label htmlFor="nomorKk" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--foreground)' }}>
                    Nomor Kartu Keluarga (KK) <span style={{ fontSize: '0.75rem', color: 'var(--secondary-foreground)', fontWeight: 400 }}>(Opsional)</span>
                  </label>
                  {nomorKk.length > 0 && (
                    <span style={{ fontSize: '0.75rem', color: nomorKk.length === 16 ? 'var(--success)' : 'var(--secondary-foreground)' }}>
                      {nomorKk.length}/16 digit
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  id="nomorKk"
                  name="nomorKk"
                  value={nomorKk}
                  onChange={handleKkChange}
                  placeholder="327401xxxxxxxxxx"
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: state?.fieldErrors?.nomorKk ? '1px solid var(--error)' : '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--foreground)',
                    fontFamily: 'monospace',
                    fontSize: '0.9rem',
                  }}
                />
                {state?.fieldErrors?.nomorKk && (
                  <div style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    {state.fieldErrors.nomorKk}
                  </div>
                )}
              </div>

            </div>

            {/* Alamat Domisili */}
            <div style={{ marginTop: '1rem' }}>
              <label htmlFor="alamat" style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--foreground)' }}>
                Alamat Domisili / Tempat Tinggal <span style={{ fontSize: '0.75rem', color: 'var(--secondary-foreground)', fontWeight: 400 }}>(Opsional)</span>
              </label>
              <input
                type="text"
                id="alamat"
                name="alamat"
                placeholder="Contoh: Jl. Anggrek No. 15, Blok C"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--foreground)',
                  fontSize: '0.9rem',
                }}
              />
            </div>
          </div>

          {/* SECTION 2: KONTAK & NOTIFIKASI */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              paddingBottom: '0.5rem',
              borderBottom: '1px solid var(--border)',
              marginBottom: '1rem',
              color: 'var(--primary)',
              fontWeight: 600,
              fontSize: '0.95rem'
            }}>
              <span>📱</span>
              <span>2. Kontak Notifikasi Layanan</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              
              {/* WhatsApp */}
              <div>
                <label htmlFor="noWhatsapp" style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--foreground)' }}>
                  Nomor WhatsApp <span style={{ fontSize: '0.75rem', color: 'var(--secondary-foreground)', fontWeight: 400 }}>(Sangat Disarankan)</span>
                </label>
                <input
                  type="tel"
                  id="noWhatsapp"
                  name="noWhatsapp"
                  placeholder="081234567890"
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--foreground)',
                    fontSize: '0.9rem',
                  }}
                />
                <div style={{ color: 'var(--secondary-foreground)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  Untuk menerima kabar status surat pengantar langsung ke WhatsApp Anda.
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--foreground)' }}>
                  Alamat Surel (Email) <span style={{ fontSize: '0.75rem', color: 'var(--secondary-foreground)', fontWeight: 400 }}>(Opsional)</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="nama.warga@email.com"
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: state?.fieldErrors?.email ? '1px solid var(--error)' : '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--foreground)',
                    fontSize: '0.9rem',
                  }}
                />
                {state?.fieldErrors?.email && (
                  <div style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    {state.fieldErrors.email}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* SECTION 3: KATA SANDI & LOGIN */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              paddingBottom: '0.5rem',
              borderBottom: '1px solid var(--border)',
              marginBottom: '1rem',
              color: 'var(--primary)',
              fontWeight: 600,
              fontSize: '0.95rem'
            }}>
              <span>🔐</span>
              <span>3. Kredensial Akun Pengguna</span>
            </div>

            {/* Username */}
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="username" style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--foreground)' }}>
                Username Login <span style={{ color: 'var(--error)' }}>*</span>
              </label>
              <input
                type="text"
                id="username"
                name="username"
                required
                autoComplete="username"
                placeholder="budi_santoso"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: state?.fieldErrors?.username ? '1px solid var(--error)' : '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--foreground)',
                  fontSize: '0.9rem',
                }}
              />
              {state?.fieldErrors?.username ? (
                <div style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  {state.fieldErrors.username}
                </div>
              ) : (
                <div style={{ color: 'var(--secondary-foreground)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  Minimal 3 karakter (huruf kecil, angka, titik, strip, atau underscore).
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              
              {/* Password */}
              <div>
                <label htmlFor="password" style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--foreground)' }}>
                  Kata Sandi <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="Minimal 6 karakter"
                    style={{
                      width: '100%',
                      padding: '0.6rem 2.5rem 0.6rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: state?.fieldErrors?.password ? '1px solid var(--error)' : '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--foreground)',
                      fontSize: '0.9rem',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    style={{
                      position: 'absolute',
                      right: '0.5rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      opacity: 0.7,
                    }}
                    title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {state?.fieldErrors?.password && (
                  <div style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    {state.fieldErrors.password}
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--foreground)' }}>
                  Konfirmasi Kata Sandi <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="Ulangi kata sandi"
                    style={{
                      width: '100%',
                      padding: '0.6rem 2.5rem 0.6rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: state?.fieldErrors?.confirmPassword || passwordsMismatch ? '1px solid var(--error)' : '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--foreground)',
                      fontSize: '0.9rem',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                    style={{
                      position: 'absolute',
                      right: '0.5rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      opacity: 0.7,
                    }}
                    title={showConfirmPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  >
                    {showConfirmPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {passwordsMatch && (
                  <div style={{ color: 'var(--success)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    ✓ Kata sandi cocok
                  </div>
                )}
                {passwordsMismatch && (
                  <div style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    ✗ Kata sandi belum cocok
                  </div>
                )}
                {state?.fieldErrors?.confirmPassword && !passwordsMismatch && (
                  <div style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    {state.fieldErrors.confirmPassword}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Privacy Notice Box */}
          <div style={{
            padding: '0.85rem',
            backgroundColor: 'rgba(59, 130, 246, 0.06)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(59, 130, 246, 0.18)',
            fontSize: '0.775rem',
            color: 'var(--secondary-foreground)',
            lineHeight: 1.45,
          }}>
            <strong>🛡️ Perlindungan Data Pribadi:</strong> Data NIK dan identitas yang Anda daftarkan hanya digunakan untuk keperluan verifikasi kepengurusan rukun warga (RT/RW) secara sah dan terlindungi sesuai ketentuan privasi data sistem.
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isPending || passwordsMismatch}
            style={{
              padding: '0.75rem',
              fontSize: '1rem',
              fontWeight: 600,
              gap: '0.5rem',
              opacity: isPending || passwordsMismatch ? 0.7 : 1,
              cursor: isPending || passwordsMismatch ? 'not-allowed' : 'pointer',
            }}
          >
            {isPending ? (
              <>
                <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
                <span>Memproses Pendaftaran...</span>
              </>
            ) : (
              <>
                <span>Daftar Akun Sekarang</span>
                <span>&rarr;</span>
              </>
            )}
          </button>

        </form>

        {/* Card Footer */}
        <div style={{
          marginTop: '2rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.875rem'
        }}>
          <div>
            Sudah memiliki akun warga?{' '}
            <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>
              Masuk di sini &rarr;
            </Link>
          </div>
          <Link href="/" style={{ color: 'var(--secondary-foreground)', fontSize: '0.8125rem' }}>
            &larr; Kembali ke Halaman Utama
          </Link>
        </div>

      </div>
    </div>
  );
}
