import React, { useState } from 'react';
import WidgetSmall from '../../../components/common/WidgetSmall';
import WidgetNormal from '../../../components/common/WidgetNormal';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const meta = { order: 4 };

// Apufunktio kylmiön tilan laskentaan (4 tunnin / 24 rivin ikkuna)
const getKylmioHealth = (data) => {
  if (!data || data.length === 0) {
    return { status: 'Ei dataa', isWarning: false, temp: null, isRunning: false, power: 0, dutyCycle: 0 };
  }

  const latest = data[0];
  const powerW = parseFloat(latest.power_w) || 0;
  const isRunning = powerW > 5;
  const temp = latest.meta?.kylmio_lampotila;

  const onCount = data.filter(row => parseFloat(row.power_w) > 5).length;
  const totalCount = data.length;
  const dutyCycle = totalCount > 0 ? Math.round((onCount / totalCount) * 100) : 0;

  let highTempConsecutive = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i].meta?.kylmio_lampotila >= 8.5) {
      highTempConsecutive++;
    } else {
      break; 
    }
  }

  let status = "OK";
  let isWarning = false;

  if (dutyCycle >= 65) {
    status = "VAROITUS"; 
    isWarning = true;
  } else if (temp >= 12.0) {
    status = "Ovi auki!"; 
    isWarning = true;
  } else if (highTempConsecutive >= 4) {
    status = "Tarkista ovi"; 
    isWarning = true;
  }

  return { status, isWarning, temp, isRunning, power: powerW, dutyCycle };
};

// --- YLÄRIVIN PIENI WIDGET ---
export function SmallWidget({ data }) {
  const { kylmioData } = data;
  const health = getKylmioHealth(kylmioData);
  
  const displayValue = health.temp !== null && health.temp !== undefined 
    ? `${health.temp.toFixed(1)}°C ${health.status}`
    : `- °C`;

  let widgetColor = undefined;
  if (kylmioData && kylmioData.length > 0) {
    widgetColor = health.isWarning ? 'var(--color-rosso)' : 'var(--color-electric)';
  }

  return (
    <WidgetSmall 
      title="Kylmiö" 
      value={displayValue} 
      iconName="Refrigerator" 
      statusColor={widgetColor} 
    />
  );
}

// --- YLEISKATSAUKSEN ISO KORTTI (KLIKATTAVA) ---
export function NormalWidget({ data }) {
  const [isExpanded, setIsExpanded] = useState(false); // Tilan hallinta auki/kiinni
  const { kylmioData, kylmioDaily, budgetSettings } = data;

  const health = getKylmioHealth(kylmioData);
  
// 2. Kuukausiennusteen matematiikka
  // LASKETAAN KUINKA MONELTA PÄIVÄLTÄ ON DATAA (Ei jaeta kalenteripäivällä, jos laite on vasta asennettu)
  const daysWithData = kylmioDaily?.length || 0; 
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate(); 

  let totalKwh = 0;
  let totalSpotSnt = 0;

  kylmioDaily?.forEach(day => {
    totalKwh += day.kwh || 0;
    totalSpotSnt += day.spot_cost_snt || 0;
  });

  // Arviot (Skaalataan TODELLISTEN datapivien keskiarvo koko kuukaudelle)
  const projectedKwh = daysWithData > 0 ? (totalKwh / daysWithData) * daysInMonth : 0;
  const projectedSpotSnt = daysWithData > 0 ? (totalSpotSnt / daysWithData) * daysInMonth : 0;
  
  const transferFee = budgetSettings?.transfer_fee_snt || 3.86;
  const taxFee = budgetSettings?.electricity_tax_snt || 2.92;

  const projectedTransferSnt = projectedKwh * transferFee;
  const projectedTaxSnt = projectedKwh * taxFee;
  
  // Euromäärät erittelyä varten
  const projectedSpotEur = projectedSpotSnt / 100;
  const projectedTransferEur = projectedTransferSnt / 100;
  const projectedTaxEur = projectedTaxSnt / 100;
  const projectedTotalEur = projectedSpotEur + projectedTransferEur + projectedTaxEur;

  // Graafin data
  const chartData = kylmioDaily ? [...kylmioDaily].reverse().map(d => ({
    name: new Date(d.paiva).toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric' }),
    kwh: d.kwh,
    spotSnt: d.spot_cost_snt
  })) : [];

  const statusDisplay = health.isWarning 
    ? <span style={{ color: 'var(--color-rosso)', fontWeight: 'bold' }}>{health.status}</span>
    : health.status;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: isExpanded ? 'auto' : '100%' }}>
      
      {/* 1. PERUSWIDGET (Klikattava nappi) */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)} 
        style={{ cursor: 'pointer', height: '100%', position: 'relative' }}
        title="Klikkaa nähdäksesi tarkemmat tiedot ja ennusteen"
      >
        <WidgetNormal 
          title="Kylmiö"
          value={health.temp !== null && health.temp !== undefined ? health.temp.toFixed(1) : '-'} 
          unit="°C"
          description={<span>Tila: {statusDisplay} • Käyntisuhde 4h: {health.dutyCycle} %</span>}
          subLabel="KOMPRESSORI"
          subValue={health.isRunning ? `Jäähdyttää (${health.power} W)` : 'Lepää (0 W)'}
          iconName="Refrigerator"
          isActive={health.isRunning}
        />
      </div>

      {/* 2. LISÄTIEDOT (Aukeaa alle kun klikattu) */}
      {isExpanded && (
        <div className="ui-panel smooth-transition" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* A. Kustannusten erittelylaatikko */}
          <div style={{ backgroundColor: 'var(--color-bg-clean)', padding: '16px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '8px' }}>
              <span style={{ fontWeight: 'bold', color: 'var(--color-text-main)' }}>Kuukausiarvio ({projectedKwh.toFixed(0)} kWh)</span>
              <span style={{ fontWeight: 'bold', color: 'var(--color-text-main)', fontSize: '1.1rem' }}>{projectedTotalEur.toFixed(2)} €</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-technical)', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>Pörssisähkö (Spot)</span>
              <span>{projectedSpotEur.toFixed(2)} €</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-technical)', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>Siirtomaksu ({transferFee} c/kWh)</span>
              <span>{projectedTransferEur.toFixed(2)} €</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-technical)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Sähkövero ({taxFee} c/kWh)</span>
              <span>{projectedTaxEur.toFixed(2)} €</span>
            </div>
          </div>

          {/* B. Pylväsgraafi */}
          <div style={{ height: '200px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="var(--color-text-technical)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-text-technical)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--color-tooltip-bg)', borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-elegant)' }}
                  formatter={(value, name) => [name === 'kwh' ? `${value.toFixed(2)} kWh` : `${value.toFixed(1)} snt`, name === 'kwh' ? 'Kulutus' : 'Pörssisähkö']}
                />
                <Bar dataKey="kwh" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="var(--color-electric)" fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* C. Päivälistaus */}
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-technical)', fontWeight: 'bold', marginBottom: '8px' }}>PÄIVÄKOHTAINEN (PÖRSSIHINTA)</div>
            {kylmioDaily?.slice(0, 7).map((day, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--color-border-subtle)', marginBottom: '8px' }}>
                <span style={{ color: 'var(--color-text-main)', fontWeight: '500' }}>
                  {new Date(day.paiva).toLocaleDateString('fi-FI', { weekday: 'short', day: 'numeric', month: 'numeric' })}
                </span>
                <div style={{ display: 'flex', gap: '12px', color: 'var(--color-text-muted)' }}>
                  <span style={{ width: '60px', textAlign: 'right' }}>{day.kwh.toFixed(2)} kWh</span>
                  <span style={{ width: '50px', textAlign: 'right', fontWeight: 'bold' }}>{day.spot_cost_snt.toFixed(1)} c</span>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}
    </div>
  );
}