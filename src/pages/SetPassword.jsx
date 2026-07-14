import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import { CheckCircle } from 'lucide-react';

function SetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    console.log("--- SALASANAN VAIHTO ALKAA ---");

    if (password !== confirmPassword) {
      return setError('Salasanat eivät täsmää.');
    }

    if (password.length < 6) {
      return setError('Salasanan täytyy olla vähintään 6 merkkiä pitkä.');
    }

    setLoading(true);
    setError(null);

    try {
      console.log("Vaihe 1: Tarkistetaan aktiivinen URL-istunto tai kutsu-token...");
      // Hakee luotettavasti session myös URL:n kätketystä hash-koodista 
      // (ensimmäinen kirjautuminen & unohtunut salasana)
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !sessionData.session) {
        throw new Error('Istunto on vanhentunut tai puuttuu. Kokeile klikata sähköpostissa olevaa linkkiä uudelleen.');
      }

      console.log("Vaihe 2: Istunto OK, lähetetään uusi salasana tietokantaan...");
      // HUOM! Täällä ei ole enää 3 sekunnin hätäkatkaisinta. Annetaan Supabasen tehdä
      // rauhassa työnsä, nettiyhteyden laadusta riippumatta. Sentinel pysyy hiljaa taustalla.
      const { error: updateError } = await supabase.auth.updateUser({ 
        password: password 
      });

      // Jos tulee error (esim token hylätty palvelimella), kaadutaan siististi catch-lohkoon
      if (updateError) throw updateError;
      
      console.log("Vaihe 3: Tietokanta vastasi ONNISTUI!");
      setSuccess(true);
      setLoading(false); 
      
      // Ohjataan tyylikkäästi suoraan Dashboardille 3 sekunnin kuluessa
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 3000);
      
    } catch (err) {
      console.error("Vika salasanan vaihdossa:", err);
      // Supabase-virhe voi joskus olla englanniksi. Voi jatkossa lokalisoida tähän paremmin
      setError(err.message || 'Salasanan asettaminen epäonnistui. Yritä uudelleen.');
      setLoading(false);
    } 
  };

  return (
    <div className="layout-center">
      <div className="ui-panel p-8 max-w-sm text-center">
        
        {success ? (
          <div className="py-4">
            <CheckCircle size={48} style={{ color: 'var(--color-saab)', margin: '0 auto', marginBottom: '16px' }} />
            <h2 className="text-title mb-2">Salasana asetettu!</h2>
            <p className="text-technical">
              Tilisi on nyt turvattu. Ohjataan sinut automaattisesti järjestelmään...
            </p>
          </div>
        ) : (
          <div className="text-left">
            <h1 className="text-title mb-2">Aseta uusi salasana</h1>
            <p className="text-muted mb-8">
              Määritä itsellesi turvallinen salasana järjestelmään.
            </p>

            {error && (
              <div className="text-error mb-4" style={{ padding: '10px', backgroundColor: '#ffe6e6', borderRadius: '4px' }}>
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
                  disabled={loading}
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
                  disabled={loading}
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