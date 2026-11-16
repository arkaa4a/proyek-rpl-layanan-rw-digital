'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/app/(auth)/login/actions';
import NotificationBell from './NotificationBell';

interface NavbarClientProps {
  session: {
    id: string;
    username: string;
    role: string;
    wargaId?: string | null;
  } | null;
}

export default function NavbarClient({ session }: NavbarClientProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // State & Ref untuk Horizontal Scroll Navbar
  const navScrollRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragDistanceRef = useRef(0);
  const startXRef = useRef(0);
  const scrollLeftStartRef = useRef(0);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // ==========================================
  // API Fallback / Anti-Crash Handling
  // ==========================================
  const [configApiError, setConfigApiError] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        window.location.href = '/login';
        return;
      }
    } catch (err) {
      console.warn('NavbarClient: Kendala logout API via fetch (graceful fallback):', err);
    }

    try {
      await logoutAction();
    } catch (err) {
      console.warn('NavbarClient: Fallback logoutAction kendala:', err);
      window.location.href = '/login';
    }
  };

  useEffect(() => {
    // Hanya periksa status jika sesi aktif dan role SUPER_ADMIN
    if (session?.role !== 'SUPER_ADMIN') return;

    let isMounted = true;
    const checkConfigStatus = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const res = await fetch('/api/auth/me', {
          signal: controller.signal,
          credentials: 'include',
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          // Tangkap error status (401, 403, 500) ke dalam state tanpa memicu crash
          if (isMounted) setConfigApiError(true);
          return;
        }

        if (isMounted) setConfigApiError(false);
      } catch (err) {
        // Tangkap unhandled exception (network error, timeout, dsb.) dengan graceful fallback
        console.warn('NavbarClient: Kendala koneksi status konfigurasi (graceful fallback):', err);
        if (isMounted) setConfigApiError(true);
      }
    };

    checkConfigStatus();

    return () => {
      isMounted = false;
    };
  }, [session?.role]);

  const isWarga = session?.role === 'WARGA';

  // Helper untuk menentukan status active
  const isActive = (path: string) => {
    if (path === '/dashboard/warga') {
      return pathname === '/dashboard/warga';
    }
    if (path === '/dashboard/rt') {
      return pathname.startsWith('/dashboard/rt');
    }
    if (path === '/dashboard/rw') {
      return pathname.startsWith('/dashboard/rw');
    }
    if (path === '/dashboard/admin') {
      return pathname.startsWith('/dashboard/admin');
    }
    if (path === '/dashboard/pengaduan-warga') {
      return pathname.startsWith('/dashboard/pengaduan-warga');
    }
    if (path === '/dashboard/manajemen-akun') {
      return pathname.startsWith('/dashboard/manajemen-akun');
    }
    if (path === '/dashboard/manajemen-warga') {
      return pathname.startsWith('/dashboard/manajemen-warga');
    }
    if (path === '/dashboard/layanan') {
      return pathname.startsWith('/dashboard/layanan');
    }
    if (path === '/dashboard/kartu-keluarga') {
      return pathname.startsWith('/dashboard/kartu-keluarga');
    }
    if (path === '/dashboard/pengajuan') {
      return pathname.startsWith('/dashboard/pengajuan');
    }
    if (path === '/dashboard/pengaduan') {
      return pathname.startsWith('/dashboard/pengaduan');
    }
    if (path === '/dashboard/profil') {
      return pathname === '/dashboard/profil';
    }
    if (path === '/dashboard/wilayah') {
      return pathname.startsWith('/dashboard/wilayah');
    }
    if (path === '/dashboard/notifikasi') {
      return pathname.startsWith('/dashboard/notifikasi');
    }
    if (path === '/dashboard/konfigurasi') {
      return pathname.startsWith('/dashboard/konfigurasi');
    }
    if (path === '/pengumuman') {
      return pathname.startsWith('/pengumuman');
    }
    return pathname === path;
  };

  const getPengurusDashboard = () => {
    if (!session) return null;
    if (session.role === 'KETUA_RT') return { href: '/dashboard/rt', label: 'Dashboard RT' };
    if (session.role === 'KETUA_RW') return { href: '/dashboard/rw', label: 'Dashboard RW' };
    if (session.role === 'ADMIN_RW') return { href: '/dashboard/rw', label: 'Dashboard RW' };
    if (session.role === 'SUPER_ADMIN') return { href: '/dashboard/admin', label: 'Dashboard' };
    return null;
  };
  const pengurusDashboard = getPengurusDashboard();

  // Cek apakah navbar bisa di-scroll ke kiri atau kanan
  const checkScroll = () => {
    if (!navScrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = navScrollRef.current;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
  };

  useEffect(() => {
    checkScroll();
    const timer = setTimeout(checkScroll, 150);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && navScrollRef.current) {
      observer = new ResizeObserver(() => {
        checkScroll();
      });
      observer.observe(navScrollRef.current);
    }

    window.addEventListener('resize', checkScroll);
    return () => {
      clearTimeout(timer);
      if (observer) observer.disconnect();
      window.removeEventListener('resize', checkScroll);
    };
  }, [pathname]);

  // Otomatis geser menu aktif ke tengah tampilan
  useEffect(() => {
    if (!navScrollRef.current) return;
    const activeEl = navScrollRef.current.querySelector('[data-active="true"]') as HTMLElement;
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
    const timer = setTimeout(checkScroll, 200);
    return () => clearTimeout(timer);
  }, [pathname]);

  // Handler tombol panah kiri / kanan
  const handleScrollNav = (direction: 'left' | 'right') => {
    if (!navScrollRef.current) return;
    const scrollAmount = 200;
    navScrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
    setTimeout(checkScroll, 220);
  };

  // Handler mouse wheel horizontal
  const handleWheel = (e: React.WheelEvent) => {
    if (!navScrollRef.current) return;
    if (navScrollRef.current.scrollWidth > navScrollRef.current.clientWidth) {
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (delta !== 0) {
        navScrollRef.current.scrollLeft += delta;
        checkScroll();
      }
    }
  };

  // Handler drag-to-scroll dengan mouse
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!navScrollRef.current) return;
    isDraggingRef.current = true;
    dragDistanceRef.current = 0;
    startXRef.current = e.pageX;
    scrollLeftStartRef.current = navScrollRef.current.scrollLeft;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !navScrollRef.current) return;
    const delta = e.pageX - startXRef.current;
    dragDistanceRef.current = Math.abs(delta);
    if (Math.abs(delta) > 3) {
      e.preventDefault();
      navScrollRef.current.scrollLeft = scrollLeftStartRef.current - delta;
      checkScroll();
    }
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
    setIsDragging(false);
  };

  const handleClickCapture = (e: React.MouseEvent) => {
    if (dragDistanceRef.current > 6) {
      e.preventDefault();
      e.stopPropagation();
      dragDistanceRef.current = 0;
    }
  };

  const desktopLinkStyle = (path: string) => {
    const active = isActive(path);
    return {
      fontSize: '0.825rem',
      fontWeight: active ? 600 : 500,
      padding: '0.38rem 0.85rem',
      borderRadius: '9999px',
      transition: 'all 0.15s ease',
      textDecoration: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      whiteSpace: 'nowrap' as const,
      flexShrink: 0,
      userSelect: 'none' as const,
      color: active ? '#ffffff' : 'var(--foreground)',
      backgroundColor: active ? 'var(--primary)' : 'transparent',
      boxShadow: active ? '0 2px 6px rgba(37, 99, 235, 0.3)' : 'none',
    };
  };

  const mobileLinkStyle = (path: string) => {
    const active = isActive(path);
    return {
      fontSize: '0.95rem',
      fontWeight: active ? 700 : 500,
      color: active ? 'var(--primary)' : 'var(--foreground)',
      backgroundColor: active ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
      padding: '0.65rem 0.95rem',
      borderRadius: '8px',
      textDecoration: 'none',
      display: 'block',
      transition: 'background 0.15s ease',
    };
  };

  const isOverflowing = canScrollLeft || canScrollRight;

  return (
    <nav style={{ position: 'sticky', top: 0, zIndex: 50, backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
      <div style={{ maxWidth: '1440px', width: '100%', margin: '0 auto', padding: '0 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '4.25rem', gap: '1rem', boxSizing: 'border-box' }}>
        
        {/* Brand / Logo */}
        <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, marginRight: '0.5rem' }}>
          <Link href="/" style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
            Layanan RW Digital
          </Link>
        </div>

        {/* Desktop Navigation Menu Track: TENGAH saat login (bagian dalem), KANAN saat guest (halaman depan) */}
        <div 
          className="desktop-menu-track" 
          style={{ 
            flex: 1, 
            minWidth: 0, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: session ? 'center' : 'flex-end',
            padding: '0 0.5rem'
          }}
        >
          {/* Constrained Island Capsule */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              maxWidth: 'clamp(320px, 44vw, 560px)',
              width: 'fit-content',
              backgroundColor: 'rgba(148, 163, 184, 0.12)',
              borderRadius: '9999px',
              padding: '3px 4px',
              border: '1px solid var(--border)',
              boxSizing: 'border-box',
            }}
          >
            {/* Tombol Geser Kiri (Slide Left) */}
            {isOverflowing && (
              <button
                type="button"
                onClick={() => handleScrollNav('left')}
                disabled={!canScrollLeft}
                aria-label="Geser Menu ke Kiri"
                title="Geser menu ke kiri"
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  backgroundColor: canScrollLeft ? 'var(--surface)' : 'transparent',
                  border: canScrollLeft ? '1px solid var(--border)' : '1px solid transparent',
                  boxShadow: canScrollLeft ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: canScrollLeft ? 'pointer' : 'default',
                  color: canScrollLeft ? 'var(--primary)' : 'var(--border)',
                  opacity: canScrollLeft ? 1 : 0.3,
                  pointerEvents: canScrollLeft ? 'auto' : 'none',
                  flexShrink: 0,
                  marginRight: '2px',
                  transition: 'all 0.15s ease',
                  zIndex: 2,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
            )}

            {/* Container Menu yang Bisa Digeser / Di-scroll Kiri-Kanan */}
            <div
              ref={navScrollRef}
              onScroll={checkScroll}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUpOrLeave}
              onMouseLeave={handleMouseUpOrLeave}
              onClickCapture={handleClickCapture}
              className="nav-scroll-container"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                overflowX: 'auto',
                scrollBehavior: 'smooth',
                padding: '0 2px',
                userSelect: 'none',
                cursor: isDragging ? 'grabbing' : 'grab',
                flex: 1,
                minWidth: 0,
              }}
            >
              {isWarga ? (
                <>
                  <Link href="/dashboard/warga" className="nav-pill-item" style={desktopLinkStyle('/dashboard/warga')} data-active={isActive('/dashboard/warga')}>
                    Dashboard
                  </Link>
                  <Link href="/pengumuman" className="nav-pill-item" style={desktopLinkStyle('/pengumuman')} data-active={isActive('/pengumuman')}>
                    Pengumuman
                  </Link>
                  <Link href="/dashboard/kartu-keluarga" className="nav-pill-item" style={desktopLinkStyle('/dashboard/kartu-keluarga')} data-active={isActive('/dashboard/kartu-keluarga')}>
                    Kartu Keluarga
                  </Link>
                  <Link href="/dashboard/layanan" className="nav-pill-item" style={desktopLinkStyle('/dashboard/layanan')} data-active={isActive('/dashboard/layanan')}>
                    Ajukan Surat
                  </Link>
                  <Link href="/dashboard/pengajuan" className="nav-pill-item" style={desktopLinkStyle('/dashboard/pengajuan')} data-active={isActive('/dashboard/pengajuan')}>
                    Status Pengajuan
                  </Link>
                  <Link href="/dashboard/pengaduan" className="nav-pill-item" style={desktopLinkStyle('/dashboard/pengaduan')} data-active={isActive('/dashboard/pengaduan')}>
                    Pengaduan
                  </Link>
                </>
              ) : session ? (
                <>
                  {pengurusDashboard && (
                    <Link href={pengurusDashboard.href} className="nav-pill-item" style={desktopLinkStyle(pengurusDashboard.href)} data-active={isActive(pengurusDashboard.href)}>
                      {pengurusDashboard.label}
                    </Link>
                  )}

                  <Link href="/dashboard/pengaduan-warga" className="nav-pill-item" style={desktopLinkStyle('/dashboard/pengaduan-warga')} data-active={isActive('/dashboard/pengaduan-warga')}>
                    Pengaduan
                  </Link>

                  <Link href="/dashboard/manajemen-warga" className="nav-pill-item" style={desktopLinkStyle('/dashboard/manajemen-warga')} data-active={isActive('/dashboard/manajemen-warga')}>
                    Data Warga
                  </Link>

                  <Link href="/dashboard/layanan" className="nav-pill-item" style={desktopLinkStyle('/dashboard/layanan')} data-active={isActive('/dashboard/layanan')}>
                    Layanan
                  </Link>

                  <Link href="/pengumuman" className="nav-pill-item" style={desktopLinkStyle('/pengumuman')} data-active={isActive('/pengumuman')}>
                    Pengumuman
                  </Link>

                  {session.role === 'SUPER_ADMIN' && (
                    <>
                      <Link 
                        href="/dashboard/konfigurasi" 
                        className="nav-pill-item" 
                        style={{
                          ...desktopLinkStyle('/dashboard/konfigurasi'),
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.375rem',
                        }} 
                        data-active={isActive('/dashboard/konfigurasi')}
                      >
                        <span>Konfigurasi</span>
                        {/* Graceful Fallback Indicator: Dot penanda jika ada potensi kendala API */}
                        {configApiError && (
                          <span
                            title="Terdapat potensi kendala koneksi konfigurasi"
                            style={{
                              display: 'inline-block',
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: '#f59e0b',
                            }}
                          />
                        )}
                      </Link>

                      <Link 
                        href="/dashboard/manajemen-akun" 
                        className="nav-pill-item" 
                        style={desktopLinkStyle('/dashboard/manajemen-akun')} 
                        data-active={isActive('/dashboard/manajemen-akun')}
                      >
                        Manajemen Akun
                      </Link>

                      <Link 
                        href="/dashboard/admin/log" 
                        className="nav-pill-item" 
                        style={desktopLinkStyle('/dashboard/admin/log')} 
                        data-active={isActive('/dashboard/admin/log')}
                      >
                        Log Aktivitas
                      </Link>
                    </>
                  )}
                </>
              ) : (
                <>
                  <Link href="/pengumuman" className="nav-pill-item" style={desktopLinkStyle('/pengumuman')} data-active={isActive('/pengumuman')}>
                    Pengumuman
                  </Link>
                </>
              )}
            </div>

            {/* Tombol Geser Kanan (Slide Right) */}
            {isOverflowing && (
              <button
                type="button"
                onClick={() => handleScrollNav('right')}
                disabled={!canScrollRight}
                aria-label="Geser Menu ke Kanan"
                title="Geser menu ke kanan"
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  backgroundColor: canScrollRight ? 'var(--surface)' : 'transparent',
                  border: canScrollRight ? '1px solid var(--border)' : '1px solid transparent',
                  boxShadow: canScrollRight ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: canScrollRight ? 'pointer' : 'default',
                  color: canScrollRight ? 'var(--primary)' : 'var(--border)',
                  opacity: canScrollRight ? 1 : 0.3,
                  pointerEvents: canScrollRight ? 'auto' : 'none',
                  flexShrink: 0,
                  marginLeft: '2px',
                  transition: 'all 0.15s ease',
                  zIndex: 2,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            )}
          </div>
        </div>

          {/* Right: User Auth Section (Positioned right next to the menu track) */}
          <div className="desktop-auth-section" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
            {session ? (
              <>
                <NotificationBell session={session} />
                <Link href="/dashboard/profil" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '0.875rem'
                  }}>
                    {session.username.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{session.username}</span>
                </Link>
                <form onSubmit={handleLogout} action="/api/auth/logout" method="POST">
                  <button 
                    type="submit" 
                    disabled={isLoggingOut}
                    className="btn" 
                    style={{ 
                      padding: '0.4rem 0.8rem', 
                      fontSize: '0.875rem', 
                      backgroundColor: 'var(--error)', 
                      color: 'white',
                      opacity: isLoggingOut ? 0.7 : 1,
                      cursor: isLoggingOut ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isLoggingOut ? 'Keluar...' : 'Logout'}
                  </button>
                </form>
              </>
            ) : (
              <Link href="/login" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                Masuk
              </Link>
            )}
          </div>

        {/* Mobile Actions: Notification Bell & Hamburger */}
        <div className="mobile-actions" style={{ display: 'none', alignItems: 'center', gap: '0.5rem' }}>
          {session && <NotificationBell session={session} />}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '0.5rem',
              color: 'inherit',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {mobileMenuOpen ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            )}
          </button>
        </div>

      </div>

      {/* Mobile Drawer / Dropdown Menu */}
      {mobileMenuOpen && (
        <div 
          className="mobile-drawer" 
          style={{
            backgroundColor: 'var(--surface)',
            borderTop: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)',
            padding: '1rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          {isWarga ? (
            <>
              <Link href="/dashboard/warga" onClick={() => setMobileMenuOpen(false)} style={mobileLinkStyle('/dashboard/warga')}>
                Dashboard
              </Link>
              <Link href="/pengumuman" onClick={() => setMobileMenuOpen(false)} style={mobileLinkStyle('/pengumuman')}>
                Pengumuman
              </Link>
              <Link href="/dashboard/kartu-keluarga" onClick={() => setMobileMenuOpen(false)} style={mobileLinkStyle('/dashboard/kartu-keluarga')}>
                Kartu Keluarga
              </Link>
              <Link href="/dashboard/layanan" onClick={() => setMobileMenuOpen(false)} style={mobileLinkStyle('/dashboard/layanan')}>
                Ajukan Surat
              </Link>
              <Link href="/dashboard/pengajuan" onClick={() => setMobileMenuOpen(false)} style={mobileLinkStyle('/dashboard/pengajuan')}>
                Status Pengajuan
              </Link>
              <Link href="/dashboard/pengaduan" onClick={() => setMobileMenuOpen(false)} style={mobileLinkStyle('/dashboard/pengaduan')}>
                Pengaduan
              </Link>
            </>
          ) : session ? (
            <>
              {pengurusDashboard && (
                <Link href={pengurusDashboard.href} onClick={() => setMobileMenuOpen(false)} style={mobileLinkStyle(pengurusDashboard.href)}>
                  {pengurusDashboard.label}
                </Link>
              )}

              <Link href="/dashboard/pengaduan-warga" onClick={() => setMobileMenuOpen(false)} style={mobileLinkStyle('/dashboard/pengaduan-warga')}>
                Pengaduan
              </Link>

              <Link href="/dashboard/manajemen-warga" onClick={() => setMobileMenuOpen(false)} style={mobileLinkStyle('/dashboard/manajemen-warga')}>
                Data Warga
              </Link>

              <Link href="/dashboard/layanan" onClick={() => setMobileMenuOpen(false)} style={mobileLinkStyle('/dashboard/layanan')}>
                Layanan
              </Link>

              <Link href="/pengumuman" onClick={() => setMobileMenuOpen(false)} style={mobileLinkStyle('/pengumuman')}>
                Pengumuman
              </Link>

              {session.role === 'SUPER_ADMIN' && (
                <>
                  <Link 
                    href="/dashboard/konfigurasi" 
                    onClick={() => setMobileMenuOpen(false)} 
                    style={{
                      ...mobileLinkStyle('/dashboard/konfigurasi'),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>Konfigurasi Sistem</span>
                    {/* Graceful Fallback Indicator pada Mobile */}
                    {configApiError && (
                      <span
                        title="Terdapat kendala koneksi konfigurasi"
                        style={{
                          fontSize: '0.7rem',
                          padding: '0.1rem 0.4rem',
                          borderRadius: '9999px',
                          backgroundColor: '#fef3c7',
                          color: '#b45309',
                          fontWeight: 500,
                        }}
                      >
                        Cek Koneksi
                      </span>
                    )}
                  </Link>

                  <Link 
                    href="/dashboard/manajemen-akun" 
                    onClick={() => setMobileMenuOpen(false)} 
                    style={mobileLinkStyle('/dashboard/manajemen-akun')}
                  >
                    Manajemen Akun
                  </Link>

                  <Link 
                    href="/dashboard/admin/log" 
                    onClick={() => setMobileMenuOpen(false)} 
                    style={mobileLinkStyle('/dashboard/admin/log')}
                  >
                    Log Aktivitas
                  </Link>
                </>
              )}
            </>
          ) : (
            <>
              <Link href="/pengumuman" onClick={() => setMobileMenuOpen(false)} style={mobileLinkStyle('/pengumuman')}>
                Pengumuman
              </Link>
            </>
          )}

          {session ? (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Link href="/dashboard/profil" onClick={() => setMobileMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: 'inherit' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '0.875rem'
                }}>
                  {session.username.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{session.username}</span>
              </Link>
              <form onSubmit={handleLogout} action="/api/auth/logout" method="POST">
                <button 
                  type="submit" 
                  disabled={isLoggingOut}
                  className="btn" 
                  style={{ 
                    padding: '0.4rem 0.8rem', 
                    fontSize: '0.875rem', 
                    backgroundColor: 'var(--error)', 
                    color: 'white',
                    opacity: isLoggingOut ? 0.7 : 1,
                    cursor: isLoggingOut ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isLoggingOut ? 'Keluar...' : 'Logout'}
                </button>
              </form>
            </div>
          ) : (
            <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="btn btn-primary" style={{ textAlign: 'center', textDecoration: 'none' }}>
              Masuk
            </Link>
          )}
        </div>
      )}

      {/* Embedded CSS for responsive toggle and custom scroll hiding */}
      <style jsx>{`
        .nav-scroll-container::-webkit-scrollbar {
          display: none;
        }
        .nav-scroll-container {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .nav-pill-item:hover:not([data-active="true"]) {
          background-color: rgba(255, 255, 255, 0.85) !important;
          color: var(--primary) !important;
        }

        @media (prefers-color-scheme: dark) {
          .nav-pill-item:hover:not([data-active="true"]) {
            background-color: rgba(255, 255, 255, 0.12) !important;
            color: #ffffff !important;
          }
        }

        @media (max-width: 1080px) {
          .desktop-right-group,
          .desktop-menu-track,
          .desktop-auth-section {
            display: none !important;
          }
          .mobile-actions {
            display: flex !important;
          }
        }
      `}</style>
    </nav>
  );
}
