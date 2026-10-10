import React from 'react';
import * as LucideIcons from 'lucide-react';

export default function WidgetSmall({ title, value, iconName, isActive, statusColor }) {
  const Icon = LucideIcons[iconName] || LucideIcons.Activity;
  
  // Jos statusColor on annettu, käytetään sitä. Muuten mennään vanhalla logiikalla.
  const iconColor = statusColor ? statusColor : (isActive ? 'var(--color-saab)' : 'var(--color-text-technical)');
  const borderColor = statusColor ? statusColor : (isActive ? 'var(--color-saab)' : 'transparent');
  const bgColor = (isActive || statusColor) ? 'var(--color-surface)' : 'var(--color-bg-clean)';
  const shadow = (isActive || statusColor) ? 'var(--shadow-subtle)' : 'none';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 16px',
      backgroundColor: bgColor,
      border: `1px solid ${borderColor}`,
      borderRadius: '8px',
      boxShadow: shadow,
      minWidth: 'fit-content',
      transition: 'all 0.2s ease'
    }}>
      <Icon size={20} color={iconColor} />
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