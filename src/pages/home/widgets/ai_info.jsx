import React, { useState, useMemo } from 'react';
import WidgetSmall from '../../../components/common/WidgetSmall';
import WidgetNormal from '../../../components/common/WidgetNormal';
import Accordion from '../../../components/common/Accordion';
import MetricBlock from '../../../components/common/MetricBlock';
import Badge from '../../../components/common/Badge';
import Paragraph from '../../../components/common/Paragraph';
import { BrainCircuit, Cpu, ThermometerSun, Wallet, Coins, Zap, Thermometer } from 'lucide-react';

export const meta = { 
  order: 9, 
  title: 'AI-Ohjaus',
  id: 'ai_control'
};

const getChipColor = (key) => {
  if (key.includes('temp') || key.includes('target')) return 'var(--color-electric)'; 
  if (key.includes('pct') || key.includes('free_ride')) return 'var(--color-saab)'; 
  if (key.includes('limit') || key.includes('price')) return 'var(--color-hermes)'; 
  return 'var(--color-text-technical)';
};

// --- YLÄRIVIN PIENI WIDGET ---
export function SmallWidget({ data }) {
  const logs = data?.aiBotLogs || [];
  const latestLog = logs[0];

  if (!latestLog) {
    return (
      <WidgetSmall 
        title="AI-Ohjaus" 
        value="-" 
        iconName="BrainCircuit" 
        isActive={false} 
      />
    );
  }

  let strategy = "Eco";
  try {
    const settings = typeof latestLog.proposed_settings === 'string' ? JSON.parse(latestLog.proposed_settings) : latestLog.proposed_settings;
    if (latestLog.ai_analysis_text?.toLowerCase().includes('comfort') || settings?.normal_thermo_target >= 21) {
      strategy = "Comfort";
    }
  } catch (e) {}

  return (
    <WidgetSmall 
      title="AI-Ohjaus" 
      value={strategy} 
      iconName="BrainCircuit" 
      isActive={true}
      statusColor="var(--color-saab)" 
    />
  );
}

// --- YLEISKATSAUKSEN ISO KORTTI (KLIKATTAVA) ---
export function NormalWidget({ data }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const logs = data?.aiBotLogs || [];
  
  const analysis = useMemo(() => {
    if (!logs || logs.length === 0) return null;
    const latest = logs[0];
    
    let settings = {};
    let wallet = {};
    let env = {};
    
    try { settings = typeof latest.proposed_settings === 'string' ? JSON.parse(latest.proposed_settings) : latest.proposed_settings || {}; } catch(e){}
    try { wallet = typeof latest.context_wallet === 'string' ? JSON.parse(latest.context_wallet) : latest.context_wallet || {}; } catch(e){}
    try { env = typeof latest.context_environment === 'string' ? JSON.parse(latest.context_environment) : latest.context_environment || {}; } catch(e){}

    let strategy = "Eco";
    if (latest.ai_analysis_text?.toLowerCase().includes('comfort') || settings?.normal_thermo_target >= 21) {
      strategy = "Comfort";
    }

    const greeting = latest.morning_greeting_text || latest.evening_greeting_text || "Tervehdys!";
    const shortGreeting = greeting.length > 70 ? greeting.substring(0, 70) + '...' : greeting;

    return { latest, settings, wallet, env, strategy, greeting, shortGreeting };
  }, [logs]);
  
  if (!analysis) {
    return (
      <div className="ui-panel" style={{ padding: 'var(--padding-panel)', textAlign: 'center', gridColumn: '1 / -1' }}>
        <p className="text-muted">Ei tekoälyn ohjausdataa saatavilla.</p>
      </div>
    );
  }

  const { latest, settings, wallet, env, strategy, greeting, shortGreeting } = analysis;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-grid)', height: isExpanded ? 'auto' : '100%' }}>
      
      <div 
        onClick={() => setIsExpanded(!isExpanded)} 
        style={{ cursor: 'pointer', height: '100%', position: 'relative' }}
        title="Klikkaa nähdäksesi tekoälyn koko analyysin ja asetetut tavoitteet"
      >
        <WidgetNormal 
          title="AI-Ohjaus"
          value={strategy} 
          unit=""
          description={<span>{shortGreeting}</span>}
          subLabel="TILANNE"
          subValue={latest.execution_mode === 'DRY_RUN' ? 'Simulaatio' : 'Aktiivinen'}
          iconName="BrainCircuit"
          isActive={true} 
        />
      </div>

      {isExpanded && (
        <div className="ui-panel smooth-transition" style={{ padding: 'var(--padding-panel)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-layout)' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-technical)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                Tekoälyn tilannekatsaus
              </div>
              <Badge label={strategy} isActive={strategy === 'Comfort'} />
            </div>
            
            {/* UUSI PARAGRAPH-KOMPONENTTI KÄYTÖSSÄ TÄSSÄ */}
            <Paragraph>
              {greeting}
            </Paragraph>

            <div style={{ backgroundColor: 'var(--color-bg-clean)', padding: '16px', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Cpu size={16} className="text-muted" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-main)' }}>Analyysin perustelut</span>
              </div>
              
              {/* JA TÄSSÄ */}
              <Paragraph variant="muted">
                {latest.ai_analysis_text}
              </Paragraph>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--color-bg-clean)', paddingTop: 'var(--padding-panel)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <ThermometerSun size={16} className="text-saab" />
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-technical)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                Lasketut ohjausarvot (KPI Targets)
              </div>
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {Object.entries(settings).map(([key, value]) => {
                if (typeof value === 'object') return null; 
                return (
                  <div key={key} style={{ 
                    display: 'flex', alignItems: 'center', gap: '6px', 
                    padding: '6px 12px', 
                    backgroundColor: 'var(--color-surface)', 
                    border: `1px solid ${getChipColor(key)}`, 
                    borderRadius: '20px',
                    fontSize: '0.8rem'
                  }}>
                    <span style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>{key.replace(/_/g, ' ')}:</span>
                    <span style={{ color: getChipColor(key), fontWeight: 700 }}>{value}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <Accordion title="Päätöksen Konteksti (Data)" iconName="Wallet">
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: 'var(--spacing-grid)',
              margin: 'calc(var(--padding-panel) * -0.5) 0'
            }}>
              
              <MetricBlock 
                title="Budjetin Paine" 
                mainValue={`${wallet?.financial_pressure_pct || 0} %`} 
                iconName="Wallet"
                valueColor={wallet?.financial_pressure_pct > 20 ? 'var(--color-rosso)' : 'var(--color-saab)'}
              />
              
              <MetricBlock 
                title="Käytettävissä" 
                mainValue={`${((wallet?.total_available_snt || 0) / 100).toFixed(2)} €`} 
                subValue={`Käytetty: ${((wallet?.consumed_snt || 0) / 100).toFixed(2)} €`}
                iconName="Coins"
                valueColor="var(--color-text-main)"
              />
              
              <MetricBlock 
                title="Sähkön KA (24h)" 
                mainValue={`${env?.electricity_24h?.avg_eur || 0} snt`}
                iconName="Zap"
                valueColor="var(--color-electric)"
              />
              
              <MetricBlock 
                title="Ulkolämpötila (24h)" 
                mainValue={`${env?.weather_24h?.avg_temp || 0} °C`} 
                subValue={`Alin: ${env?.weather_24h?.min_temp || 0} °C`}
                iconName="Thermometer"
                valueColor="var(--color-text-main)"
              />

            </div>
          </Accordion>

        </div>
      )}
    </div>
  );
}