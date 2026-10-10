import React, { useState, useEffect } from 'react';
import { macbase } from '../../config/supabaseClient'; 
import { useSentinel } from '../../context/SentinelContext';
import { ShieldAlert, RefreshCw } from 'lucide-react';
import Button from '../../components/common/Button';
import DashboardLayout from './components/DashboardLayout';

export default function Home() {
  const { profile, hasRole } = useSentinel();
  
  // Tilan hallinta
  const [solarData, setSolarData] = useState([]);
  const [heatingData, setHeatingData] = useState(null);
  const [heatpumpHistory, setHeatpumpHistory] = useState([]);
  const [nordpoolPrices, setNordpoolPrices] = useState([]); 
  const [historyAnalytics, setHistoryAnalytics] = useState([]);
  const [weatherForecast, setWeatherForecast] = useState([]);
  const [logHeating, setLogHeating] = useState([]); // UUSI: Ulkolämpötilat
  const [kylmioData, setKylmioData] = useState([]); // UUSI: Kylmiön 4h data

  // UI-tila
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const perms = typeof profile?.permissions === 'string' 
    ? JSON.parse(profile?.permissions || '{}') : (profile?.permissions || {});
  
  const hasAccess = hasRole('superadmin') || perms?.home === true;

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Haetaan viimeiset 7 päivää, jotta päivärullaus toimii
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0); 
      const timeWindowIso = sevenDaysAgo.toISOString();

const [
        heatingRes,
        solarRes,
        heatpumpRes,
        nordpoolRes,
        analyticsRes,
        weatherRes,
        logHeatingRes,
        kylmioRes // UUSI
      ] = await Promise.all([
        macbase.schema('homeassistant').from('heating_history').select('*').order('recorded_at', { ascending: false }).limit(1).maybeSingle(),
        macbase.schema('homeassistant').from('solar_history').select('*').order('recorded_at', { ascending: false }).limit(4),
        macbase.schema('homeassistant').from('heatpump_history').select('*').gte('recorded_at', timeWindowIso).order('recorded_at', { ascending: false }),
        macbase.schema('homeassistant').from('nordpool_prices').select('*').gte('start_time', timeWindowIso),
        macbase.schema('homeassistant').from('history_analytics').select('*').order('hour_id', { ascending: false }).limit(24),
        macbase.schema('homeassistant').from('weather_forecast').select('*').gte('target_time', timeWindowIso).order('target_time', { ascending: true }),
        macbase.schema('homeassistant').from('log_heating').select('recorded_at, outdoor_temp_mitsu, outdoor_temp_hue').gte('recorded_at', timeWindowIso).order('recorded_at', { ascending: true }),
        macbase.schema('homeassistant').from('log_appliances_energy').select('*').eq('appliance_name', 'kylmio').order('created_at', { ascending: false }).limit(24) // UUSI (4 tunnin ikkuna)
      ]);

      if (heatingRes.error) throw heatingRes.error;
      if (solarRes.error) throw solarRes.error;
      if (heatpumpRes.error) throw heatpumpRes.error;
      if (nordpoolRes.error) throw nordpoolRes.error;
      if (logHeatingRes.error) throw logHeatingRes.error;
      if (kylmioRes.error) throw kylmioRes.error; // UUSI
      if (analyticsRes.error && analyticsRes.error.code !== '42P01') throw analyticsRes.error; 
      if (weatherRes.error && weatherRes.error.code !== '42P01') throw weatherRes.error;     

      setHeatingData(heatingRes.data || null);
      setSolarData(solarRes.data || []);
      setHeatpumpHistory(heatpumpRes.data || []);
      setNordpoolPrices(nordpoolRes.data || []);
      setHistoryAnalytics(analyticsRes.data || []);
      setWeatherForecast(weatherRes.data || []);
      setLogHeating(logHeatingRes.data || []);
      setKylmioData(kylmioRes.data || []); // UUSI

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

  const homeData = {
    solarData,
    heatingData,
    heatpumpHistory,
    nordpoolPrices,
    historyAnalytics,
    weatherForecast,
    logHeating, // Välitetään eteenpäin
    kylmioData, // UUSI
    isLoading
  };

  return (
    <div className="layout-dashboard">
      <div className="flex-between mb-8" style={{ flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 className="text-title" style={{ marginBottom: '8px' }}>Kodin Yhteenveto</h2>
          <p className="text-muted" style={{ margin: 0 }}>
            Reaaliaikainen analytiikka, automaatio ja sääolosuhteet.
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

      <DashboardLayout data={homeData} />
    </div>
  );
}