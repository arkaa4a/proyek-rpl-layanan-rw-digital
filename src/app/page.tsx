import Link from 'next/link';

export default function Home() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem', alignItems: 'center', textAlign: 'center', marginTop: '4rem' }}>
      <div style={{ maxWidth: '800px' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--primary)' }}>
          Sistem Pelayanan Digital RW Terpadu
        </h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--secondary-foreground)', marginBottom: '2rem' }}>
          Platform administrasi RT/RW yang cerdas, cepat, dan terintegrasi dengan asisten AI.
          Ajukan surat pengantar, cek status, dan dapatkan dokumen resmi ber-QR Code dengan mudah.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link href="/login" className="btn btn-primary" style={{ padding: '0.75rem 1.75rem', fontSize: '1rem' }}>
            Masuk / Mulai Pengajuan
          </Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', width: '100%', marginTop: '4rem', paddingBottom: '4rem' }}>
        <div className="card">
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Pengajuan Online</h3>
          <p style={{ color: 'var(--secondary-foreground)' }}>Warga dapat mengajukan berbagai jenis layanan administrasi dari rumah tanpa harus antri.</p>
        </div>
        <div className="card">
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Dokumen Resmi (QR Code)</h3>
          <p style={{ color: 'var(--secondary-foreground)' }}>Surat yang telah disetujui akan di-generate otomatis menjadi PDF dengan validasi QR Code resmi.</p>
        </div>
        <div className="card">
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>AI Support 24/7</h3>
          <p style={{ color: 'var(--secondary-foreground)' }}>Asisten AI siap membantu menjawab pertanyaan terkait FAQ layanan, persyaratan, dan panduan pengajuan.</p>
        </div>
      </div>
    </div>
  );
}
