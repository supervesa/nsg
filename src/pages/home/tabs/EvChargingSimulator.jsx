import React, { useState, useMemo } from 'react';
import { Battery, Sun, Cloud, CloudSun, CloudRain, Zap, Clock, Car, CheckCircle2, AlertCircle, Server, RefreshCw } from 'lucide-react';

export const meta = {
  id: 'EvCharge',
  title: 'EvCharge',
  icon: 'Car',
  order: 6 
};

const EV_POWER_KW = 11;

export default function EvChargingSimulator({ data }) {
  const [soc, setSoc] = useState(30);
  const [weather, setWeather] = useState('cloudy');
  
  // Tilat autodatalla ja API-testeille
  const [carRange, setCarRange] = useState(null);
  const [isFetchingCar, setIsFetchingCar] = useState(false);
  
  const [apiResponse, setApiResponse] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const [apiError, setApiError] = useState(null);

  const prices = useMemo(() => {
    if (data?.nordpoolPrices?.length >= 24) return data.nordpoolPrices.map(p => p.price);
    return [3.2, 2.5, 1.8, 1.5, 1.9, 3.5, 8.0, 12.5, 15.0, 10.5, 8.0, 5.0, 4.5, 4.0, 3.8, 4.2, 8.5, 14.0, 18.5, 15.0, 10.0, 6.0, 4.5, 3.5];
  }, [data]);

  const hourlySolarYield = useMemo(() => {
    let peakKw = 0;
    switch(weather) {
      case 'sunny': peakKw = 5.0; break;
      case 'partlyCloudy': peakKw = 2.198; break;
      case 'cloudy': peakKw = 0.719; break;
      case 'rainy': peakKw = 0.2; break;
      default: peakKw = 0.719;
    }
    return Array.from({ length: 24 }).map((_, hour) => {
      if (hour < 8 || hour > 18) return 0; 
      const distance = Math.abs(13 - hour); 
      const intensity = Math.max(0, 1 - (distance / 5));
      return peakKw * (intensity ** 2);
    });
  }, [weather]);

  const hourlyData = useMemo(() => {
    return prices.map((price, idx) => {
      const solarYield = hourlySolarYield[idx];
      const purchasedKw = Math.max(0, EV_POWER_KW - solarYield);
      return { 
        price, solarYield, purchasedKw, 
        hourlyCostCents: purchasedKw * price, 
        effectivePrice: (purchasedKw / EV_POWER_KW) * price 
      };
    });
  }, [prices, hourlySolarYield]);

  // REACTIN LASKENTA
  const bucketCalculations = useMemo(() => {
    const buckets = [2, 5, 7];
    const results = {};
    buckets.forEach(size => {
      let minCost = Infinity;
      let bestStartIdx = 0;
      let daylightHours = 0; 
      for (let i = 0; i <= 24 - size; i++) {
        let currentCost = 0;
        let currentDaylightHours = 0;
        for (let j = 0; j < size; j++) {
          currentCost += hourlyData[i + j].hourlyCostCents;
          if ((i + j) >= 8 && (i + j) <= 18) currentDaylightHours++;
        }
        if (currentCost < minCost) {
          minCost = currentCost;
          bestStartIdx = i;
          daylightHours = currentDaylightHours;
        }
      }
      const isNightTime = bestStartIdx < 6 || bestStartIdx > 20;
      let explanation = isNightTime ? `Sijoittuu yölle halvimpiin tunteihin.` : (daylightHours > 0 && hourlySolarYield[13] > 0.5 ? `Hyödyntää päivän aurinkosähköä.` : `Kallista ostosähköä.`);
      
      results[size] = {
        size, startIndex: bestStartIdx, endIndex: bestStartIdx + size - 1,
        totalCostEuros: (minCost / 100).toFixed(2), avgPriceCents: (minCost / (EV_POWER_KW * size)).toFixed(2),
        explanation
      };
    });
    return results;
  }, [hourlyData, hourlySolarYield]);

  const selectedBucketSize = useMemo(() => {
    let size = 5; 
    if (soc < 25) size = 7;
    else if (soc > 60) size = 2;
    if ((weather === 'sunny' || weather === 'partlyCloudy') && size > 2) size = size === 7 ? 5 : 2; 
    return size;
  }, [soc, weather]);

  const optimalWindow = bucketCalculations[selectedBucketSize];
  const maxPrice = Math.max(...prices);
  const maxSolarScale = 5.0; 

  // =====================================================================
  // API KUTSUT BACKENDILLE
  // =====================================================================
  const fetchRealCarData = async () => {
    setIsFetchingCar(true);
    const API_URL = "https://nsg.asuscomm.com/python/api/car-battery";
    const apiKey = import.meta.env?.VITE_PYTHON_API_KEY || process.env?.REACT_APP_PYTHON_API_KEY;

    try {
      const response = await fetch(API_URL, {
        method: 'GET',
        headers: { 'X-API-Key': apiKey }
      });
      if (!response.ok) throw new Error("Yhteysvirhe HA-dataan");
      
      const data = await response.json();
      setSoc(data.real_soc);
      setCarRange(data.real_range);
      
    } catch (err) {
      console.error("HA Akun haku epäonnistui", err);
    } finally {
      setIsFetchingCar(false);
    }
  };

  const testPythonApi = async () => {
    setIsFetching(true); setApiError(null); setApiResponse(null);
    const API_URL = "https://nsg.asuscomm.com/python/api/optimize-charging";
    const apiKey = import.meta.env?.VITE_PYTHON_API_KEY || process.env?.REACT_APP_PYTHON_API_KEY;

    if (!apiKey) {
      setApiError("API-avain puuttuu (.env)!");
      setIsFetching(false); return;
    }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
        body: JSON.stringify({ car_soc_percent: soc, weather_forecast: weather, prices: prices })
      });
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      const responseData = await response.json();
      setApiResponse(responseData);
    } catch (err) {
      console.error("API Error:", err);
      setApiError(err.message);
    } finally {
      setIsFetching(false);
    }
  };

  const getWeatherButtonStyle = (currentWeather) => ({
    flex: '1 1 calc(50% - 4px)', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)',
    backgroundColor: weather === currentWeather ? 'var(--color-bg-inverse, #333)' : 'transparent',
    color: weather === currentWeather ? 'var(--color-text-inverse, #fff)' : 'inherit',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.85rem'
  });

  const renderBucketCard = (size, bucketData, isSelected, titlePrefix = "") => (
    <div key={size} style={{ 
      display: 'flex', alignItems: 'flex-start', padding: '12px', borderRadius: '8px',
      backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.05)' : 'var(--color-bg-clean)',
      border: isSelected ? '2px solid #10b981' : '1px solid var(--color-border)',
      transition: 'all 0.2s ease'
    }}>
      <div style={{ marginRight: '12px', marginTop: '2px', color: isSelected ? '#10b981' : 'var(--color-text-muted)' }}>
        {isSelected ? <CheckCircle2 size={20} /> : <div style={{width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--color-border)'}}></div>}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap', gap: '4px' }}>
          <strong style={{ color: isSelected ? 'var(--color-text-main)' : 'var(--color-text-muted)', fontSize: '0.95rem' }}>{titlePrefix}{size}h Lataus</strong>
          <strong style={{ color: isSelected ? '#10b981' : 'var(--color-text-main)', fontSize: '1.05rem' }}>{bucketData.totalCostEuros || bucketData.total_cost_euros} €</strong>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.8rem' }}>
          <span style={{ color: 'var(--color-text-muted)' }}>
            Klo {String(bucketData.startIndex ?? bucketData.start_index).padStart(2, '0')}:00 - {String((bucketData.endIndex ?? bucketData.end_index) + 1).padStart(2, '0')}:00 
            ({bucketData.avgPriceCents ?? bucketData.avg_price_cents} snt/kWh)
          </span>
        </div>
        {isSelected && (
          <p style={{ margin: '6px 0 0 0', fontSize: '0.8rem', color: 'var(--color-text-main)', fontStyle: 'italic', lineHeight: '1.4' }}>
            {bucketData.explanation}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <section className="ui-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* OTSIKKO & AUTON TILA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={20} className="text-electric" style={{ color: '#eab308' }} /> EV Latausoptimoija
          </h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Testaa parametreja tai hae autosta reaaliaikainen tila.</p>
        </div>
        <button 
          onClick={fetchRealCarData} 
          disabled={isFetchingCar}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '6px', 
            border: 'none', backgroundColor: 'var(--color-bg-inverse, #333)', color: 'var(--color-text-inverse, #fff)', 
            fontWeight: 600, cursor: isFetchingCar ? 'wait' : 'pointer' 
          }}>
          <RefreshCw size={16} className={isFetchingCar ? "spin" : ""} /> {isFetchingCar ? 'Yhdistetään Kiaan...' : 'Hae Kian tila'}
        </button>
      </div>

      {/* KONTROLLIT */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', backgroundColor: 'var(--color-bg-clean)', padding: '16px', borderRadius: '8px' }}>
        <div style={{ flex: '1 1 100%', minWidth: '200px' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontWeight: 600 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Battery size={18}/> Akun tila (SoC)</span>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '1.1rem', color: 'var(--color-electric, #eab308)', display: 'block' }}>{soc} %</span>
              {carRange > 0 && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Range: {carRange} km</span>}
            </div>
          </label>
          <input type="range" min="0" max="100" value={soc} onChange={(e) => setSoc(Number(e.target.value))} style={{ width: '100%', cursor: 'pointer', accentColor: '#eab308' }} />
        </div>
        <div style={{ flex: '1 1 100%', minWidth: '200px', marginTop: '8px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem' }}>Huomisen sääennuste</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button onClick={() => setWeather('sunny')} style={getWeatherButtonStyle('sunny')}><Sun size={16} /> Aurinko</button>
            <button onClick={() => setWeather('partlyCloudy')} style={getWeatherButtonStyle('partlyCloudy')}><CloudSun size={16} /> Puolipilvi</button>
            <button onClick={() => setWeather('cloudy')} style={getWeatherButtonStyle('cloudy')}><Cloud size={16} /> Pilvinen</button>
            <button onClick={() => setWeather('rainy')} style={getWeatherButtonStyle('rainy')}><CloudRain size={16} /> Sade/Pimeä</button>
          </div>
        </div>
      </div>

      {/* REACTIN LASKEMAT KORIT */}
      <div>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem' }}>Selain (React) ehdottaa:</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[2, 5, 7].map(size => renderBucketCard(size, bucketCalculations[size], size === selectedBucketSize))}
        </div>
      </div>

      {/* API-TESTAUS */}
      <div style={{ padding: '16px', backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: apiResponse || apiError ? '16px' : '0' }}>
          <div>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Server size={18} className="text-primary" /> Python API -integraatio
            </h4>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Varmista liukuvan ikkunan toiminta API:n puolella.</p>
          </div>
          <button onClick={testPythonApi} disabled={isFetching}
            style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#3b82f6', color: 'white', fontWeight: 600, cursor: isFetching ? 'not-allowed' : 'pointer', opacity: isFetching ? 0.7 : 1 }}>
            {isFetching ? 'Lasketaan...' : 'Kutsu API:a'}
          </button>
        </div>
        {apiError && <div style={{ padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '6px', fontSize: '0.85rem' }}><strong>Virhe yhteydessä:</strong> {apiError}</div>}
        {apiResponse && apiResponse.bucket_options && (
          <div style={{ marginTop: '16px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--color-text-main)' }}>Python-Backend palautti seuraavat optiot:</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {apiResponse.bucket_options.map(bucket => renderBucketCard(bucket.size, bucket, bucket.size === apiResponse.selected_bucket_hours, "API: "))}
            </div>
          </div>
        )}
      </div>

      {/* 24H GRAAFI (REACT DATA) */}
      <div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
          <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Tuntikohtainen hinta ja aurinkotuotto</h4>
        </div>
        <div style={{ overflowX: 'auto', paddingBottom: '24px', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ display: 'flex', height: '160px', alignItems: 'flex-end', gap: '2px', borderBottom: '1px solid var(--color-border)', minWidth: '450px' }}>
            {hourlyData.map((data, idx) => {
              const isSelected = idx >= optimalWindow.startIndex && idx <= optimalWindow.endIndex;
              const originalHeight = Math.max((data.price / maxPrice) * 100, 2);
              const effectiveHeight = Math.max((data.effectivePrice / maxPrice) * 100, 2);
              const solarHeight = (data.solarYield / maxSolarScale) * 100;
              return (
                <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
                  <div style={{ position: 'absolute', bottom: 0, width: '100%', height: `${originalHeight}%`, backgroundColor: 'var(--color-border)', opacity: 0.4, borderRadius: '2px 2px 0 0' }} />
                  <div style={{ position: 'absolute', bottom: 0, width: '100%', height: `${effectiveHeight}%`, backgroundColor: isSelected ? '#10b981' : '#3b82f6', borderRadius: '2px 2px 0 0', transition: 'all 0.3s ease' }} />
                  {data.solarYield > 0 && <div style={{ position: 'absolute', bottom: `${solarHeight}%`, left: '50%', transform: 'translateX(-50%)', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#eab308', boxShadow: '0 0 4px rgba(234, 179, 8, 0.8)' }} />}
                  <div style={{ position: 'absolute', bottom: '-22px', width: '100%', textAlign: 'center', fontSize: '0.65rem', color: isSelected ? '#10b981' : 'var(--color-text-muted)', fontWeight: isSelected ? 'bold' : 'normal', backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.1)' : 'transparent', height: 'calc(100% + 22px)', zIndex: -1 }}>
                    <span style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)' }}>{idx}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}