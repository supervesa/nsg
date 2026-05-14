import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Tuodaan Sentinel!
import { SentinelProvider } from './context/SentinelContext';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SetPassword from './pages/SetPassword';
import Media from './pages/Media'; // UUSI: Tuodaan Media-sivu
import ProtectedRoute from './components/layout/ProtectedRoute';
import AdminLayout from './components/layout/AdminLayout';

function App() {
  return (
    <SentinelProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/set-password" element={<SetPassword />} />
          
          <Route element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/media" element={<Media />} /> {/* PÄIVITETTY: Kytketään oikea komponentti */}
            <Route path="/jobs" element={<div className="p-8">Työt-moduuli tulossa...</div>} />
            <Route path="/fitness" element={<div className="p-8">Kuntoilu-moduuli tulossa...</div>} />
            <Route path="/settings" element={<div className="p-8">Asetukset tulossa...</div>} />
          </Route>
          
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </SentinelProvider>
  );
}

export default App;