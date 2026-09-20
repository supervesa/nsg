import React from 'react';
import * as LucideIcons from 'lucide-react';

export default function WidgetSmall({ title, value, iconName, isActive }) {
  const Icon = LucideIcons[iconName] || LucideIcons.Activity;
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 16px',
      backgroundColor: isActive ? 'var(--color-surface)' : 'var(--color-bg-clean)',
      border: isActive ? '1px solid var(--color-saab)' : '1px solid transparent',
      borderRadius: '8px',
      boxShadow: isActive ? 'var(--shadow-subtle)' : 'none',
      minWidth: 'fit-content',
      transition: 'all 0.2s ease'
    }}>
      <Icon size={20} color={isActive ? 'var(--color-saab)' : 'var(--color-text-technical)'} />
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-technical)', fontWeight: 600 }}>
          {title}
        </span>
        <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-main)', lineHeight: '1.2' }}>
          {value}
        </span>
      </div>
    </div>
  );
}