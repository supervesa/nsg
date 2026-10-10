import React, { useState, useEffect } from 'react';
import { macbase } from '../../../config/supabaseClient'; 
import { BrainCircuit, Thermometer, Sun, Clock, ChevronLeft, ChevronRight, Calendar, Flame, Zap, Cloud, Wallet, TrendingUp, TrendingDown, Receipt, ChevronUp, ChevronDown, Snowflake, Wind, Droplets, RefreshCw, Power } from 'lucide-react';
import Accordion from '../../../components/common/Accordion';
import Badge from '../../../components/common/Badge';

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

  const [allWallets, setAllWallets] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [isLoadingWallet, setIsLoadingWallet] = useState(true);
  const [budgetOffset, setBudgetOffset] = useState(0); 

  // Tila lokikirjan menneisyyden ja tulevaisuuden avaamiselle
  const [expandedLogbook, setExpandedLogbook] = useState({ past: false, future: false });

  // Nollataan lokikirjan laajennus kun päivä vaihtuu
  useEffect(() => {
    setExpandedLogbook({ past: false, future: false });
  }, [selectedDate]);

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

  useEffect(() => {
    const fetchWalletData = async () => {
      setIsLoadingWallet(true);
      try {
        const [walletRes, ledgerRes] = await Promise.all([
          macbase.schema('homeassistant').from('budget_wallets')
            .select('*')
            .eq('system_id', 'main_house')
            .order('year_month', { ascending: true })
            .order('week_number', { ascending: true }),
          macbase.schema('homeassistant').from('budget_ledger')
            .select('*')
            .eq('system_id', 'main_house')
            .order('created_at', { ascending: false })
            .limit(10)
        ]);

        if (walletRes.error) throw walletRes.error;
        if (ledgerRes.error) throw ledgerRes.error;

        setAllWallets(walletRes.data || []);
        setLedger(ledgerRes.data || []);
      } catch (err) {
        console.error("Lompakon haku epäonnistui.", err);
      } finally {
        setIsLoadingWallet(false);
      }
    };
    fetchWalletData();
  }, []);

  const formatTime = (isoString) => new Date(isoString).toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' });
  const isPastTime = (isoString) => new Date(isoString) < new Date();
  
  const changeDay = (days) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const getPriceColor = (price) => {
    if (price === null) return 'var(--color-text-muted)';
    if (price > 10) return 'var(--color-rosso)';
    if (price <= 3) return 'var(--color-saab)';
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

  const getWeekInfo = (dateObj) => {
    const d = new Date(dateObj);
    const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const firstDayOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
    const dayOfWeek = firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1; 
    const weekOfMonth = Math.ceil((d.getDate() + dayOfWeek) / 7);
    return { yearMonth, weekOfMonth };
  };

  const activeBudgetDate = new Date(selectedDate);
  activeBudgetDate.setDate(activeBudgetDate.getDate() + (budgetOffset * 7));

  const visibleWeeks = [-1, 0].map(offset => {
    const targetDate = new Date(activeBudgetDate);
    targetDate.setDate(targetDate.getDate() + (offset * 7));
    const { yearMonth, weekOfMonth } = getWeekInfo(targetDate);
    const walletMatch = allWallets.find(w => w.year_month === yearMonth && w.week_number === weekOfMonth) || null;
    return { offset, yearMonth, weekOfMonth, wallet: walletMatch };
  });

  const now = new Date();
  const isToday = selectedDate.toDateString() === now.toDateString();
  const currentHour = now.getHours();

  // LOKIKIRJAN RYHMITTELYLOGIIKKA (Grouping)
  const groupedSchedules = [];
  let currentGroup = null;

  schedules.forEach(sched => {
    const schedDate = new Date(sched.target_hour);
    const isCurrentHour = isToday && schedDate.getHours() === currentHour;
    const past = isPastTime(sched.target_hour) && !isCurrentHour;

    if (!currentGroup) {
      currentGroup = {
        start_hour: sched.target_hour,
        end_hour: sched.target_hour,
        ilp_mode: sched.ilp_mode,
        ilp_target_temp: sched.ilp_target_temp,
        eve_thermo_target: sched.eve_thermo_target,
        ai_reasoning: sched.ai_reasoning,
        isCurrentBlock: isCurrentHour,
        isPast: past,
        schedules: [sched]
      };
    } else {
      if (
        currentGroup.ilp_mode === sched.ilp_mode &&
        currentGroup.ilp_target_temp === sched.ilp_target_temp &&
        currentGroup.eve_thermo_target === sched.eve_thermo_target &&
        currentGroup.ai_reasoning === sched.ai_reasoning
      ) {
        currentGroup.end_hour = sched.target_hour;
        currentGroup.schedules.push(sched);
        if (isCurrentHour) currentGroup.isCurrentBlock = true;
        if (!past) currentGroup.isPast = false;
      } else {
        groupedSchedules.push(currentGroup);
        currentGroup = {
          start_hour: sched.target_hour,
          end_hour: sched.target_hour,
          ilp_mode: sched.ilp_mode,
          ilp_target_temp: sched.ilp_target_temp,
          eve_thermo_target: sched.eve_thermo_target,
          ai_reasoning: sched.ai_reasoning,
          isCurrentBlock: isCurrentHour,
          isPast: past,
          schedules: [sched]
        };
      }
    }
  });
  if (currentGroup) {
    groupedSchedules.push(currentGroup);
  }

  // Näytettävien lokikirjakorttien logiikka
  let visibleGroups = groupedSchedules;
  let hiddenPastCount = 0;
  let hiddenFutureCount = 0;

  if (isToday) {
    const currIdx = groupedSchedules.findIndex(g => g.isCurrentBlock);
    if (currIdx !== -1) {
      visibleGroups = groupedSchedules.filter((g, idx) => {
        if (idx < currIdx - 1) {
          if (!expandedLogbook.past) {
            hiddenPastCount++;
            return false;
          }
        }
        if (idx > currIdx + 2) {
          if (!expandedLogbook.future) {
            hiddenFutureCount++;
            return false;
          }
        }
        return true;
      });
    }
  }

  const renderIlpMode = (mode, temp) => {
    let IconCmp = Wind;
    let modeText = 'Kierrätys';
    let color = 'var(--color-text-muted)';

    switch(mode) {
      case 'heat': IconCmp = Flame; modeText = 'Lämmitys'; color = 'var(--color-rosso)'; break;
      case 'cool': IconCmp = Snowflake; modeText = 'Viilennys'; color = 'var(--color-electric)'; break;
      case 'fan_only': IconCmp = Wind; modeText = 'Kierrätys'; color = 'var(--color-text-muted)'; break;
      case 'dry': IconCmp = Droplets; modeText = 'Kuivaus'; color = 'var(--color-electric)'; break;
      case 'heat_cool': IconCmp = RefreshCw; modeText = 'Automaatti'; color = 'var(--color-saab)'; break;
      case 'off': IconCmp = Power; modeText = 'Pois'; color = 'var(--color-text-muted)'; break;
      default: IconCmp = Wind; modeText = mode; color = 'var(--color-text-muted)'; break;
    }

    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: color, fontWeight: 600, backgroundColor: 'var(--color-bg-clean)', padding: '4px 8px', borderRadius: '4px' }}>
        <IconCmp size={14} /> ILP: {temp}°C <span style={{ fontWeight: 500, fontSize: '0.75rem', color: 'var(--color-text-technical)' }}>{modeText}</span>
      </span>
    );
  };

  if (isLoadingProfiles) {
    return <div className="text-muted" style={{ padding: 'var(--padding-panel)' }}>Ladataan analytiikkaa...</div>;
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-layout)' }}>
      
      {/* 1. BUDJETTI */}
      {!isLoadingWallet && (
        <Accordion title="Viikon energiabudjetti" iconName="Wallet" defaultOpen={true}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'center', margin: '0' }}>
               <button onClick={() => setBudgetOffset((prev) => prev - 1)} className="btn-icon">
                 <ChevronUp size={20} className="text-technical" />
               </button>
            </div>

            {visibleWeeks.map((weekData, idx) => {
              const w = weekData.wallet;
              const isPast = weekData.offset === -1;
              const isActive = weekData.offset === 0;
              
              const base = w ? parseFloat(w.base_budget_snt) : 0;
              const rollover = w ? parseFloat(w.rollover_snt) : 0;
              const bonus = w ? parseFloat(w.solar_bonus_snt) : 0;
              const consumed = w ? parseFloat(w.consumed_snt) : 0;
              const total = base + rollover + bonus;
              const availableEur = (total - consumed) / 100;
              const statusColor = availableEur >= 0 ? 'var(--color-saab)' : 'var(--color-rosso)';

              if (isActive) {
                return (
                  <div key={`active-${idx}`} style={{ 
                    display: 'flex', flexDirection: 'column', gap: '12px', 
                    backgroundColor: 'var(--color-bg-main)', padding: 'var(--padding-panel)', 
                    borderRadius: '8px', border: '1px solid var(--color-border)', 
                    boxShadow: 'var(--shadow-subtle)' 
                  }}>
                    <div className="flex-between" style={{ flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Viikko {weekData.weekOfMonth}</span>
                          <Badge label="Aktiivinen" isActive={true} />
                        </div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: statusColor, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {availableEur >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                          {formatEur(availableEur * 100)}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', textAlign: 'right' }}>
                        <div>
                          <div style={{ color: 'var(--color-text-muted)' }}>Säästöt</div>
                          <div style={{ fontWeight: 600 }}>{formatEur(base + rollover)}</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--color-saab)' }}>Bonus</div>
                          <div style={{ fontWeight: 600, color: 'var(--color-saab)' }}>+{formatEur(bonus)}</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--color-rosso)' }}>Kulu</div>
                          <div style={{ fontWeight: 600, color: 'var(--color-rosso)' }}>-{formatEur(consumed)}</div>
                        </div>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--color-lancia)', paddingTop: '8px' }}>
                      <h4 style={{ fontSize: '0.75rem', color: 'var(--color-text-technical)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <Receipt size={12} /> Tapahtumat
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {ledger.length !== 0 ? ledger.map((transaction) => {
                          const isBonus = transaction.transaction_type === 'SOLAR_BONUS' || parseFloat(transaction.amount_snt) > 0;
                          const amountEur = parseFloat(transaction.amount_snt) / 100;
                          const meta = transaction.meta || {};
                          
                          return (
                            <div key={transaction.ledger_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: 'var(--color-bg-clean)', borderRadius: '4px', fontSize: '0.8rem' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '80%' }}>
                                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>
                                  {new Date(transaction.created_at).toLocaleDateString('fi-FI')} {new Date(transaction.created_at).toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span style={{ color: 'var(--color-text-main)' }}>{meta.selitys || transaction.transaction_type}</span>
                              </div>
                              <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap', color: isBonus ? 'var(--color-saab)' : 'var(--color-rosso)' }}>
                                {isBonus ? '+' : ''}{amountEur.toLocaleString('fi-FI', { style: 'currency', currency: 'EUR' })}
                              </div>
                            </div>
                          );
                        }) : <div className="text-muted" style={{ fontSize: '0.8rem' }}>Ei tapahtumia.</div>}
                      </div>
                    </div>
                  </div>
                );
              } else {
                return (
                  <div key={`collapsed-${idx}`} className="flex-between smooth-transition" style={{ 
                    padding: '8px 12px', backgroundColor: 'transparent', border: '1px solid var(--color-lancia)', 
                    borderRadius: '6px', opacity: 0.7 
                  }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
                      Menneisyys (vko {weekData.weekOfMonth})
                    </div>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', alignItems: 'center' }}>
                      {w ? (
                        <>
                          <div style={{ color: 'var(--color-text-muted)' }}>Tulos:</div>
                          <div style={{ fontWeight: 'bold', color: statusColor }}>{formatEur(availableEur * 100)}</div>
                        </>
                      ) : (
                        <div className="text-technical">Odottava...</div>
                      )}
                    </div>
                  </div>
                );
              }
            })}

            {(budgetOffset < 0) && (
              <div style={{ display: 'flex', justifyContent: 'center', margin: '0' }}>
                 <button onClick={() => setBudgetOffset((prev) => prev + 1)} className="btn-icon">
                   <ChevronDown size={20} className="text-technical" />
                 </button>
              </div>
            )}
          </div>
        </Accordion>
      )}

      {/* 2. PÄIVÄN AIKAJANA (KORTTIMAINEN FEED) */}
      <section className="ui-panel" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--padding-panel)', backgroundColor: 'var(--color-bg-clean)', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap', gap: '8px' }}>
          <h3 className="text-title flex-row-gap" style={{ fontSize: '0.95rem' }}>
            <Calendar size={16} className="text-electric" /> Lokikirja
          </h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--color-bg-main)', padding: '2px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
            <button onClick={() => changeDay(-1)} className="btn-icon" style={{ padding: '4px' }}><ChevronLeft size={16} /></button>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, padding: '0 4px' }}>
              {selectedDate.toLocaleDateString('fi-FI', { weekday: 'short', day: 'numeric', month: 'numeric' })}
            </span>
            <button onClick={() => changeDay(1)} className="btn-icon" style={{ padding: '4px' }}><ChevronRight size={16} /></button>
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', padding: 'var(--padding-panel)', gap: '16px', backgroundColor: 'var(--color-bg-clean)' }}>
          {isLoadingSchedules ? (
            <div style={{ textAlign: 'center' }} className="text-muted">Ladataan...</div>
          ) : groupedSchedules.length === 0 ? (
            <div style={{ textAlign: 'center' }} className="text-muted">Ei ajastuksia.</div>
          ) : (
            <>
              {/* Kelaus menneisyyteen */}
              {hiddenPastCount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button className="btn-icon" onClick={() => setExpandedLogbook(p => ({ ...p, past: true }))}>
                    <ChevronUp size={20} className="text-technical" />
                  </button>
                </div>
              )}

              {visibleGroups.map((group, index) => {
                const startTimeStr = formatTime(group.start_hour).replace(':', '.');
                let timeDisplay = startTimeStr;
                if (group.schedules.length > 1) {
                  const endHourDate = new Date(group.end_hour);
                  endHourDate.setHours(endHourDate.getHours() + 1); 
                  const endTimeStr = formatTime(endHourDate.toISOString()).replace(':', '.');
                  timeDisplay = `${startTimeStr} – ${endTimeStr}`;
                }

                const validPrices = group.schedules.map(s => s.price).filter(p => p !== null);
                let priceDisplay = null;
                if (validPrices.length === 1) {
                  priceDisplay = `${validPrices[0].toFixed(2)} c`;
                } else if (validPrices.length > 1) {
                  const minP = Math.min(...validPrices);
                  const maxP = Math.max(...validPrices);
                  priceDisplay = minP === maxP ? `${minP.toFixed(2)} c` : `${minP.toFixed(1)} – ${maxP.toFixed(1)} c`;
                }

                return (
                  <div key={index} style={{ 
                    padding: 'var(--padding-panel)',
                    borderRadius: '8px',
                    border: '1px solid var(--color-lancia)', 
                    opacity: group.isPast && !group.isCurrentBlock ? 0.6 : 1,
                    backgroundColor: group.isCurrentBlock ? 'var(--color-surface)' : (group.isPast ? 'transparent' : 'var(--color-surface)'),
                    borderLeft: group.isCurrentBlock ? '4px solid var(--color-electric)' : '1px solid var(--color-lancia)',
                    boxShadow: group.isCurrentBlock ? 'var(--shadow-subtle)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ fontWeight: 700, fontSize: '1.05rem', color: group.isCurrentBlock ? 'var(--color-electric)' : 'var(--color-text-main)' }}>
                          {timeDisplay}
                        </div>
                        {group.isCurrentBlock && (
                          <Badge label="Nyt" isActive={true} />
                        )}
                      </div>
                      
                      <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem' }}>
                        {priceDisplay !== null && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: 'var(--color-text-main)' }}>
                            <Zap size={12} className="text-muted" /> {priceDisplay}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '0.85rem' }}>
                      {renderIlpMode(group.ilp_mode, group.ilp_target_temp)}

                      {group.eve_thermo_target && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-text-main)', backgroundColor: 'var(--color-bg-clean)', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>
                          <Thermometer size={14} className="text-muted" /> Termostaatit: {group.eve_thermo_target}°C
                        </span>
                      )}
                    </div>

                    {group.ai_reasoning && (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', color: 'var(--color-text-muted)', fontSize: '0.85rem', lineHeight: '1.4', marginTop: '4px' }}>
                        <BrainCircuit size={16} className={group.isCurrentBlock ? "text-electric" : "text-muted"} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>{group.ai_reasoning}</span>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Kelaus tulevaisuuteen */}
              {hiddenFutureCount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button className="btn-icon" onClick={() => setExpandedLogbook(p => ({ ...p, future: true }))}>
                    <ChevronDown size={20} className="text-technical" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* 3 & 4. ANALYTIIKKA-LISTAT */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 'var(--spacing-layout)' }}>
        
        {/* LÄMMÖNPITÄVYYS */}
        <section className="ui-panel" style={{ padding: 'var(--padding-panel)', display: 'flex', flexDirection: 'column' }}>
          <div className="mb-2">
            <h3 className="text-title flex-row-gap mb-1" style={{ fontSize: '0.95rem' }}>
              <Thermometer size={16} className="text-rosso" /> Huoneiden viileneminen
            </h3>
            <p className="text-muted" style={{ margin: 0, fontSize: '0.8rem' }}>
              Fysiikan kannalta arvokkain tieto: huoneiden todellinen jäähtymisnopeus.
            </p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}> 
            {rooms.map((room) => (
              <Accordion key={room} title={room} iconName="LayoutGrid">
                <div style={{ display: 'flex', flexDirection: 'column', margin: 'calc(var(--padding-panel) * -0.5) 0' }}>
                  {weatherCategories.map((cat, i) => {
                    const prof = getProfile(room, cat);
                    if (!prof) return null;
                    
                    let coolingTimeText = 'Ei viilene';
                    if (prof.cooling_rate > 0) {
                      const hoursPerDegree = (1 / prof.cooling_rate).toFixed(1);
                      coolingTimeText = `~${hoursPerDegree.replace('.0', '')} h / aste`;
                    }
                    
                    const hasOffset = prof.required_offset !== null && prof.required_offset > 0;
                    
                    return (
                      <div key={cat} className="flex-between smooth-transition" style={{ 
                        padding: '12px 8px', 
                        borderBottom: i === weatherCategories.length - 1 ? 'none' : '1px solid var(--color-lancia)'
                      }}>
                        <div className="flex-row-gap">
                          <Cloud size={14} className="text-muted" />
                          <span style={{ fontWeight: 600, color: 'var(--color-text-main)', fontSize: '0.8rem' }}>
                            {cleanCategoryName(cat)}
                          </span>
                        </div>
                        <div className="text-right">
                          <div style={{ color: 'var(--color-text-main)', fontWeight: 700, fontSize: '0.95rem' }}>
                            {coolingTimeText}
                          </div>
                          {hasOffset && (
                            <div className="text-electric" style={{ fontSize: '0.7rem', fontWeight: 600 }}>
                              +{prof.required_offset}°C offset
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Accordion>
            ))}
          </div>
        </section>

        {/* AURINKOTUOTTO */}
        <section className="ui-panel" style={{ padding: 'var(--padding-panel)', display: 'flex', flexDirection: 'column' }}>
          <div className="mb-2">
            <h3 className="text-title flex-row-gap mb-1" style={{ fontSize: '0.95rem' }}>
              <Sun size={16} className="text-saab" /> Tuotto-odotus (30 pv)
            </h3>
            <p className="text-muted" style={{ margin: 0, fontSize: '0.8rem' }}>
              Malli aurinkopaneelien tuotosta eri pilvisyyksillä.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', marginTop: '8px' }}>
            {activeSolarProfiles.length !== 0 ? (
              activeSolarProfiles.map((sp, i) => (
                <div key={sp.solar_profile_id} className="flex-between smooth-transition" style={{ 
                  padding: '12px 8px', 
                  borderBottom: i === activeSolarProfiles.length - 1 ? 'none' : '1px solid var(--color-lancia)'
                }}>
                  <div className="flex-row-gap">
                    <Sun size={14} className={sp.max_solar_power_w > 1000 ? "text-saab" : "text-muted"} />
                    <span style={{ fontWeight: 600, color: 'var(--color-text-main)', fontSize: '0.8rem' }}>
                      {cleanCategoryName(getCloudName(sp.cloud))}
                    </span>
                  </div>
                  <div className="text-right">
                    <div style={{ color: 'var(--color-saab)', fontWeight: 700, fontSize: '0.95rem' }}>
                      {formatNumber(sp.max_solar_power_w)} W <span className="text-muted" style={{ fontSize: '0.7rem', fontWeight: 500 }}>(Max)</span>
                    </div>
                    <div className="text-technical" style={{ fontSize: '0.75rem' }}>
                      {formatNumber(sp.avg_solar_power_w)} W <span style={{ fontSize: '0.7rem' }}>(KA)</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
               <p className="text-muted" style={{ fontSize: '0.8rem' }}>Ei aurinkodataa.</p>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}