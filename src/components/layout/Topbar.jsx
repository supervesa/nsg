import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Menu } from 'lucide-react';

function Topbar({ onToggleMenu }) {
  const { user } = useAuth();

  return (
    <header className="topbar">
      <div className="flex-center">
        {/* Nappi näkyy vain mobiilissa */}
        <button className="mobile-toggle smooth-transition" onClick={onToggleMenu}>
          <Menu size={24} />
        </button>

        <div className="flex-row-gap text-technical">
          <span className="status-dot bg-saab"></span>
          <span className="hide-on-mobile">Järjestelmä OK</span>
        </div>
      </div>

      <div className="flex-row-gap">
        <span className="text-technical hide-on-mobile" style={{ fontSize: '0.875rem' }}>
          Kirjautuneena:
        </span>
        <span style={{ fontWeight: 500, fontSize: '0.875rem', color: 'var(--color-text-main)' }}>
          {user?.email}
        </span>
      </div>
    </header>
  );
}

export default Topbar;