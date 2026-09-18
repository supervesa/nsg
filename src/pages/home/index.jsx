import React, { useState, useEffect } from 'react';
import { macbase } from '../../config/supabaseClient'; 
import { useSentinel } from '../../context/SentinelContext';
import StatsCard from '../../components/common/StatsCard';
import Accordion from '../../components/common/Accordion';
import Button from '../../components/common/Button';
import { ShieldAlert, RefreshCw } from 'lucide-react';

import HeatpumpMath from './heat_pump/math'; 
import NordpoolEnergy from './nordpool/energy'; // UUSI TUONTI

const getHeatpumpStateName = (state) => {
  const states = { 'heat_cool': 'Auto', 'heat': 'Lämmitys', 'cool': 'Viilennys', 'dry': 'Kuivaus', 'fan_only': 'Puhallus', 'off': 'Pois' };
  return states[state] || state || '-';
};

const getFanModeName = (mode) => {
  const modes = { 'auto': 'Automaattinen', 'quiet': 'Hiljainen', 'low': 'Pieni', 'medium': 'Keskiteho', 'high': 'Maksimi' };
  return modes[mode] || mode || '-';
};

export default function Home() {
  const { profile, hasRole } = useSentinel();
  
  const [solarData, setSolarData] = useState([]);
  const [heatingData, setHeatingData] = useState(null);
  const [heatpumpHistory, setHeatpumpHistory] = useState([]);
  const [nordpoolPrices, setNordpoolPrices] = useState([]); 
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const perms = typeof profile?.permissions === 'string' 
    ? JSON.parse(profile?.permissions || '{}') : (profile?.permissions || {});
  
  const hasAccess = hasRole('superadmin') || perms?.home === true;

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0); 
      const todayIso = today.toISOString();

      const { data: heating, error: heatingError } = await macbase
        .schema('homeassistant') 
        .from('heating_history')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle(); 

      if (heatingError) throw heatingError;

      const { data: solar, error: solarError } = await macbase
        .schema('homeassistant') 
        .from('solar_history')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(4);

      if (solarError) throw solarError;

      const { data: heatpump, error: hpError } = await macbase
        .schema('homeassistant')
        .from('heatpump_history')
        .select('*')
        .gte('recorded_at', todayIso) 
        .order('recorded_at', { ascending: false });
        
      if (hpError) throw hpError;

      const { data: nordpool, error: npError } = await macbase
        .schema('homeassistant')
        .from('nordpool_prices')
        .select('*')
        .gte('start_time', todayIso);

      if (npError) throw npError;

      setHeatingData(heating || null);
      setSolarData(solar || []);
      setHeatpumpHistory(heatpump || []);
      setNordpoolPrices(nordpool || []);

    } catch (err) {
      console.error("Virhe haettaessa kotidataa:", err);
      setError("Tietojen haku epäonnistui. Tarkista tietokantayhteys.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hasAccess) fetchData();
  }, [hasAccess]);

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

  const pvPower = solarData?.find(s => s?.sensor_id?.includes('pv_power'))?.value || '0';
  const dailyYield = solarData?.find(s => s?.sensor_id?.includes('daily_yield'))?.value || '0';
  const isGenerating = parseFloat(pvPower) > 0;
  
  const currentHeatpump = heatpumpHistory.length > 0 ? heatpumpHistory[0] : null;
  const hpIsRunning = currentHeatpump?.state && currentHeatpump.state !== 'off';

 return (
    <div className="layout-dashboard">
      <div className="flex-between mb-8" style={{ flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 className="text-title" style={{ marginBottom: '8px' }}>Kodin Yhteenveto</h2>
          <p className="text-muted" style={{ margin: 0 }}>
            Reaaliaikainen data aurinkopaneeleista ja lämmitysjärjestelmästä.
          </p>
        </div>
        
        <Button variant="secondary" icon={RefreshCw} onClick={fetchData} isLoading={isLoading}>
          Päivitä tiedot
        </Button>
      </div>

      {error && (
        <div className="text-error" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          <ShieldAlert size={20} />
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        
        <StatsCard 
          title="Aurinkovoima" 
          value={pvPower} unit="W" 
          description="Paneelien tuottama hetkellinen teho" 
          iconName="Sun" 
          isActive={isGenerating} 
        />
        
        <StatsCard 
          title="Päivän Tuotto" 
          value={dailyYield} unit="Wh" 
          description="Tämän päivän kokonaistuotto" 
          iconName="BatteryCharging" 
        />

        <StatsCard 
          title="Ilmalämpöpumppu"
          value={currentHeatpump?.target_temp} 
          unit="°C"
          description={`Tila: ${getHeatpumpStateName(currentHeatpump?.state)} • Sisälämpö: ${currentHeatpump?.room_temp || '-'} °C`}
          subLabel="PUHALLIN"
          subValue={getFanModeName(currentHeatpump?.fan_mode)}
          iconName="Wind"
          isActive={hpIsRunning}
        />

        <StatsCard 
          title="Patteriverkosto"
          value={heatingData?.indoor_temp} unit="°C"
          description="Olohuoneen anturin mitattu lämpötila"
          subLabel="ULKOLÄMPÖTILA"
          subValue={heatingData?.outdoor_temp ? `${heatingData.outdoor_temp} °C` : '-'}
          iconName="Home"
        />

      </div>

      {/* UUSI: Pörssisähkö-haitari lisätty ensin */}
      {nordpoolPrices.length > 0 && (
        <div className="mb-4">
          <Accordion title="Pörssisähkö (Nordpool)" iconName="Zap" defaultOpen={true}>
            <NordpoolEnergy nordpoolPrices={nordpoolPrices} />
          </Accordion>
        </div>
      )}

      {/* Pumppuanalyysi laitettu defaultOpen={false} pitämään näkymä siistinä, muuta trueksi jos haluat molemmat auki */}
      {heatpumpHistory.length > 0 && (
        <div className="mb-4">
          <Accordion title="Analyysi ja Kulutuslaskenta (Ilmalämpöpumppu)" iconName="Calculator" defaultOpen={false}>
            <HeatpumpMath historyData={heatpumpHistory} nordpoolPrices={nordpoolPrices} />
          </Accordion>
        </div>
      )}

    </div>
  );
}