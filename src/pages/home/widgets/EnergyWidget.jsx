import React from 'react';
import WidgetSmall from '../../../components/common/WidgetSmall';
import { TrendingDown, TrendingUp, Zap, Car } from 'lucide-react';

export const meta = { order: 5 };

// Yhteiset asetukset
const SLOT_HOURS = 6;
const CHARGE_POWER_KW = 11; // 11 kW 3-vaihelataus

// Yhteinen apufunktio latausikkunan etsimiseen
const findBestChargeSlot = (nordpoolPrices) => {
  const now = new Date();
  const futurePrices = nordpoolPrices?.filter(p => new Date(p.end_time) > now) || [];
  
  const chronologicalPrices = [...futurePrices].sort((a, b) => 
    new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  let bestSlot = null;
  let minSlotCost = Infinity;

  if (chronologicalPrices.length >= SLOT_HOURS) {
    for (let i = 0; i <= chronologicalPrices.length - SLOT_HOURS; i++) {
      const window = chronologicalPrices.slice(i, i + SLOT_HOURS);
      
      // LASKENTAMUUTOS: Negatiivinen hinta lasketaan nollana
      const slotCost = window.reduce((acc, curr) => {
        const rawPrice = parseFloat(curr.price);
        const effectivePrice = rawPrice < 0 ? 0 : rawPrice; // Pakotetaan nollaan jos miinuksella
        return acc + (effectivePrice * CHARGE_POWER_KW / 100);
      }, 0);
      
      if (slotCost < minSlotCost) {
        minSlotCost = slotCost;
        bestSlot = window;
      }
    }
  }

  return { bestSlot, minSlotCost };
};

// Yhteiset apufunktiot formatoinnille
const formatTime = (isoString) => {
  const date = new Date(isoString);
  return date.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (isoString) => {
  const date = new Date(isoString);
  return date.toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric' });
};

// --- YLÄRIVIN PIENI WIDGET ---
export function SmallWidget({ data }) {
  const { nordpoolPrices } = data;
  const { bestSlot, minSlotCost } = findBestChargeSlot(nordpoolPrices);

  // Jos tulevia hintoja ei ole tarpeeksi, näytetään nykyinen hinta
  if (!bestSlot) {
    const now = new Date();
    const currentPriceObj = nordpoolPrices?.find(p => new Date(p.start_time) <= now && new Date(p.end_time) > now);
    const currentPrice = currentPriceObj ? parseFloat(currentPriceObj.price).toFixed(2) : '-';
    
    return (
      <WidgetSmall 
        title="Sähkön Hinta" 
        value={`${currentPrice} snt`} 
        iconName="Zap" 
        isActive={false} 
      />
    );
  }

  // Latausikkuna löytyi! Näytetään sen aloitusaika ja kokonaishinta
  const startTime = formatTime(bestSlot[0].start_time);
  
  return (
    <WidgetSmall 
      title={`Lataus klo ${startTime}`} 
      value={`${minSlotCost.toFixed(2)} €`} 
      iconName="Car" 
      isActive={true} 
    />
  );
}

// --- YLEISKATSAUKSEN ISO KORTTI ---
export function NormalWidget({ data }) {
  const { nordpoolPrices } = data;
  const now = new Date();
  
  const futurePrices = nordpoolPrices?.filter(p => new Date(p.end_time) > now) || [];

  if (futurePrices.length === 0) {
    return (
      <div className="ui-panel" style={{ padding: '32px', textAlign: 'center', gridColumn: '1 / -1' }}>
        <p className="text-muted">Ei tulevia hintatietoja saatavilla tälle hetkelle.</p>
      </div>
    );
  }

  const { bestSlot, minSlotCost } = findBestChargeSlot(nordpoolPrices);
  
  // Järjestetään halvimmat ja kalleimmat
  const sortedByPrice = [...futurePrices].sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
  const cheapest = sortedByPrice.slice(0, 3);
  const mostExpensive = [...sortedByPrice].reverse().slice(0, 3);

  const formatRangeText = (startIso, endIso) => {
    const startDateStr = formatDate(startIso);
    const endDateStr = formatDate(endIso);
    const startTimeStr = formatTime(startIso);
    const endTimeStr = formatTime(endIso);
    if (startDateStr === endDateStr) return `${startDateStr} klo ${startTimeStr} – ${endTimeStr}`;
    return `${startDateStr} klo ${startTimeStr} – ${endDateStr} klo ${endTimeStr}`;
  };

  const chronologicalPrices = [...futurePrices].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  const calcRangeText = chronologicalPrices.length > 0 
    ? formatRangeText(chronologicalPrices[0].start_time, chronologicalPrices[chronologicalPrices.length - 1].end_time)
    : '';

  const totalCostEuros = bestSlot ? minSlotCost.toFixed(2) : '0.00';
  const totalEnergyKwh = SLOT_HOURS * CHARGE_POWER_KW;

  const PriceRow = ({ item, isExpensive }) => {
    const priceCents = parseFloat(item.price).toFixed(2);
    const timeLabel = `${formatDate(item.start_time)} klo ${formatTime(item.start_time)} - ${formatTime(item.end_time)}`;
    
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-bg-clean)' }}>
        <span className="text-technical" style={{ fontWeight: 500 }}>{timeLabel}</span>
        <span className={isExpensive ? '' : 'perm-badge perm-active'} style={isExpensive ? { color: 'var(--color-rosso)', fontWeight: 600 } : { margin: 0 }}>
          {priceCents} snt/kWh
        </span>
      </div>
    );
  };

  return (
    <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Yläpalkki: Seuranta-aikaväli */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '16px', backgroundColor: 'var(--color-bg-clean)', borderRadius: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', backgroundColor: 'var(--color-surface)', borderRadius: '50%', boxShadow: 'var(--shadow-subtle)' }}>
            <Zap size={24} color="var(--color-electric)" />
          </div>
          <div>
            <span className="text-label">Nordpool Tuntihinnat</span>
            <span className="text-technical" style={{ fontWeight: 600, color: 'var(--color-text-main)', display: 'block', fontSize: '1rem', marginTop: '2px' }}>
              Seuranta alkaen tästä hetkestä
            </span>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span className="text-label">Seuranta-aikaväli</span>
          <span className="text-technical" style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>
            {calcRangeText}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
        
        {/* Optimaalinen latausikkuna */}
        {bestSlot ? (
          <div className="ui-panel" style={{ padding: '16px', gridColumn: '1 / -1', borderLeft: '4px solid var(--color-saab)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--color-text-main)' }}>
              <Car size={18} color="var(--color-saab)" />
              <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>Optimaalinen latausikkuna ({SLOT_HOURS}h peräkkäin)</h4>
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '16px', alignItems: 'center' }}>
              <div>
                <span className="text-label" style={{ marginBottom: '4px', display: 'block' }}>Aikaikkuna</span>
                <span style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-text-main)' }}>
                  {formatRangeText(bestSlot[0].start_time, bestSlot[bestSlot.length - 1].end_time)}
                </span>
              </div>
              
              <div style={{ textAlign: 'right' }}>
                <span className="text-label" style={{ marginBottom: '4px', display: 'block' }}>
                  Kokonaishinta ({CHARGE_POWER_KW} kW)
                </span>
                <span style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-saab)' }}>
                  {totalCostEuros} €
                </span>
                <div className="text-technical" style={{ fontSize: '0.75rem', marginTop: '2px' }}>
                  Yhteensä {totalEnergyKwh} kWh
                </div>
              </div>
            </div>

            {/* Ikkunan tarkat tuntihinnat */}
            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--color-bg-clean)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
              {bestSlot.map((item, idx) => (
                <div key={idx} style={{ backgroundColor: 'var(--color-bg-clean)', padding: '8px 12px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="text-technical" style={{ fontSize: '0.75rem' }}>{formatTime(item.start_time)}</span>
                  <span style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--color-saab)' }}>{parseFloat(item.price).toFixed(2)} snt/kWh</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="ui-panel" style={{ padding: '16px', gridColumn: '1 / -1' }}>
            <p className="text-muted" style={{ margin: 0 }}>Ei riittävästi peräkkäisiä tunteja (vähintään {SLOT_HOURS}h) jäljellä latausikkunan laskemiseksi tästä hetkestä eteenpäin.</p>
          </div>
        )}

        {/* Halvimmat tulevat tunnit */}
        <div className="ui-panel" style={{ padding: '16px', boxShadow: 'none', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--color-saab)' }}>
            <TrendingDown size={18} />
            <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>Tulevat halvimmat tunnit</h4>
          </div>
          <div style={{ flex: 1 }}>
            {cheapest.map((item, idx) => <PriceRow key={idx} item={item} isExpensive={false} />)}
          </div>
        </div>

        {/* Kalleimmat tulevat tunnit */}
        <div className="ui-panel" style={{ padding: '16px', boxShadow: 'none', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--color-rosso)' }}>
            <TrendingUp size={18} />
            <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>Tulevat kalleimmat tunnit</h4>
          </div>
          <div style={{ flex: 1 }}>
            {mostExpensive.map((item, idx) => <PriceRow key={idx} item={item} isExpensive={true} />)}
          </div>
        </div>

      </div>
    </div>
  );
}