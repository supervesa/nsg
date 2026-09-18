import React from 'react';
import * as LucideIcons from 'lucide-react';

export default function StatsCard({ 
  title, 
  value, 
  unit, 
  description, 
  subLabel, 
  subValue,
  iconName,
  isActive // Voidaan käyttää sytyttämään vihreä "status-dot", esim. kun paneelit tuottavat sähköä
}) {
  const Icon = LucideIcons[iconName] || LucideIcons.Activity;

  const cardStyle = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    padding: '24px'
  };

  return (
    <div className="ui-panel smooth-transition" style={cardStyle}>
      
      {/* Yläosa: Ikoni, Otsikko ja mahdollinen tila-LED */}
      <div className="flex-between mb-4">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            backgroundColor: 'var(--color-bg-clean)', 
            color: 'var(--color-text-main)', 
            padding: '8px', 
            borderRadius: '6px',
            display: 'flex'
          }}>
            <Icon size={24} />
          </div>
          <h3 className="text-title">{title}</h3>
        </div>
        
        {isActive !== undefined && (
          <span className={`status-dot ${isActive ? 'bg-saab' : ''}`} style={{ 
            backgroundColor: !isActive ? 'var(--color-text-muted)' : undefined 
          }} />
        )}
      </div>
      
      {/* Keskiosa: Pääarvo ja Yksikkö */}
      <div style={{ margin: '16px 0', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
        <span style={{ fontSize: '2.5rem', fontWeight: '700', color: 'var(--color-text-main)', lineHeight: '1' }}>
          {value !== null && value !== undefined ? value : '-'}
        </span>
        <span className="text-technical" style={{ fontSize: '1.25rem', fontWeight: '600' }}>
          {unit}
        </span>
      </div>

      {/* Alaosa: Kuvaus ja Lisätieto */}
      <div style={{ marginTop: 'auto' }}>
        <p className="text-muted" style={{ marginBottom: subLabel ? '12px' : '0' }}>
          {description}
        </p>
        
        {subLabel && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            paddingTop: '12px', 
            borderTop: '1px solid var(--color-bg-clean)' 
          }}>
            <span className="text-label">{subLabel}</span>
            <span className="text-technical font-mono" style={{ fontSize: '12px' }}>
              {subValue}
            </span>
          </div>
        )}
      </div>

    </div>
  );
}