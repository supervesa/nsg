import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Tuodaan Sentinel!
import { SentinelProvider } from './context/SentinelContext';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SetPassword from './pages/SetPassword';
import Media from './pages/media'; 
import ProtectedRoute from './components/layout/ProtectedRoute';
import AdminLayout from './components/layout/AdminLayout';

function App() {
  
  // ARKKITEHTUURINEN VIP-KAISTA (SIEAPPAUS)
  // Katsotaan reaaliajassa, sisältääkö selaimen yläpalkki (URL) taikasanoja 
  // (access_token, code tai recovery), ennen kuin edes lataamme mitään muuta.
  const isRecoverySession = 
    typeof window !== 'undefined' && 
    (window.location.hash.includes('type=recovery') || 
     window.location.hash.includes('access_token=') ||
     window.location.search.includes('code='));

  return (
    <SentinelProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/set-password" element={<SetPassword />} />
          
          {/* Suojatut reitit ovimiehen takana */}
          <Route element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/media" element={<Media />} /> 
            <Route path="/jobs" element={<div className="p-8">Työt-moduuli tulossa...</div>} />
            <Route path="/fitness" element={<div className="p-8">Kuntoilu-moduuli tulossa...</div>} />
            <Route path="/settings" element={<div className="p-8">Asetukset tulossa...</div>} />
          </Route>
          
          {/* Ovelin temppu: Jos käyttäjä on pelastamassa salasanaa, ei edes yritetä kojelaudalle (dashboard)
              vaan lähetetään puhtaalle /set-password -sivulle ohi turvaportin. */}
          <Route 
            path="/" 
            element={
              isRecoverySession 
                ? <Navigate to="/set-password" replace /> 
                : <Navigate to="/dashboard" replace />
            } 
          />
        </Routes>
      </Router>
    </SentinelProvider>
  );
}

export default App;