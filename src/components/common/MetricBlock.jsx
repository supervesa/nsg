import React from 'react';
import * as LucideIcons from 'lucide-react';

export default function MetricBlock({ title, mainValue, subValue, iconName, valueColor = 'var(--color-text-main)' }) {
  const Icon = iconName ? LucideIcons[iconName] : null;

  return (
    <div style={{
      padding: '12px',
      backgroundColor: 'var(--color-bg-clean)',
      border: '1px solid var(--color-lancia)',
      borderRadius: '6px',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px'
    }} className="smooth-transition">
      
      {/* Otsikko (esim. Sääkategoria tai Pilvisyys) */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '6px', 
        color: 'var(--color-text-muted)',
        fontSize: '0.75rem',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        fontWeight: 600
      }}>
        {Icon && <Icon size={14} />}
        {title}
      </div>
      
      {/* Pääarvo (esim. Vaadittu lisälämpö) */}
      <div style={{ 
        fontSize: '1.25rem', 
        fontWeight: 700, 
        color: valueColor 
      }}>
        {mainValue}
      </div>
      
      {/* Alaotsikko (esim. Kuinka nopeasti viilenee) */}
      {subValue && (
        <div className="text-technical" style={{ fontSize: '0.75rem' }}>
          {subValue}
        </div>
      )}
    </div>
  );
}