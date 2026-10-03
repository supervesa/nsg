import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Activity, DollarSign, Cloud } from 'lucide-react';

import Button from '../../../components/common/Button.jsx';
import Badge from '../../../components/common/Badge.jsx';
import StatsCard from '../../../components/common/StatsCard.jsx';

export const meta = {
  id: 'heatpump',
  title: 'Ilmalämpöpumppu',
  icon: 'Wind',
  order: 3
};

export default function HeatpumpTab({ data }) {
  const { heatpumpHistory = [], nordpoolPrices = [], logHeating = [] } = data;
  const [currentDate, setCurrentDate] = useState(new Date());

  const changeDate = (days) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
  };

  const tableData = useMemo(() => {
    const sortedPump = [...heatpumpHistory].sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));
    const sortedLog = [...logHeating].sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));

    const hours = Array.from({ length: 24 }, (_, i) => 23 - i);
    
    let dailyEnergySum = 0;
    let dailyCostSum = 0;
    let tempSum = 0;
    let tempCount = 0;

    const rows = hours.map((hour) => {
      const startOfHour = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), hour, 0, 0, 0);
      const startOfNextHour = new Date(startOfHour.getTime() + 60 * 60 * 1000);

      // --- PÖRSSIHIINA (Nordpool) ---
      const priceRecord = nordpoolPrices.find(p => {
        const pDate = new Date(p.start_time);
        return pDate >= startOfHour && pDate < startOfNextHour;
      });
      const price = priceRecord && priceRecord.price != null ? parseFloat(priceRecord.price) : null;

      // --- ULKOILMA HUE (logHeating) ---
      // Etsitään sellainen tallenne tältä tunnilta, jolla on aidosti Hue-lämpötila (ei null)
      const hueRecord = sortedLog.find(l => {
        const lDate = new Date(l.recorded_at);
        return lDate >= startOfHour && lDate < startOfNextHour && l.outdoor_temp_hue != null;
      });
      
      const hueVal = hueRecord ? parseFloat(hueRecord.outdoor_temp_hue) : NaN;
      const hueTemp = !isNaN(hueVal) ? hueVal : null;
      
      if (hueTemp !== null) {
          tempSum += hueTemp;
          tempCount++;
      }

      // --- LÄMPÖPUMPUN DATA (heatpumpHistory) ---
      const hourPumpRecords = sortedPump.filter(h => {
        const hDate = new Date(h.recorded_at);
        return hDate >= startOfHour && hDate < startOfNextHour;
      });
      const currentRecord = hourPumpRecords[hourPumpRecords.length - 1]; 

      // --- KULUTUS ---
      let hourlyConsumption = null;
      if (currentRecord && currentRecord.energy_consumed != null) {
         const previousRecords = sortedPump.filter(h => new Date(h.recorded_at) < startOfHour && h.energy_consumed != null);
         const previousRecord = previousRecords[previousRecords.length - 1];
         
         if (previousRecord && previousRecord.energy_consumed != null) {
            hourlyConsumption = parseFloat(currentRecord.energy_consumed) - parseFloat(previousRecord.energy_consumed);
            if (hourlyConsumption < 0) hourlyConsumption = 0; 
         }
      }

      // --- KUSTANNUS (€) ---
      let hourlyCost = null;
      if (hourlyConsumption !== null && price !== null) {
         hourlyCost = hourlyConsumption * (price / 100); 
         dailyEnergySum += hourlyConsumption;
         dailyCostSum += hourlyCost;
      }

      return {
        timeString: `${hour.toString().padStart(2, '0')}:00`,
        state: currentRecord ? currentRecord.state : null,
        fanMode: currentRecord && currentRecord.fan_mode ? currentRecord.fan_mode : '-',
        hueTemp: hueTemp,
        price: price,
        consumption: hourlyConsumption,
        cost: hourlyCost
      };
    });

    return { 
      rows, 
      dailyEnergySum, 
      dailyCostSum, 
      averageTemp: tempCount > 0 ? (tempSum / tempCount) : null 
    };
  }, [currentDate, heatpumpHistory, nordpoolPrices, logHeating]);

  const dateFormatted = new Intl.DateTimeFormat('fi-FI', { 
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' 
  }).format(currentDate);

  const titleDate = dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1);

  return (
    <div className="space-y-6">
      
      {/* 1. YLÄPALKKI: Päivämäärä */}
      <div className="flex-between mb-6 ui-panel" style={{ padding: '16px' }}>
        <Button variant="secondary" icon={ChevronLeft} onClick={() => changeDate(-1)}>Edellinen</Button>
        <h2 className="text-title" style={{ fontWeight: 'bold' }}>{titleDate}</h2>
        <Button variant="secondary" icon={ChevronRight} iconPosition="right" onClick={() => changeDate(1)}>Seuraava</Button>
      </div>

      {/* 2. TILASTOKORTIT: Omaan flex-asetteluun */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px' }}>
          <StatsCard 
            title="Päivän kulutus" 
            value={`${tableData.dailyEnergySum.toFixed(1)} kWh`} 
            icon={Activity} 
          />
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <StatsCard 
            title="Kustannus (Pörssi)" 
            value={`${tableData.dailyCostSum.toFixed(2)} €`} 
            icon={DollarSign} 
          />
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <StatsCard 
            title="Ulkolämpötila (Ka.)" 
            value={tableData.averageTemp !== null ? `${tableData.averageTemp.toFixed(1)} °C` : '-'} 
            icon={Cloud} 
          />
        </div>
      </div>

      {/* 3. TAULUKKO: Sinun CSS-luokillasi (nsg-table) */}
      <div className="ui-panel table-wrapper">
        <table className="nsg-table">
          <thead>
            <tr>
              <th>Kellonaika</th>
              <th>Toimintatila</th>
              <th>Puhallus</th>
              <th>Ulkoilma (Hue)</th>
              <th>Pörssihinta</th>
              <th>Kulutus</th>
              <th className="text-right">Kustannus</th>
            </tr>
          </thead>
          <tbody>
            {tableData.rows.map((row) => (
              <tr key={row.timeString}>
                <td style={{ fontWeight: 500 }}>{row.timeString}</td>
                
                {/* OMA BADGE-KOMPONENTTISI: label ja isActive */}
                <td>
                  {row.state ? (
                     <Badge 
                        label={row.state} 
                        isActive={row.state === 'heat' || row.state === 'cool'} 
                     />
                  ) : (
                    '-'
                  )}
                </td>
                
                <td className="capitalize">{row.fanMode}</td>
                
                <td>
                  {row.hueTemp !== null ? `${row.hueTemp.toFixed(1)} °C` : '-'}
                </td>
                
                <td>
                  {row.price !== null ? `${row.price.toFixed(2)} c` : '-'}
                </td>
                
                <td>
                  {row.consumption !== null ? `${row.consumption.toFixed(2)} kWh` : '-'}
                </td>
                
                <td className="text-right font-mono">
                  {row.cost !== null ? `${row.cost.toFixed(2)} €` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}