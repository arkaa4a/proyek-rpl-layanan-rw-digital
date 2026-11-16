'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

import { usePathname } from 'next/navigation';

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null | undefined>(undefined);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const pathname = usePathname();
  
  const [input, setInput] = useState('');
  
  const { messages, setMessages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      credentials: 'include',
    }),
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput('');
  };
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const prevUserRef = useRef(currentUser);

  useEffect(() => {
    if (prevUserRef.current !== undefined && prevUserRef.current !== currentUser) {
      setMessages([]);
    }
    prevUserRef.current = currentUser;
  }, [currentUser, setMessages]);

  const checkAuthAndReset = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.id || null);
        setCurrentUserRole(data.role || null);
      } else if (res.status === 401) {
        setCurrentUser(null);
        setCurrentUserRole(null);
      }
    } catch (e) {
      console.error('Failed to check auth status', e);
    }
  };

  const openAssistant = () => {
    setIsOpen(true);
    checkAuthAndReset();
  };

  // Listen for custom event from other components
  useEffect(() => {
    document.addEventListener('open-ai-assistant', openAssistant);
    return () => document.removeEventListener('open-ai-assistant', openAssistant);
  }, []);

  // Check auth status on initial load and when pathname changes
  useEffect(() => {
    if (pathname === '/' || pathname === '/login' || pathname?.startsWith('/login/')) {
      return;
    }
    checkAuthAndReset();
  }, [pathname]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const quickQuestions = (() => {
    if (currentUserRole === 'SUPER_ADMIN') {
      return [
        "Statistik kependudukan",
        "Cek data akun",
        "Cari data warga",
        "Apa saja layanan yang tersedia?",
      ];
    }
    if (currentUserRole === 'ADMIN_RW' || currentUserRole === 'KETUA_RW') {
      return [
        "Statistik warga RW",
        "Pengajuan surat di RW",
        "Pengaduan di wilayah RW",
        "Apa saja layanan yang tersedia?",
      ];
    }
    if (currentUserRole === 'KETUA_RT') {
      return [
        "Statistik warga RT",
        "Daftar warga di RT saya",
        "Pengajuan surat di RT",
        "Apa saja layanan yang tersedia?",
      ];
    }
    return [
      "Apa saja layanan yang tersedia?",
      "Apa syarat surat domisili?",
      "Cek pengajuan saya",
      "Data keluarga saya",
    ];
  })();

  const handleQuickQuestion = (q: string) => {
    setInput(q);
    setTimeout(() => {
      const form = document.getElementById('ai-chat-form') as HTMLFormElement;
      if (form) form.requestSubmit();
    }, 50);
  };

  // Chatbot wajib SELALU ADA di seluruh area dashboard (/dashboard/...)
  const isDashboardRoute = Boolean(pathname?.startsWith('/dashboard'));

  // Pada rute pengumuman, chatbot aktif untuk pengguna yang sudah login (area pengumuman dashboard)
  const isPengumumanRoute = pathname === '/pengumuman' || pathname?.startsWith('/pengumuman/');
  const isPengumumanWithAuth = isPengumumanRoute && Boolean(currentUser);

  // Sembunyikan chatbot HANYA di halaman publik (pengumuman publik belum login, landing page, login)
  if (!isDashboardRoute && !isPengumumanWithAuth) {
    return null;
  }

  return (
    <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999 }}>
      {/* Tombol Floating */}
      {!isOpen && (
        <button
          onClick={openAssistant}
          style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 10px 25px rgba(37, 99, 235, 0.4)', cursor: 'pointer', border: 'none',
            transition: 'transform 0.2s ease-in-out',
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </button>
      )}

      {/* Jendela Chat */}
      {isOpen && (
        <div style={{
          width: 'calc(100vw - 4rem)', maxWidth: '400px', height: '600px', maxHeight: 'calc(100vh - 6rem)',
          background: '#ffffff', borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column',
          overflow: 'hidden', border: '1px solid #e5e7eb'
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #2563eb, #1e40af)', color: 'white', padding: '1.25rem 1rem',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 'bold' }}>AI Assistant RW</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#dbeafe' }}>Siap membantu pelayanan RW</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMessages([])}
                  title="Mulai percakapan baru / Bersihkan chat"
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    padding: '6px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.2s',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                  aria-label="Bersihkan Chat"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '4px', opacity: 0.8 }}
                onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                onMouseOut={(e) => e.currentTarget.style.opacity = '0.8'}
                aria-label="Tutup"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: '#f9fafb' }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#4b5563', marginBottom: '1rem' }}>Halo! Saya asisten AI. Ada yang bisa dibantu?</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
                  {quickQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuickQuestion(q)}
                      style={{
                        padding: '0.375rem 0.75rem', fontSize: '0.75rem',
                        background: '#ffffff', border: '1px solid #e5e7eb',
                        borderRadius: '9999px', cursor: 'pointer', color: '#374151',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)', transition: 'all 0.15s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = '#eff6ff';
                        e.currentTarget.style.color = '#2563eb';
                        e.currentTarget.style.borderColor = '#bfdbfe';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = '#ffffff';
                        e.currentTarget.style.color = '#374151';
                        e.currentTarget.style.borderColor = '#e5e7eb';
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m: any) => {
                const hasText = m.role === 'user'
                  ? Boolean(m.parts?.some((p: any) => p.type === 'text' && p.text?.trim()) || m.content)
                  : Boolean(m.parts?.some((p: any) => p.type === 'text' && p.text?.trim()));

                if (!hasText) return null;

                return (
                  <div key={m.id} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '85%', padding: '0.625rem 1rem', fontSize: '0.875rem', lineHeight: '1.4',
                      background: m.role === 'user' ? '#2563eb' : '#ffffff',
                      color: m.role === 'user' ? '#ffffff' : '#1f2937',
                      borderRadius: '16px',
                      borderTopRightRadius: m.role === 'user' ? '4px' : '16px',
                      borderTopLeftRadius: m.role === 'user' ? '16px' : '4px',
                      border: m.role === 'user' ? 'none' : '1px solid #f3f4f6',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}>
                      {m.role === 'user' ? (
                        m.parts?.length ? m.parts.map((part: any, idx: number) => 
                          part.type === 'text' ? <React.Fragment key={idx}>{part.text}</React.Fragment> : null
                        ) : <React.Fragment>{String(m.content)}</React.Fragment>
                      ) : (
                        m.parts?.map((part: any, idx: number) => {
                          if (part.type === 'text') {
                            return (
                              <div key={idx} className="prose prose-sm max-w-none">
                                <ReactMarkdown
                                   components={{
                                     a: ({ node, ...props }) => (
                                       <a 
                                         {...props} 
                                         style={{ display: 'inline-block', padding: '0.375rem 0.75rem', marginTop: '0.5rem', marginRight: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: 'white', background: '#2563eb', borderRadius: '0.375rem', textDecoration: 'none' }}
                                         target={props.href?.startsWith('/') ? '_self' : '_blank'}
                                       />
                                     ),
                                     p: ({ node, ...props }) => <p style={{ margin: '0.25rem 0' }} {...props} />,
                                     strong: ({ node, ...props }) => <strong style={{ color: '#111827' }} {...props} />
                                   }}
                                >
                                  {part.text}
                                </ReactMarkdown>
                              </div>
                            );
                          }
                          return null;
                        })
                      )}
                    </div>
                  </div>
                );
              })
            )}
            
            {/* Processing Indicator */}
            {isLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ 
                  background: '#f0fdf4', 
                  color: '#166534', 
                  fontSize: '0.75rem', 
                  padding: '0.42rem 0.85rem', 
                  borderRadius: '16px', 
                  borderTopLeftRadius: '4px', 
                  border: '1px solid #bbf7d0', 
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)' 
                }}>
                  <span style={{ fontWeight: 500 }}>Sedang memproses...</span>
                </div>
              </div>
            )}

            {error && (() => {
              let cleanErrorMessage = error.message;
              try {
                const parsed = JSON.parse(error.message);
                if (parsed.error) cleanErrorMessage = parsed.error;
              } catch {}

              return (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem' }}>
                   <div style={{ padding: '0.75rem 1rem', borderRadius: '12px', background: '#fef2f2', color: '#dc2626', fontSize: '0.75rem', textAlign: 'center', border: '1px solid #fee2e2', width: '100%' }}>
                     {error.message.includes('401') || error.message.includes('Unauthorized') 
                       ? 'Sesi Anda telah berakhir atau Anda belum login. Silakan login kembali.' 
                       : error.message.includes('429') || error.message.includes('Terlalu banyak permintaan')
                         ? 'Terlalu banyak permintaan. Silakan tunggu beberapa saat.'
                         : error.message.includes('karakter')
                           ? 'Teks pesan melebihi batas maksimal karakter.'
                           : error.message.includes('413')
                             ? 'Ukuran pesan terlalu besar.'
                             : `Terjadi kendala: ${cleanErrorMessage}`}
                   </div>
                </div>
              );
            })()}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form id="ai-chat-form" onSubmit={handleSubmit} style={{ padding: '1rem', background: '#ffffff', borderTop: '1px solid #f3f4f6', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                maxLength={5000}
                value={input}
                onChange={handleInputChange}
                placeholder="Ketik pertanyaan Anda..."
                style={{
                  flex: 1, padding: '0.625rem 1rem', borderRadius: '9999px',
                  border: '1px solid #d1d5db', background: '#f9fafb', color: '#1f2937',
                  fontSize: '0.875rem', outline: 'none'
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.backgroundColor = '#ffffff'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.backgroundColor = '#f9fafb'; }}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                style={{
                  width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                  background: (isLoading || !input.trim()) ? '#e5e7eb' : '#2563eb',
                  color: (isLoading || !input.trim()) ? '#9ca3af' : 'white',
                  border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: (isLoading || !input.trim()) ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '2px' }}>
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

