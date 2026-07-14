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

// =========================================================
// VOITTAMATON SIEPPAUS (Global Photocopy)
// Tämä koodirivi on koodin ulkopuolella ja se suoritetaan välittömästi.
// Nappaamme salakoodin aikomuksen kiinni ennen kuin Supabase tuhoaa sen!
// =========================================================
let globalIntent = '';
if (typeof window !== 'undefined') {
  const hashString = window.location.hash;
  if (hashString.includes('type=recovery') || hashString.includes('type=invite')) {
    globalIntent = 'set-password';
  }
}

function App() {
  // Tallennetaan siepattu suunta lokaaliin tilaan niin, ettei se jäädytä meitä luuppiin jatkossa
  const [initialDestination] = useState(globalIntent);

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
          
          {/* Jos sieppari löysi koodin ladattaessa, pakotetaan käyttöliittymä 
              suoraan aseta-salasana-näkymään! Jos ei, niin mennään kojelaudalle. */}
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