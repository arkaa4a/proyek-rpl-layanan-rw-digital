'use client';

import React from 'react';

type ConfirmationDialogProps = {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  error?: string | null;
  itemName?: string | null;
};

export default function ConfirmationDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Ya, Lanjutkan',
  cancelText = 'Batal',
  isDestructive = false,
  isLoading = false,
  error = null,
  itemName = null,
}: ConfirmationDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: 'var(--surface)',
          borderRadius: '1.25rem',
          padding: '1.75rem',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tombol Tutup X */}
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          aria-label="Tutup dialog"
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'rgba(0,0,0,0.04)',
            border: 'none',
            color: 'var(--secondary-foreground)',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            padding: '0.25rem',
            borderRadius: '0.375rem',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Header dengan Icon Badge */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              backgroundColor: isDestructive ? '#fee2e2' : '#eff6ff',
              color: isDestructive ? '#dc2626' : '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {isDestructive ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                <line x1="10" x2="10" y1="11" y2="17" />
                <line x1="14" x2="14" y1="11" y2="17" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            )}
          </div>

          <div style={{ paddingRight: '1.5rem' }}>
            <h3
              style={{
                fontSize: '1.2rem',
                fontWeight: 700,
                color: 'var(--foreground)',
                margin: '0 0 0.35rem 0',
                lineHeight: 1.3,
              }}
            >
              {title}
            </h3>
            <div
              style={{
                fontSize: '0.875rem',
                color: 'var(--secondary-foreground)',
                lineHeight: 1.55,
              }}
            >
              {message}
            </div>
          </div>
        </div>

        {/* Item Card Preview (Jika ada) */}
        {itemName && (
          <div
            style={{
              backgroundColor: 'var(--secondary)',
              borderLeft: isDestructive ? '4px solid #dc2626' : '4px solid #1e40af',
              padding: '0.85rem 1rem',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--foreground)',
              wordBreak: 'break-word',
            }}
          >
            &ldquo;{itemName}&rdquo;
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div
            style={{
              backgroundColor: '#fee2e2',
              border: '1px solid #fecaca',
              padding: '0.75rem 1rem',
              borderRadius: '0.5rem',
              fontSize: '0.82rem',
              color: '#b91c1c',
              lineHeight: 1.45,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Footer Tombol Aksi */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="btn"
            style={{
              padding: '0.65rem 1.25rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              backgroundColor: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--foreground)',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              borderRadius: '0.65rem',
            }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="btn"
            style={{
              padding: '0.65rem 1.35rem',
              fontSize: '0.875rem',
              fontWeight: 700,
              backgroundColor: isDestructive ? '#dc2626' : 'var(--primary)',
              borderColor: isDestructive ? '#dc2626' : 'var(--primary)',
              color: '#ffffff',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.75 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              borderRadius: '0.65rem',
              boxShadow: isDestructive ? '0 2px 4px rgba(220, 38, 38, 0.25)' : '0 2px 4px rgba(30, 58, 138, 0.25)',
            }}
          >
            {isLoading ? (
              <>
                <span
                  style={{
                    display: 'inline-block',
                    width: '14px',
                    height: '14px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#ffffff',
                    borderRadius: '50%',
                    animation: 'spin 0.6s linear infinite',
                  }}
                />
                Memproses...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.97);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
