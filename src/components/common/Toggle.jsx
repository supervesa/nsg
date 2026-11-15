import React from 'react';
import IconMapper from './IconMapper';

export default function Toggle({ label, description, iconName, isActive, onToggle }) {
  return (
    <div 
      className="ui-panel smooth-transition"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start', // Pitää kytkimen nätisti yläreunassa, vaikka teksti rivittyisi
        padding: '16px',
        gap: '16px',
        cursor: 'pointer', // Koko kortti on klikattava mobiiliystävällisyyden vuoksi
        width: '100%',
        boxSizing: 'border-box'
      }}
      onClick={onToggle}
    >
      {/* Vasen puoli: Otsikko ja Kuvaus */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {iconName && <IconMapper name={iconName} className="text-technical" size={20} />}
          <span style={{ fontWeight: 600, fontSize: '1.05rem', color: 'var(--color-text-main)' }}>
            {label}
          </span>
        </div>
        
        {description && (
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
            {description}
          </span>
        )}
      </div>
      
      {/* Oikea puoli: Itse kytkin */}
      <div 
        className={`toggle-switch ${isActive ? 'active' : ''}`} 
        style={{ flexShrink: 0, marginTop: '2px' }} // flexShrink: 0 estää kytkintä menemästä kasaan
        onClick={(e) => {
          e.stopPropagation(); // Estää tuplaklikkauksen, kun koko kortti on jo klikattava
          onToggle();
        }}
      >
        <div className="toggle-knob"></div>
      </div>
    </div>
  );
}