import React, { useState } from 'react';
import { supabase } from '../config/supabaseClient';
import { useSentinel } from '../context/SentinelContext'; 
// Tuodaan uusi hieno common-komponentti!
import LaunchCard from '../components/common/LaunchCard';

// HUOM: Jos admin-paneelisi on Netlifyssä, window.location.origin ohjaa väärään paikkaan.
// Käytetään siis kovaa Nginx-palvelimen osoitetta, josta Studio ja Terminaali löytyvät.
const SERVER_URL = 'https://nsg.asuscomm.com'; 

export default function Launchpad() {
  const { profile, hasRole } = useSentinel();
  
  // Nyt seurataan, MIKÄ kortti lataa (esim. 'terminal' tai 'studio')
  const [loadingTarget, setLoadingTarget] = useState(null);
  // Virheet tallennetaan objektiin: { terminal: 'virhe...', studio: null }
  const [errors, setErrors] = useState({});

  const perms = typeof profile?.permissions === 'string' 
    ? JSON.parse(profile.permissions || '{}') 
    : (profile?.permissions || {});

  const hasAccess = hasRole('superadmin') || perms?.terminal === true;

  // Yhteinen funktio kaikkien työkalujen käynnistämiseen
  const handleLaunch = async (targetId, dbTargetName, urlPath) => {
    setLoadingTarget(targetId);
    setErrors(prev => ({ ...prev, [targetId]: null }));
    
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        throw new Error("Käyttäjäsessio puuttuu. Kirjaudu uudelleen sisään.");
      }

      // Luodaan tiketti oikealle targetille (esim. 'web-terminaali' tai 'supabase-studio')
      const { data, error: insertError } = await supabase
        .from('terminal_tickets')
        .insert([{
            target: dbTargetName,
            user_id: session.user.id
        }])
        .select('id')
        .single();

      if (insertError) throw insertError;

      if (data && data.id) {
        // Rakennetaan lopullinen osoite (esim. https://nsg.asuscomm.com/terminal/?ticket=123)
        const finalUrl = `${SERVER_URL}${urlPath}?ticket=${data.id}`;
        window.open(finalUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      console.error(`Sentinel: Lipun luonti epäonnistui (${targetId})`, err);
      setErrors(prev => ({ 
        ...prev, 
        [targetId]: err.message || "Yhteyden luonti epäonnistui. Tarkista tietoverkko." 
      }));
    } finally {
      setLoadingTarget(null);
    }
  };

  if (!hasAccess) {
    return (
      <div className="p-8">
        <h2 className="text-title text-red-600 mb-4">Pääsy evätty</h2>
        <div className="ui-panel">
          <p>Sinulla ei ole tarvittavia valtuuksia palvelintyökalujen käyttöön (Sentinel Level: Inadequate).</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h2 className="text-title mb-2">Launchpad</h2>
      <p className="mb-8 text-gray-600 max-w-2xl">
        Keskitetty hallintakeskus Sentinel-suojatuille taustajärjestelmille. 
        Yhteydet muodostetaan kertakäyttöisillä, salatuilla lipuilla ilman erillisiä salasanoja.
      </p>

      {/* Grid-asettelu, johon on helppo lisätä kortteja vierekkäin */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        
        {/* KORTTI 1: Supabase Studio */}
        <LaunchCard 
          title="Supabase Studio"
          description="Täysi graafinen tietokannan ja autentikaation hallintapaneeli. Sisältää SQL-editorin ja taulujen muokkauksen."
          iconName="Database"
          buttonText="Avaa Supabase Studio"
          isGenerating={loadingTarget === 'studio'}
          error={errors['studio']}
          onLaunch={() => handleLaunch('studio', 'supabase-studio', '/')}
        />

        {/* KORTTI 2: Palvelimen Etäpääte */}
        <LaunchCard 
          title="Palvelimen Etäpääte (ttyd)"
          description="Avaa suojatun WebSocket-yhteyden Ubuntu-palvelimelle (CLI). Istunto katkaistaan automaattisesti 15min inaktiivisuuden jälkeen."
          iconName="Terminal"
          buttonText="Avaa Palvelinterminaali"
          isGenerating={loadingTarget === 'terminal'}
          error={errors['terminal']}
          onLaunch={() => handleLaunch('terminal', 'web-terminaali', '/terminal/')}
        />

      </div>
    </div>
  );
}