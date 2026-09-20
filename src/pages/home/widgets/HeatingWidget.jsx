import React from 'react';
import WidgetSmall from '../../../components/common/WidgetSmall';
import WidgetNormal from '../../../components/common/WidgetNormal';

export const meta = { order: 4 };

// --- YLÄRIVIN PIENI WIDGET ---
export function SmallWidget({ data }) {
  const { heatingData } = data;
  const indoorTemp = heatingData?.indoor_temp || '-';

  return (
    <WidgetSmall 
      title="Sisälämpö" 
      value={`${indoorTemp}°C`} 
      iconName="Home" 
      isActive={indoorTemp !== '-'} 
    />
  );
}

// --- YLEISKATSAUKSEN ISO KORTTI ---
export function NormalWidget({ data }) {
  const { heatingData } = data;

  return (
    <WidgetNormal 
      title="Patteriverkosto"
      value={heatingData?.indoor_temp || '-'} 
      unit="°C"
      description="Olohuoneen anturin mitattu lämpötila"
      subLabel="ULKOLÄMPÖTILA"
      subValue={heatingData?.outdoor_temp ? `${heatingData.outdoor_temp} °C` : '-'}
      iconName="Home"
    />
  );
}