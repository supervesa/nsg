import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Users, Settings, LogOut, Image, Terminal } from 'lucide-react'; 
import { supabase } from '../../config/supabaseClient';
import { useSentinel } from '../../context/SentinelContext'; 
import IconMapper from '../common/IconMapper'; 

function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { hasRole, hasModule, systemModules, profile } = useSentinel();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleLinkClick = () => {
    if (onClose) onClose();
  };

  // Varmistettu oikeustarkistus Terminaalille
  const perms = typeof profile?.permissions === 'string' 
    ? JSON.parse(profile.permissions || '{}') 
    : (profile?.permissions || {});
    
  const hasTerminalAccess = hasRole('superadmin') || perms?.terminal === true;
  const hasAnyModules = systemModules.some(mod => hasModule(mod.key));

  return (
    <aside className={`sidebar ${isOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header">
        <h1 className="text-title" style={{ fontSize: '1.25rem' }}>NSG Admin</h1>
      </div>

      <nav className="sidebar-nav">
        
        {/* HALLINTA-OSIO */}
        {(hasRole('admin') || hasTerminalAccess) && (
          <>
            <div className="text-label mb-2" style={{ paddingLeft: '12px' }}>Hallinta</div>
            
            {hasRole('admin') && (
              <>
                <NavLink 
                  to="/dashboard" 
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} 
                  onClick={handleLinkClick}
                >
                  <Users className="nav-icon" size={20} /> Käyttäjät
                </NavLink>
                
                <NavLink 
                  to="/media" 
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} 
                  onClick={handleLinkClick}
                >
                  <Image className="nav-icon" size={20} /> Media-oikeudet
                </NavLink>
              </>
            )}

            {/* Terminaali-linkki */}
            {hasTerminalAccess && (
              <NavLink 
                to="/server" 
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} 
                onClick={handleLinkClick}
              >
                <Terminal className="nav-icon" size={20} /> Terminaali
              </NavLink>
            )}
          </>
        )}
        
        {/* MODUULIT-OSIO */}
        {hasAnyModules && (
          <div className="text-label mb-2" style={{ paddingLeft: '12px', marginTop: '16px' }}>Moduulit</div>
        )}

        {systemModules.map((mod) => {
          if (!hasModule(mod.key)) return null;

          return (
            <NavLink 
              key={mod.key}
              to={`/${mod.key}`} 
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} 
              onClick={handleLinkClick}
            >
              <IconMapper name={mod.icon_name} className="nav-icon" size={20} /> {mod.label}
            </NavLink>
          );
        })}

        <div style={{ flex: 1 }}></div>

        {/* ASETUKSET JA ULOSKIRJAUTUMINEN */}
        <NavLink 
          to="/settings" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} 
          onClick={handleLinkClick}
        >
          <Settings className="nav-icon" size={20} /> Asetukset
        </NavLink>

        <button 
          onClick={handleLogout} 
          className="nav-item smooth-transition w-full"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', marginTop: '8px' }}
        >
          <LogOut className="nav-icon" size={20} /> Kirjaudu Ulos
        </button>
      </nav>
    </aside>
  );
}

export default Sidebar;