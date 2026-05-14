import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Users, Settings, LogOut, Image } from 'lucide-react'; // UUSI: Tuodaan Image-ikoni
import { supabase } from '../../config/supabaseClient';
import { useSentinel } from '../../context/SentinelContext'; // UUSI: Tuodaan Sentinel
import IconMapper from '../common/IconMapper'; // UUSI: Tuodaan ikonimapperi

function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  // Haetaan Sentineliltä voimat: kuka minä olen ja mitä moduuleja on olemassa?
  const { hasRole, hasModule, systemModules } = useSentinel();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleLinkClick = () => {
    if (onClose) onClose();
  };

  // Tarkistetaan, onko käyttäjällä oikeus YHTEENKÄÄN moduuliin (jotta tiedetään piirretäänkö "Moduulit" otsikkoa)
  const hasAnyModules = systemModules.some(mod => hasModule(mod.key));

  return (
    <aside className={`sidebar ${isOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header">
        <h1 className="text-title" style={{ fontSize: '1.25rem' }}>NSG Admin</h1>
      </div>

      <nav className="sidebar-nav">
        
        {/* HALLINTA-OSIO (Näkyy vain Admin ja Superadmin) */}
        {hasRole('admin') && (
          <>
            <div className="text-label mb-2" style={{ paddingLeft: '12px' }}>Hallinta</div>
            <NavLink 
              to="/dashboard" 
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} 
              onClick={handleLinkClick}
            >
              <Users className="nav-icon" size={20} /> Käyttäjät
            </NavLink>
            
            {/* UUSI: Media-oikeuksien hallinta */}
            <NavLink 
              to="/media" 
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} 
              onClick={handleLinkClick}
            >
              <Image className="nav-icon" size={20} /> Media-oikeudet
            </NavLink>
          </>
        )}
        
        {/* MODUULIT-OSIO (Piirretään dynaamisesti tietokannasta) */}
        {hasAnyModules && (
          <div className="text-label mb-2" style={{ paddingLeft: '12px', marginTop: '16px' }}>Moduulit</div>
        )}

        {systemModules.map((mod) => {
          // Sentinelin tarkistus: Piirretäänkö tämä kyseinen linkki tälle käyttäjälle?
          // HUOM: Jos "media" on myös järjestelmämoduuli tietokannassa, se piirtyy tähänkin. 
          // Halutessasi voit rajata sen pois esim. if (mod.key === 'media') return null;
          if (!hasModule(mod.key)) return null;

          return (
            <NavLink 
              key={mod.key}
              to={`/${mod.key}`} 
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} 
              onClick={handleLinkClick}
            >
              {/* IconMapper hakee oikean ikonin Supabasen tekstin perusteella */}
              <IconMapper name={mod.icon_name} className="nav-icon" size={20} /> {mod.label}
            </NavLink>
          );
        })}

        {/* Erotin pitää alaosan napit pohjassa */}
        <div style={{ flex: 1 }}></div>

        {/* ASETUKSET JA ULOSKIRJAUTUMINEN (Säilytetty täysin alkuperäisenä) */}
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