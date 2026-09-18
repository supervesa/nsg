import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import { useSentinel } from '../../context/SentinelContext';
import StatsCard from '../../components/common/StatsCard';
import Button from '../../components/common/Button';
import { ShieldAlert, RefreshCw } from 'lucide-react';

export default function Home() {
  const { profile, hasRole } = useSentinel();
  
  const [solarData, setSolarData] = useState([]);
  const [heatingData, setHeatingData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tarkistetaan käyttöoikeudet (superadmin tai erillinen home-oikeus)
  const perms = typeof profile?.permissions === 'string' 
    ? JSON.parse(profile?.permissions || '{}') 
    : (profile?.permissions || {});
  
  const hasAccess = hasRole('superadmin') || perms?.home === true;

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Haetaan lämmitysdata puhtaasti homeassistant-skeemasta
      const { data: heating, error: heatingError } = await supabase
        .schema('homeassistant') 
        .from('heating_history')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle(); 

      if (heatingError) throw heatingError;

      // 2. Haetaan aurinkodata puhtaasti homeassistant-skeemasta
      const { data: solar, error: solarError } = await supabase
        .schema('homeassistant') 
        .from('solar_history')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(4);

      if (solarError) throw solarError;

      setHeatingData(heating || null);
      setSolarData(solar || []);

    } catch (err) {
      console.error("Virhe haettaessa kotidataa:", JSON.stringify(err, null, 2));
      setError("Tietojen haku epäonnistui. Tarkista konsoli (F12).");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hasAccess) {
      fetchData();
    }
  }, [hasAccess]);

  // Pääsyn eväys
  if (!hasAccess) {
    return (
      <div style={{ padding: '32px' }}>
        <h2 className="text-title" style={{ marginBottom: '16px', color: 'var(--color-rosso)' }}>Pääsy evätty</h2>
        <div className="ui-panel" style={{ padding: '24px' }}>
          <p>Sinulla ei ole tarvittavia valtuuksia kodin mittariston tarkasteluun.</p>
        </div>
      </div>
    );
  }

  // Etsitään halutut sensorit aurinkodatasta. 
  // Turvatarkistukset mukana, jos joku arvo uupuisi.
  const pvPower = solarData?.find(s => s?.sensor_id?.includes('pv_power'))?.value || '0';
  const dailyYield = solarData?.find(s => s?.sensor_id?.includes('daily_yield'))?.value || '0';
  
  const isGenerating = parseFloat(pvPower) > 0;

  return (
    <div className="layout-dashboard">
      
      {/* Yläpalkki */}
      <div className="flex-between mb-8" style={{ flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 className="text-title" style={{ marginBottom: '8px' }}>Kodin Yhteenveto</h2>
          <p className="text-muted" style={{ margin: 0 }}>
            Reaaliaikainen data aurinkopaneeleista ja lämmitysjärjestelmästä.
          </p>
        </div>
        
        <Button 
          variant="secondary" 
          icon={RefreshCw} 
          onClick={fetchData} 
          isLoading={isLoading}
        >
          Päivitä tiedot
        </Button>
      </div>

      {error && (
        <div className="text-error" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          <ShieldAlert size={20} />
          {error}
        </div>
      )}

      {/* Mittaristo (Grid) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
        
        {/* Aurinkovoima: Teho */}
        <StatsCard 
          title="Aurinkovoima"
          value={pvPower}
          unit="W"
          description="Paneelien tuottama hetkellinen teho"
          iconName="Sun"
          isActive={isGenerating}
        />

        {/* Aurinkovoima: Päivän tuotto */}
        <StatsCard 
          title="Päivän Tuotto"
          value={dailyYield}
          unit="Wh"
          description="Tämän päivän kokonaistuotto tähän mennessä"
          iconName="BatteryCharging"
        />

        {/* Sisäilma */}
        <StatsCard 
          title="Sisäilma"
          value={heatingData?.indoor_temp}
          unit="°C"
          description="Olohuoneen mitattu lämpötila"
          subLabel="TAVOITELÄMPÖTILA"
          subValue={heatingData?.target_temp ? `${heatingData.target_temp} °C` : '-'}
          iconName="Home"
        />

        {/* Sää ja Ulkoilma */}
        <StatsCard 
          title="Ulkoilma"
          value={heatingData?.outdoor_temp}
          unit="°C"
          description="Ulkolämpötila tällä hetkellä"
          subLabel="3H ENNUSTE"
          subValue={heatingData?.forecast_3h ? `${heatingData.forecast_3h} °C` : '-'}
          iconName="Cloud"
        />

      </div>
    </div>
  );
}