import React, { useState, useMemo } from 'react';
import WidgetSmall from '../../../components/common/WidgetSmall';
import WidgetNormal from '../../../components/common/WidgetNormal';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Clock, Zap } from 'lucide-react';

export const meta = { 
  order: 6, 
  title: 'Ilmanvaihto',
  id: 'ventilation'
};

// Määritellään raja-arvo tehostukselle, olettaen, että normaali 1-2 taso on alle 110W
const BOOST_THRESHOLD_W = 110; 

// Apufunktio ajan muotoiluun (Vain klo)
const formatTime = (isoString) => {
  return new Date(isoString).toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' });
};

// Apufunktio päivämäärän ja ajan muotoiluun (Tooltipia varten)
const formatDateTime = (isoString) => {
  const date = new Date(isoString);
  return `${date.toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric' })} klo ${date.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })}`;
};

// --- YLÄRIVIN PIENI WIDGET ---
export function SmallWidget({ data }) {
  const logs = data?.ventilationLogs || [];
  const latestLog = logs[0];

  if (!latestLog) {
    return (
      <WidgetSmall 
        title="Ilmanvaihto" 
        value="-" 
        iconName="Fan" 
        isActive={false} 
      />
    );
  }

  const currentPower = parseFloat(latestLog.power_w);
  const isBoostActive = currentPower > BOOST_THRESHOLD_W;

  return (
    <WidgetSmall 
      title="Ilmanvaihto" 
      value={`${currentPower.toFixed(0)} W`} 
      iconName="Fan" 
      isActive={true}
      statusColor={isBoostActive ? 'var(--color-saab)' : 'var(--color-electric)'}
    />
  );
}

// --- YLEISKATSAUKSEN ISO KORTTI (KLIKATTAVA) ---
export function NormalWidget({ data }) {
  // 1. Hookit AINA ensimmäisenä, ei ehtoja näiden yläpuolelle!
  const [isExpanded, setIsExpanded] = useState(false);
  const logs = data?.ventilationLogs || [];
  
  // 2. Analysoidaan data Memossa, suojataan tyhjältä taulukolta
  const analysis = useMemo(() => {
    if (!logs || logs.length === 0) return null;

    // Graafidata kronologisessa järjestyksessä (vanhin ensin)
    const reversedLogs = [...logs].reverse();
    
    // Muotoillaan data Rechratin tarpeisiin (X-akselille tallennetaan pelkkä aika ruudun säästämiseksi, mutta tooltipille koko aika)
    const formattedChartData = reversedLogs.map(log => ({
      time: formatTime(log.created_at),
      fullTime: formatDateTime(log.created_at),
      power: parseFloat(log.power_w)
    }));
    
    // Nypitään tehostushetket kronologisessa järjestyksessä näyttämistä varten (Vain tehostukset!)
    const boosts = logs.filter(log => parseFloat(log.power_w) > BOOST_THRESHOLD_W).slice(0, 7); 
    
    // Nykyinen teho
    const latest = logs[0];
    const current = parseFloat(latest.power_w);
    const oldest = reversedLogs[0];
    
    // Kokonaisenergia seurantavälillä
    const energyDiff = Math.max(0, parseFloat(latest.energy_kwh) - parseFloat(oldest.energy_kwh));

    return {
      chartData: formattedChartData,
      boostEvents: boosts,
      currentPower: current,
      totalEnergy: energyDiff,
      latestLogTime: latest.created_at
    };
  }, [logs]);
  
  // 3. Vasta hookkien JÄLKEEN voidaan katkaista renderöinti (Early return), jos dataa ei ole
  if (!analysis) {
    return (
      <div className="ui-panel" style={{ padding: '32px', textAlign: 'center', gridColumn: '1 / -1' }}>
        <p className="text-muted">Ei ilmanvaihtokoneen kulutusdataa saatavilla.</p>
      </div>
    );
  }

  // 4. Puretaan laskettu data käyttöön
  const { chartData, boostEvents, currentPower, totalEnergy, latestLogTime } = analysis;
  
  const isBoostActive = currentPower > BOOST_THRESHOLD_W;
  const statusDisplay = isBoostActive 
    ? <span style={{ color: 'var(--color-saab)', fontWeight: 'bold' }}>Tehostus päällä!</span>
    : "Normaali (Taso 1-2)";

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: isExpanded ? 'auto' : '100%' }}>
      
      {/* 1. PERUSWIDGET (Klikattava nappi) */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)} 
        style={{ cursor: 'pointer', height: '100%', position: 'relative' }}
        title="Klikkaa nähdäksesi tehovaihtelut ja historian"
      >
        <WidgetNormal 
          title="Ilmanvaihto"
          value={currentPower.toFixed(0)} 
          unit="W"
          description={<span>Tila: {statusDisplay}</span>}
          subLabel="SEURANTAVÄLI (7 PÄIVÄÄ)"
          subValue={`${totalEnergy.toFixed(2)} kWh`}
          iconName="Fan"
          isActive={isBoostActive} // Muuttuu Saab-vihreäksi vain jos tehostus
        />
      </div>

      {/* 2. LISÄTIEDOT (Aukeaa alle kun klikattu) */}
      {isExpanded && (
        <div className="ui-panel smooth-transition" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* A. Tehograafi (Recharts) */}
          <div style={{ height: '200px', width: '100%' }}>
             <div style={{ fontSize: '0.75rem', color: 'var(--color-text-technical)', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}>
                Tehohistoria (7 Päivää)
             </div>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <XAxis 
                  dataKey="time" 
                  stroke="var(--color-text-technical)" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                  minTickGap={30} 
                />
                <YAxis 
                  stroke="var(--color-text-technical)" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false}
                  domain={['dataMin - 10', 'dataMax + 20']} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--color-tooltip-bg)', borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-elegant)' }}
                  labelStyle={{ color: 'var(--color-text-muted)', marginBottom: '4px' }}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.fullTime || label}
                  formatter={(value) => [`${value.toFixed(0)} W`, 'Teho']}
                />
                <Area 
                  type="monotone" 
                  dataKey="power" 
                  stroke="var(--color-electric)" 
                  fillOpacity={0.2} 
                  fill="var(--color-electric)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* B. Tehostusloki (Lista alhaalla, täysin Kylmiön tyyliin) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-technical)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    Tunnistetut tehostusjaksot
                </div>
                <div className="text-muted" style={{ fontSize: '0.7rem' }}>Raja: {BOOST_THRESHOLD_W} W</div>
            </div>
            
            {boostEvents.length > 0 ? (
                boostEvents.map((event, idx) => (
                <div key={event.id || idx} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--color-border-subtle)', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={14} className="text-muted" />
                        <span style={{ color: 'var(--color-text-main)', fontWeight: '500', fontSize: '0.85rem' }}>
                            {formatDateTime(event.created_at)}
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', color: 'var(--color-saab)', alignItems: 'center' }}>
                        <Zap size={14} />
                        <span style={{ width: '50px', textAlign: 'right', fontWeight: 'bold' }}>{parseFloat(event.power_w).toFixed(0)} W</span>
                    </div>
                </div>
                ))
            ) : (
                <div style={{ padding: '12px 0', borderBottom: '1px solid var(--color-border-subtle)', marginBottom: '8px' }}>
                    <span className="text-technical" style={{ fontSize: '0.85rem' }}>Ei tehostusjaksoja valitulla aikavälillä.</span>
                </div>
            )}
            
            <div style={{ marginTop: '12px', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Päivitetty: {formatTime(latestLogTime)}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}