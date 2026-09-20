import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

const renderIcon = (iconName, size = 18) => {
  const IconComponent = LucideIcons[iconName];
  if (!IconComponent) return null;
  return <IconComponent size={size} color="currentColor" />;
};

export default function Dropdown({ 
  options = [], 
  value, 
  onChange, 
  placeholder = "Valitse...",
  icon // Valinnainen pää-ikoni
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedOption = options.find(opt => opt.value === value);

  // Suljetaan valikko, jos klikataan sen ulkopuolelle
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          backgroundColor: 'var(--color-bg-clean)',
          border: '1px solid var(--color-lancia)',
          borderRadius: '8px',
          color: 'var(--color-text-main)',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {selectedOption?.icon ? renderIcon(selectedOption.icon, 20) : (icon && renderIcon(icon, 20))}
          <span>{selectedOption ? selectedOption.label : placeholder}</span>
        </div>
        <ChevronDown 
          size={20} 
          style={{ 
            color: 'var(--color-text-technical)', 
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease'
          }} 
        />
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          left: 0,
          right: 0,
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-lancia)',
          borderRadius: '8px',
          boxShadow: 'var(--shadow-subtle)',
          zIndex: 10,
          overflow: 'hidden'
        }}>
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                backgroundColor: value === opt.value ? 'var(--color-bg-clean)' : 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--color-bg-clean)',
                color: value === opt.value ? 'var(--color-electric)' : 'var(--color-text-main)',
                fontSize: '1rem',
                fontWeight: value === opt.value ? 600 : 400,
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              {opt.icon && renderIcon(opt.icon, 18)}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}