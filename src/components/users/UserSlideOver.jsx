import React from 'react';
import { X } from 'lucide-react';
import Toggle from '../common/Toggle';
import Select from '../common/Select';

// UUDET LISTAT ERIKSEEN
const CIRCLE_OPTIONS = [
  { value: 'tuttu', label: 'Tuttu' },
  { value: 'kaveri', label: 'Kaveri' },
  { value: 'ystava', label: 'Ystävä' },
  { value: 'sukulainen', label: 'Sukulainen' },
  { value: 'perhe', label: 'Perhe' }
];

const ROLE_OPTIONS = [
  { value: 'user', label: 'Käyttäjä (User)' },
  { value: 'moderator', label: 'Moderaattori' },
  { value: 'admin', label: 'Admin' },
  { value: 'superadmin', label: 'Superadmin' }
];

function UserSlideOver({ isOpen, onClose, user, modules, currentUserRole, onTogglePermission, onRoleChange, onCircleChange }) {
  if (!isOpen || !user) return null;

  const perms = user.permissions || {};
  const canEditRole = currentUserRole === 'superadmin' || (currentUserRole === 'admin' && user.role !== 'superadmin');

  return (
    <>
      <div className={`overlay ${isOpen ? '' : 'hidden-view'}`} onClick={onClose}></div>
      <div className={`slideover-panel ${isOpen ? 'slideover-open' : ''}`}>
        
        <div className="slideover-header">
          <div>
            <h3 className="text-title" style={{ fontSize: '1rem' }}>Käyttäjän asetukset</h3>
            <div className="text-technical" style={{ fontSize: '0.75rem', marginTop: '4px' }}>{user.email}</div>
          </div>
          <button className="btn-icon smooth-transition" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="slideover-content">
          
          <h4 className="text-label mb-4">Turvaluokitus (Sentinel)</h4>
          
          {/* UUSI: PIIRI (Mitä dataa näkee) */}
          <div className="mb-4">
            <Select 
              label="Sosiaalinen piiri (Data-näkyvyys)"
              value={user.circle || 'tuttu'}
              options={CIRCLE_OPTIONS}
              onChange={(newCircle) => onCircleChange(user.id, newCircle)}
              disabled={!canEditRole}
            />
          </div>

          {/* VANHA: ROOLI (Mitä nappeja saa painaa) */}
          <div className="mb-8">
            <Select 
              label="Ylläpitotaso (Järjestelmäoikeudet)"
              value={user.role || 'user'}
              options={ROLE_OPTIONS}
              onChange={(newRole) => onRoleChange(user.id, newRole)}
              disabled={!canEditRole}
            />
            {!canEditRole && <p className="text-technical" style={{ fontSize: '0.75rem', marginTop: '4px' }}>Ei oikeutta muuttaa näitä tasoja.</p>}
          </div>

          <div style={{ height: '1px', backgroundColor: 'var(--color-bg-clean)', margin: '24px 0' }}></div>

          <h4 className="text-label mb-4">Sovellusoikeudet (Moduulit)</h4>
          {modules.map((mod) => (
            <Toggle 
              key={mod.key}
              label={mod.label} 
              description={mod.description}
              iconName={mod.icon_name}
              isActive={perms[mod.key] || false}
              onToggle={() => onTogglePermission(user.id, perms, mod.key)}
            />
          ))}
          
        </div>
      </div>
    </>
  );
}

export default UserSlideOver;