import React from 'react';

function Badge({ label, isActive }) {
  return (
    <span className={`perm-badge ${isActive ? 'perm-active' : 'perm-inactive'}`}>
      {label}
    </span>
  );
}

export default Badge;