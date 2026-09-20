import React from 'react';
import StatsCard from '../../../components/common/StatsCard';
import { Cloud, CloudRain, Sun, Wind, Thermometer, BrainCircuit } from 'lucide-react';

export const meta = {
  id: 'weather',
  title: 'Sää & Lämpö',
  icon: 'CloudSun',
  order: 4
};

export default function WeatherTab({ data }) {
  const { historyAnalytics, weatherForecast } = data;

  // Haetaan uusin analytiikkarivi (yleensä historyAnalytics[0])
  const latestAnalytic = historyAnalytics?.length > 0 ? historyAnalytics[0] : null;

  // Ajan formatointi (esim. klo 14:00)
  const formatTime = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' });
  };

  // Sääikonin valinta pilvisyyden ja sateen mukaan (yksinkertainen logiikka)
  const getWeatherIcon = (cloudCover, precip) => {
    if (precip > 0.5) return <CloudRain size={24} color="var(--color-electric)" />;
    if (cloudCover > 60) return <Cloud size={24} color="var(--color-text-technical)" />;
    if (cloudCover > 30) return <Cloud size={24} color="var(--color-text-main)" />;
    return <Sun size={24} color="var(--color-saab)" />;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. TEKOÄLYN SEMANTTINEN YHTEENVETO (Jos saatavilla) */}
      {latestAnalytic?.semantic_text && (
        <div className="ui-panel" style={{ padding: '16px', borderLeft: '4px solid var(--color-electric)', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{ padding: '10px', backgroundColor: 'var(--color-bg-clean)', borderRadius: '50%' }}>
            <BrainCircuit size={20} color="var(--color-electric)" />
          </div>
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
              Talon tilanne (Tekoälyn tilannekuva)
            </h4>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
              {latestAnalytic.semantic_text}
            </p>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
        
        {/* Sisälämpötila */}
        <StatsCard 
          title="Sisälämpötila (Keskiarvo)" 
          value={latestAnalytic?.temp_indoor_avg ? parseFloat(latestAnalytic.temp_indoor_avg).toFixed(1) : '-'} 
          unit="°C" 
          description="Laskettu talon kaikista antureista" 
          iconName="Thermometer" 
          isActive={true} 
        />
        
        {/* Ulkolämpötila */}
        <StatsCard 
          title="Ulkolämpötila" 
          value={latestAnalytic?.temp_outdoor_avg ? parseFloat(latestAnalytic.temp_outdoor_avg).toFixed(1) : '-'} 
          unit="°C" 
          description="Pihan antureiden keskiarvo" 
          iconName="TreePine" 
        />

      </div>

      {/* 2. TULEVA SÄÄENNUSTE */}
      <h3 className="text-title" style={{ marginTop: '16px', marginBottom: '8px' }}>Sääennuste</h3>
      
      {weatherForecast && weatherForecast.length > 0 ? (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
          gap: '12px' 
        }}>
          {weatherForecast.slice(0, 6).map((forecast, index) => {
            const temp = parseFloat(forecast.temperature).toFixed(1);
            const wind = parseFloat(forecast.wind_speed).toFixed(1);
            const precip = parseFloat(forecast.precipitation || 0);
            const clouds = parseFloat(forecast.cloud_cover || 0);

            return (
              <div key={index} className="ui-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '12px' }}>
                <span className="text-technical" style={{ fontWeight: 600 }}>
                  klo {formatTime(forecast.target_time)}
                </span>
                
                {getWeatherIcon(clouds, precip)}
                
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-main)' }}>
                    {temp}°C
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '4px', color: 'var(--color-text-technical)' }}>
                    <Wind size={12} />
                    <span style={{ fontSize: '0.75rem' }}>{wind} m/s</span>
                  </div>
                  {precip > 0 && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-electric)', marginTop: '2px', fontWeight: 600 }}>
                      {precip.toFixed(1)} mm
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="ui-panel" style={{ padding: '24px', textAlign: 'center' }}>
          <p className="text-muted">Ei sääennustedataa saatavilla tälle päivälle.</p>
        </div>
      )}

    </div>
  );
}