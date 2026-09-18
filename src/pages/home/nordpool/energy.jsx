import React from 'react';
import { TrendingDown, TrendingUp, Zap } from 'lucide-react';

export default function NordpoolEnergy({ nordpoolPrices = [] }) {
  if (!nordpoolPrices || nordpoolPrices.length === 0) {
    return <p className="text-muted">Ei hintatietoja saatavilla tälle päivälle.</p>;
  }

  // 1. Keskihinnan laskenta
  const validPrices = nordpoolPrices.map(p => parseFloat(p.price)).filter(p => !isNaN(p));
  const averagePrice = validPrices.length > 0 
    ? (validPrices.reduce((a, b) => a + b, 0) / validPrices.length).toFixed(2) 
    : '0.00';

  // 2. Järjestetään hinnat halvimmasta kalleimpaan
  const sortedByPrice = [...nordpoolPrices].sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
  
  const cheapest = sortedByPrice.slice(0, 3);
  const mostExpensive = [...sortedByPrice].reverse().slice(0, 3);

  // Ajan formatointi (esim. 16:00) Suomen aikaan
  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' });
  };

  // Apukomponentti listan riveille
  const PriceRow = ({ item, isExpensive }) => {
    const priceCents = parseFloat(item.price).toFixed(2);
    const timeLabel = `${formatTime(item.start_time)} - ${formatTime(item.end_time)}`;
    
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-bg-clean)' }}>
        <span className="text-technical" style={{ fontWeight: 500 }}>{timeLabel}</span>
        {/* Käytetään teemasi mukaista punaista tai saabin-vihreää pillereissä/tekstissä */}
        <span className={isExpensive ? '' : 'perm-badge perm-active'} style={isExpensive ? { color: 'var(--color-rosso)', fontWeight: 600 } : { margin: 0 }}>
          {priceCents} snt
        </span>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Keskihinta nostettuna ylös */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', backgroundColor: 'var(--color-bg-clean)', borderRadius: '8px' }}>
        <div style={{ padding: '12px', backgroundColor: 'var(--color-surface)', borderRadius: '50%', boxShadow: 'var(--shadow-subtle)' }}>
          <Zap size={24} color="var(--color-electric)" />
        </div>
        <div>
          <span className="text-label">Päivän Keskihinta</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--color-text-main)', lineHeight: '1' }}>{averagePrice}</span>
            <span className="text-technical">snt/kWh</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
        {/* Halvimmat tunnit */}
        <div className="ui-panel" style={{ padding: '16px', boxShadow: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--color-saab)' }}>
            <TrendingDown size={18} />
            <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>Halvimmat tunnit</h4>
          </div>
          <div>
            {cheapest.map((item, idx) => <PriceRow key={idx} item={item} isExpensive={false} />)}
          </div>
        </div>

        {/* Kalleimmat tunnit */}
        <div className="ui-panel" style={{ padding: '16px', boxShadow: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--color-rosso)' }}>
            <TrendingUp size={18} />
            <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>Kalleimmat tunnit</h4>
          </div>
          <div>
            {mostExpensive.map((item, idx) => <PriceRow key={idx} item={item} isExpensive={true} />)}
          </div>
        </div>
      </div>
    </div>
  );
}