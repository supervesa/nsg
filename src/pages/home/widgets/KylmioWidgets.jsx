import React from 'react';
import WidgetSmall from '../../../components/common/WidgetSmall';
import WidgetNormal from '../../../components/common/WidgetNormal';

export const meta = { order: 4 }; // Voit vaihtaa järjestysnumeroa tarpeen mukaan

// Apufunktio kylmiön tilan laskentaan (4 tunnin / 24 rivin ikkuna)
// Apufunktio kylmiön tilan laskentaan (4 tunnin / 24 rivin ikkuna)
const getKylmioHealth = (data) => {
  if (!data || data.length === 0) {
    return { status: 'Ei dataa', isWarning: false, temp: null, isRunning: false, power: 0, dutyCycle: 0 };
  }

  const latest = data[0];
  const powerW = parseFloat(latest.power_w) || 0;
  const isRunning = powerW > 5;
  const temp = latest.meta?.kylmio_lampotila;

  // Laske käyntiaika (montako riviä 24:stä kompressori on ollut päällä)
  const onCount = data.filter(row => parseFloat(row.power_w) > 5).length;
  const totalCount = data.length;
  const dutyCycle = totalCount > 0 ? Math.round((onCount / totalCount) * 100) : 0;

  // Laske KUINKA KAUAN lämpötila on ollut koholla (esim. yli 8.5 astetta)
  // Lasketaan peräkkäiset rivit uusimmasta alkaen
  let highTempConsecutive = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i].meta?.kylmio_lampotila >= 8.5) {
      highTempConsecutive++;
    } else {
      break; // Heti kun löytyy alle 8.5C lukema, putki katkeaa
    }
  }

  // Terveyslogiikka (vikadiagnostiikka)
  let status = "OK";
  let isWarning = false;

  if (dutyCycle >= 65) {
    status = "VAROITUS"; // Käy liian paljon (kylmäaine vähissä tai ovi raollaan)
    isWarning = true;
  } else if (temp >= 12.0) {
    status = "Ovi auki!"; // Absoluuttinen yläraja ylitetty heti
    isWarning = true;
  } else if (highTempConsecutive >= 4) {
    // Lämpötila on ollut >= 8.5 °C vähintään 4 lukemaa (eli 40 minuuttia putkeen)
    // Normaali sykli olisi jo jäähdyttänyt sen alas.
    status = "Tarkista ovi"; 
    isWarning = true;
  }

  return { status, isWarning, temp, isRunning, power: powerW, dutyCycle };
};

// --- YLÄRIVIN PIENI WIDGET ---
export function SmallWidget({ data }) {
  const { kylmioData } = data;
  const health = getKylmioHealth(kylmioData);
  
  // Formatoidaan arvo esim. "7.1°C OK" tai "8.5°C VAROITUS"
  const displayValue = health.temp !== null && health.temp !== undefined 
    ? `${health.temp.toFixed(1)}°C ${health.status}`
    : `- °C`;

  // Määritetään fiksut värit:
  // Punainen (#ef4444) jos varoitus, Sininen (#3b82f6) jos OK. 
  // Jos ei dataa lainkaan, jätetään undefined jolloin se on harmaa.
  let widgetColor = undefined;
  if (kylmioData && kylmioData.length > 0) {
    widgetColor = health.isWarning ? '#ef4444' : '#3b82f6';
  }

  return (
    <WidgetSmall 
      title="Kylmiö" 
      value={displayValue} 
      iconName="Refrigerator" 
      statusColor={widgetColor} 
      // Emme enää välitä onko kompura käynnissä (isActive), 
      // koska widget on aina värillinen (sininen/punainen) kertoen, että tilannetta valvotaan.
    />
  );
}

// --- YLEISKATSAUKSEN ISO KORTTI ---
export function NormalWidget({ data }) {
  const { kylmioData } = data;
  const health = getKylmioHealth(kylmioData);

  // Varoitustekstin muotoilu (punaisella, jos vikaa)
  const statusDisplay = health.isWarning 
    ? <span style={{ color: 'var(--color-rosso)', fontWeight: 'bold' }}>{health.status}</span>
    : health.status;

  return (
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
  );
}