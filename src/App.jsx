import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Tuodaan Sentinel!
import { SentinelProvider } from './context/SentinelContext';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SetPassword from './pages/SetPassword';
import Media from './pages/media'; 
import ProtectedRoute from './components/layout/ProtectedRoute';
import AdminLayout from './components/layout/AdminLayout';
import Launchpad from './pages/server'; 

// 1. LISÄÄ TÄMÄ RIVI: Tuodaan uusi Koti-sivu
import Home from './pages/home'; 

// =========================================================
// VOITTAMATON SIEPPAUS (Global Photocopy)
// =========================================================
let globalIntent = '';
if (typeof window !== 'undefined') {
  const hashString = window.location.hash;
  if (hashString.includes('type=recovery') || hashString.includes('type=invite')) {
    globalIntent = 'set-password';
  }
}

function App() {
  const [initialDestination] = useState(globalIntent);

  return (
    <SentinelProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/set-password" element={<SetPassword />} />
          
          <Route element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            
            {/* 2. LISÄÄ TÄMÄ RIVI: Koti-sivun reititys */}
            <Route path="/home" element={<Home />} />
            
            <Route path="/media" element={<Media />} /> 
            <Route path="/jobs" element={<div className="p-8">Työt-moduuli tulossa...</div>} />
            <Route path="/fitness" element={<div className="p-8">Kuntoilu-moduuli tulossa...</div>} />
            <Route path="/settings" element={<div className="p-8">Asetukset tulossa...</div>} />
            <Route path="/server" element={<Launchpad />} />
          </Route>
          
          <Route 
            path="/" 
            element={
              initialDestination === 'set-password' 
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