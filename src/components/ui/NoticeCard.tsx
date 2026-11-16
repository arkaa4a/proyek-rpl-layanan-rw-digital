import React from 'react';

type NoticeProps = {
  notice: any;
  onEdit?: (notice: any) => void;
  onDelete?: (notice: any) => void;
  canManage?: boolean;
};

export default function NoticeCard({ notice, onEdit, onDelete, canManage }: NoticeProps) {
  const getBadgeColor = (kategori: string) => {
    switch (kategori) {
      case 'Gotong Royong': return '#dcfce7'; // green
      case 'Keamanan': return '#fee2e2'; // red
      case 'Informasi Penting': return '#fef3c7'; // yellow
      default: return '#e0e7ff'; // blue for Kegiatan Warga
    }
  };

  const getTextColor = (kategori: string) => {
    switch (kategori) {
      case 'Gotong Royong': return '#166534';
      case 'Keamanan': return '#991b1b';
      case 'Informasi Penting': return '#92400e';
      default: return '#3730a3';
    }
  };

  return (
    <div style={{
      background: 'var(--surface)', borderRadius: '1rem', padding: '1.5rem',
      boxShadow: notice.prioritas ? '0 4px 12px rgba(59, 130, 246, 0.15)' : '0 2px 8px rgba(0,0,0,0.05)',
      border: notice.prioritas ? '2px solid #60a5fa' : '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative'
    }}>
      {notice.prioritas && (
        <div style={{
          position: 'absolute',
          top: '-12px',
          right: '16px',
          background: '#2563eb',
          color: 'white',
          padding: '4px 10px',
          borderRadius: '9999px',
          fontSize: '0.72rem',
          fontWeight: 700,
          boxShadow: '0 2px 6px rgba(37,99,235,0.25)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="17" x2="12" y2="22" />
            <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
          </svg>
          Disematkan
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ 
            background: getBadgeColor(notice.kategori), color: getTextColor(notice.kategori),
            padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600
          }}>
            {notice.kategori}
          </span>
          {notice.isPublished === false && (
            <span style={{ 
              background: '#fef3c7', color: '#b45309',
              padding: '4px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', gap: '3px'
            }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#d97706' }} />
              Draf
            </span>
          )}
          {notice.targetRt?.nomor && (
            <span style={{ 
              background: '#f1f5f9', color: '#475569',
              padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600
            }}>
              RT {notice.targetRt.nomor}
            </span>
          )}
        </div>
        
        {canManage && (
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <button
              type="button"
              onClick={() => onEdit?.(notice)}
              title="Edit Pengumuman"
              aria-label="Edit Pengumuman"
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                cursor: 'pointer',
                color: '#475569',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => onDelete?.(notice)}
              title="Hapus Pengumuman"
              aria-label="Hapus Pengumuman"
              style={{
                background: '#fef2f2',
                border: '1px solid #fee2e2',
                borderRadius: '6px',
                cursor: 'pointer',
                color: '#dc2626',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--foreground)', margin: '0 0 0.5rem 0' }}>{notice.judul}</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--secondary-foreground)', lineHeight: 1.6, margin: 0 }}>
          {notice.konten}
        </p>
      </div>

      {(notice.tanggalKegiatan || notice.lokasiKegiatan) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
          {notice.tanggalKegiatan && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#475569' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                <line x1="16" x2="16" y1="2" y2="6" />
                <line x1="8" x2="8" y1="2" y2="6" />
                <line x1="3" x2="21" y1="10" y2="10" />
              </svg>
              <span>
                {(() => {
                  const dateObj = new Date(notice.tanggalKegiatan);
                  if (!isNaN(dateObj.getTime())) {
                    return dateObj.toLocaleString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(/\./g, ':') + ' WIB';
                  }
                  return notice.tanggalKegiatan;
                })()}
              </span>
            </div>
          )}
          {notice.lokasiKegiatan && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#475569' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>{notice.lokasiKegiatan}</span>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: notice.tanggalKegiatan || notice.lokasiKegiatan ? '0' : 'auto', paddingTop: '1rem' }}>
        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
          Oleh: <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{notice.authorRole}</span>
        </div>
        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
          {new Date(notice.createdAt).toLocaleDateString('id-ID')}
        </div>
      </div>
    </div>
  );
}
