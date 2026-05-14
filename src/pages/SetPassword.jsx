import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import { CheckCircle } from 'lucide-react'; // Lisätty ikoni

function SetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return setError('Salasanat eivät täsmää.');
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({ 
        password: password 
      });

      if (error) throw error;

      setSuccess(true);
      
      // Hieman pidempi viive, jotta ehtii lukea nätin viestin (3 sekuntia)
      setTimeout(() => navigate('/dashboard'), 3000);
      
    } catch (err) {
      setError(err.message || 'Salasanan asettaminen epäonnistui.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="layout-center">
      <div className="ui-panel p-8 max-w-sm text-center">
        
        {/* JOS ONNISTUI, NÄYTETÄÄN VAIN TÄMÄ KUITTAUS */}
        {success ? (
          <div className="py-4">
            <CheckCircle size={48} style={{ color: 'var(--color-saab)', margin: '0 auto', marginBottom: '16px' }} />
            <h2 className="text-title mb-2">Salasana asetettu!</h2>
            <p className="text-technical">
              Tilisi on nyt turvattu. Ohjataan sinut automaattisesti järjestelmään...
            </p>
          </div>
        ) : (
          /* MUUTEN NÄYTETÄÄN NORMAALI LOMAKE */
          <div className="text-left">
            <h1 className="text-title mb-2">Aseta uusi salasana</h1>
            <p className="text-muted mb-8">
              Määritä itsellesi turvallinen salasana järjestelmään.
            </p>

            {error && (
              <div className="text-error mb-4">
                <strong>Virhe:</strong> {error}
              </div>
            )}

            <form onSubmit={handleUpdatePassword}>
              <div className="mb-4">
                <label className="text-label mb-2">Uusi salasana</label>
                <input 
                  type="password" 
                  className="ui-input w-full" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="mb-8">
                <label className="text-label mb-2">Vahvista salasana</label>
                <input 
                  type="password" 
                  className="ui-input w-full" 
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'Päivitetään...' : 'Tallenna salasana'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default SetPassword;