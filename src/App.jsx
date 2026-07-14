import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Tuodaan Sentinel!
import { SentinelProvider } from './context/SentinelContext';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SetPassword from './pages/SetPassword';
import Media from './pages/media'; 
import ProtectedRoute from './components/layout/ProtectedRoute';
import AdminLayout from './components/layout/AdminLayout';

// UUSI ASIANTUNTIJATASON PORTINVARTIJA (Tämä ratkaisee ongelman!)
// Tämä istuu etusivulla ja lukee tarkalleen, mitä matkatavaroita (koodia) käyttäjällä on.
function RootHandler() {
  const location = useLocation();
  
  // Etsitään Supabasen salakoodeja kummastakin mahdollisesta piilopaikasta (search & hash)
  const hasAuthCode = location.search.includes('code=');
  const hasRecoveryToken = location.hash.includes('type=recovery') || location.hash.includes('access_token=');
  
  if (hasAuthCode || hasRecoveryToken) {
    // AHHAA! Käyttäjä on vaihtamassa salasanaa. 
    // Viedään hänet aseta-salasana-sivulle ja TÄRKEINTÄ: liimataan koodit suoraan mukaan reittiin,
    // jotta React Router ei missään nimessä kadota niitä, ja Supabase saa lukea ne siellä!
    return <Navigate to={`/set-password${location.search}${location.hash}`} replace />;
  }
  
  // Jos mitään koodeja ei ollut, kyseessä on normaali liike -> Kojelaudalle
  return <Navigate to="/dashboard" replace />;
}

function App() {
  return (
    <SentinelProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/set-password" element={<SetPassword />} />
          
          <Route element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/media" element={<Media />} /> 
            <Route path="/jobs" element={<div className="p-8">Työt-moduuli tulossa...</div>} />
            <Route path="/fitness" element={<div className="p-8">Kuntoilu-moduuli tulossa...</div>} />
            <Route path="/settings" element={<div className="p-8">Asetukset tulossa...</div>} />
          </Route>
          
          {/* Ovi on nyt ohjelmoitu fiksulla Portinvartijalla */}
          <Route path="/" element={<RootHandler />} />
        </Routes>
      </Router>
    </SentinelProvider>
  );
}

export default App;