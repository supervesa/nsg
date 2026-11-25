import React, { useState, useEffect } from 'react';
import { macbase } from '../../../config/supabaseClient'; 
import { BrainCircuit, Thermometer, Sun, Clock, ChevronLeft, ChevronRight, Calendar, Flame, Zap, Cloud, Wallet, TrendingUp, TrendingDown, Receipt, ChevronUp, ChevronDown, Snowflake, Wind, Droplets, RefreshCw, Power, Activity, ShieldAlert, Cpu } from 'lucide-react';
import Accordion from '../../../components/common/Accordion';
import Badge from '../../../components/common/Badge';

export const meta = {
  id: 'scheduling',
  title: 'Ajastus (beta)',
  icon: 'Clock',
  order: 5 
};

const MONTH_NAMES_FI = [
  'tammikuu', 'helmikuu', 'maaliskuu', 'huhtikuu', 'toukokuu', 'kesäkuu',
  'heinäkuu', 'elokuu', 'syyskuu', 'lokakuu', 'marraskuu', 'joulukuu'
];

const safeParseObject = (val) => {
  if (!val) return {};
  if (typeof val === 'object') return val;
  try {
    const parsed = JSON.parse(val);
    return typeof parsed === 'string' ? JSON.parse(parsed) : (parsed || {});
  } catch {
    return {};
  }
};

const getDecisionBadgeMeta = (code) => {
  switch (code) {
    case 'VIP_SOLAR':
      return { label: 'VIP Aurinko', color: 'var(--color-saab)' };
    case 'VIP_GRID':
      return { label: 'VIP-lataus', color: 'var(--color-electric)' };
    case 'FAILSAFE_CHARGE':
      return { label: 'Failsafe-lataus', color: 'var(--color-saab)' };
    case 'FREERIDE':
      return { label: 'Vapaamatkustus', color: 'var(--color-saab)' };
    case 'MAINT_ILP_SOLAR':
      return { label: 'ILP Aurinko', color: 'var(--color-saab)' };
    case 'MAINT_ILP':
      return { label: 'ILP-ylläpito', color: 'var(--color-electric)' };
    case 'MAINT_DH_PRICE_CAP':
      return { label: 'KL (Hintakatto)', color: 'var(--color-rosso)' };
    case 'MAINT_DH_KWH_LIMIT':
      return { label: 'KL (kWh-raja)', color: 'var(--color-rosso)' };
    case 'MAINT_DH_CHEAPER':
      return { label: 'KL (Edullisempi)', color: 'var(--color-text-technical)' };
    default:
      return null;
  }
};

const extractCleanHourlyReasoning = (rawReasoning) => {
  if (!rawReasoning) return '';
  const text = String(rawReasoning);
  if (text.startsWith('[PÄIVÄN KATSAUS]')) {
    const marker = '[TUNTIPÄÄTÖS]';
    const idx = text.indexOf(marker);
    if (idx !== -1) {
      return text.slice(idx + marker.length).trim();
    }
    const nlIdx = text.indexOf('\n');
    if (nlIdx !== -1) {
      return text.slice(nlIdx + 1).trim();
    }
  }
  return text;
};

const extractFallbackOverviewText = (rawReasoning) => {
  if (!rawReasoning) return null;
  const text = String(rawReasoning);
  if (!text.startsWith('[PÄIVÄN KATSAUS]')) return null;
  const marker = '[TUNTIPÄÄTÖS]';
  const idx = text.indexOf(marker);
  const overviewPart = idx !== -1 ? text.slice(0, idx) : text.split('\n')[0];
  return overviewPart.replace(/^\[PÄIVÄN KATSAUS\]\s*/, '').trim();
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

  const [expandedLogbook, setExpandedLogbook] = useState({ past: false, future: false });

  useEffect(() => {
    setExpandedLogbook({ past: false, future: false });
  }, [selectedDate]);

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const [climateRes, solarRes] = await Promise.all([
          macbase.schema('homeassistant').from('house_climate_profiles').select(`
            profile_id, cooling_rate, required_offset, avg_valve_position, meta,
            room:house_rooms(room_name, thermostat_type),
            weather:house_weather_categories(category_name, temp_min, temp_max)
          `),
          macbase.schema('homeassistant').from('house_solar_profiles').select(`
            solar_profile_id, month_id, max_solar_power_w, avg_solar_power_w, avg_hue_illuminance,
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

        const toHourBucket = (iso) => Math.floor(new Date(iso).getTime() / 3600000);

        const enrichedSchedules = (schedRes.data || []).map(sched => {
          const schedBucket = toHourBucket(sched.target_hour);
          const priceObj = (nordpoolRes.data || []).find(p => toHourBucket(p.start_time) === schedBucket);
          const weatherObj = (weatherRes.data || []).find(w => toHourBucket(w.target_time) === schedBucket);
          const parsedMeta = safeParseObject(sched.meta);

          const metaSpotPrice = parsedMeta.spot_price_snt !== undefined && parsedMeta.spot_price_snt !== null
            ? parseFloat(parsedMeta.spot_price_snt)
            : null;

          return {
            ...sched,
            price: priceObj ? parseFloat(priceObj.price) : metaSpotPrice,
            cloudCover: weatherObj ? parseFloat(weatherObj.cloud_cover) : null,
            meta: parsedMeta,
            cleanReasoning: extractCleanHourlyReasoning(sched.ai_reasoning)
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

  const formatWatts = (num) => {
    if (num === null || num === undefined || Number.isNaN(Number(num))) return '-';
    const rounded = Math.round(Number(num));
    return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
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
    const weekOfMonth = Math.min(Math.ceil((d.getDate() + dayOfWeek) / 7), 4);
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

  let dailyPlannedKwh = 0;
  let dailyPlannedSnt = 0;
  let dailyRealizedKwh = 0;
  let dailyRealizedSnt = 0;
  let dailyBiasKwh = 0; 
  let hasAnyRealized = false;

  schedules.forEach(s => {
    dailyPlannedKwh += Number(s.meta?.planned_kwh || 0);
    dailyPlannedSnt += Number(s.meta?.planned_cost_snt || 0);
    dailyBiasKwh += Number(s.meta?.ai_bias_correction_kwh || 0); 
    
    if (s.meta?.realized_kwh !== undefined && s.meta?.realized_kwh !== null) {
      hasAnyRealized = true;
      dailyRealizedKwh += Number(s.meta.realized_kwh);
      dailyRealizedSnt += Number(s.meta.realized_raw_cost_snt || 0);
    }
  });

  const dailySummary = schedules.find(s => s.meta?.daily_summary)?.meta?.daily_summary || null;
  const fallbackOverviewText = !dailySummary && schedules.length > 0
    ? extractFallbackOverviewText(schedules[0].ai_reasoning)
    : null;

  const groupedSchedules = [];
  let currentGroup = null;

  schedules.forEach(sched => {
    const schedDate = new Date(sched.target_hour);
    const isCurrentHour = isToday && schedDate.getHours() === currentHour;
    const past = isPastTime(sched.target_hour) && !isCurrentHour;

    const hasRealized = sched.meta?.realized_kwh !== undefined && sched.meta?.realized_kwh !== null;
    const isSnifferActive = sched.meta?.sniffer_active === true;
    const snifferAction = sched.meta?.sniffer_action;
    const decisionCode = sched.meta?.decision_code || null;

    if (!currentGroup) {
      currentGroup = {
        start_hour: sched.target_hour,
        end_hour: sched.target_hour,
        ilp_mode: sched.ilp_mode,
        ilp_target_temp: sched.ilp_target_temp,
        eve_thermo_target: sched.eve_thermo_target,
        ai_reasoning: sched.cleanReasoning,
        decision_code: decisionCode,
        isCurrentBlock: isCurrentHour,
        isPast: past,
        schedules: [sched],
        planned_kwh: Number(sched.meta?.planned_kwh || 0),
        raw_planned_kwh: Number(sched.meta?.raw_planned_kwh || 0), 
        ai_bias_correction_kwh: Number(sched.meta?.ai_bias_correction_kwh || 0), 
        planned_cost_snt: Number(sched.meta?.planned_cost_snt || 0),
        realized_kwh: Number(sched.meta?.realized_kwh || 0),
        realized_raw_cost_snt: Number(sched.meta?.realized_raw_cost_snt || 0),
        has_realized: hasRealized,
        has_sniffer: isSnifferActive,
        sniffer_action: snifferAction
      };
    } else {
      if (
        currentGroup.ilp_mode === sched.ilp_mode &&
        currentGroup.ilp_target_temp === sched.ilp_target_temp &&
        currentGroup.eve_thermo_target === sched.eve_thermo_target &&
        currentGroup.ai_reasoning === sched.cleanReasoning
      ) {
        currentGroup.end_hour = sched.target_hour;
        currentGroup.schedules.push(sched);
        if (isCurrentHour) currentGroup.isCurrentBlock = true;
        if (!past) currentGroup.isPast = false;
        
        currentGroup.planned_kwh += Number(sched.meta?.planned_kwh || 0);
        currentGroup.raw_planned_kwh += Number(sched.meta?.raw_planned_kwh || 0); 
        currentGroup.ai_bias_correction_kwh += Number(sched.meta?.ai_bias_correction_kwh || 0); 
        currentGroup.planned_cost_snt += Number(sched.meta?.planned_cost_snt || 0);
        if (hasRealized) {
          currentGroup.realized_kwh += Number(sched.meta.realized_kwh);
          currentGroup.realized_raw_cost_snt += Number(sched.meta?.realized_raw_cost_snt || 0);
          currentGroup.has_realized = true;
        }
        if (isSnifferActive) {
          currentGroup.has_sniffer = true;
          currentGroup.sniffer_action = snifferAction;
        }
      } else {
        groupedSchedules.push(currentGroup);
        currentGroup = {
          start_hour: sched.target_hour,
          end_hour: sched.target_hour,
          ilp_mode: sched.ilp_mode,
          ilp_target_temp: sched.ilp_target_temp,
          eve_thermo_target: sched.eve_thermo_target,
          ai_reasoning: sched.cleanReasoning,
          decision_code: decisionCode,
          isCurrentBlock: isCurrentHour,
          isPast: past,
          schedules: [sched],
          planned_kwh: Number(sched.meta?.planned_kwh || 0),
          raw_planned_kwh: Number(sched.meta?.raw_planned_kwh || 0), 
          ai_bias_correction_kwh: Number(sched.meta?.ai_bias_correction_kwh || 0), 
          planned_cost_snt: Number(sched.meta?.planned_cost_snt || 0),
          realized_kwh: Number(sched.meta?.realized_kwh || 0),
          realized_raw_cost_snt: Number(sched.meta?.realized_raw_cost_snt || 0),
          has_realized: hasRealized,
          has_sniffer: isSnifferActive,
          sniffer_action: snifferAction
        };
      }
    }
  });
  if (currentGroup) {
    groupedSchedules.push(currentGroup);
  }

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
        <IconCmp size={14} /> {mode === 'fan_only' || mode === 'off' ? `ILP: ${modeText}` : `ILP: ${temp}°C`} <span style={{ fontWeight: 500, fontSize: '0.75rem', color: 'var(--color-text-technical)' }}>{mode === 'fan_only' || mode === 'off' ? '' : modeText}</span>
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

  // Suodatetaan aurinkoprofiilit valitun päivän kuukaudelle (varalla viimeisin saatavilla oleva kuukausi)
  const selectedMonthId = selectedDate.getMonth() + 1;
  const availableSolarMonths = [...new Set(solarProfiles.map(sp => Number(sp.month_id)).filter(Boolean))].sort((a, b) => b - a);
  const effectiveSolarMonthId = availableSolarMonths.includes(selectedMonthId)
    ? selectedMonthId
    : (availableSolarMonths[0] || selectedMonthId);
  const effectiveSolarMonthName = MONTH_NAMES_FI[effectiveSolarMonthId - 1] || `${effectiveSolarMonthId}. kk`;

  const activeSolarProfiles = solarProfiles
    .filter(sp => Number(sp.month_id) === effectiveSolarMonthId)
    .sort((a, b) => {
      const cloudDiff = (a.cloud?.cloud_id || 0) - (b.cloud?.cloud_id || 0);
      if (cloudDiff !== 0) return cloudDiff;
      return (b.max_solar_power_w || 0) - (a.max_solar_power_w || 0);
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
                          const metaObj = safeParseObject(transaction.meta);
                          
                          return (
                            <div key={transaction.ledger_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: 'var(--color-bg-clean)', borderRadius: '4px', fontSize: '0.8rem' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '80%' }}>
                                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>
                                  {new Date(transaction.created_at).toLocaleDateString('fi-FI')} {new Date(transaction.created_at).toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span style={{ color: 'var(--color-text-main)' }}>{metaObj.selitys || transaction.transaction_type}</span>
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
        
        {/* PÄIVÄN KOKONAISYHTEENVETO LOKIKIRJAN ALUSSA */}
        {schedules.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '16px 16px 0 16px' }}>
            <div style={{ 
              backgroundColor: 'var(--color-bg-main)', 
              padding: '12px 16px', 
              borderRadius: '8px', 
              border: '1px solid var(--color-border)', 
              display: 'flex', 
              justifyContent: 'space-between',
              flexWrap: 'wrap', 
              gap: '12px', 
              fontSize: '0.85rem' 
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600 }}>Päivän Arvio</span>
                <span style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>
                  {dailyPlannedKwh.toFixed(1)} kWh <span style={{ color: 'var(--color-text-technical)' }}>({formatEur(dailyPlannedSnt)})</span>
                </span>
                {dailyBiasKwh !== 0 && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-electric)', fontWeight: 600 }}>
                    Sisältää AI-sääkorjausta {dailyBiasKwh > 0 ? '+' : ''}{dailyBiasKwh.toFixed(2)} kWh
                  </span>
                )}
              </div>

              {dailySummary?.wallet_mode && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600 }}>Teholompakko</span>
                  <span style={{ 
                    fontWeight: 600, 
                    color: dailySummary.frost_flex_triggered ? 'var(--color-electric)' : 'var(--color-text-main)' 
                  }}>
                    {dailySummary.wallet_mode}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-technical)' }}>
                    Kiintiö {Number(dailySummary.wallet_initial_allowance_kwh || 0).toFixed(1)} kWh (pohja {Number(dailySummary.mandatory_fan_kwh || 0).toFixed(1)} kWh)
                  </span>
                </div>
              )}

              {hasAnyRealized && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'right' }}>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600 }}>Toteutunut (tähän mennessä)</span>
                  <span style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>
                    {dailyRealizedKwh.toFixed(1)} kWh <span style={{ color: 'var(--color-text-technical)' }}>({formatEur(dailyRealizedSnt)})</span>
                  </span>
                </div>
              )}
            </div>

            {/* SIMULAATTORIN PÄIVÄKATSAUS (Lompakot, fysiikka, 48h tutka) */}
            {(dailySummary || fallbackOverviewText) && (
              <Accordion title="Simulaattorin päiväkatsaus & raja-arvot" iconName="BrainCircuit" defaultOpen={false}>
                {dailySummary ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8rem', color: 'var(--color-text-main)' }}>
                    <div className="flex-between" style={{ borderBottom: '1px solid var(--color-lancia)', paddingBottom: '6px', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Fysiikka-asetukset</span>
                      <span style={{ fontWeight: 600 }}>
                        Perus {dailySummary.normal_thermo_target_c}°C | Lataus {dailySummary.charge_target_c}°C | Patteripudotus {dailySummary.thermo_dropoff_c}°C
                      </span>
                    </div>

                    <div className="flex-between" style={{ borderBottom: '1px solid var(--color-lancia)', paddingBottom: '6px', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Hinta- ja mukavuusrajat</span>
                      <span style={{ fontWeight: 600 }}>
                        Katto {dailySummary.max_price_limit_snt} snt | Failsafe &le; {dailySummary.price_charge_limit_snt} snt | VIP-ale &le; {dailySummary.vip_discount_pct}% | Freeride {dailySummary.free_ride_pct}% ({dailySummary.free_ride_multiplier}x)
                      </span>
                    </div>

                    <div className="flex-between" style={{ borderBottom: '1px solid var(--color-lancia)', paddingBottom: '6px', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Eurolompakko & Aurinko</span>
                      <span style={{ fontWeight: 600 }}>
                        Käytettävissä {Number(dailySummary.euro_available_eur || 0).toFixed(2)} € (puskuri {Number(dailySummary.euro_reserve_eur || 0).toFixed(2)} €) | Aurinko: {dailySummary.solar_panels_active ? 'Aktiivinen' : 'Talvitelakka'}
                      </span>
                    </div>

                    <div className="flex-between" style={{ borderBottom: '1px solid var(--color-lancia)', paddingBottom: '6px', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>48h Tutka & VIP-ostot</span>
                      <span style={{ fontWeight: 600 }}>
                        {dailySummary.radar_panic_mode ? 'HÄTÄLATAUS' : 'Normaali'}
                        {dailySummary.radar_min_temp_c !== null && dailySummary.radar_min_temp_c !== undefined ? ` (ylihuomenna alin ${dailySummary.radar_min_temp_c}°C)` : ''}
                        {' '}| Ostettu {(dailySummary.vip_purchased_hours || []).length}/{dailySummary.vip_target_hours}h
                        {(dailySummary.vip_purchased_hours || []).length > 0 ? ` [${dailySummary.vip_purchased_hours.join(', ')}]` : ''}
                      </span>
                    </div>

                    <div className="flex-between" style={{ borderBottom: '1px solid var(--color-lancia)', paddingBottom: '6px', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Teholompakko (kWh)</span>
                      <span style={{ fontWeight: 600 }}>
                        Baseline {dailySummary.wallet_baseline_kwh} kWh &rarr; katto {dailySummary.wallet_daily_cap_kwh} kWh | Muu eläminen {dailySummary.wallet_baseload_kwh} kWh | fan_only {dailySummary.mandatory_fan_kwh} kWh | Lämmitysvara {dailySummary.heating_margin_after_fan_kwh} kWh
                      </span>
                    </div>

                    <div className="flex-between" style={{ gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Tuntijakauma ({dailySummary.hours_count}h, ka. {dailySummary.window_avg_temp_c}°C)</span>
                      <span style={{ fontWeight: 600 }}>
                        VIP {dailySummary.hours_vip}h | Failsafe {dailySummary.hours_failsafe}h | ILP-ylläpito {dailySummary.hours_ilp_maint}h | Vapaamatkustus {dailySummary.hours_freeride}h | KL {dailySummary.hours_dh_total}h
                      </span>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: '1.45' }}>
                    {fallbackOverviewText}
                  </div>
                )}
              </Accordion>
            )}
          </div>
        )}

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

                const validPrices = group.schedules.map(s => s.price).filter(p => p !== null && !Number.isNaN(p));
                let priceDisplay = null;
                if (validPrices.length === 1) {
                  priceDisplay = `${validPrices[0].toFixed(2)} c`;
                } else if (validPrices.length > 1) {
                  const minP = Math.min(...validPrices);
                  const maxP = Math.max(...validPrices);
                  priceDisplay = minP === maxP ? `${minP.toFixed(2)} c` : `${minP.toFixed(1)} – ${maxP.toFixed(1)} c`;
                }

                const estKwh = group.planned_kwh.toFixed(2);
                const estEur = formatEur(group.planned_cost_snt);
                
                let blockStats = `Arvio: ${estKwh} kWh (${estEur})`;
                let statsColor = 'var(--color-text-technical)';
                
                if (group.has_realized) {
                  const realKwh = group.realized_kwh.toFixed(2);
                  const realEur = formatEur(group.realized_raw_cost_snt);
                  
                  if (group.realized_kwh > group.planned_kwh * 1.1) {
                    statsColor = 'var(--color-rosso)';
                  } else if (group.realized_kwh < group.planned_kwh * 0.9) {
                    statsColor = 'var(--color-saab)';
                  }
                  
                  blockStats = `Toteutunut: ${realKwh} kWh (${realEur})`;
                }

                const decisionBadge = getDecisionBadgeMeta(group.decision_code);
                const firstMeta = group.schedules[0]?.meta || {};
                const lastMeta = group.schedules[group.schedules.length - 1]?.meta || {};

                return (
                  <div key={index} style={{ 
                    padding: '0',
                    borderRadius: '8px',
                    border: '1px solid var(--color-lancia)', 
                    opacity: group.isPast && !group.isCurrentBlock ? 0.85 : 1,
                    backgroundColor: group.isCurrentBlock ? 'var(--color-surface)' : (group.isPast ? 'transparent' : 'var(--color-surface)'),
                    borderLeft: group.isCurrentBlock ? '4px solid var(--color-electric)' : '1px solid var(--color-lancia)',
                    boxShadow: group.isCurrentBlock ? 'var(--shadow-subtle)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                  }}>
                    
                    {/* Kortin Yläosa (Näkyy aina) */}
                    <div style={{ padding: 'var(--padding-panel)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <div style={{ fontWeight: 700, fontSize: '1.05rem', color: group.isCurrentBlock ? 'var(--color-electric)' : 'var(--color-text-main)' }}>
                            {timeDisplay}
                          </div>
                          {group.isCurrentBlock && (
                            <Badge label="Nyt" isActive={true} />
                          )}
                          {decisionBadge && (
                            <span style={{ 
                              fontSize: '0.7rem', 
                              fontWeight: 600, 
                              color: decisionBadge.color, 
                              backgroundColor: 'var(--color-bg-clean)', 
                              border: '1px solid var(--color-border)',
                              padding: '2px 7px', 
                              borderRadius: '4px' 
                            }}>
                              {decisionBadge.label}
                            </span>
                          )}
                        </div>
                        
                        <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: statsColor, backgroundColor: 'var(--color-bg-clean)', padding: '2px 6px', borderRadius: '4px' }}>
                            <Activity size={12} /> {blockStats}
                          </span>

                          {priceDisplay !== null && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: 'var(--color-text-main)' }}>
                              <Zap size={12} className="text-muted" /> {priceDisplay}
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '0.85rem' }}>
                        {renderIlpMode(group.ilp_mode, group.ilp_target_temp)}

                        {group.eve_thermo_target !== null && group.eve_thermo_target !== undefined && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-text-main)', backgroundColor: 'var(--color-bg-clean)', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>
                            <Thermometer size={14} className="text-muted" /> Termostaatit: {group.eve_thermo_target}°C
                          </span>
                        )}

                        {group.has_sniffer && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-saab)', backgroundColor: 'var(--color-bg-clean)', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>
                            <ShieldAlert size={14} /> Nuuskijan korjaus ({group.sniffer_action})
                          </span>
                        )}
                      </div>

                      {group.ai_reasoning && (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', color: 'var(--color-text-muted)', fontSize: '0.85rem', lineHeight: '1.4', marginTop: '4px' }}>
                          <BrainCircuit size={16} className={group.isCurrentBlock ? "text-electric" : "text-muted"} style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span style={{ whiteSpace: 'pre-line' }}>{group.ai_reasoning}</span>
                        </div>
                      )}
                    </div>

                    {/* LAAJENNETTAVA ANALYYSI (Menneille ja tuleville tunneille) */}
                    <Accordion title={group.isPast ? "Analyysi ja Toteutuma" : "Laskentatiedot ja hintavertailu"} iconName="Cpu">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.8rem', color: 'var(--color-text-main)' }}>
                        
                        {/* Uudet hintavertailu- ja fysiikkaluvut */}
                        {firstMeta.ilp_heat_price_snt !== undefined && firstMeta.dh_heat_price_snt !== undefined && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-lancia)', paddingBottom: '8px' }}>
                            <span style={{ color: 'var(--color-text-muted)' }}>Lämpöhinta (ILP vs. Kaukolämpö)</span>
                            <span style={{ fontWeight: 600 }}>
                              {Number(firstMeta.ilp_heat_price_snt).toFixed(2)} vs {Number(firstMeta.dh_heat_price_snt).toFixed(1)} snt/kWh
                            </span>
                          </div>
                        )}

                        {lastMeta.virtual_temp_c !== undefined && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-lancia)', paddingBottom: '8px' }}>
                            <span style={{ color: 'var(--color-text-muted)' }}>Laatan virtuaalilämpö / Ulkolämpö</span>
                            <span style={{ fontWeight: 600 }}>
                              {Number(lastMeta.virtual_temp_c).toFixed(2)}°C
                              {firstMeta.outdoor_temp_c !== undefined ? ` / ${Number(firstMeta.outdoor_temp_c).toFixed(1)}°C` : ''}
                            </span>
                          </div>
                        )}

                        {lastMeta.wallet_kwh_remaining !== undefined && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-lancia)', paddingBottom: '8px' }}>
                            <span style={{ color: 'var(--color-text-muted)' }}>Teholompakon lisävara jäljellä</span>
                            <span style={{ fontWeight: 600 }}>
                              {Number(lastMeta.wallet_kwh_remaining).toFixed(2)} kWh
                              {lastMeta.wallet_mode ? ` (${lastMeta.wallet_mode})` : ''}
                            </span>
                          </div>
                        )}

                        {/* Fysiikkamallin arvio vs. Toteutuma */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-lancia)', paddingBottom: '8px' }}>
                          <span style={{ color: 'var(--color-text-muted)' }}>Raaka-arvio (Fysiikka)</span>
                          <span style={{ fontWeight: 600 }}>{group.raw_planned_kwh.toFixed(3)} kWh</span>
                        </div>
                        
                        {group.ai_bias_correction_kwh !== 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-lancia)', paddingBottom: '8px' }}>
                            <span style={{ color: 'var(--color-text-muted)' }}>Tekoälyn sääkorjaus</span>
                            <span style={{ fontWeight: 600, color: 'var(--color-electric)' }}>{group.ai_bias_correction_kwh > 0 ? '+' : ''}{group.ai_bias_correction_kwh.toFixed(3)} kWh</span>
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-lancia)', paddingBottom: '8px' }}>
                          <span style={{ color: 'var(--color-text-muted)' }}>Lopullinen arvio (Ennuste)</span>
                          <span style={{ fontWeight: 600 }}>{group.planned_kwh.toFixed(3)} kWh</span>
                        </div>
                        
                        {group.has_realized && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-lancia)', paddingBottom: '8px' }}>
                            <span style={{ color: 'var(--color-text-muted)' }}>Toteutunut kulutus</span>
                            <span style={{ fontWeight: 600, color: group.realized_kwh > group.planned_kwh * 1.1 ? 'var(--color-rosso)' : 'var(--color-saab)' }}>
                              {group.realized_kwh.toFixed(3)} kWh
                            </span>
                          </div>
                        )}

                        {/* Termostaattien Offsets (jos tunti sisältää ne meta-datassa) */}
                        {firstMeta.applied_targets && (
                          <div style={{ marginTop: '4px', backgroundColor: 'var(--color-bg-main)', padding: '12px', borderRadius: '6px' }}>
                            <div style={{ color: 'var(--color-text-technical)', textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 600, marginBottom: '8px' }}>Huonekohtainen ohjaus</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                              {Object.entries(firstMeta.applied_targets).map(([room, target]) => {
                                const aiOffset = firstMeta.ai_offsets_used?.[room];
                                const manualOffset = firstMeta.manual_offsets_used?.[room];
                                let offsetText = '';
                                if (manualOffset !== null && manualOffset !== undefined) offsetText = `(Käsin: ${manualOffset})`;
                                else if (aiOffset !== null && aiOffset !== undefined && Number(aiOffset) !== 0) offsetText = `(AI: ${aiOffset})`;

                                return (
                                  <div key={room} style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--color-surface)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                                    <span style={{ color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>{room}:</span>
                                    <span style={{ fontWeight: 600 }}>{parseFloat(target).toFixed(1)}°C {offsetText && <span style={{ fontSize: '0.7rem', color: 'var(--color-electric)', fontWeight: 'normal' }}>{offsetText}</span>}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                      </div>
                    </Accordion>

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
                    const profMeta = safeParseObject(prof.meta);
                    const hasCop = profMeta.cop_heat !== undefined && profMeta.cop_heat !== null;
                    
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
                          {hasCop && (
                            <div className="text-technical" style={{ fontSize: '0.7rem' }}>
                              COP {Number(profMeta.cop_heat).toFixed(1)}
                              {profMeta.heating_speed_c_per_h ? ` | +${Number(profMeta.heating_speed_c_per_h).toFixed(2)}°C/h` : ''}
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
              <Sun size={16} className="text-saab" /> Tuotto-odotus ({effectiveSolarMonthName})
            </h3>
            <p className="text-muted" style={{ margin: 0, fontSize: '0.8rem' }}>
              Malli aurinkopaneelien tuotosta eri pilvisyyksillä ({effectiveSolarMonthName}).
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
                    <Sun size={14} className={Number(sp.max_solar_power_w) > 1000 ? "text-saab" : "text-muted"} />
                    <span style={{ fontWeight: 600, color: 'var(--color-text-main)', fontSize: '0.8rem' }}>
                      {cleanCategoryName(getCloudName(sp.cloud))}
                    </span>
                  </div>
                  <div className="text-right">
                    <div style={{ color: 'var(--color-saab)', fontWeight: 700, fontSize: '0.95rem' }}>
                      {formatWatts(sp.max_solar_power_w)} W <span className="text-muted" style={{ fontSize: '0.7rem', fontWeight: 500 }}>(Max)</span>
                    </div>
                    <div className="text-technical" style={{ fontSize: '0.75rem' }}>
                      {formatWatts(sp.avg_solar_power_w)} W <span style={{ fontSize: '0.7rem' }}>(KA)</span>
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