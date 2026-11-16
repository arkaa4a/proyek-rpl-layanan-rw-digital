import prisma from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const metadata = {
  title: 'Verifikasi Keaslian Dokumen Resmi',
};

// Fungsi helper untuk masking NIK (misal: 3271********0001)
function maskNik(nik?: string | null) {
  if (!nik || nik.length < 16) return nik || '-';
  return nik.substring(0, 4) + '*'.repeat(nik.length - 8) + nik.substring(nik.length - 4);
}

// Fungsi helper untuk masking Nama (misal: C**** W****)
function maskName(name?: string | null) {
  if (!name) return '-';
  return name.split(' ').map(word => {
    if (word.length <= 1) return word;
    return word.charAt(0) + '*'.repeat(word.length - 1);
  }).join(' ');
}

export default async function VerifyPage(props: { params: Promise<{ token: string }> }) {
  try {
    const params = await props.params;
    const token = params.token;

    if (!token) {
      notFound();
    }

    const request = await prisma.request.findUnique({
      where: { documentToken: token },
      include: {
        applicant: {
          include: {
            rt: { include: { rw: true } }
          }
        },
        serviceType: true,
        createdBy: true,
      }
    });

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.5rem',
    backgroundColor: 'var(--background)',
  };

  const cardStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '520px',
    backgroundColor: 'var(--surface)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-lg)',
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  };

  if (!request) {
    return (
      <div style={containerStyle}>
        <div style={{ ...cardStyle, textAlign: 'center', alignItems: 'center' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            backgroundColor: '#fee2e2', color: '#dc2626',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '0.5rem'
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--error)' }}>
            Dokumen Tidak Ditemukan
          </h2>
          <p style={{ color: 'var(--secondary-foreground)', fontSize: '0.875rem', lineHeight: 1.6 }}>
            QR Code atau token verifikasi tidak cocok dengan data surat manapun di dalam sistem administrasi RW Digital.
          </p>
          <Link href="/" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', textDecoration: 'none' }}>
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  if (request.documentStatus === 'REVOKED') {
    return (
      <div style={containerStyle}>
        <div style={{ ...cardStyle, textAlign: 'center', alignItems: 'center' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            backgroundColor: '#fef3c7', color: '#b45309',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '0.5rem'
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#b45309' }}>
            Dokumen Dibatalkan
          </h2>
          <p style={{ color: 'var(--secondary-foreground)', fontSize: '0.875rem', lineHeight: 1.6 }}>
            Dokumen resmi ini telah dicabut atau dibatalkan oleh pihak pengurus RT/RW sehingga sudah tidak berlaku lagi.
          </p>
          <Link href="/" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', textDecoration: 'none' }}>
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  // Jika ACTIVE
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* Header Status */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            backgroundColor: '#dcfce7', color: '#16a34a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #86efac'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <div>
            <span style={{
              display: 'inline-block',
              backgroundColor: '#dcfce7',
              color: '#15803d',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginBottom: '0.5rem',
              border: '1px solid #86efac'
            }}>
              Dokumen Resmi & Valid
            </span>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--foreground)', margin: 0 }}>
              Verifikasi Keaslian Surat
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--secondary-foreground)', marginTop: '0.25rem' }}>
              Dokumen ini resmi diterbitkan melalui Sistem Layanan RW Digital.
            </p>
          </div>
        </div>

        {/* Informasi Detail Surat */}
        <div style={{
          backgroundColor: 'rgba(0,0,0,0.02)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--secondary-foreground)', fontWeight: 600 }}>NOMOR SURAT RESMI</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'var(--primary)', fontFamily: 'monospace' }}>
              {request.documentNumber || '-'}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--secondary-foreground)', fontWeight: 600 }}>JENIS LAYANAN SURAT</div>
            <div style={{ fontSize: '0.925rem', fontWeight: 600, color: 'var(--foreground)' }}>
              {request.serviceType.name}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--secondary-foreground)', fontWeight: 600 }}>TANGGAL TERBIT</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--foreground)' }}>
                {new Date(request.updatedAt).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--secondary-foreground)', fontWeight: 600 }}>DITERBITKAN OLEH</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--foreground)' }}>
                {request.createdBy?.username || 'Ketua RW'}
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--secondary-foreground)', fontWeight: 600 }}>DATA PEMOHON (PRIVASI DILINDUNGI)</div>
            <div style={{ marginTop: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div style={{ fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--secondary-foreground)' }}>Nama: </span>
                <strong style={{ color: 'var(--foreground)' }}>{maskName(request.applicant.namaLengkap)}</strong>
              </div>
              <div style={{ fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--secondary-foreground)' }}>NIK: </span>
                <span style={{ fontFamily: 'monospace', color: 'var(--foreground)' }}>{maskNik(request.applicant.nik)}</span>
              </div>
              {request.applicant.rt && (
                <div style={{ fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--secondary-foreground)' }}>Domisili: </span>
                  <span style={{ color: 'var(--foreground)' }}>RT {request.applicant.rt.nomor} / RW {request.applicant.rt.rw?.nomor || '12'}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
          <Link href="/" className="btn btn-primary" style={{ width: '100%', textDecoration: 'none' }}>
            Kembali ke Halaman Utama
          </Link>
        </div>
      </div>
    </div>
  );
  } catch (err: any) {
    console.error('VERIFY ERROR:', err);
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Terjadi Kendala Saat Memuat Dokumen</h2>
        <p>{err?.message || 'Error'}</p>
        <Link href="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>Kembali</Link>
      </div>
    );
  }
}
