import React, { useState } from 'react';
import * as LucideIcons from 'lucide-react';

export default function Accordion({ title, iconName, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const Icon = iconName ? LucideIcons[iconName] : null;

  return (
    <div className="ui-panel smooth-transition" style={{ marginBottom: 'var(--spacing-layout)', overflow: 'hidden' }}>
      {/* Otsikkorivi */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex-between"
        style={{ padding: 'var(--padding-panel)', cursor: 'pointer', backgroundColor: isOpen ? 'var(--color-bg-clean)' : 'transparent' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {Icon && (
            <div style={{ color: 'var(--color-text-main)', display: 'flex' }}>
              <Icon size={20} />
            </div>
          )}
          <h3 className="text-title" style={{ margin: 0, fontSize: '1rem' }}>{title}</h3>
        </div>
        
        <div style={{ color: 'var(--color-text-muted)', display: 'flex' }}>
          {isOpen ? <LucideIcons.ChevronUp size={20} /> : <LucideIcons.ChevronDown size={20} />}
        </div>
      </div>

      {/* Sisältöalue */}
      {isOpen && (
        <div style={{ padding: 'var(--padding-panel)', borderTop: '1px solid var(--color-lancia)' }}>
          {children}
        </div>
      )}
    </div>
  );
}