import React from 'react';

export default function Input({ 
  type = "text", 
  value, 
  onChange, 
  placeholder, 
  disabled = false 
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className="ui-input w-full"
      style={{
        boxSizing: 'border-box',
        fontFamily: 'inherit',
        opacity: disabled ? 0.6 : 1
      }}
    />
  );
}