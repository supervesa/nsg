import React from 'react';
import { Activity, Thermometer, Zap, Coins } from 'lucide-react';

export default function HeatpumpMath({ historyData, nordpoolPrices = [] }) {
  if (!historyData || historyData.length === 0) {
    return <p className="text-muted">Ei tarpeeksi dataa laskentaan vielä tänään.</p>;
  }

  // 1. Uusin ja vanhin data perustilastoja varten
  const current = historyData[0];
  const startOfDay = historyData[historyData.length - 1];

  // Lämpötilaero (Delta T)
  const room = parseFloat(current.room_temp || 0);
  const target = parseFloat(current.target_temp || 0);
  const deltaT = (room - target).toFixed(1);
  const deltaColor = deltaT > 0 ? 'var(--color-rosso)' : (deltaT < 0 ? 'var(--color-electric)' : 'var(--color-saab)');

  // Päivän kokonaiskulutus
  const energyCurrent = parseFloat(current.energy_consumed || 0);
  const energyStart = parseFloat(startOfDay.energy_consumed || 0);
  const dailyConsumption = (energyCurrent - energyStart).toFixed(2);

  // 2. TARKKA TUNTIKOHTAINEN KUSTANNUSLASKENTA
  let totalCostEur = 0;
  
  // Käännetään historia vanhimmasta uusimpaan tarkan lisäyksen laskemiseksi
  const chronologicalHistory = [...historyData].reverse();

  for (let i = 1; i < chronologicalHistory.length; i++) {
    const prev = chronologicalHistory[i - 1];
    const curr = chronologicalHistory[i];

    const prevEnergy = parseFloat(prev.energy_consumed || 0);
    const currEnergy = parseFloat(curr.energy_consumed || 0);
    const energyDiff = currEnergy - prevEnergy;
    
    // Jos energiaa on kulunut tällä mittausvälillä
    if (energyDiff > 0) {
      const recordTime = new Date(prev.recorded_at).getTime();
      
      // Etsitään tätä ajanhetkeä vastaava hinta Nordpool-datasta
      const priceRecord = nordpoolPrices.find(p => {
        const start = new Date(p.start_time).getTime();
        const end = new Date(p.end_time).getTime();
        return recordTime >= start && recordTime < end;
      });

      // Hinta on senttejä (esim. 6.50), jaetaan 100 jotta saadaan kerroin euroina (0.065 €/kWh)
      const priceCents = priceRecord ? parseFloat(priceRecord.price) : 0;
      const priceEur = priceCents / 100;
      
      totalCostEur += (energyDiff * priceEur);
    }
  }

  const dailyCostFormatted = totalCostEur.toFixed(2);

  // 3. Käyntiaika (Uptime) % tältä päivältä
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
        icon={Coins} label="KUSTANNUSARVIO (PÖRSSISÄHKÖ)" 
        value={dailyCostFormatted > 0 ? dailyCostFormatted : '0.00'} unit="€" 
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