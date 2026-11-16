import React from 'react';

type StatCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
};

export default function StatCard({ title, value, subtitle, trend }: StatCardProps) {
  return (
    <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <h3 style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--secondary-foreground)' }}>{title}</h3>
      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--foreground)' }}>{value}</div>
      {subtitle && (
        <div style={{ fontSize: '0.75rem', color: trend === 'up' ? 'var(--success)' : trend === 'down' ? 'var(--error)' : 'var(--secondary-foreground)' }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}
