import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from '@/lib/session';

// Tentukan route mana saja yang protected (butuh login)
const protectedRoutes = ['/dashboard', '/pengajuan', '/manajemen-warga'];
const authRoutes = ['/login', '/register'];

// Definisi route khusus per role (contoh)
const roleRoutes = {
  '/dashboard/manajemen-akun': ['SUPER_ADMIN'],
  '/dashboard/konfigurasi': ['SUPER_ADMIN'],
  '/dashboard/admin': ['SUPER_ADMIN'],
  '/dashboard/rw': ['KETUA_RW', 'ADMIN_RW'],
  '/dashboard/rt': ['KETUA_RT'],
  '/dashboard/warga': ['WARGA'],
};

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  
  const isProtectedRoute = protectedRoutes.some((route) => path.startsWith(route));
  const isAuthRoute = authRoutes.includes(path);

  const cookie = req.cookies.get('session')?.value;
  const session = await decrypt(cookie);

  // Jika mencoba akses route Auth (login/register) dan sudah login -> redirect ke dashboard
  if (isAuthRoute && session?.id) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl));
  }

  // Jika akses protected route tapi belum login -> lempar ke login
  if (isProtectedRoute && !session?.id) {
    return NextResponse.redirect(new URL('/login', req.nextUrl));
  }

  // Cek otorisasi berdasarkan Role (RBAC)
  if (session?.role) {
    for (const [route, allowedRoles] of Object.entries(roleRoutes)) {
      if (path.startsWith(route) && !allowedRoles.includes(session.role as string)) {
        // Role tidak berhak mengakses halaman ini
        return NextResponse.redirect(new URL('/unauthorized', req.nextUrl));
      }
    }
    
    // Redirect dasar jika akses /dashboard
    if (path === '/dashboard') {
      if (session.role === 'SUPER_ADMIN') return NextResponse.redirect(new URL('/dashboard/admin', req.nextUrl));
      if (['KETUA_RW', 'ADMIN_RW'].includes(session.role as string)) return NextResponse.redirect(new URL('/dashboard/rw', req.nextUrl));
      if (session.role === 'KETUA_RT') return NextResponse.redirect(new URL('/dashboard/rt', req.nextUrl));
      if (session.role === 'WARGA') return NextResponse.redirect(new URL('/dashboard/warga', req.nextUrl));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
