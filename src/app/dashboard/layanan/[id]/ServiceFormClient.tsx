'use client';

import React, { useState } from 'react';
import { createRequestAction } from '../actions';
import { useRouter } from 'next/navigation';

export default function ServiceFormClient({ service, userRole, wargaList }: { service: any, userRole: string, wargaList?: any[] }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<any>({});
  const [applicantId, setApplicantId] = useState('');

  const requirements = service.requirements ? JSON.parse(service.requirements) : [];
  const formFields = service.formFields ? JSON.parse(service.formFields) : [];
  
  const isInclusiveMode = ['KETUA_RT', 'KETUA_RW', 'ADMIN_RW', 'SUPER_ADMIN'].includes(userRole);

  const handleNext = () => {
    if (isInclusiveMode && step === 2 && !applicantId) {
      setError('Pilih warga pemohon terlebih dahulu.');
      return;
    }
    setError(null);
    setStep(step + 1);
  };

  const handleBack = () => setStep(step - 1);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    const fd = new FormData();
    fd.append('serviceTypeId', service.id);
    if (isInclusiveMode) {
      fd.append('applicantId', applicantId);
    }
    fd.append('formFieldsJson', JSON.stringify(formData));

    const res = await createRequestAction(fd);
    if (res.error) {
      setError(res.error);
      setIsPending(false);
    } else if (res.success) {
      // Navigate to tracking
      router.push(`/dashboard/pengajuan/${res.requestId}`);
    }
  };

  return (
    <div className="card glass">
      {/* Stepper Header */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <div style={{ fontWeight: step >= 1 ? 'bold' : 'normal', color: step >= 1 ? 'var(--primary)' : 'var(--secondary-foreground)' }}>1. Persyaratan</div>
        {isInclusiveMode && <div style={{ fontWeight: step >= 2 ? 'bold' : 'normal', color: step >= 2 ? 'var(--primary)' : 'var(--secondary-foreground)' }}>2. Pilih Warga</div>}
        <div style={{ fontWeight: step >= (isInclusiveMode ? 3 : 2) ? 'bold' : 'normal', color: step >= (isInclusiveMode ? 3 : 2) ? 'var(--primary)' : 'var(--secondary-foreground)' }}>{isInclusiveMode ? '3. Formulir' : '2. Formulir'}</div>
      </div>

      {error && <div style={{ padding: '1rem', background: 'var(--error)', color: 'white', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        {/* Step 1: Persyaratan */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Persyaratan Dokumen</h3>
            <p style={{ color: 'var(--secondary-foreground)', fontSize: '0.875rem' }}>Harap pastikan Anda telah melengkapi/menyiapkan dokumen berikut sebelum melanjutkan:</p>
            <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', color: 'var(--foreground)' }}>
              {requirements.map((req: string, idx: number) => (
                <li key={idx} style={{ marginBottom: '0.5rem' }}>{req}</li>
              ))}
            </ul>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="button" onClick={handleNext} className="btn btn-primary">Lanjutkan</button>
            </div>
          </div>
        )}

        {/* Step 2 (Inclusive Mode): Pilih Warga */}
        {isInclusiveMode && step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Pilih Warga Pemohon (Inclusive Mode)</h3>
            <p style={{ color: 'var(--secondary-foreground)', fontSize: '0.875rem' }}>Anda membuat pengajuan atas nama warga. Pilih warga yang bersangkutan:</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Warga</label>
              <select 
                value={applicantId}
                onChange={(e) => setApplicantId(e.target.value)}
                style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--background)' }}
                required
              >
                <option value="">-- Pilih Warga --</option>
                {wargaList?.map(w => (
                  <option key={w.id} value={w.id}>{w.namaLengkap} - NIK: {w.nik} (RT {w.rt?.nomor || '-'})</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
              <button type="button" onClick={handleBack} className="btn">Kembali</button>
              <button type="button" onClick={handleNext} className="btn btn-primary">Lanjutkan ke Formulir</button>
            </div>
          </div>
        )}

        {/* Step 3/2: Formulir Dinamis */}
        {((isInclusiveMode && step === 3) || (!isInclusiveMode && step === 2)) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Isi Formulir</h3>
            <p style={{ color: 'var(--secondary-foreground)', fontSize: '0.875rem' }}>Silakan lengkapi data yang dibutuhkan sesuai dengan layanan.</p>
            
            {formFields.map((field: any, idx: number) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                  {field.label} {field.required && <span style={{ color: 'var(--error)' }}>*</span>}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    name={field.name}
                    value={formData[field.name] || ''}
                    onChange={handleChange}
                    required={field.required}
                    rows={4}
                    style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--background)' }}
                  />
                ) : (
                  <input
                    type={field.type || 'text'}
                    name={field.name}
                    value={formData[field.name] || ''}
                    onChange={handleChange}
                    required={field.required}
                    style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--background)' }}
                  />
                )}
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
              <button type="button" onClick={handleBack} className="btn">Kembali</button>
              <button type="submit" disabled={isPending} className="btn btn-primary">
                {isPending ? 'Menyimpan...' : 'Submit Pengajuan'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
