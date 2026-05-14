import React from 'react';

// options odottaa taulukkoa: [{ value: 'tuttu', label: 'Tuttu' }, ...]
function Select({ value, options, onChange, label, disabled = false }) {
  return (
    <div className="mb-4 w-full">
      {label && <label className="text-label mb-2">{label}</label>}
      <select 
        className="ui-select" 
        value={value || ''} 
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="" disabled>Valitse...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default Select;