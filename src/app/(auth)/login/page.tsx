'use client';

import { useActionState } from 'react';
import { loginAction } from './actions';
import Link from 'next/link';

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <div className="card glass" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', textAlign: 'center' }}>
          Login Sistem
        </h2>

        {state?.error && (
          <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {state.error}
          </div>
        )}

        <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label htmlFor="username" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Username</label>
            <input
              type="text"
              id="username"
              name="username"
              required
              style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--foreground)' }}
            />
          </div>
          <div>
            <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Password</label>
            <input
              type="password"
              id="password"
              name="password"
              required
              style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--foreground)' }}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={isPending} style={{ marginTop: '1rem' }}>
            {isPending ? 'Logging in...' : 'Masuk'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            Belum memiliki akun warga?{' '}
            <Link href="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>
              Daftar Sekarang &rarr;
            </Link>
          </div>
          <Link href="/" style={{ color: 'var(--secondary-foreground)', fontSize: '0.8125rem' }}>&larr; Kembali ke Beranda</Link>
        </div>

        <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: 'var(--secondary)', borderRadius: 'var(--radius-md)', fontSize: '0.75rem' }}>
          <strong>Akun Demo:</strong><br />
          superadmin | adminrw | ketuarw | ketuart | warga1<br />
          <em>Password: password123</em>
        </div>
      </div>
    </div>
  );
}