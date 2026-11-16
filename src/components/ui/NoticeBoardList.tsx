'use client';

import React, { useState } from 'react';
import NoticeCard from './NoticeCard';
import ModalFormNotice from './ModalFormNotice';
import ConfirmationDialog from './ConfirmationDialog';
import { deletePengumumanAction, deleteAllPengumumanAction } from '@/app/dashboard/pengumuman/actions';

type NoticeBoardProps = {
  initialNotices: any[];
  canManage: boolean;
  userRole?: string;
  userRtId?: string | null;
  rtOptions?: { id: string; nomor: string }[];
};

export default function NoticeBoardList({
  initialNotices,
  canManage,
  userRole,
  userRtId,
  rtOptions = [],
}: NoticeBoardProps) {
  const [notices, setNotices] = useState(initialNotices);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<any>(null);
  const [noticeToDelete, setNoticeToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [deleteAllError, setDeleteAllError] = useState<string | null>(null);

  const handleEdit = (notice: any) => {
    setEditingNotice(notice);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingNotice(null);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (noticeOrId: any) => {
    if (typeof noticeOrId === 'string') {
      const found = notices.find((n) => n.id === noticeOrId);
      setNoticeToDelete(found || { id: noticeOrId, judul: 'Pengumuman' });
    } else {
      setNoticeToDelete(noticeOrId);
    }
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!noticeToDelete?.id) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await deletePengumumanAction(noticeToDelete.id);
      if (res?.error) {
        setDeleteError(res.error);
        setIsDeleting(false);
        return;
      }
      setNotices((prev) => prev.filter((n) => n.id !== noticeToDelete.id));
      setNoticeToDelete(null);
      setIsDeleting(false);
    } catch (err: any) {
      setDeleteError(err.message || 'Gagal menghapus pengumuman.');
      setIsDeleting(false);
    }
  };

  const handleConfirmDeleteAll = async () => {
    setIsDeletingAll(true);
    setDeleteAllError(null);
    try {
      const res = await deleteAllPengumumanAction();
      if (res?.error) {
        setDeleteAllError(res.error);
        setIsDeletingAll(false);
        return;
      }
      setNotices([]);
      setIsDeleteAllOpen(false);
      setIsDeletingAll(false);
    } catch (err: any) {
      setDeleteAllError(err.message || 'Gagal menghapus semua pengumuman.');
      setIsDeletingAll(false);
    }
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Papan Pengumuman Digital RW</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--secondary-foreground)' }}>Informasi terbaru, jadwal gotong royong, dan kegiatan warga.</p>
        </div>
        {canManage && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {notices.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setIsDeleteAllOpen(true);
                  setDeleteAllError(null);
                }}
                disabled={isDeletingAll}
                className="btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  border: '1px solid #fca5a5',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  padding: '0.5rem 0.95rem',
                  borderRadius: 'var(--radius-md)',
                  transition: 'all 0.15s ease',
                  cursor: isDeletingAll ? 'not-allowed' : 'pointer',
                  opacity: isDeletingAll ? 0.7 : 1,
                }}
                title="Hapus semua pengumuman sekaligus"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
                <span>Hapus Semua ({notices.length})</span>
              </button>
            )}
            <button onClick={handleAddNew} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Tambah Pengumuman</span>
            </button>
          </div>
        )}
      </div>

      {notices.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', border: '2px dashed var(--border)', borderRadius: '1rem', color: 'var(--secondary-foreground)' }}>
          Belum ada pengumuman saat ini.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {notices.map(notice => (
            <NoticeCard 
              key={notice.id} 
              notice={notice} 
              canManage={canManage}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      )}

      <ModalFormNotice 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        noticeToEdit={editingNotice}
        userRole={userRole}
        userRtId={userRtId}
        rtOptions={rtOptions}
        onSuccess={() => {
          window.location.reload(); 
        }}
      />

      {/* Dialog Konfirmasi Hapus Satu Pengumuman */}
      <ConfirmationDialog
        isOpen={Boolean(noticeToDelete)}
        title="Hapus Pengumuman Lingkungan?"
        message="Apakah Anda yakin ingin menghapus pengumuman ini? Data pengumuman akan dihapus secara permanen dan tidak lagi ditampilkan kepada warga."
        itemName={noticeToDelete?.judul}
        confirmText="Ya, Hapus Pengumuman"
        cancelText="Batal"
        isDestructive={true}
        isLoading={isDeleting}
        error={deleteError}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          if (!isDeleting) {
            setNoticeToDelete(null);
            setDeleteError(null);
          }
        }}
      />

      {/* Dialog Konfirmasi Hapus Semua Pengumuman */}
      <ConfirmationDialog
        isOpen={isDeleteAllOpen}
        title="Hapus Semua Pengumuman?"
        message={`Apakah Anda yakin ingin menghapus seluruh (${notices.length}) pengumuman? Tindakan ini bersifat permanen dan semua pengumuman akan dibersihkan dari papan pengumuman.`}
        itemName={`${notices.length} Pengumuman Terdaftar`}
        confirmText={isDeletingAll ? 'Menghapus Semua...' : 'Ya, Hapus Semua'}
        cancelText="Batal"
        isDestructive={true}
        isLoading={isDeletingAll}
        error={deleteAllError}
        onConfirm={handleConfirmDeleteAll}
        onCancel={() => {
          if (!isDeletingAll) {
            setIsDeleteAllOpen(false);
            setDeleteAllError(null);
          }
        }}
      />
    </div>
  );
}
