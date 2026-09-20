import React from 'react';
// Kytketään aiemmin luotu sähkökomponentti
import NordpoolEnergy from '../nordpool/energy'; 

export const meta = {
  id: 'energy',
  title: 'Pörssisähkö',
  icon: 'Zap',
  order: 2
};

export default function EnergyTab({ data }) {
  const { nordpoolPrices } = data;

  if (!nordpoolPrices || nordpoolPrices.length === 0) {
    return (
      <div className="ui-panel" style={{ padding: '32px', textAlign: 'center' }}>
        <p className="text-muted">Ei hintatietoja saatavilla. Odota hetki tai päivitä sivu.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h3 className="text-title" style={{ marginBottom: '8px' }}>Sähkö ja Lataus</h3>
        <p className="text-muted" style={{ margin: 0 }}>
          Nordpoolin tuntihinnat ja optimaalisen sähköauton latausikkunan laskenta.
        </p>
      </div>

      {/* Renderöidään tuttu Nordpool-komponentti, annetaan sille vain data! */}
      <NordpoolEnergy nordpoolPrices={nordpoolPrices} />
      
    </div>
  );
}