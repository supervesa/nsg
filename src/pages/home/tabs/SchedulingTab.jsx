import React, { useState, useEffect } from 'react';
import { macbase } from '../../../config/supabaseClient'; 
import { BrainCircuit, Thermometer, Sun, Clock, ChevronLeft, ChevronRight, Calendar, Flame, Zap, Cloud, Wallet, TrendingUp, TrendingDown, Receipt } from 'lucide-react';
import Accordion from '../../../components/common/Accordion';

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

  // Uudet tilat lompakolle ja kuitille
  const [wallet, setWallet] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [isLoadingWallet, setIsLoadingWallet] = useState(true);

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

        const [schedRes, nordpoolRes, weatherRes] = await Promise.all([
          macbase.schema('homeassistant').from('automatic_scheduling_day')
            .select('*').gte('target_hour', startIso).lte('target_hour', endIso).order('target_hour', { ascending: true }),
          macbase.schema('homeassistant').from('nordpool_prices')
            .select('start_time, price').gte('start_time', startIso).lte('start_time', endIso),
          macbase.schema('homeassistant').from('weather_forecast')
            .select('target_time, cloud_cover').gte('target_time', startIso).lte('target_time', endIso)
        ]);

        if (schedRes.error) throw schedRes.error;

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

  // 3. Lompakon ja kuitin haku
  useEffect(() => {
    const fetchWalletData = async () => {
      setIsLoadingWallet(true);
      try {
        const [walletRes, ledgerRes] = await Promise.all([
          macbase.schema('homeassistant').from('budget_wallets')
            .select('*').eq('system_id', 'main_house').order('updated_at', { ascending: false }).limit(1),
          macbase.schema('homeassistant').from('budget_ledger')
            .select('*').eq('system_id', 'main_house').order('created_at', { ascending: false }).limit(10)
        ]);

        if (walletRes.error) throw walletRes.error;
        if (ledgerRes.error) throw ledgerRes.error;

        setWallet(walletRes.data[0] || null);
        setLedger(ledgerRes.data || []);
      } catch (err) {
        console.error("Lompakon haku epäonnistui.", err);
      } finally {
        setIsLoadingWallet(false);
      }
    };
    fetchWalletData();
  }, []);

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
    if (price > 10) return 'var(--color-rosso)';
    if (price < 3) return 'var(--color-saab)';
    return 'var(--color-electric)';
  };

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '-';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  const formatEur = (cents) => {
    if (cents === null || cents === undefined) return '0,00 €';
    return (parseFloat(cents) / 100).toLocaleString('fi-FI', { style: 'currency', currency: 'EUR' });
  };

  const cleanCategoryName = (name) => {
    if (!name) return 'Tuntematon';
    return name.split(' (')[0];
  };

  if (isLoadingProfiles) {
    return <div className="text-muted" style={{ padding: '24px' }}>Ladataan analytiikkaa...</div>;
  }

  const sortedClimateProfiles = [...climateProfiles].sort((a, b) => (a.weather?.temp_max || 0) - (b.weather?.temp_max || 0));
  const weatherCategories = [...new Set(sortedClimateProfiles.map(p => p.weather?.category_name))].filter(Boolean);
  const rooms = [...new Set(climateProfiles.map(p => p.room?.room_name))].filter(Boolean);
  const getProfile = (roomName, weatherCat) => climateProfiles.find(p => p.room?.room_name === roomName && p.weather?.category_name === weatherCat);
  const getCloudName = (cloudObj) => cloudObj?.cloud_name || cloudObj?.name || cloudObj?.category_name || 'Tuntematon';
  
  const activeSolarProfiles = [...solarProfiles].sort((a, b) => {
    const powerDiff = (b.max_solar_power_w || 0) - (a.max_solar_power_w || 0);
    if (powerDiff !== 0) return powerDiff;
    return (a.cloud?.cloud_id || 0) - (b.cloud?.cloud_id || 0);
  });

  // Lompakon laskutoimitukset
  let availableBudgetEur = 0;
  let budgetStatusColor = 'var(--color-text-main)';
  if (wallet) {
    const totalBudget = parseFloat(wallet.base_budget_snt) + parseFloat(wallet.rollover_snt) + parseFloat(wallet.solar_bonus_snt);
    const consumed = parseFloat(wallet.consumed_snt);
    const available = totalBudget - consumed;
    availableBudgetEur = available / 100;
    budgetStatusColor = available >= 0 ? 'var(--color-saab)' : 'var(--color-rosso)';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* 1. LOMPAKKO JA KUITTI (Accordion) */}
      {!isLoadingWallet && wallet && (
        <Accordion title="Viikon energiabudjetti" iconName="Wallet" defaultOpen={true}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Lompakon yhteenveto */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', padding: '16px', backgroundColor: 'var(--color-bg-main)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Käytettävissä tällä viikolla (vko {wallet.week_number})</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: budgetStatusColor, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {availableBudgetEur >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                  {formatEur(availableBudgetEur * 100)}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', textAlign: 'right' }}>
                <div>
                  <div style={{ color: 'var(--color-text-muted)' }}>Perusbudjetti + Säästöt</div>
                  <div style={{ fontWeight: 600 }}>{formatEur(parseFloat(wallet.base_budget_snt) + parseFloat(wallet.rollover_snt))}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--color-saab)' }}>Aurinkobonukset</div>
                  <div style={{ fontWeight: 600, color: 'var(--color-saab)' }}>+{formatEur(wallet.solar_bonus_snt)}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--color-rosso)' }}>Kulutus</div>
                  <div style={{ fontWeight: 600, color: 'var(--color-rosso)' }}>-{formatEur(wallet.consumed_snt)}</div>
                </div>
              </div>
            </div>

            {/* Tilitapahtumat / Kuitti */}
            <div>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--color-text-main)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Receipt size={16} /> Viimeisimmät tilitapahtumat
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {ledger.map(transaction => {
                  const isBonus = transaction.transaction_type === 'SOLAR_BONUS' || parseFloat(transaction.amount_snt) > 0;
                  const amountEur = parseFloat(transaction.amount_snt) / 100;
                  const meta = transaction.meta || {};
                  
                  return (
                    <div key={transaction.ledger_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: 'var(--color-bg-main)', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '80%' }}>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                          {new Date(transaction.created_at).toLocaleDateString('fi-FI')} klo {new Date(transaction.created_at).toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span style={{ color: 'var(--color-text-main)' }}>{meta.selitys || transaction.transaction_type}</span>
                      </div>
                      <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap', color: isBonus ? 'var(--color-saab)' : 'var(--color-rosso)' }}>
                        {isBonus ? '+' : ''}{amountEur.toLocaleString('fi-FI', { style: 'currency', currency: 'EUR' })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </Accordion>
      )}

      {/* 2. PÄIVÄN AIKAJANA */}
      <section className="ui-panel" style={{ padding: '0', overflow: 'hidden' }}>
        {/* ... (Aikajanan koodi pysyy ennallaan kuten aiemmassa versiossasi) ... */}
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

      {/* 3 & 4. MATRIISIT (SIVUTTAIN SKROLLATTAVAT MOBIILISSA) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* ... (Matriisien koodi pysyy ennallaan kuten aiemmassa versiossasi) ... */}
      </div>
    </div>
  );
}