'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import Link from 'next/link';
import {
  getMyInAppNotifications,
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
  InAppNotificationItem,
} from '@/app/dashboard/notifikasi/inAppActions';

interface NotificationBellProps {
  session: {
    id: string;
    username: string;
    role: string;
    wargaId?: string | null;
  } | null;
}

export default function NotificationBell({ session }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'ALL' | 'UNREAD'>('ALL');
  const [selectedNotification, setSelectedNotification] = useState<InAppNotificationItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Muat notifikasi saat komponen dipasang atau dropdown dibuka
  const fetchNotifications = async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      const res = await getMyInAppNotifications();
      if (res.success) {
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount);
      }
    } catch (err) {
      console.error('Gagal memuat notifikasi:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Polling berkala setiap 60 detik jika halaman terbuka
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [session]);

  // Tutup dropdown jika klik di luar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Tandai 1 notifikasi sudah dibaca
  const handleMarkAsRead = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    startTransition(async () => {
      await markNotificationAsReadAction(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    });
  };

  // Tandai semua notifikasi sudah dibaca (kecuali yang butuh tindak lanjut/persetujuan)
  const handleMarkAllAsRead = () => {
    startTransition(async () => {
      const res = await markAllNotificationsAsReadAction();
      if (res.success) {
        setNotifications((prev) => {
          const updated = prev.map((n) => (n.requiresAction ? n : { ...n, isRead: true }));
          const remainingUnread = updated.filter((n) => !n.isRead).length;
          setUnreadCount(remainingUnread);
          return updated;
        });
      }
    });
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'UNREAD') return !n.isRead;
    return true;
  });

  const hasMarkableUnread = notifications.some((n) => !n.isRead && !n.requiresAction);
  const actionableUnreadCount = notifications.filter((n) => !n.isRead && n.requiresAction).length;

  if (!session) return null;

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Tombol Lonceng Notifikasi */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        aria-label="Pemberitahuan Notifikasi"
        style={{
          position: 'relative',
          background: isOpen ? '#f1f5f9' : 'transparent',
          border: '1px solid var(--border)',
          borderRadius: '50%',
          width: '38px',
          height: '38px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: isOpen ? '#0f172a' : 'var(--foreground)',
          transition: 'all 0.2s ease',
        }}
        title="Lihat Notifikasi"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.8}
          stroke="currentColor"
          style={{ width: '19px', height: '19px' }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>

        {/* Badge Hitungan Belum Dibaca */}
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              fontSize: '0.66rem',
              fontWeight: 800,
              minWidth: '17px',
              height: '17px',
              borderRadius: '9999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              border: '2px solid #ffffff',
              boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Container */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '390px',
            maxWidth: 'calc(100vw - 20px)',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 12px 32px -4px rgba(15, 23, 42, 0.14), 0 4px 12px -2px rgba(15, 23, 42, 0.08)',
            border: '1px solid #e2e8f0',
            zIndex: 1000,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '520px',
          }}
        >
          {/* Header Dropdown (Clean Slate Navy) */}
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #1e293b',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#f8fafc',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '-0.01em', color: '#f8fafc' }}>
                  Pemberitahuan
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                  {unreadCount > 0 ? `${unreadCount} belum dibaca` : 'Semua telah dibaca'}
                </div>
              </div>
            </div>

            {hasMarkableUnread ? (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={isPending}
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
              >
                {isPending ? 'Memproses...' : 'Tandai Dibaca'}
              </button>
            ) : actionableUnreadCount > 0 ? (
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  backgroundColor: 'rgba(245, 158, 11, 0.16)',
                  color: '#fbbf24',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                {actionableUnreadCount} butuh tindakan
              </span>
            ) : null}
          </div>

          {/* Filter Tabs */}
          <div
            style={{
              display: 'flex',
              backgroundColor: '#f1f5f9',
              padding: '3px',
              margin: '8px 12px 6px 12px',
              borderRadius: '8px',
              gap: '4px',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              style={{
                flex: 1,
                padding: '6px 10px',
                fontSize: '0.75rem',
                fontWeight: activeTab === 'ALL' ? 700 : 500,
                color: activeTab === 'ALL' ? '#0f172a' : '#64748b',
                backgroundColor: activeTab === 'ALL' ? '#ffffff' : 'transparent',
                borderRadius: '6px',
                border: activeTab === 'ALL' ? '1px solid #e2e8f0' : '1px solid transparent',
                cursor: 'pointer',
                boxShadow: activeTab === 'ALL' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Semua ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('UNREAD')}
              style={{
                flex: 1,
                padding: '6px 10px',
                fontSize: '0.75rem',
                fontWeight: activeTab === 'UNREAD' ? 700 : 500,
                color: activeTab === 'UNREAD' ? '#0f172a' : '#64748b',
                backgroundColor: activeTab === 'UNREAD' ? '#ffffff' : 'transparent',
                borderRadius: '6px',
                border: activeTab === 'UNREAD' ? '1px solid #e2e8f0' : '1px solid transparent',
                cursor: 'pointer',
                boxShadow: activeTab === 'UNREAD' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Belum Dibaca ({unreadCount})
            </button>
          </div>

          {/* List of Notification Items */}
          <div style={{ overflowY: 'auto', flex: 1, maxHeight: '380px' }}>
            {isLoading && notifications.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#64748b', fontSize: '0.82rem' }}>
                Memuat notifikasi...
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div style={{ padding: '36px 16px', textAlign: 'center', color: '#94a3b8' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 10px auto',
                    color: '#94a3b8',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </div>
                <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#475569' }}>
                  {activeTab === 'UNREAD'
                    ? 'Tidak ada notifikasi belum dibaca'
                    : 'Belum ada notifikasi'}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '3px' }}>
                  Pemberitahuan layanan dan pengumuman akan muncul di sini.
                </div>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const isUnread = !notif.isRead;
                return (
                  <div
                    key={notif.id}
                    onClick={() => {
                      // Notifikasi biasa: saat diklik langsung ditandai sudah dibaca
                      if (!notif.requiresAction && isUnread) {
                        handleMarkAsRead(notif.id);
                      }
                      // Notifikasi yang butuh tindakan / persetujuan:
                      // Tetap unread agar tidak terhapus dari tab "Belum Dibaca"
                      setSelectedNotification(notif);
                    }}
                    style={{
                      padding: '11px 14px 11px 12px',
                      borderBottom: '1px solid #f1f5f9',
                      borderLeft: isUnread
                        ? notif.requiresAction
                          ? '3px solid #d97706'
                          : '3px solid #2563eb'
                        : '3px solid transparent',
                      backgroundColor: isUnread
                        ? notif.requiresAction
                          ? '#fffdf5'
                          : '#f8faff'
                        : '#ffffff',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'flex-start',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = isUnread
                        ? (notif.requiresAction ? '#fef9c3' : '#eff6ff')
                        : '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = isUnread
                        ? (notif.requiresAction ? '#fffdf5' : '#f8faff')
                        : '#ffffff';
                    }}
                  >
                    {/* SVG Icon Box (Clean & Elegant) */}
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '2px',
                        backgroundColor: notif.requiresAction
                          ? '#fef3c7'
                          : notif.type === 'PENGUMUMAN'
                          ? '#eff6ff'
                          : notif.type === 'PENGAJUAN_SURAT'
                          ? '#f0f9ff'
                          : notif.type === 'PENGADUAN'
                          ? '#fff7ed'
                          : '#f8fafc',
                        border: `1px solid ${
                          notif.requiresAction
                            ? '#fde68a'
                            : notif.type === 'PENGUMUMAN'
                            ? '#dbeafe'
                            : notif.type === 'PENGAJUAN_SURAT'
                            ? '#e0f2fe'
                            : notif.type === 'PENGADUAN'
                            ? '#ffedd5'
                            : '#e2e8f0'
                        }`,
                      }}
                    >
                      {notif.type === 'PENGUMUMAN' ? (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m3 11 18-5v12L3 14v-3z" />
                          <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
                        </svg>
                      ) : notif.type === 'PENGAJUAN_SURAT' ? (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={notif.requiresAction ? '#b45309' : '#0284c7'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" x2="8" y1="13" y2="13" />
                          <line x1="16" x2="8" y1="17" y2="17" />
                        </svg>
                      ) : notif.type === 'PENGADUAN' ? (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" x2="12" y1="8" y2="12" />
                          <line x1="12" x2="12.01" y1="16" y2="16" />
                        </svg>
                      ) : (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 16v-4" />
                          <path d="M12 8h.01" />
                        </svg>
                      )}
                    </div>

                    {/* Konten */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '1px' }}>
                        <span
                          style={{
                            fontSize: '0.82rem',
                            fontWeight: isUnread ? 700 : 600,
                            color: '#0f172a',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {notif.subject}
                        </span>
                        {isUnread && (
                          <span
                            style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              backgroundColor: notif.requiresAction ? '#d97706' : '#2563eb',
                              flexShrink: 0,
                            }}
                            title={notif.requiresAction ? 'Perlu tindakan' : 'Belum dibaca'}
                          />
                        )}
                      </div>

                      {/* Status Badge & Action Badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', margin: '2px 0 4px 0' }}>
                        {notif.statusBadge && (
                          <span
                            style={{
                              fontSize: '0.67rem',
                              fontWeight: 600,
                              padding: '1px 7px',
                              borderRadius: '4px',
                              color: notif.statusBadge.color,
                              backgroundColor: notif.statusBadge.bgColor,
                              border: `1px solid ${notif.statusBadge.color}25`,
                              display: 'inline-block',
                            }}
                          >
                            {notif.statusBadge.label}
                          </span>
                        )}
                        {notif.requiresAction && (
                          <span
                            style={{
                              fontSize: '0.67rem',
                              fontWeight: 700,
                              padding: '1px 7px',
                              borderRadius: '4px',
                              color: '#92400e',
                              backgroundColor: '#fef3c7',
                              border: '1px solid #fde68a',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#d97706' }} />
                            Perlu Tindakan
                          </span>
                        )}
                      </div>

                      {/* Ringkasan Singkat & Informatif */}
                      <p
                        style={{
                          fontSize: '0.76rem',
                          color: '#475569',
                          margin: '2px 0 4px 0',
                          lineHeight: 1.4,
                        }}
                      >
                        {notif.content}
                      </p>

                      {/* Footer baris item */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginTop: '4px',
                          fontSize: '0.7rem',
                          color: '#94a3b8',
                        }}
                      >
                        <span>{notif.timeAgo}</span>
                        {notif.actionUrl && (
                          <Link
                            href={notif.actionUrl}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isUnread) handleMarkAsRead(notif.id);
                              setIsOpen(false);
                            }}
                            style={{
                              color: notif.requiresAction ? '#b45309' : '#2563eb',
                              fontWeight: 600,
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                              fontSize: '0.72rem',
                            }}
                          >
                            {notif.actionLabel || (notif.requiresAction ? 'Tindak Lanjuti →' : 'Lihat Detail →')}
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Dropdown */}
          <div
            style={{
              padding: '9px 14px',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.73rem',
            }}
          >
            <span style={{ color: '#64748b' }}>Pelayanan Digital RW</span>
            {['SUPER_ADMIN', 'ADMIN_RW', 'KETUA_RW', 'KETUA_RT'].includes(session.role) && (
              <Link
                href="/dashboard/notifikasi"
                onClick={() => setIsOpen(false)}
                style={{
                  color: '#2563eb',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Log Notifikasi Pengurus &rarr;
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Detail Modal Dialog */}
      {selectedNotification && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(15, 23, 42, 0.6)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)',
            padding: '16px',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              width: '100%',
              maxWidth: '490px',
              boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.2)',
              maxHeight: '88vh',
              overflowY: 'auto',
              position: 'relative',
              border: '1px solid #cbd5e1',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '16px 20px',
                backgroundColor: '#0f172a',
                color: '#ffffff',
                borderTopLeftRadius: '14px',
                borderTopRightRadius: '14px',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    flexShrink: 0,
                  }}
                >
                  {selectedNotification.type === 'PENGUMUMAN' ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m3 11 18-5v12L3 14v-3z" />
                      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
                    </svg>
                  ) : selectedNotification.type === 'PENGAJUAN_SURAT' ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" x2="8" y1="13" y2="13" />
                      <line x1="16" x2="8" y1="17" y2="17" />
                    </svg>
                  ) : selectedNotification.type === 'PENGADUAN' ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" x2="12" y1="8" y2="12" />
                      <line x1="12" x2="12.01" y1="16" y2="16" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4" />
                      <path d="M12 8h.01" />
                    </svg>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>
                    PELAYANAN DIGITAL RW • PEMBERITAHUAN
                  </div>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '2px 0 0 0', color: '#ffffff', lineHeight: 1.3 }}>
                    {selectedNotification.subject}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNotification(null)}
                aria-label="Tutup dialog"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: '#ffffff',
                  width: '26px',
                  height: '26px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Badge Status & Waktu */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  {selectedNotification.statusBadge && (
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: '4px',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        color: selectedNotification.statusBadge.color,
                        backgroundColor: selectedNotification.statusBadge.bgColor,
                        border: `1px solid ${selectedNotification.statusBadge.color}30`,
                      }}
                    >
                      {selectedNotification.statusBadge.label}
                    </span>
                  )}
                  {selectedNotification.requiresAction && (
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: '4px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        color: '#92400e',
                        backgroundColor: '#fef3c7',
                        border: '1px solid #fde68a',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#d97706' }} />
                      Perlu Tindakan
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  {selectedNotification.timeAgo}
                </span>
              </div>

              {/* Banner Penjelasan Jika Memerlukan Tindakan / Persetujuan */}
              {selectedNotification.requiresAction && (
                <div
                  style={{
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    color: '#92400e',
                    lineHeight: 1.45,
                  }}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.8rem', marginBottom: '2px', color: '#78350f' }}>
                      Memerlukan Tindakan / Persetujuan
                    </div>
                    <div style={{ fontSize: '0.76rem' }}>
                      Notifikasi ini tetap tersimpan di status &quot;Belum Dibaca&quot; sampai Anda memproses berkas ini melalui tombol aksi di bawah.
                    </div>
                  </div>
                </div>
              )}

              {/* Penerima */}
              <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                Kepada Yth. <strong style={{ color: '#0f172a' }}>{selectedNotification.recipientName}</strong>
              </div>

              {/* Ringkasan Pesan */}
              <div
                style={{
                  fontSize: '0.84rem',
                  lineHeight: 1.55,
                  color: '#1e293b',
                  backgroundColor: '#f8fafc',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  whiteSpace: 'pre-line',
                }}
              >
                {selectedNotification.content}
              </div>

              {/* Rincian Data Dinamis (Hanya field yang valid) */}
              {selectedNotification.details && selectedNotification.details.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                    Rincian Informasi
                  </div>
                  <table
                    width="100%"
                    cellPadding={0}
                    cellSpacing={0}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      borderCollapse: 'separate',
                      overflow: 'hidden',
                      fontSize: '0.8rem',
                    }}
                  >
                    <tbody>
                      {selectedNotification.details.map((d, idx) => (
                        <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                          <td style={{ padding: '8px 12px', color: '#64748b', fontWeight: 600, width: '40%', borderBottom: '1px solid #e2e8f0' }}>
                            {d.label}
                          </td>
                          <td style={{ padding: '8px 12px', color: '#0f172a', fontWeight: 500, borderBottom: '1px solid #e2e8f0' }}>
                            {d.value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Catatan Petugas (Hanya jika ada) */}
              {selectedNotification.officerNotes && (
                <div style={{ backgroundColor: '#eff6ff', borderLeft: '3px solid #2563eb', padding: '10px 14px', borderRadius: '4px' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
                    Catatan Petugas
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#1e3a8a', lineHeight: 1.45 }}>
                    {selectedNotification.officerNotes}
                  </div>
                </div>
              )}

              {/* Langkah Selanjutnya (Hanya jika ada) */}
              {selectedNotification.nextInstructions && (
                <div style={{ backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', padding: '10px 14px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '3px' }}>
                    Langkah Selanjutnya
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#334155', lineHeight: 1.45 }}>
                    {selectedNotification.nextInstructions}
                  </div>
                </div>
              )}

              {/* Unduhan Dokumen Resmi (Hanya jika benar-benar tersedia) */}
              {selectedNotification.downloadUrl && (
                <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#166534' }}>
                      Dokumen Resmi Siap Diunduh
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#15803d' }}>
                      Dilengkapi tanda tangan digital &amp; QR Code keabsahan
                    </div>
                  </div>
                  <a
                    href={selectedNotification.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '6px 14px',
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      borderRadius: '6px',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 1px 2px rgba(22, 163, 74, 0.2)',
                    }}
                  >
                    {selectedNotification.downloadLabel || 'Unduh Berkas PDF'} &darr;
                  </a>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedNotification(null)}
                  style={{
                    padding: '7px 16px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Tutup
                </button>
                {selectedNotification.actionUrl && (
                  <Link
                    href={selectedNotification.actionUrl}
                    onClick={() => {
                      if (!selectedNotification.isRead) {
                        handleMarkAsRead(selectedNotification.id);
                      }
                      setSelectedNotification(null);
                      setIsOpen(false);
                    }}
                    style={{
                      padding: '7px 18px',
                      borderRadius: '6px',
                      background: selectedNotification.requiresAction ? '#b45309' : '#0f172a',
                      color: '#ffffff',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    }}
                  >
                    {selectedNotification.actionLabel || (selectedNotification.requiresAction ? 'Tindak Lanjuti Sekarang' : 'Lihat Detail')} &rarr;
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
