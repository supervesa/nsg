import React from 'react';
import IconMapper from './IconMapper';

function Toggle({ label, description, iconName, isActive, onToggle }) {
  return (
    <div className="toggle-wrapper">
      <div className="flex-row-gap">
        {/* Käytetään meidän omaa Mapperia! */}
        {iconName && <IconMapper name={iconName} className="text-technical" size={20} />}
        <div>
          <div style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>{label}</div>
          <div className="text-technical" style={{ fontSize: '0.75rem', marginTop: '2px' }}>{description}</div>
        </div>
      </div>
      
      <div 
        className={`toggle-switch ${isActive ? 'active' : ''}`} 
        onClick={onToggle}
      >
        <div className="toggle-knob"></div>
      </div>
    </div>
  );
}

export default Toggle;