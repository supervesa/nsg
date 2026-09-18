import React from 'react';
import { Activity, Thermometer, Zap, Coins } from 'lucide-react';

export default function HeatpumpMath({ historyData }) {
  if (!historyData || historyData.length === 0) {
    return <p className="text-muted">Ei tarpeeksi dataa laskentaan vielä tänään.</p>;
  }

  // Uusin data on indeksissä 0, vanhin (tämän päivän ensimmäinen) on viimeinen.
  const current = historyData[0];
  const startOfDay = historyData[historyData.length - 1];

  // 1. Delta T (Lämpötilaero tavoitteen ja todellisen välillä)
  const room = parseFloat(current.room_temp || 0);
  const target = parseFloat(current.target_temp || 0);
  const deltaT = (room - target).toFixed(1);
  const deltaColor = deltaT > 0 ? 'var(--color-rosso)' : (deltaT < 0 ? 'var(--color-electric)' : 'var(--color-saab)');

  // 2. Päivän kulutus (Kumulatiivinen energia UUSIN - VANHIN)
  const energyCurrent = parseFloat(current.energy_consumed || 0);
  const energyStart = parseFloat(startOfDay.energy_consumed || 0);
  const dailyConsumption = (energyCurrent - energyStart).toFixed(2);

  // 3. Sähkön hinta-arvio (Oletuksena 15 c / kWh, voit vaihtaa tämän myöhemmin dynaamiseksi)
  const pricePerKwh = 0.15; 
  const dailyCost = (dailyConsumption * pricePerKwh).toFixed(2);

  // 4. Käyntiaika (Uptime) % tältä päivältä
  const activeRecords = historyData.filter(row => row.state !== 'off').length;
  const uptimePercent = ((activeRecords / historyData.length) * 100).toFixed(0);

  // Pienkomponentti tulosten piirtämiseen
  const StatItem = ({ icon: Icon, label, value, unit, color }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', backgroundColor: 'var(--color-bg-clean)', borderRadius: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-technical)' }}>
        <Icon size={16} />
        <span className="text-label" style={{ fontSize: '0.65rem' }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
        <span style={{ fontSize: '1.5rem', fontWeight: '700', color: color || 'var(--color-text-main)', lineHeight: '1' }}>{value}</span>
        <span className="text-technical" style={{ fontSize: '0.85rem' }}>{unit}</span>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
      <StatItem 
        icon={Zap} label="TÄMÄN PÄIVÄN KULUTUS" 
        value={dailyConsumption > 0 ? dailyConsumption : '0.00'} unit="kWh" 
      />
      <StatItem 
        icon={Coins} label="KUSTANNUSARVIO (15 c/kWh)" 
        value={dailyCost > 0 ? dailyCost : '0.00'} unit="€" 
      />
      <StatItem 
        icon={Thermometer} label="LÄMPÖTILAERO (DELTA T)" 
        value={deltaT > 0 ? `+${deltaT}` : deltaT} unit="°C" color={deltaColor}
      />
      <StatItem 
        icon={Activity} label="PUMPUN KÄYNTIAIKA TÄNÄÄN" 
        value={uptimePercent} unit="%" 
      />
    </div>
  );
}