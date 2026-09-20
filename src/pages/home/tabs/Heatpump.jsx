import React from 'react';
// Kytketään aiemmin luotu pumppumatematiikka
import HeatpumpMath from '../heat_pump/math'; 

export const meta = {
  id: 'heatpump',
  title: 'Ilmalämpöpumppu',
  icon: 'Wind',
  order: 3
};

export default function HeatpumpTab({ data }) {
  // Puretaan tarvittavat datat propseista
  const { heatpumpHistory, nordpoolPrices } = data;

  if (!heatpumpHistory || heatpumpHistory.length === 0) {
    return (
      <div className="ui-panel" style={{ padding: '32px', textAlign: 'center' }}>
        <p className="text-muted">Ei pumppudataa saatavilla. Odota hetki tai päivitä sivu.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h3 className="text-title" style={{ marginBottom: '8px' }}>Ilmalämpöpumpun Analyysi</h3>
        <p className="text-muted" style={{ margin: 0 }}>
          Kulutuslaskenta, toimintahistoria ja säästöt verrattuna suoraan sähkölämmitykseen.
        </p>
      </div>

      {/* Renderöidään tuttu matematiikkakomponentti.
          Huom: math.jsx odottaa propsin nimen olevan 'historyData', ei 'heatpumpHistory'. */}
      <HeatpumpMath historyData={heatpumpHistory} nordpoolPrices={nordpoolPrices} />
      
    </div>
  );
}