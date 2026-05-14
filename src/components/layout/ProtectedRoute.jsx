import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  // Odotetaan hetki, että Supabase ehtii tarkistaa session
  if (loading) {
    return (
      <div className="layout-center">
        <div className="text-technical">Tarkistetaan oikeuksia...</div>
      </div>
    );
  }

  // Jos käyttäjää ei löydy, ohjataan kirjautumiseen
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Jos kaikki on OK, näytetään haluttu sivu (esim. Dashboard)
  return children;
};

export default ProtectedRoute;