import React from 'react';
import WidgetSmall from '../../../components/common/WidgetSmall';
import WidgetNormal from '../../../components/common/WidgetNormal';

export const meta = { order: 3 };

// Apufunktiot suomennoksiin
const getHeatpumpStateName = (state) => {
  const states = { 'heat_cool': 'Auto', 'heat': 'Lämmitys', 'cool': 'Viilennys', 'dry': 'Kuivaus', 'fan_only': 'Puhallus', 'off': 'Pois' };
  return states[state] || state || '-';
};

const getFanModeName = (mode) => {
  const modes = { 'auto': 'Automaattinen', 'quiet': 'Hiljainen', 'low': 'Pieni', 'medium': 'Keskiteho', 'high': 'Maksimi' };
  return modes[mode] || mode || '-';
};

// --- YLÄRIVIN PIENI WIDGET ---
export function SmallWidget({ data }) {
  const { heatpumpHistory } = data;
  const currentHeatpump = heatpumpHistory?.length > 0 ? heatpumpHistory[0] : null;
  const hpIsRunning = currentHeatpump?.state && currentHeatpump?.state !== 'off';
  const targetTemp = currentHeatpump?.target_temp || '-';

  return (
    <WidgetSmall 
      title="ILP" 
      value={`${targetTemp}°C`} 
      iconName="Wind" 
      isActive={hpIsRunning} 
    />
  );
}

// --- YLEISKATSAUKSEN ISO KORTTI ---
export function NormalWidget({ data }) {
  const { heatpumpHistory } = data;
  const currentHeatpump = heatpumpHistory?.length > 0 ? heatpumpHistory[0] : null;
  const hpIsRunning = currentHeatpump?.state && currentHeatpump?.state !== 'off';

  return (
    <WidgetNormal 
      title="Ilmalämpöpumppu"
      value={currentHeatpump?.target_temp || '-'} 
      unit="°C"
      description={`Tila: ${getHeatpumpStateName(currentHeatpump?.state)} • Sisälämpö: ${currentHeatpump?.room_temp || '-'} °C`}
      subLabel="PUHALLIN"
      subValue={getFanModeName(currentHeatpump?.fan_mode)}
      iconName="Wind"
      isActive={hpIsRunning}
    />
  );
}