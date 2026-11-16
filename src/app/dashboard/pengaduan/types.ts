// Shared constants & types for Pengaduan Warga

export const PENGADUAN_KATEGORI = [
  'FASILITAS_UMUM',
  'KEBERSIHAN',
  'KEAMANAN',
  'DRAINASE',
  'JALAN',
  'LAINNYA',
] as const;

export type PengaduanKategoriType = (typeof PENGADUAN_KATEGORI)[number];

export const PENGADUAN_STATUS_UPDATE = [
  'DITINJAU',
  'DIPROSES',
  'SELESAI',
  'DITOLAK',
] as const;

export type PengaduanStatusUpdateType = (typeof PENGADUAN_STATUS_UPDATE)[number];

export type CreatePengaduanInput = {
  judul: string;
  kategori: string;
  deskripsi: string;
  lokasi: string;
};

export function getStatusBadge(status: string) {
  switch (status) {
    case 'DILAPORKAN':
      return {
        label: 'Dilaporkan',
        bg: 'rgba(59, 130, 246, 0.12)',
        color: '#2563eb',
        border: 'rgba(59, 130, 246, 0.25)',
      };
    case 'DITINJAU':
      return {
        label: 'Ditinjau',
        bg: 'rgba(234, 179, 8, 0.12)',
        color: '#ca8a04',
        border: 'rgba(234, 179, 8, 0.25)',
      };
    case 'DIPROSES':
      return {
        label: 'Sedang Diproses',
        bg: 'rgba(139, 92, 246, 0.12)',
        color: '#7c3aed',
        border: 'rgba(139, 92, 246, 0.25)',
      };
    case 'SELESAI':
      return {
        label: 'Selesai',
        bg: 'rgba(34, 197, 94, 0.12)',
        color: '#16a34a',
        border: 'rgba(34, 197, 94, 0.25)',
      };
    case 'DITOLAK':
      return {
        label: 'Ditolak',
        bg: 'rgba(239, 68, 68, 0.12)',
        color: '#dc2626',
        border: 'rgba(239, 68, 68, 0.25)',
      };
    default:
      return {
        label: status,
        bg: 'var(--secondary)',
        color: 'var(--secondary-foreground)',
        border: 'var(--border)',
      };
  }
}
