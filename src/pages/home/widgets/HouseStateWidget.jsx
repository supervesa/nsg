import React from 'react';
import WidgetSmall from '../../../components/common/WidgetSmall';
import WidgetNormal from '../../../components/common/WidgetNormal';

export const meta = { order: 2 };

// Tämä ominaisuus ei ehkä tarvitse pientä widgettiä lainkaan?
// Jos haluat sen yläriville, aktivoi tämä. Jos poistat koko funktioblokin, se ei näy ylärivillä!
export function SmallWidget({ data }) {
  const gridPower = data?.solarData?.find(s => s?.sensor_id?.includes('grid_power'))?.value || '0';
  const isSelling = parseFloat(gridPower) > 0;

  return (
    <WidgetSmall 
      title="Verkko" 
      value={isSelling ? `Vienti ${gridPower}W` : 'Tuonti'} 
      iconName="Zap" 
      isActive={isSelling} 
    />
  );
}

export function NormalWidget({ data }) {
  const { solarData } = data;
  const pvPower = solarData?.find(s => s?.sensor_id?.includes('pv_power'))?.value || '0';
  const gridPower = solarData?.find(s => s?.sensor_id?.includes('grid_power'))?.value || '0';
  
  const gridPowerNum = parseFloat(gridPower);
  const pvPowerNum = parseFloat(pvPower);

  let houseStatusTitle = 'Verkkosähkö';
  let houseStatusDesc = 'Ottaa sähköä ulkopuolelta';
  let houseIsActive = false;

  if (gridPowerNum > 0) {
    houseStatusTitle = 'Myy sähköä';
    houseStatusDesc = `Syöttää verkkoon ${gridPower} W`;
    houseIsActive = true;
  } else if (pvPowerNum > 0) {
    houseStatusTitle = 'Itseriittoinen';
    houseStatusDesc = 'Käyttää tuotettua aurinkosähköä';
    houseIsActive = true;
  }

  return (
    <WidgetNormal 
      title="Talon Sähkötila" 
      value={houseStatusTitle} 
      unit="" 
      description={houseStatusDesc} 
      iconName="Zap" 
      isActive={houseIsActive} 
    />
  );
}