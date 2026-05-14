import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';

function Login() {
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // Peruskirjautuminen
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResetEmailSent(false);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;

      if (data.user) {
        navigate('/dashboard');
      }

    } catch (err) {
      setError(err.message || 'Kirjautuminen epäonnistui. Tarkista tunnukset.');
    } finally {
      setLoading(false);
    }
  };

  // Salasanan palautuspyyntö
  const handleForgotPassword = async () => {
    if (!email) {
      return setError('Syötä sähköpostiosoitteesi ensin yläpuolelle.');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // Varmista, että tämä URL on lisätty Supabasen Redirect URLs -listaan!
        redirectTo: 'http://localhost:3000/set-password',
      });
      
      if (error) throw error;
      
      setResetEmailSent(true);
    } catch (err) {
      setError(err.message || 'Palautuslinkin lähetys epäonnistui.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="layout-center">
      <div className="ui-panel p-8 max-w-sm w-full">
        
        <div className="flex-between mb-6">
          <h1 className="text-title">NSG Hallinta</h1>
          <div className="flex-row-gap text-technical">
            <span className="status-dot bg-saab"></span>
            Järjestelmä OK
          </div>
        </div>

        <p className="text-muted mb-8">
          Kirjaudu sisään hallinnoidaksesi käyttäjiä ja moduulioikeuksia.
        </p>

        {error && (
          <div className="text-error mb-6 p-3 rounded-sm border border-red-500/20 bg-red-500/10">
            {error}
          </div>
        )}

        {resetEmailSent && (
          <div className="text-saab mb-6 p-3 rounded-sm border border-green-500/20 bg-green-500/10">
            Palautuslinkki on lähetetty sähköpostiisi!
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="text-label mb-2">Sähköposti</label>
            <input 
              type="email" 
              className="ui-input smooth-transition w-full" 
              placeholder="admin@nsg.fi" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="mb-8">
            <div className="flex-between mb-2">
              <label className="text-label">Salasana</label>
              <button 
                type="button"
                onClick={handleForgotPassword}
                className="text-technical hover:text-white smooth-transition"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}
              >
                Unohdin salasanan?
              </button>
            </div>
            <input 
              type="password" 
              className="ui-input smooth-transition w-full" 
              placeholder="••••••••" 
              required={!resetEmailSent}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary smooth-transition w-full"
            disabled={loading}
          >
            {loading ? 'Käsitellään...' : 'Kirjaudu Sisään'}
          </button>
        </form>

      </div>
    </div>
  );
}

export default Login;