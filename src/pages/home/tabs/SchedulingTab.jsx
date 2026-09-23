import React, { useState, useEffect } from 'react';
import { macbase } from '../../../config/supabaseClient'; 
import { BrainCircuit, Thermometer, Sun, Clock, ChevronLeft, ChevronRight, Calendar, Flame, Zap, Cloud } from 'lucide-react';
import Button from '../../../components/common/Button';

export const meta = {
  id: 'scheduling',
  title: 'Ajastus (beta)',
  icon: 'Clock',
  order: 5 
};

export default function SchedulingTab() {
  const [schedules, setSchedules] = useState([]);
  const [climateProfiles, setClimateProfiles] = useState([]);
  const [solarProfiles, setSolarProfiles] = useState([]);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);
  const [error, setError] = useState(null);

  const [selectedDate, setSelectedDate] = useState(new Date());

  // 1. Profiilidatan haku (kerran)
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const [climateRes, solarRes] = await Promise.all([
          macbase.schema('homeassistant').from('house_climate_profiles').select(`
            profile_id, cooling_rate, required_offset, avg_valve_position,
            room:house_rooms(room_name, thermostat_type),
            weather:house_weather_categories(category_name, temp_min, temp_max)
          `),
          macbase.schema('homeassistant').from('house_solar_profiles').select(`
            solar_profile_id, month_id, max_solar_power_w, avg_solar_power_w,
            cloud:house_cloud_categories(*)
          `)
        ]);
        if (climateRes.error) throw climateRes.error;
        if (solarRes.error) throw solarRes.error;
        setClimateProfiles(climateRes.data || []);
        setSolarProfiles(solarRes.data || []);
      } catch (err) {
        setError("Profiilidatan haku epäonnistui.");
      } finally {
        setIsLoadingProfiles(false);
      }
    };
    fetchProfiles();
  }, []);

  // 2. Ajastusten, hinnan ja sään haku valitulle päivälle
  useEffect(() => {
    const fetchDayData = async () => {
      setIsLoadingSchedules(true);
      try {
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        const startIso = startOfDay.toISOString();
        const endIso = endOfDay.toISOString();

        // Haetaan rinnakkain aikataulut, hinnat ja sää
        const [schedRes, nordpoolRes, weatherRes] = await Promise.all([
          macbase.schema('homeassistant').from('automatic_scheduling_day')
            .select('*').gte('target_hour', startIso).lte('target_hour', endIso).order('target_hour', { ascending: true }),
          macbase.schema('homeassistant').from('nordpool_prices')
            .select('start_time, price').gte('start_time', startIso).lte('start_time', endIso),
          macbase.schema('homeassistant').from('weather_forecast')
            .select('target_time, cloud_cover').gte('target_time', startIso).lte('target_time', endIso)
        ]);

        if (schedRes.error) throw schedRes.error;

        // Yhdistetään hinnat ja pilvisyys oikeaan tuntiin
        const enrichedSchedules = (schedRes.data || []).map(sched => {
          const schedTime = new Date(sched.target_hour).getTime();
          const priceObj = (nordpoolRes.data || []).find(p => new Date(p.start_time).getTime() === schedTime);
          const weatherObj = (weatherRes.data || []).find(w => new Date(w.target_time).getTime() === schedTime);

          return {
            ...sched,
            price: priceObj ? parseFloat(priceObj.price) : null,
            cloudCover: weatherObj ? parseFloat(weatherObj.cloud_cover) : null
          };
        });

        setSchedules(enrichedSchedules);
      } catch (err) {
        setError("Päivän tietojen haku epäonnistui.");
      } finally {
        setIsLoadingSchedules(false);
      }
    };
    fetchDayData();
  }, [selectedDate]);

  // Apufunktiot
  const formatTime = (isoString) => new Date(isoString).toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' });
  const isPast = (isoString) => new Date(isoString) < new Date();
  const changeDay = (days) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const getPriceColor = (price) => {
    if (price === null) return 'var(--color-text-muted)';
    if (price > 10) return 'var(--color-rosso)'; // Kallis > 10c
    if (price < 3) return 'var(--color-saab)';   // Halpa < 3c
    return 'var(--color-electric)';              // Normaali
  };

  if (isLoadingProfiles) {
    return <div className="text-muted" style={{ padding: '24px' }}>Ladataan analytiikkaa...</div>;
  }

  // --- MATRIISIN DATAN KÄSITTELY ---
  const weatherCategories = [...new Set(climateProfiles.map(p => p.weather?.category_name))].filter(Boolean);
  const rooms = [...new Set(climateProfiles.map(p => p.room?.room_name))].filter(Boolean);
  const getProfile = (roomName, weatherCat) => climateProfiles.find(p => p.room?.room_name === roomName && p.weather?.category_name === weatherCat);
  const getCloudName = (cloudObj) => cloudObj?.cloud_name || cloudObj?.name || cloudObj?.category_name || 'Tuntematon';
  const currentMonthSolar = solarProfiles.filter(sp => sp.month_id === (new Date().getMonth() + 1));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* 1. PÄIVÄN AIKAJANA - MOBIILIOPTIMOITU LISTA */}
      <section className="ui-panel" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', backgroundColor: 'var(--color-bg-clean)', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} className="text-electric" /> Tekoälyn lokikirja
          </h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: 'var(--color-bg-main)', padding: '4px', borderRadius: '8px', border: '1px solid var(--color-border)', width: '100%', maxWidth: '280px', justifyContent: 'space-between' }}>
            <button onClick={() => changeDay(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', display: 'flex' }}><ChevronLeft size={18} /></button>
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
              {selectedDate.toLocaleDateString('fi-FI', { weekday: 'short', day: 'numeric', month: 'numeric' })}
            </span>
            <button onClick={() => changeDay(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', display: 'flex' }}><ChevronRight size={18} /></button>
          </div>
        </div>
        
        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
          {isLoadingSchedules ? (
            <div style={{ padding: '24px', textAlign: 'center' }} className="text-muted">Ladataan päivän tietoja...</div>
          ) : schedules.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center' }} className="text-muted">Ei ajastuksia valitulle päivälle.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {schedules.map((sched) => {
                const past = isPast(sched.target_hour);
                return (
                  <div key={sched.schedule_id} style={{ 
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--color-border)', 
                    opacity: past ? 0.6 : 1,
                    backgroundColor: past ? 'var(--color-bg-clean)' : 'transparent',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    {/* YLÄRIVI: Aika, Sähkön hinta, Pilvisyys */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-text-main)' }}>
                        {formatTime(sched.target_hour)}
                      </div>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem' }}>
                        {sched.price !== null && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: getPriceColor(sched.price) }}>
                            <Zap size={14} /> {sched.price.toFixed(2)} snt
                          </span>
                        )}
                        {sched.cloudCover !== null && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-text-muted)' }}>
                            <Cloud size={14} /> {Math.round(sched.cloudCover)}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* KESKIRIVI: Lämmityslaittet */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '0.9rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-rosso)', fontWeight: 600, backgroundColor: 'var(--color-bg-clean)', padding: '4px 8px', borderRadius: '4px' }}>
                        <Flame size={14} /> ILP: {sched.ilp_target_temp}°C <span style={{ fontWeight: 400, fontSize: '0.8rem', color: 'var(--color-text-technical)' }}>({sched.ilp_mode})</span>
                      </span>
                      {sched.eve_thermo_target && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-text-main)', backgroundColor: 'var(--color-bg-clean)', padding: '4px 8px', borderRadius: '4px' }}>
                          <Thermometer size={14} /> Patterit: {sched.eve_thermo_target}°C
                        </span>
                      )}
                    </div>

                    {/* ALARIVI: Tekoälyn perustelu */}
                    {sched.ai_reasoning && (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', color: 'var(--color-text-muted)', fontSize: '0.85rem', lineHeight: '1.4', marginTop: '4px' }}>
                        <BrainCircuit size={16} className="text-electric" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>{sched.ai_reasoning}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

     {/* 2 & 3. MATRIISIT (SIVUTTAIN SKROLLATTAVAT MOBIILISSA) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
       {/* LÄMMÖNPITÄVYYS */}
        <section className="ui-panel" style={{ padding: '20px', overflowX: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Thermometer size={18} className="text-rosso" /> Kuinka nopeasti huoneet viilenevät?
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
              Tekoälyn oppima malli talon lämmönkarkauksesta. Alempi luku kertoo, <strong>kuinka monta tuntia menee, että huone viilenee yhden asteen</strong> ilman lämmitystä. Ylempi luku on patterin vaatima <strong>lisälämpö</strong>, jotta huone pysyy mukavana näillä keleillä.
            </p>
          </div>
          
          <div style={{ minWidth: '400px', marginTop: 'auto' }}> 
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  <th style={{ padding: '8px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Huone</th>
                  {weatherCategories.map(cat => (
                    <th key={cat} style={{ padding: '8px', color: 'var(--color-text-muted)', fontWeight: 600 }}>{cat}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rooms.map((room, i) => (
                  <tr key={room} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: i % 2 === 0 ? 'transparent' : 'var(--color-bg-clean)' }}>
                    <td style={{ padding: '10px 8px', fontWeight: 600, color: 'var(--color-text-main)' }}>{room}</td>
                    {weatherCategories.map(cat => {
                      const prof = getProfile(room, cat);
                      
                      // LASKETAAN KUINKA MONTA TUNTIA MENEE 1 ASTEEN VIILENTYMISEEN
                      let coolingTimeText = '-';
                      if (prof && prof.cooling_rate > 0) {
                        const hoursPerDegree = (1 / prof.cooling_rate).toFixed(1);
                        coolingTimeText = `~${hoursPerDegree.replace('.0', '')} h / aste`; // Esim. 2.0 -> 2 h / aste
                      } else if (prof && parseFloat(prof.cooling_rate) === 0) {
                        coolingTimeText = 'Ei viilene';
                      }

                      return (
                        <td key={cat} style={{ padding: '10px 8px' }}>
                          {prof ? (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ color: 'var(--color-electric)', fontWeight: 600 }} title="Vaadittu lisälämpö patterille">
                                {prof.required_offset > 0 ? '+' : ''}{prof.required_offset}°C
                              </span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-technical)' }} title="Aika, jossa huone viilenee yhden asteen">
                                {coolingTimeText}
                              </span>
                            </div>
                          ) : <span className="text-muted">-</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* AURINKOTUOTTO */}
        <section className="ui-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sun size={18} className="text-saab" /> Aurinkopaneelien tuotto-odotus
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
              Historiadatasta opittu arvio siitä, kuinka paljon aurinkopaneelit tuottavat sähköä (watteina) kuluvan kuukauden eri pilvisyystilanteissa. Tekoäly hyödyntää näitä arvoja ennakoidessaan talon saamaa ilmaista lämpöä päiväsaikaan.
            </p>
          </div>

          <div style={{ marginTop: 'auto' }}>
            {currentMonthSolar.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <tbody>
                  {currentMonthSolar.map((sp, i) => (
                    <tr key={sp.solar_profile_id} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: i % 2 === 0 ? 'transparent' : 'var(--color-bg-clean)' }}>
                      <td style={{ padding: '12px 8px', fontWeight: 600, color: 'var(--color-text-main)' }}>
                        {getCloudName(sp.cloud)}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                        <div style={{ color: 'var(--color-saab)', fontWeight: 'bold', fontSize: '1rem' }} title="Opittu huipputeho">
                          {sp.max_solar_power_w} W <span style={{ fontSize: '0.7rem', fontWeight: 'normal', color: 'var(--color-text-muted)' }}>(Max)</span>
                        </div>
                        <div style={{ color: 'var(--color-text-technical)' }} title="Opittu keskiarvotuotto">
                          {sp.avg_solar_power_w} W <span style={{ fontSize: '0.7rem' }}>(Keskiarvo)</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
               <p className="text-muted">Ei aurinkodataa kuluvalle kuukaudelle.</p>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}