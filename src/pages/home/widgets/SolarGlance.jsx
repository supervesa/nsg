import React from 'react';
import { Sun } from 'lucide-react';

export const meta = {
  order: 1 // Järjestys ylärivillä (pienin vasemmalle)
};

export default function SolarGlance({ data }) {
  const { solarData } = data;
  const pvPower = solarData?.find(s => s?.sensor_id?.includes('pv_power'))?.value || '0';
  const pvPowerNum = parseFloat(pvPower);
  
  const isGenerating = pvPowerNum > 0;

  // Jos tuottoa ei ole, widgetti on vähän himmeämpi
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 16px',
      backgroundColor: isGenerating ? 'var(--color-surface)' : 'var(--color-bg-clean)',
      border: isGenerating ? '1px solid var(--color-saab)' : '1px solid transparent',
      borderRadius: '8px',
      boxShadow: isGenerating ? 'var(--shadow-subtle)' : 'none',
      minWidth: 'fit-content', // Estää rypistymisen ylärivillä
      transition: 'all 0.2s ease'
    }}>
      <Sun size={20} color={isGenerating ? 'var(--color-saab)' : 'var(--color-text-technical)'} />
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-technical)', fontWeight: 600 }}>
          Aurinko
        </span>
        <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-main)', lineHeight: '1.2' }}>
          {pvPowerNum} W
        </span>
      </div>
    </div>
  );
}