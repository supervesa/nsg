import React, { useState, useEffect } from 'react';
import { macbase } from '../../../config/supabaseClient';
import { Settings, Cpu, Wallet, Save, RefreshCcw, Loader2, AlertCircle, Clock, X } from 'lucide-react';
import Accordion from '../../../components/common/Accordion';
import Toggle from '../../../components/common/Toggle';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';

export const meta = {
  id: 'settings',
  title: 'Asetukset',
  icon: 'Settings',
  order: 99
};

const VENTILATION_KEY = 'ventilation_smart_control';

const DEFAULT_VENTILATION_CONFIG = {
  price_limit_home: 15.0,
  price_limit_away: 10.0,
  price_limit_night: 10.0,
  price_force_on_below: 3.0,
  min_on_hours: 3,
  max_off_hours: 6,
  min_daily_on_pct: 50,
  max_humidity_pct: 70.0,
  temp_delta_threshold: 3.0,
  winter_temp_limit: -5.0,
  weekend_always_home: true,
  force_on_until: null,
  schedule: {
    home_morning_start: 7,
    home_morning_end: 9,
    away_work_start: 12,
    away_work_end: 16,
    home_evening_start: 17,
    home_evening_end: 24,
    weekend_home_start: 7,
    weekend_home_end: 24
  }
};

const VENTILATION_FIELD_GROUPS = [
  {
    title: 'Pörssisähkön hintarajat (snt/kWh)',
    fields: [
      {
        key: 'price_limit_home',
        label: 'Hintaraja: Kotona',
        unit: 'snt/kWh',
        step: '0.5',
        description: 'Kone voidaan sammuttaa kotona-aikoina vasta tämän rajan ylittyessä.'
      },
      {
        key: 'price_limit_away',
        label: 'Hintaraja: Töissä / Poissa',
        unit: 'snt/kWh',
        step: '0.5',
        description: 'Arjen työajan hintaraja, jolloin säästetään herkemmin.'
      },
      {
        key: 'price_limit_night',
        label: 'Hintaraja: Yö / Siirtymä',
        unit: 'snt/kWh',
        step: '0.5',
        description: 'Hintaraja yöaikaan ja siirtymätunneilla.'
      },
      {
        key: 'price_force_on_below',
        label: 'Halvan sähkön pakkokäynti',
        unit: 'snt/kWh',
        step: '0.5',
        description: 'Tämän hinnan tai alle kone pidetään aina päällä.'
      }
    ]
  },
  {
    title: 'Syklit ja vuorokausisuhde',
    fields: [
      {
        key: 'min_on_hours',
        label: 'Minimikäyntiaika',
        unit: 'h',
        step: '1',
        isInt: true,
        min: 1,
        max: 24,
        description: 'Ramppauksen esto: vähimmäisaika putkeen päällä käynnistyksen jälkeen.'
      },
      {
        key: 'max_off_hours',
        label: 'Maksimisammutusaika',
        unit: 'h',
        step: '1',
        isInt: true,
        min: 1,
        max: 24,
        description: 'Yhtäjaksoinen tauko, jonka jälkeen kone pakotetaan päälle.'
      },
      {
        key: 'min_daily_on_pct',
        label: 'Vähimmäiskäyntisuhde (24h)',
        unit: '%',
        step: '1',
        min: 0,
        max: 100,
        description: 'Liukuvan 24 tunnin vähimmäisosuus, jonka koneen on oltava päällä.'
      }
    ]
  },
  {
    title: 'Fysiikka ja turvarajat',
    fields: [
      {
        key: 'max_humidity_pct',
        label: 'Kriittinen kosteusraja',
        unit: '%',
        step: '1',
        min: 20,
        max: 100,
        description: 'Sisäilman suhteellinen kosteus, jonka ylitys pakottaa koneen päälle.'
      },
      {
        key: 'temp_delta_threshold',
        label: 'Lämpötiladelta (3h)',
        unit: '°C',
        step: '0.5',
        min: 0,
        description: '3 tunnin lämpötilamuutos (itseisarvo), joka pitää koneen päällä.'
      },
      {
        key: 'winter_temp_limit',
        label: 'Talviraja (pakkassuoja)',
        unit: '°C',
        step: '0.5',
        description: 'Kun ulkolämpötila alittaa tämän, kone pakotetaan pysymään päällä.'
      }
    ]
  }
];

const SCHEDULE_ROWS = [
  {
    id: 'home_morning',
    label: 'Arki: Aamu (Kotona)',
    startKey: 'home_morning_start',
    endKey: 'home_morning_end',
    description: 'Aamun kotona-profiili Suomen ajassa (esim. 7–9).'
  },
  {
    id: 'away_work',
    label: 'Arki: Työaika (Poissa)',
    startKey: 'away_work_start',
    endKey: 'away_work_end',
    description: 'Työpäivän säästöprofiili Suomen ajassa (esim. 12–16).'
  },
  {
    id: 'home_evening',
    label: 'Arki: Ilta (Kotona)',
    startKey: 'home_evening_start',
    endKey: 'home_evening_end',
    description: 'Illan kotona-profiili (24 = keskiyöhön asti).'
  },
  {
    id: 'weekend_home',
    label: 'Viikonloppu: Kotona (La–Su)',
    startKey: 'weekend_home_start',
    endKey: 'weekend_home_end',
    description: 'Käytössä la–su, kun "Viikonloppu aina kotona" on päällä.'
  }
];

// Apufunktio erikoismerkkien ja alaviivojen siistimiseen otsikoiksi
const formatLabel = (key) => {
  if (!key) return '';
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
};

// Turvallinen JSON-parsinta, joka korjaa SQL-inserttien tuplalainausmerkit (esim. '"{...}"')
const safeParseJSON = (data) => {
  if (!data) return {};
  if (typeof data === 'object') return data;
  try {
    const parsed = JSON.parse(data);
    if (typeof parsed === 'string') return JSON.parse(parsed);
    return parsed;
  } catch (e) {
    console.error("Virhe JSON-parsinnassa:", e, data);
    return {};
  }
};

// Muodostaa lomakkeelle turvallisen ilmanvaihtotilan (numerot merkkijonoina miinusmerkin ja tyhjennyksen vuoksi)
const toVentilationFormState = (rawConfig) => {
  const parsed = safeParseJSON(rawConfig);
  const rawSchedule = parsed.schedule && typeof parsed.schedule === 'object' ? parsed.schedule : {};

  const numStr = (val, fallback) => {
    const resolved = val !== null && val !== undefined && val !== '' ? val : fallback;
    return String(resolved);
  };

  return {
    price_limit_home: numStr(parsed.price_limit_home, DEFAULT_VENTILATION_CONFIG.price_limit_home),
    price_limit_away: numStr(parsed.price_limit_away, DEFAULT_VENTILATION_CONFIG.price_limit_away),
    price_limit_night: numStr(parsed.price_limit_night, DEFAULT_VENTILATION_CONFIG.price_limit_night),
    price_force_on_below: numStr(parsed.price_force_on_below, DEFAULT_VENTILATION_CONFIG.price_force_on_below),
    min_on_hours: numStr(parsed.min_on_hours, DEFAULT_VENTILATION_CONFIG.min_on_hours),
    max_off_hours: numStr(parsed.max_off_hours, DEFAULT_VENTILATION_CONFIG.max_off_hours),
    min_daily_on_pct: numStr(parsed.min_daily_on_pct, DEFAULT_VENTILATION_CONFIG.min_daily_on_pct),
    max_humidity_pct: numStr(parsed.max_humidity_pct, DEFAULT_VENTILATION_CONFIG.max_humidity_pct),
    temp_delta_threshold: numStr(parsed.temp_delta_threshold, DEFAULT_VENTILATION_CONFIG.temp_delta_threshold),
    winter_temp_limit: numStr(parsed.winter_temp_limit, DEFAULT_VENTILATION_CONFIG.winter_temp_limit),
    weekend_always_home: parsed.weekend_always_home !== undefined ? Boolean(parsed.weekend_always_home) : DEFAULT_VENTILATION_CONFIG.weekend_always_home,
    force_on_until: parsed.force_on_until || null,
    schedule: {
      home_morning_start: numStr(rawSchedule.home_morning_start, DEFAULT_VENTILATION_CONFIG.schedule.home_morning_start),
      home_morning_end: numStr(rawSchedule.home_morning_end, DEFAULT_VENTILATION_CONFIG.schedule.home_morning_end),
      away_work_start: numStr(rawSchedule.away_work_start, DEFAULT_VENTILATION_CONFIG.schedule.away_work_start),
      away_work_end: numStr(rawSchedule.away_work_end, DEFAULT_VENTILATION_CONFIG.schedule.away_work_end),
      home_evening_start: numStr(rawSchedule.home_evening_start, DEFAULT_VENTILATION_CONFIG.schedule.home_evening_start),
      home_evening_end: numStr(rawSchedule.home_evening_end, DEFAULT_VENTILATION_CONFIG.schedule.home_evening_end),
      weekend_home_start: numStr(rawSchedule.weekend_home_start, DEFAULT_VENTILATION_CONFIG.schedule.weekend_home_start),
      weekend_home_end: numStr(rawSchedule.weekend_home_end, DEFAULT_VENTILATION_CONFIG.schedule.weekend_home_end)
    }
  };
};

// Muuntaa lomaketilan tietokannan JSONB-muotoon ja validoi arvot ennen tallennusta
const buildVentilationPayload = (formState) => {
  const parseNum = (raw, label, { isInt = false, min = null, max = null } = {}) => {
    const normalized = String(raw ?? '').replace(',', '.').trim();
    if (normalized === '') {
      throw new Error(`Kenttä "${label}" ei voi olla tyhjä.`);
    }
    const num = isInt ? parseInt(normalized, 10) : parseFloat(normalized);
    if (Number.isNaN(num)) {
      throw new Error(`Kentän "${label}" arvo ei ole kelvollinen numero.`);
    }
    if (min !== null && num < min) {
      throw new Error(`Kentän "${label}" arvon on oltava vähintään ${min}.`);
    }
    if (max !== null && num > max) {
      throw new Error(`Kentän "${label}" arvo voi olla enintään ${max}.`);
    }
    return num;
  };

  const schedule = {};
  for (const row of SCHEDULE_ROWS) {
    const startVal = parseNum(formState.schedule[row.startKey], `${row.label} (alku)`, { isInt: true, min: 0, max: 23 });
    const endVal = parseNum(formState.schedule[row.endKey], `${row.label} (loppu)`, { isInt: true, min: 0, max: 24 });
    schedule[row.startKey] = startVal;
    schedule[row.endKey] = endVal;
  }

  return {
    price_limit_home: parseNum(formState.price_limit_home, 'Hintaraja: Kotona'),
    price_limit_away: parseNum(formState.price_limit_away, 'Hintaraja: Töissä / Poissa'),
    price_limit_night: parseNum(formState.price_limit_night, 'Hintaraja: Yö / Siirtymä'),
    price_force_on_below: parseNum(formState.price_force_on_below, 'Halvan sähkön pakkokäynti'),
    min_on_hours: parseNum(formState.min_on_hours, 'Minimikäyntiaika', { isInt: true, min: 1, max: 24 }),
    max_off_hours: parseNum(formState.max_off_hours, 'Maksimisammutusaika', { isInt: true, min: 1, max: 24 }),
    min_daily_on_pct: parseNum(formState.min_daily_on_pct, 'Vähimmäiskäyntisuhde (24h)', { min: 0, max: 100 }),
    max_humidity_pct: parseNum(formState.max_humidity_pct, 'Kriittinen kosteusraja', { min: 20, max: 100 }),
    temp_delta_threshold: parseNum(formState.temp_delta_threshold, 'Lämpötiladelta (3h)', { min: 0 }),
    winter_temp_limit: parseNum(formState.winter_temp_limit, 'Talviraja (pakkassuoja)'),
    weekend_always_home: Boolean(formState.weekend_always_home),
    force_on_until: formState.force_on_until || null,
    schedule
  };
};

// Muotoilee ISO-aikaleiman Suomen aikaan
const formatHelsinkiTimestamp = (isoStr) => {
  if (!isoStr) return null;
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return isoStr;
  return d.toLocaleString('fi-FI', {
    timeZone: 'Europe/Helsinki',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function SettingsTab() {
  const [originalData, setOriginalData] = useState({
    switchboard: [],
    ventilationConfig: toVentilationFormState(null),
    budgetRoot: {},
    budgetKpi: {},
    budgetSim: {}
  });

  const [localData, setLocalData] = useState({
    switchboard: [],
    ventilationConfig: toVentilationFormState(null),
    budgetRoot: {},
    budgetKpi: {},
    budgetSim: {}
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [switchRes, budgetRes] = await Promise.all([
        macbase.schema('homeassistant').from('settings_switchboard').select('*').order('automation_key', { ascending: true }),
        macbase.schema('homeassistant').from('budget_settings').select('*').eq('system_id', 'main_house').maybeSingle()
      ]);

      if (switchRes.error) throw switchRes.error;
      if (budgetRes.error) throw budgetRes.error;

      const switches = switchRes.data || [];
      const bData = budgetRes.data || {};
      const ventRow = switches.find((sw) => sw.automation_key === VENTILATION_KEY);

      const kpi = safeParseJSON(bData.kpi_targets);
      const sim = safeParseJSON(bData.simulator_settings);
      const ventConfig = toVentilationFormState(ventRow?.config);

      const loadedData = {
        switchboard: switches,
        ventilationConfig: ventConfig,
        budgetRoot: {
          monthly_budget_eur: bData.monthly_budget_eur,
          monthly_fee_eur: bData.monthly_fee_eur,
          transfer_fee_snt: bData.transfer_fee_snt,
          electricity_tax_snt: bData.electricity_tax_snt,
          spot_margin_snt: bData.spot_margin_snt
        },
        budgetKpi: kpi,
        budgetSim: sim
      };

      setOriginalData(JSON.parse(JSON.stringify(loadedData)));
      setLocalData(JSON.parse(JSON.stringify(loadedData)));
    } catch (err) {
      console.error("Virhe haettaessa asetuksia:", err);
      setError("Asetusten haku epäonnistui. Tarkista oikeudet tai tietokantayhteys.");
    } finally {
      setIsLoading(false);
    }
  };

  // Käsittelee Toggle-kytkimen (Switchboard) muutoksen lokaaliin tilaan
  const handleToggleSwitch = (key, currentVal) => {
    setLocalData((prev) => ({
      ...prev,
      switchboard: prev.switchboard.map((sw) =>
        sw.automation_key === key ? { ...sw, is_active: !currentVal } : sw
      )
    }));
  };

  // Käsittelee yleisten budjettikenttien muutoksen
  const handleInputChange = (section, key, val) => {
    setLocalData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: val
      }
    }));
  };

  // Käsittelee ilmanvaihdon juuritason parametrin muutoksen
  const handleVentChange = (key, val) => {
    setLocalData((prev) => ({
      ...prev,
      ventilationConfig: {
        ...prev.ventilationConfig,
        [key]: val
      }
    }));
  };

  // Käsittelee ilmanvaihdon kellonaika-asetuksen muutoksen
  const handleVentScheduleChange = (key, val) => {
    setLocalData((prev) => ({
      ...prev,
      ventilationConfig: {
        ...prev.ventilationConfig,
        schedule: {
          ...prev.ventilationConfig.schedule,
          [key]: val
        }
      }
    }));
  };

  // Asettaa tilapäisen pakkokäynnin (Sauna/Vieraat) lokaaliin tilaan
  const handleSetForceOnHours = (hours) => {
    const targetIso = hours
      ? new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
      : null;
    handleVentChange('force_on_until', targetIso);
  };

  const hasChanges = JSON.stringify(originalData) !== JSON.stringify(localData);

  const handleUndo = () => {
    setError(null);
    setLocalData(JSON.parse(JSON.stringify(originalData)));
  };

  // Tallentaa VAIN MUUTTUNEET arvot tietokantaan
  const handleSave = async () => {
    if (!hasChanges) return;
    setIsSaving(true);
    setError(null);

    try {
      // 1. Validoi ja rakenna ilmanvaihdon config-payload, jos se muuttui
      const ventConfigChanged =
        JSON.stringify(localData.ventilationConfig) !== JSON.stringify(originalData.ventilationConfig);

      let ventPayload = null;
      if (ventConfigChanged) {
        ventPayload = buildVentilationPayload(localData.ventilationConfig);
      }

      // 2. Tallenna muuttuneet Switchboard-rivit (is_active ja/tai ventilation config samassa päivityksessä)
      for (const localSw of localData.switchboard) {
        const origSw = originalData.switchboard.find(
          (sw) => sw.automation_key === localSw.automation_key
        );
        const isActiveChanged = origSw ? localSw.is_active !== origSw.is_active : true;
        const isVentRow = localSw.automation_key === VENTILATION_KEY;

        if (isActiveChanged || (isVentRow && ventConfigChanged)) {
          const swUpdatePayload = { updated_at: new Date().toISOString() };
          if (isActiveChanged) swUpdatePayload.is_active = localSw.is_active;
          if (isVentRow && ventConfigChanged) swUpdatePayload.config = ventPayload;

          const { error: swErr } = await macbase
            .schema('homeassistant')
            .from('settings_switchboard')
            .update(swUpdatePayload)
            .eq('automation_key', localSw.automation_key);

          if (swErr) throw swErr;
        }
      }

      // 3. Tallenna muuttuneet Budget-asetukset
      const originalBudgetObj = JSON.stringify({
        root: originalData.budgetRoot,
        kpi: originalData.budgetKpi,
        sim: originalData.budgetSim
      });
      const localBudgetObj = JSON.stringify({
        root: localData.budgetRoot,
        kpi: localData.budgetKpi,
        sim: localData.budgetSim
      });

      if (originalBudgetObj !== localBudgetObj) {
        const updatePayload = { updated_at: new Date().toISOString() };

        Object.keys(localData.budgetRoot).forEach((key) => {
          if (localData.budgetRoot[key] !== originalData.budgetRoot[key]) {
            updatePayload[key] = localData.budgetRoot[key];
          }
        });

        if (JSON.stringify(localData.budgetKpi) !== JSON.stringify(originalData.budgetKpi)) {
          updatePayload.kpi_targets = localData.budgetKpi;
        }
        if (JSON.stringify(localData.budgetSim) !== JSON.stringify(originalData.budgetSim)) {
          updatePayload.simulator_settings = localData.budgetSim;
        }

        if (Object.keys(updatePayload).length > 1) {
          const { error: bgErr } = await macbase
            .schema('homeassistant')
            .from('budget_settings')
            .update(updatePayload)
            .eq('system_id', 'main_house');
          if (bgErr) throw bgErr;
        }
      }

      // Normalisoidaan tallennettu tila vastaamaan täsmälleen kantaan mennyttä muotoa
      const savedSnapshot = JSON.parse(JSON.stringify(localData));
      if (ventPayload) {
        savedSnapshot.ventilationConfig = toVentilationFormState(ventPayload);
        savedSnapshot.switchboard = savedSnapshot.switchboard.map((sw) =>
          sw.automation_key === VENTILATION_KEY ? { ...sw, config: ventPayload } : sw
        );
      }

      setOriginalData(savedSnapshot);
      setLocalData(JSON.parse(JSON.stringify(savedSnapshot)));
    } catch (err) {
      console.error("Virhe tallennettaessa:", err);
      setError(err.message || "Asetusten tallennus epäonnistui.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted flex-center">
        <Loader2 className="animate-spin" size={20} style={{ marginRight: '8px' }} /> Ladataan asetuksia...
      </div>
    );
  }

  // Yhteinen renderöijä budjetin JSON-objektien arvoille
  const renderInputGrid = (sectionName, dataObj, originalObj) => {
    if (!dataObj || Object.keys(dataObj).length === 0) {
      return (
        <div style={{ padding: '16px', backgroundColor: 'var(--color-bg-clean)', borderRadius: '6px', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
          Ei määriteltyjä asetuksia tässä kategoriassa.
        </div>
      );
    }

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--spacing-grid)' }}>
        {Object.entries(dataObj).map(([key, value]) => {
          if (value !== null && typeof value === 'object') return null;

          const isModified = originalObj && value !== originalObj[key];

          return (
            <div
              key={key}
              className="ui-panel"
              style={{
                padding: '16px',
                borderLeft: isModified ? '3px solid var(--color-hermes)' : '1px solid var(--color-lancia)'
              }}
            >
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-technical)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '8px' }}>
                {formatLabel(key)}
              </label>
              <Input
                type="number"
                value={value !== null && value !== undefined ? value : ''}
                onChange={(e) => handleInputChange(sectionName, key, parseFloat(e.target.value) || 0)}
                placeholder="Aseta arvo..."
              />
            </div>
          );
        })}
      </div>
    );
  };

  const ventSwitch = localData.switchboard.find((sw) => sw.automation_key === VENTILATION_KEY);
  const ventLocal = localData.ventilationConfig;
  const ventOrig = originalData.ventilationConfig;
  const forceOnIso = ventLocal.force_on_until;
  const forceOnActive = forceOnIso ? new Date(forceOnIso) > new Date() : false;
  const forceOnModified = forceOnIso !== ventOrig.force_on_until;
  const weekendModified = ventLocal.weekend_always_home !== ventOrig.weekend_always_home;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-layout)' }}>
      {/* Sivun Header & Tallennuspainikkeet */}
      <div
        className="flex-between"
        style={{
          flexWrap: 'wrap',
          gap: '16px',
          backgroundColor: 'var(--color-surface)',
          padding: 'var(--padding-panel)',
          borderRadius: '8px',
          border: '1px solid var(--color-lancia)',
          boxShadow: 'var(--shadow-subtle)'
        }}
      >
        <div>
          <h2 className="text-title" style={{ margin: 0 }}>Asetukset</h2>
          <p className="text-muted" style={{ margin: 0, marginTop: '4px' }}>
            Järjestelmän dynaamiset parametrit ja automaatio-ohjaus.
          </p>
        </div>

        {hasChanges && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button variant="secondary" icon={RefreshCcw} onClick={handleUndo} disabled={isSaving}>
              Peruuta
            </Button>
            <Button variant="primary" icon={isSaving ? Loader2 : Save} onClick={handleSave} isLoading={isSaving}>
              Tallenna
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="text-error flex-row-gap">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* A. Automaation Kytkimet */}
      <Accordion title="Automaatiot (On / Off)" iconName="Cpu" defaultOpen={true}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {localData.switchboard.length === 0 ? (
            <div className="text-muted" style={{ fontSize: '0.85rem', padding: '8px' }}>
              Ei kytkimiä saatavilla.
            </div>
          ) : (
            localData.switchboard.map((sw, idx) => {
              const isModified = sw.is_active !== originalData.switchboard[idx]?.is_active;
              return (
                <div
                  key={sw.automation_key}
                  style={{
                    borderLeft: isModified ? '3px solid var(--color-hermes)' : 'none',
                    paddingLeft: isModified ? '12px' : '15px'
                  }}
                >
                  <Toggle
                    label={formatLabel(sw.automation_key)}
                    description={sw.description}
                    isActive={sw.is_active}
                    onToggle={() => handleToggleSwitch(sw.automation_key, sw.is_active)}
                  />
                </div>
              );
            })
          )}
        </div>
      </Accordion>

      {/* B. Ilmanvaihdon asetukset */}
      <Accordion title="Ilmanvaihdon asetukset" iconName="Fan">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {ventSwitch && !ventSwitch.is_active && (
            <div
              className="flex-row-gap"
              style={{
                padding: '12px 16px',
                borderRadius: '6px',
                backgroundColor: 'var(--color-bg-clean)',
                borderLeft: '3px solid var(--color-hermes)',
                fontSize: '0.85rem',
                color: 'var(--color-text-muted)'
              }}
            >
              <AlertCircle size={16} />
              <span>
                Ilmanvaihdon pääkytkin on pois päältä. Voit säätää ja tallentaa parametreja valmiiksi — ohjaus aktivoituu, kun kytkin käännetään päälle.
              </span>
            </div>
          )}

          {/* 1. Tilapäinen pakkokäynti (Sauna / Vieraat) */}
          <div
            className="ui-panel"
            style={{
              padding: '16px',
              borderLeft: forceOnModified ? '3px solid var(--color-hermes)' : '1px solid var(--color-lancia)'
            }}
          >
            <div className="flex-between" style={{ flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '4px' }}>
                  Tilapäinen pakkokäynti (Sauna / Vieraat)
                </div>
                <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                  {forceOnActive ? (
                    <>Aktiivinen klo <strong>{formatHelsinkiTimestamp(forceOnIso)}</strong> asti (ohittaa hinta- ja syklisäännöt).</>
                  ) : forceOnIso ? (
                    <>Aiempi ohitus vanhentunut ({formatHelsinkiTimestamp(forceOnIso)}). Normaali automaatio käytössä.</>
                  ) : (
                    <>Ei aktiivinen. Normaali automaatio käytössä.</>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <Button variant="secondary" icon={Clock} onClick={() => handleSetForceOnHours(2)}>
                  +2 h
                </Button>
                <Button variant="secondary" icon={Clock} onClick={() => handleSetForceOnHours(3)}>
                  +3 h
                </Button>
                <Button variant="secondary" icon={Clock} onClick={() => handleSetForceOnHours(4)}>
                  +4 h
                </Button>
                {forceOnIso && (
                  <Button variant="secondary" icon={X} onClick={() => handleSetForceOnHours(null)}>
                    Poista ohitus
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* 2–4. Hintarajat, syklit ja fysiikka */}
          {VENTILATION_FIELD_GROUPS.map((group) => (
            <div key={group.title} style={{ borderTop: '1px solid var(--color-bg-clean)', paddingTop: '16px' }}>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--color-text-main)', marginTop: 0, marginBottom: '12px' }}>
                {group.title}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--spacing-grid)' }}>
                {group.fields.map((field) => {
                  const isModified = ventLocal[field.key] !== ventOrig[field.key];
                  return (
                    <div
                      key={field.key}
                      className="ui-panel"
                      style={{
                        padding: '16px',
                        borderLeft: isModified ? '3px solid var(--color-hermes)' : '1px solid var(--color-lancia)'
                      }}
                    >
                      <div className="flex-between" style={{ marginBottom: '6px' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--color-text-technical)', textTransform: 'uppercase', fontWeight: 600 }}>
                          {field.label}
                        </label>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                          {field.unit}
                        </span>
                      </div>
                      <Input
                        type="number"
                        step={field.step}
                        min={field.min}
                        max={field.max}
                        value={ventLocal[field.key]}
                        onChange={(e) => handleVentChange(field.key, e.target.value)}
                      />
                      <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '8px', lineHeight: 1.35 }}>
                        {field.description}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* 5. Kalenteri ja kellonajat */}
          <div style={{ borderTop: '1px solid var(--color-bg-clean)', paddingTop: '16px' }}>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--color-text-main)', marginTop: 0, marginBottom: '12px' }}>
              Kalenteri ja kellonajat (Suomen aika)
            </h4>

            <div
              style={{
                borderLeft: weekendModified ? '3px solid var(--color-hermes)' : 'none',
                paddingLeft: weekendModified ? '12px' : '15px',
                marginBottom: '16px'
              }}
            >
              <Toggle
                label="Viikonloppu aina kotona"
                description="Lauantaisin ja sunnuntaisin käytetään viikonlopun kotona-profiilia ilman työaikajaksoa."
                isActive={ventLocal.weekend_always_home}
                onToggle={() => handleVentChange('weekend_always_home', !ventLocal.weekend_always_home)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--spacing-grid)' }}>
              {SCHEDULE_ROWS.map((row) => {
                const startVal = ventLocal.schedule[row.startKey];
                const endVal = ventLocal.schedule[row.endKey];
                const isModified =
                  startVal !== ventOrig.schedule[row.startKey] ||
                  endVal !== ventOrig.schedule[row.endKey];
                const isDimmed = row.id === 'weekend_home' && !ventLocal.weekend_always_home;

                return (
                  <div
                    key={row.id}
                    className="ui-panel"
                    style={{
                      padding: '16px',
                      opacity: isDimmed ? 0.55 : 1,
                      borderLeft: isModified ? '3px solid var(--color-hermes)' : '1px solid var(--color-lancia)'
                    }}
                  >
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-technical)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '8px' }}>
                      {row.label}
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '8px' }}>
                      <Input
                        type="number"
                        step="1"
                        min={0}
                        max={23}
                        value={startVal}
                        onChange={(e) => handleVentScheduleChange(row.startKey, e.target.value)}
                        placeholder="Alku"
                      />
                      <span className="text-muted" style={{ fontSize: '0.85rem' }}>–</span>
                      <Input
                        type="number"
                        step="1"
                        min={0}
                        max={24}
                        value={endVal}
                        onChange={(e) => handleVentScheduleChange(row.endKey, e.target.value)}
                        placeholder="Loppu"
                      />
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '8px', lineHeight: 1.35 }}>
                      {row.description}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Accordion>

      {/* C. Talous ja Hinnat */}
      <Accordion title="Talouden perusasetukset" iconName="Wallet">
        {renderInputGrid('budgetRoot', localData.budgetRoot, originalData.budgetRoot)}
      </Accordion>

      {/* D. Tekoäly ja Simulaattori */}
      <Accordion title="Tekoälyn parametrit (KPI & Simulaattori)" iconName="Settings">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--color-text-main)', marginBottom: '12px' }}>Tavoitteet (KPI)</h4>
            {renderInputGrid('budgetKpi', localData.budgetKpi, originalData.budgetKpi)}
          </div>

          <div style={{ borderTop: '1px solid var(--color-bg-clean)', paddingTop: '16px' }}>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--color-text-main)', marginBottom: '12px' }}>Simulaattorin Rajat</h4>
            {renderInputGrid('budgetSim', localData.budgetSim, originalData.budgetSim)}
          </div>
        </div>
      </Accordion>
    </div>
  );
}