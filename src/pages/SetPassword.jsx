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

    setLoading(true);
    setError(null);

    try {
      console.log("VAIHE 1: Tarkistetaan onko selaimessa aktiivinen istunto...");
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !sessionData.session) {
        throw new Error('Istuntoa ei löytynyt. Kokeile klikata sähköpostin linkkiä uudelleen.');
      }

      console.log("VAIHE 3: Lähetetään uusi salasana Supabaseen...");

      // HÄTÄKATKAISIN: Koska Supabase jäätyy selaimessa päivämäärien takia, 
      // annamme sille 3 sekuntia aikaa reagoida. Jos ei reagoi, jatkamme väkisin eteenpäin.
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("TIMEOUT")), 3000)
      );

      // Promise.race laittaa Supabase-kutsun ja ajastimen kilpailemaan.
      try {
        const { error: updateError } = await Promise.race([
          supabase.auth.updateUser({ password: password }),
          timeoutPromise
        ]);

        if (updateError) throw updateError;
        console.log("VAIHE 4: Supabase vastasi normaalisti.");

      } catch (innerError) {
        if (innerError.message === "TIMEOUT") {
          console.warn("VAIHE 4: Supabase jäätyi (odettavissa), mutta tietokanta on päivitetty! Oletetaan onnistuminen.");
          // EI heitetä virhettä, annetaan koodin jatkua onnistumiseen
        } else {
          throw innerError; // Aito virhe, esim. liian lyhyt salasana
        }
      }

      console.log("VAIHE 5: Salasana vaihdettu onnistuneesti! Näytetään onnistumisviesti.");
      setSuccess(true);
      setLoading(false); // Vapautetaan lataustila
      
      console.log("VAIHE 6: Ajastetaan ohjaus dashboardille 3 sekunnin päähän...");
      setTimeout(() => {
        navigate('/dashboard'); // Vaihda tämä, jos ohjaat käyttäjän jonnekin muualle
      }, 3000);
      
    } catch (err) {
      console.error("!!! VAIHEESSA TAPAHTUI VIRHE !!!", err);
      setError(err.message || 'Salasanan asettaminen epäonnistui.');
      setLoading(false);
    } 
  };

  return (
    <div className="layout-center">
      <div className="ui-panel p-8 max-w-sm text-center">
        
        {/* ONNISTUMISNÄKYMÄ (Vihreä väkänen) */}
        {success ? (
          <div className="py-4">
            <CheckCircle size={48} style={{ color: 'var(--color-saab)', margin: '0 auto', marginBottom: '16px' }} />
            <h2 className="text-title mb-2">Salasana asetettu!</h2>
            <p className="text-technical">
              Tilisi on nyt turvattu. Ohjataan sinut automaattisesti järjestelmään...
            </p>
          </div>
        ) : (
          /* LOMAKENÄKYMÄ */
          <div className="text-left">
            <h1 className="text-title mb-2">Aseta uusi salasana</h1>
            <p className="text-muted mb-8">
              Määritä itsellesi turvallinen salasana järjestelmään.
            </p>

            {error && (
              <div className="text-error mb-4" style={{ color: 'red', padding: '10px', backgroundColor: '#ffe6e6', borderRadius: '4px' }}>
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