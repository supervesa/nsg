import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

function AdminLayout() {
  // Tila hallitsee mobiilivalikon näkyvyyttä
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="admin-layout">
      {/* Tumma tausta näkyy vain, kun mobiilivalikko on auki. Klikkaus sulkee valikon. */}
      <div 
        className={`overlay ${isMobileMenuOpen ? '' : 'hidden-view'}`} 
        onClick={() => setIsMobileMenuOpen(false)}
        style={{ zIndex: 40 }} // Varmistetaan, että asettuu Sidebarin (50) alle, mutta Topbarin (10) päälle
      ></div>

      {/* Välitetään tila ja sulkemisfunktio Sidebarille */}
      <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      
      <div className="main-content">
        {/* Välitetään avausfunktio Topbarille */}
        <Topbar onToggleMenu={toggleMenu} />
        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;