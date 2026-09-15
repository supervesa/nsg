import React, { useState } from 'react';
import { supabase } from '../config/supabaseClient';
import { useSentinel } from '../context/SentinelContext'; 
import LaunchCard from '../components/common/LaunchCard';
import Button from '../components/common/Button'; 
import { ShieldAlert, CheckCircle } from 'lucide-react';

const SERVER_URL = 'https://nsg.asuscomm.com'; 

export default function Launchpad() {
  const { profile, hasRole } = useSentinel();
  
  const [loadingTarget, setLoadingTarget] = useState(null);
  const [errors, setErrors] = useState({});
  const [readyUrls, setReadyUrls] = useState({});
  const [activeSessions, setActiveSessions] = useState({});
  const [isKilling, setIsKilling] = useState(false);
  const [killMessage, setKillMessage] = useState(null);

  const perms = typeof profile?.permissions === 'string' 
    ? JSON.parse(profile.permissions || '{}') 
    : (profile?.permissions || {});

  const hasAccess = hasRole('superadmin') || perms?.terminal === true;

  // VAIHE 1: Haetaan lippu
  const handleLaunch = async (targetId, dbTargetName, urlPath) => {
    setLoadingTarget(targetId);
    setErrors(prev => ({ ...prev, [targetId]: null }));
    
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) throw new Error("Käyttäjäsessio puuttuu.");

      const { data, error: insertError } = await supabase
        .from('terminal_tickets')
        .insert([{ target: dbTargetName, user_id: session.user.id }])
        .select('id')
        .single();

      if (insertError) throw insertError;

      if (data && data.id) {
        const finalUrl = `${SERVER_URL}${urlPath}?ticket=${data.id}`;
        setReadyUrls(prev => ({ ...prev, [targetId]: finalUrl }));
      }
    } catch (err) {
      console.error(`Sentinel: Lipun luonti epäonnistui (${targetId})`, err);
      setErrors(prev => ({ ...prev, [targetId]: err.message || "Yhteyden luonti epäonnistui." }));
    } finally {
      setLoadingTarget(null);
    }
  };

  // VAIHE 2: Käytetään lippu ja merkitään istunto aktiiviseksi
  const handleActivate = (targetId) => {
    window.open(readyUrls[targetId], '_blank', 'noopener,noreferrer');
    
    // Piilotetaan "Avaa tästä" -nappi ja laitetaan päälle "Palaa palveluun" -tila
    setReadyUrls(prev => ({ ...prev, [targetId]: null }));
    setActiveSessions(prev => ({ ...prev, [targetId]: true }));
  };

  // VAIHE 3: Palataan suoraan palveluun (eväste hoitaa portinvartijan)
  const handleReturn = (urlPath) => {
    window.open(`${SERVER_URL}${urlPath}`, '_blank', 'noopener,noreferrer');
  };

  // HÄTÄKATKAISIN: Tuhoaa liput suoraan tietokannasta (Ohittaa evästeongelmat!)
  const handleKillSwitch = async () => {
    setIsKilling(true);
    setKillMessage(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { error } = await supabase
          .from('terminal_tickets')
          .delete()
          .eq('user_id', session.user.id);
          
        if (error) throw error;
      }
      
      setKillMessage({ type: 'success', text: 'Kaikki aktiiviset Sentinel-istunnot on katkaistu turvallisesti.' });
      
      // Nollataan käyttöliittymä (Kortit palaavat Vaiheeseen 1)
      setReadyUrls({});
      setActiveSessions({});
      
      setTimeout(() => setKillMessage(null), 5000);
    } catch (err) {
      console.error("Sentinel lipun tuhoaminen epäonnistui", err);
      setKillMessage({ type: 'error', text: 'Virhe yhteyksien katkaisussa.' });
    } finally {
      setIsKilling(false);
    }
  };

  if (!hasAccess) {
    return (
      <div style={{ padding: '32px' }}>
        <h2 className="text-title" style={{ marginBottom: '16px', color: 'var(--color-rosso)' }}>Pääsy evätty</h2>
        <div className="ui-panel" style={{ padding: '24px' }}>
          <p>Sinulla ei ole tarvittavia valtuuksia palvelintyökalujen käyttöön.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Otsikko ja Hätäkatkaisin */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
        <div>
          <h2 className="text-title" style={{ marginBottom: '8px' }}>Launchpad</h2>
          <p className="text-muted" style={{ maxWidth: '600px', margin: 0 }}>
            Keskitetty hallintakeskus Sentinel-suojatuille taustajärjestelmille. 
            Yhteydet muodostetaan kertakäyttöisillä, salatuilla lipuilla.
          </p>
        </div>
        
        <Button variant="danger" icon={ShieldAlert} onClick={handleKillSwitch} isLoading={isKilling}>
          Sulje aktiiviset istunnot
        </Button>
      </div>

      {/* Palauteviesti */}
      {killMessage && (
        <div style={{
          marginBottom: '24px', padding: '16px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '12px',
          backgroundColor: killMessage.type === 'success' ? 'rgba(0, 204, 102, 0.1)' : 'rgba(195, 0, 47, 0.1)',
          color: killMessage.type === 'success' ? 'var(--color-saab)' : 'var(--color-rosso)',
          border: `1px solid ${killMessage.type === 'success' ? 'rgba(0, 204, 102, 0.3)' : 'rgba(195, 0, 47, 0.3)'}`
        }}>
          {killMessage.type === 'success' ? <CheckCircle size={20} /> : <ShieldAlert size={20} />}
          {killMessage.text}
        </div>
      )}

      {/* Korttien Grid-asettelu */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        <LaunchCard 
          title="Supabase Studio"
          description="Täysi graafinen tietokannan ja autentikaation hallintapaneeli. Sisältää SQL-editorin ja taulujen muokkauksen."
          iconName="Database"
          buttonText="Muodosta turvayhteys"
          isGenerating={loadingTarget === 'studio'}
          error={errors['studio']}
          
          readyUrl={readyUrls['studio']}
          isActive={activeSessions['studio']}
          
          onLaunch={() => handleLaunch('studio', 'supabase-studio', '/')}
          onActivate={() => handleActivate('studio')}
          onReturn={() => handleReturn('/')}
        />

        <LaunchCard 
          title="Palvelimen Etäpääte (ttyd)"
          description="Avaa suojatun WebSocket-yhteyden Ubuntu-palvelimelle (CLI). Istunto katkaistaan automaattisesti selaimen sulkeutuessa."
          iconName="Terminal"
          buttonText="Muodosta turvayhteys"
          isGenerating={loadingTarget === 'terminal'}
          error={errors['terminal']}
          
          readyUrl={readyUrls['terminal']}
          isActive={activeSessions['terminal']}
          
          onLaunch={() => handleLaunch('terminal', 'web-terminaali', '/terminal/')}
          onActivate={() => handleActivate('terminal')}
          onReturn={() => handleReturn('/terminal/')}
        />

      </div>
    </div>
  );
}