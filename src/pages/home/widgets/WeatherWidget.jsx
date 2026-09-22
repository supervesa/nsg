import React from 'react';
import WidgetSmall from '../../../components/common/WidgetSmall';

export const meta = { order: 6 };

// --- YLÄRIVIN PIENI WIDGET ---
export function SmallWidget({ data }) {
  const { historyAnalytics } = data;
  
  // Etsitään uusin rivi, jossa on oikeasti ulkolämpötila
  const latestValid = historyAnalytics?.find(row => row.temp_outdoor_avg !== null);
  const outTemp = latestValid?.temp_outdoor_avg ? parseFloat(latestValid.temp_outdoor_avg).toFixed(1) : '-';

  return (
    <WidgetSmall 
      title="Ulkolämpö" 
      value={`${outTemp}°C`} 
      iconName="CloudSun" 
      isActive={outTemp !== '-'} 
    />
  );
}