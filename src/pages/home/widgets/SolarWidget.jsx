import React from 'react';
import WidgetSmall from '../../../components/common/WidgetSmall';
import WidgetNormal from '../../../components/common/WidgetNormal';

export const meta = { order: 1 };

// --- YLÄRIVIN PIENI WIDGET ---
export function SmallWidget({ data }) {
  const pvPower = data?.solarData?.find(s => s?.sensor_id?.includes('pv_power'))?.value || '0';
  const isGenerating = parseFloat(pvPower) > 0;

  return (
    <WidgetSmall 
      title="Aurinko" 
      value={`${pvPower} W`} 
      iconName="Sun" 
      isActive={isGenerating} 
    />
  );
}

// --- YLEISKATSAUKSEN ISO KORTTI ---
export function NormalWidget({ data }) {
  const { solarData } = data;
  const pvPower = solarData?.find(s => s?.sensor_id?.includes('pv_power'))?.value || '0';
  const dailyYield = solarData?.find(s => s?.sensor_id?.includes('daily_yield'))?.value || '0';
  const isGenerating = parseFloat(pvPower) > 0;

  return (
    <WidgetNormal 
      title="Aurinkovoima" 
      value={pvPower} 
      unit="W" 
      description={`Tämän päivän tuotto: ${dailyYield} Wh`} 
      iconName="Sun" 
      isActive={isGenerating} 
    />
  );
}