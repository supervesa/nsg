import React, { useMemo } from 'react';
import { Thermometer, Cloud, Sun, BrainCircuit } from 'lucide-react';

const parseMeta = (metaString) => {
  if (!metaString) return {};
  try {
    return typeof metaString === 'string' ? JSON.parse(metaString) : metaString;
  } catch (e) {
    return {};
  }
};

export default function WeatherAnalysis({ historyAnalytics, weatherForecast }) {
  // Etsitään uusin validi rivi
  const latestAnalytics = useMemo(() => {
    return historyAnalytics?.find(row => {
      const meta = parseMeta(row.meta);
      return meta.olohuone_temp !== undefined && meta.ruokatila_temp !== undefined;
    });
  }, [historyAnalytics]);

  const currentForecast = weatherForecast && weatherForecast.length > 0 ? weatherForecast[0] : null;

  if (!latestAnalytics) return null;

  const meta = parseMeta(latestAnalytics.meta);

  // Lämpötilat ja deltat
  const olohuone = parseFloat(meta.olohuone_temp || 0);
  const ruokatila = parseFloat(meta.ruokatila_temp || 0);
  const huoneDelta = (olohuone - ruokatila).toFixed(1);

  // Ulkoiset olosuhteet
  const omaUlkolampo = parseFloat(meta.outdoor_temp_mitsu || meta.outdoor_temp_hue || latestAnalytics.temp_outdoor_avg || 0);
  const ennusteLampo = currentForecast ? parseFloat(currentForecast.temperature) : omaUlkolampo;
  const saaDelta = (omaUlkolampo - ennusteLampo).toFixed(1);

  // Valoisuus & Tuotto
  const aurinkoTuotto = parseFloat(latestAnalytics.solar_yield_wh || 0);
  const omaLux = parseFloat(meta.outdoor_illuminance_hue || 0);
  const pilvisyys = latestAnalytics.weather_cloud_cover !== null ? parseFloat(latestAnalytics.weather_cloud_cover) : 
                    (currentForecast ? parseFloat(currentForecast.cloud_cover) : 0);

  const AnalysisRow = ({ label, value1, label1, value2, label2, delta, deltaLabel, icon: Icon }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 0', borderBottom: '1px solid var(--color-bg-clean)' }}>
      <div style={{ padding: '10px', backgroundColor: 'var(--color-bg-clean)', borderRadius: '8px', color: 'var(--color-text-main)' }}>
        <Icon size={20} />
      </div>
      <div style={{ flex: 1 }}>
        <div className="text-label" style={{ marginBottom: '4px' }}>{label}</div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'baseline', flexWrap: 'wrap' }}>
          <span><span style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>{value1}</span> <span className="text-technical" style={{ fontSize: '0.8rem' }}>{label1}</span></span>
          <span className="text-technical">vs</span>
          <span><span style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>{value2}</span> <span className="text-technical" style={{ fontSize: '0.8rem' }}>{label2}</span></span>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="text-label">{deltaLabel}</div>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: Math.abs(delta) > 1.5 ? 'var(--color-electric)' : 'var(--color-saab)' }}>
          {delta > 0 ? '+' : ''}{delta}
        </div>
      </div>
    </div>
  );

  return (
    <div className="ui-panel" style={{ padding: '24px' }}>
      <h3 className="text-title" style={{ marginBottom: '16px' }}>Kodin Dynamiikka</h3>
      
      <AnalysisRow 
        icon={Thermometer} label="Lämpötilan jakautuminen"
        value1={`${olohuone.toFixed(1)}°C`} label1="Olohuone"
        value2={`${ruokatila.toFixed(1)}°C`} label2="Ruokatila"
        delta={huoneDelta} deltaLabel="ΔT Erotus"
      />

      <AnalysisRow 
        icon={Cloud} label="Paikallinen sää vs. Ennuste"
        value1={`${omaUlkolampo.toFixed(1)}°C`} label1="Piha"
        value2={`${ennusteLampo.toFixed(1)}°C`} label2="Ennuste"
        delta={saaDelta} deltaLabel="Paikallis-Δ"
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 0' }}>
        <div style={{ padding: '10px', backgroundColor: 'var(--color-bg-clean)', borderRadius: '8px', color: 'var(--color-saab)' }}>
          <Sun size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="text-label" style={{ marginBottom: '4px' }}>Aurinko & Valoisuus</div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'baseline', flexWrap: 'wrap' }}>
            <span><span style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>{aurinkoTuotto}</span> <span className="text-technical" style={{ fontSize: '0.8rem' }}>Wh tuotto</span></span>
            <span className="text-technical">•</span>
            <span><span style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>{omaLux}</span> <span className="text-technical" style={{ fontSize: '0.8rem' }}>lux valoisuus</span></span>
            <span className="text-technical">•</span>
            <span><span style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>{pilvisyys}%</span> <span className="text-technical" style={{ fontSize: '0.8rem' }}>pilvistä</span></span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="text-label">Tila</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: aurinkoTuotto > 0 ? 'var(--color-saab)' : 'var(--color-text-muted)' }}>
            {aurinkoTuotto > 0 ? 'Aktiivinen' : 'Lepo'}
          </div>
        </div>
      </div>
    </div>
  );
}