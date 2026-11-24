import React, { useState, useEffect } from 'react';
import { macbase } from '../../../config/supabaseClient';
import { Save, RefreshCcw, Loader2, AlertCircle, Clock, X, Power, Users, Sparkles } from 'lucide-react';
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
const AWAY_KEY = 'away_mode';
const GUEST_KEY = 'guest_mode_active';

const GUEST_DURATION_OPTIONS = [4, 6, 8];
const ILP_FAN_MODE_OPTIONS = [
  { value: '1', label: '1 (Hiljaisin)' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5 (Suurin)' },
  { value: 'auto', label: 'Auto' }
];

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

const DEFAULT_AWAY_CONFIG = {
  active_from: null,
  active_until: null,
  return_prep_hours: 4,
  ventilation_hours_per_day: 6,
  ventilation_max_off_hours: 12,
  ilp_hours_per_day: 6,
  heating_target_temp: 17.0,
  source: 'manual',
  calendar_uid: null,
  dismissed_calendar_uid: null
};

const DEFAULT_GUEST_CONFIG = {
  active_from: null,
  active_until: null,
  default_duration_hours: 6,
  guest_profile: 'standard',
  source: 'manual',
  calendar_uid: null,
  dismissed_calendar_uid: null,
  target_temp: 20.5,
  sniffer_low_temp: 20.0,
  sniffer_high_temp: 21.5,
  cool_trigger_temp: 23.0,
  cool_heating_season_trigger_temp: 24.0,
  cool_target_temp: 21.5,
  cool_min_outdoor_temp: 12.0,
  ilp_heat_cool_max_thermo: 18.0,
  ilp_fan_mode: '1',
  ilp_restore_fan_mode: 'auto',
  fan_mode_dirty: false,
  fest_target_temp: 19.5,
  fest_sniffer_low_temp: 19.0,
  fest_sniffer_high_temp: 20.5,
  fest_cool_trigger_temp: 22.0,
  fest_cool_heating_season_trigger_temp: 22.5,
  fest_cool_target_temp: 21.0,
  fest_cool_boost_fan_temp: 23.0,
  fest_cool_boost_fan_mode: '2',
  fest_sniffer_humidity_pct: 55,
  fest_sniffer_pm25_limit: 12,
  boost_enabled: false,
  boost_entity_id: null,
  boost_min_outdoor_temp: -10.0,
  boost_max_outdoor_aqi: 50,
  sniffer_humidity_pct: 60,
  sniffer_pm25_limit: 15
};

const GUEST_STANDARD_HEATING_FIELDS = [
  {
    key: 'target_temp',
    label: 'Vaihe 1: Tavoitelämpötila (heat)',
    unit: '°C',
    step: '0.5',
    min: 16,
    max: 24,
    description: 'Normaalialueen mukavuuslämpötila. ILP lämmittää vain tarvittaessa eikä jäähdytä turhaan.'
  },
  {
    key: 'sniffer_low_temp',
    label: 'Kylmäpaikkauksen alaraja',
    unit: '°C',
    step: '0.5',
    min: 15,
    max: 23,
    description: 'Jos olohuone laskee tämän alle, lämmitystä paikataan pehmeästi takaisin tavoitteeseen.'
  },
  {
    key: 'sniffer_high_temp',
    label: 'Vaihe 2: Ilmainen tasaus (fan_only)',
    unit: '°C',
    step: '0.5',
    min: 18,
    max: 26,
    description: 'Tästä ylöspäin patterit pudotetaan alas ja ILP tasaa lämpöä fan_only-tilassa ilman jäähdytystä.'
  },
  {
    key: 'cool_trigger_temp',
    label: 'Vaihe 3: Viilennysraja (lämmin kausi)',
    unit: '°C',
    step: '0.5',
    min: 20,
    max: 28,
    description: 'Kuumaraja aktiiviselle cool-viilennykselle, kun ulkolämpötila ylittää vuodenaikarajan.'
  },
  {
    key: 'cool_heating_season_trigger_temp',
    label: 'Vaihe 3: Hätäviilennys (lämmityskausi)',
    unit: '°C',
    step: '0.5',
    min: 21,
    max: 30,
    description: 'Lämmityskaudella viilennys on estetty rutiinisti ja sallitaan vasta tämän hätärajan ylittyessä.'
  },
  {
    key: 'cool_target_temp',
    label: 'Viilennyksen pyyntilämpötila',
    unit: '°C',
    step: '0.5',
    min: 18,
    max: 25,
    description: 'Maltillinen cool-pyynti (esim. 21,5 °C), jotta pumppu ei puhalla kylmää vetoa vieraiden niskaan.'
  },
  {
    key: 'cool_min_outdoor_temp',
    label: 'Vuodenaikavahti (FMI ulkolämpötila)',
    unit: '°C',
    step: '0.5',
    min: -10,
    max: 25,
    description: 'Alle tämän ulkolämpötilan sovelletaan lämmityskauden tiukempaa viilennysrajaa.'
  },
  {
    key: 'ilp_heat_cool_max_thermo',
    label: 'Patterien leikkaustaso',
    unit: '°C',
    step: '0.5',
    min: 14,
    max: 22,
    description: 'Lämpötila, johon patterien peruspyynti pudotetaan vaiheissa 2–3 ja Fest-ennakoinnissa.'
  }
];

const GUEST_FEST_FIELDS = [
  {
    key: 'fest_target_temp',
    label: 'Fest: Ennakoiva tavoite (heat)',
    unit: '°C',
    step: '0.5',
    min: 16,
    max: 23,
    description: 'Laskettu pohjatavoite (esim. 19,5 °C), joka kompensoi 8+ ihmisen ja keittiön lämpökuorman.'
  },
  {
    key: 'fest_sniffer_low_temp',
    label: 'Fest: Kylmäpaikkauksen alaraja',
    unit: '°C',
    step: '0.5',
    min: 15,
    max: 22,
    description: 'Patterit pysyvät Fest-tilassa alhaalla ja avautuvat vain, jos olohuone putoaa tämän alle.'
  },
  {
    key: 'fest_sniffer_high_temp',
    label: 'Fest: Vaihe 2 tasaus (fan_only)',
    unit: '°C',
    step: '0.5',
    min: 18,
    max: 25,
    description: 'Olohuoneen raja, josta Fest-tila siirtyy ilmaiseen fan_only-tasaukseen.'
  },
  {
    key: 'fest_cool_trigger_temp',
    label: 'Fest: Viilennys (lämmin kausi)',
    unit: '°C',
    step: '0.5',
    min: 19,
    max: 26,
    description: 'Fest-profiilin cool-viilennysraja lämpimänä kautena.'
  },
  {
    key: 'fest_cool_heating_season_trigger_temp',
    label: 'Fest: Viilennys (lämmityskausi)',
    unit: '°C',
    step: '0.5',
    min: 20,
    max: 27,
    description: 'Fest-profiilissa viilennys sallitaan täyden huoneen vuoksi myös lämmityskaudella tästä rajasta.'
  },
  {
    key: 'fest_cool_target_temp',
    label: 'Fest: Viilennyksen pyynti',
    unit: '°C',
    step: '0.5',
    min: 18,
    max: 24,
    description: 'ILP:n lämpötilapyynti Fest-profiilin cool-vaiheessa.'
  },
  {
    key: 'fest_cool_boost_fan_temp',
    label: 'Fest: Puhalluksen lisätehoraja',
    unit: '°C',
    step: '0.5',
    min: 20,
    max: 28,
    description: 'Jos olohuone kiipeää tämän yli cool-tilassa, puhallinnopeus nostetaan lisäteholle.'
  },
  {
    key: 'fest_sniffer_humidity_pct',
    label: 'Fest IV-nuuskija: Kosteusraja',
    unit: '%',
    step: '1',
    min: 30,
    max: 90,
    description: 'Herkempi kosteusraja isolle porukalle (reagoi myös TVOC medium/moderate -tasoon).'
  },
  {
    key: 'fest_sniffer_pm25_limit',
    label: 'Fest IV-nuuskija: PM2.5-raja',
    unit: 'µg/m³',
    step: '1',
    min: 5,
    max: 100,
    description: 'Herkempi pienhiukkasraja ruoanlaiton ja suuren väkimäärän varalle.'
  }
];

const GUEST_VENTILATION_FIELDS = [
  {
    key: 'boost_min_outdoor_temp',
    label: 'Tehostuksen pakkasraja',
    unit: '°C',
    step: '0.5',
    min: -35,
    max: 10,
    description: 'Alle tämän ulkolämpötilan Valloxin rutiini-impulssi estetään jälkilämmityksen suojaamiseksi.'
  },
  {
    key: 'boost_max_outdoor_aqi',
    label: 'Ulkoilman AQI-raja',
    unit: 'AQI',
    step: '1',
    isInt: true,
    min: 10,
    max: 200,
    description: 'Rutiinitehostus estetään, jos ulkoilman laatuindeksi ylittää tämän rajan.'
  },
  {
    key: 'sniffer_humidity_pct',
    label: 'Nuuskija: Kosteusraja (Vieraat)',
    unit: '%',
    step: '1',
    min: 30,
    max: 90,
    description: 'Tämän kosteuden ylitys laukaisee tuuletuksen ja 1h tehostusimpulssin rajoitteista huolimatta.'
  },
  {
    key: 'sniffer_pm25_limit',
    label: 'Nuuskija: PM2.5-raja (Vieraat)',
    unit: 'µg/m³',
    step: '1',
    min: 5,
    max: 100,
    description: 'Buddy- tai Ilmari-anturin PM2.5-raja (esim. ruoanlaitto), joka herättää tehostuksen.'
  }
];

const AWAY_NUMERIC_FIELDS = [
  {
    key: 'ilp_hours_per_day',
    label: 'ILP:n lämmityskiintiö',
    unit: 'h / vrk',
    step: '1',
    isInt: true,
    min: 0,
    max: 24,
    description: 'Jaetaan kahteen 12h puoliskoon päivän halvimpiin tunteihin. Muina tunteina ILP on pois päältä (off).'
  },
  {
    key: 'ventilation_hours_per_day',
    label: 'Ilmanvaihdon käyntikiintiö',
    unit: 'h / vrk',
    step: '1',
    isInt: true,
    min: 0,
    max: 24,
    description: 'Jaetaan kahteen 12h puoliskoon päivän halvimpiin yhtäjaksoisiin tunteihin (esim. 6 h = 3 h + 3 h).'
  },
  {
    key: 'ventilation_max_off_hours',
    label: 'Ilmanvaihdon maksimitauko',
    unit: 'h',
    step: '1',
    isInt: true,
    min: 1,
    max: 24,
    description: 'Vararaja poissaolon ajalle: pakottaa tuuletuksen, jos hintadataa puuttuu tai tauko venyy.'
  },
  {
    key: 'heating_target_temp',
    label: 'Lämmityksen poissaololämpötila',
    unit: '°C',
    step: '0.5',
    min: 10,
    max: 25,
    description: 'Tavoitelämpötila poissaolon ajalle (lämmityssimulaattoria varten).'
  }
];

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

// Turvallinen JSON-parsinta, joka korjaa SQL-inserttien tuplalainausmerkit
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

// ISO-aikaleima -> HTML datetime-local -kentän muoto (YYYY-MM-DDTHH:mm)
const isoToLocalInputValue = (isoStr) => {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// HTML datetime-local -> ISO-8601 UTC -aikaleima (tai null)
const localInputValueToIso = (localStr, fieldLabel) => {
  if (!localStr || !String(localStr).trim()) return null;
  const d = new Date(localStr);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Kentän "${fieldLabel}" aikaleima ei ole kelvollinen.`);
  }
  return d.toISOString();
};

// Muotoilee aikaleiman Suomen aikaan luettavaan muotoon
const formatHelsinkiTimestamp = (dateOrIso) => {
  if (!dateOrIso) return null;
  const d = dateOrIso instanceof Date ? dateOrIso : new Date(dateOrIso);
  if (Number.isNaN(d.getTime())) return String(dateOrIso);
  return d.toLocaleString('fi-FI', {
    timeZone: 'Europe/Helsinki',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Yhteinen numerovalidaattori lomaketiloille
const parseValidatedNumber = (raw, label, { isInt = false, min = null, max = null } = {}) => {
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

// Ilmanvaihdon lomaketila
const toVentilationFormState = (rawConfig) => {
  const parsed = safeParseJSON(rawConfig);
  const rawSchedule = parsed.schedule && typeof parsed.schedule === 'object' ? parsed.schedule : {};
  const numStr = (val, fallback) => String(val !== null && val !== undefined && val !== '' ? val : fallback);

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

// Poissaolotilan lomaketila
const toAwayFormState = (rawConfig) => {
  const parsed = safeParseJSON(rawConfig);
  const numStr = (val, fallback) => String(val !== null && val !== undefined && val !== '' ? val : fallback);

  return {
    active_from: isoToLocalInputValue(parsed.active_from),
    active_until: isoToLocalInputValue(parsed.active_until),
    return_prep_hours: numStr(parsed.return_prep_hours, DEFAULT_AWAY_CONFIG.return_prep_hours),
    ventilation_hours_per_day: numStr(parsed.ventilation_hours_per_day, DEFAULT_AWAY_CONFIG.ventilation_hours_per_day),
    ventilation_max_off_hours: numStr(parsed.ventilation_max_off_hours, DEFAULT_AWAY_CONFIG.ventilation_max_off_hours),
    ilp_hours_per_day: numStr(parsed.ilp_hours_per_day, DEFAULT_AWAY_CONFIG.ilp_hours_per_day),
    heating_target_temp: numStr(parsed.heating_target_temp, DEFAULT_AWAY_CONFIG.heating_target_temp),
    source: parsed.source || DEFAULT_AWAY_CONFIG.source,
    calendar_uid: parsed.calendar_uid || null,
    dismissed_calendar_uid: parsed.dismissed_calendar_uid || null
  };
};

// Vierastilan lomaketila
const toGuestFormState = (rawConfig) => {
  const parsed = safeParseJSON(rawConfig);
  const numStr = (val, fallback) => String(val !== null && val !== undefined && val !== '' ? val : fallback);
  const rawProfile = String(parsed.guest_profile || DEFAULT_GUEST_CONFIG.guest_profile).toLowerCase();

  return {
    active_from: isoToLocalInputValue(parsed.active_from),
    active_until: isoToLocalInputValue(parsed.active_until),
    default_duration_hours: numStr(parsed.default_duration_hours, DEFAULT_GUEST_CONFIG.default_duration_hours),
    guest_profile: rawProfile === 'fest' ? 'fest' : 'standard',
    source: parsed.source || DEFAULT_GUEST_CONFIG.source,
    calendar_uid: parsed.calendar_uid || null,
    dismissed_calendar_uid: parsed.dismissed_calendar_uid || null,
    target_temp: numStr(parsed.target_temp, DEFAULT_GUEST_CONFIG.target_temp),
    sniffer_low_temp: numStr(parsed.sniffer_low_temp, DEFAULT_GUEST_CONFIG.sniffer_low_temp),
    sniffer_high_temp: numStr(parsed.sniffer_high_temp, DEFAULT_GUEST_CONFIG.sniffer_high_temp),
    cool_trigger_temp: numStr(parsed.cool_trigger_temp, DEFAULT_GUEST_CONFIG.cool_trigger_temp),
    cool_heating_season_trigger_temp: numStr(parsed.cool_heating_season_trigger_temp, DEFAULT_GUEST_CONFIG.cool_heating_season_trigger_temp),
    cool_target_temp: numStr(parsed.cool_target_temp, DEFAULT_GUEST_CONFIG.cool_target_temp),
    cool_min_outdoor_temp: numStr(parsed.cool_min_outdoor_temp, DEFAULT_GUEST_CONFIG.cool_min_outdoor_temp),
    ilp_heat_cool_max_thermo: numStr(parsed.ilp_heat_cool_max_thermo, DEFAULT_GUEST_CONFIG.ilp_heat_cool_max_thermo),
    ilp_fan_mode: String(parsed.ilp_fan_mode || DEFAULT_GUEST_CONFIG.ilp_fan_mode),
    ilp_restore_fan_mode: String(parsed.ilp_restore_fan_mode || DEFAULT_GUEST_CONFIG.ilp_restore_fan_mode),
    fan_mode_dirty: Boolean(parsed.fan_mode_dirty),
    fest_target_temp: numStr(parsed.fest_target_temp, DEFAULT_GUEST_CONFIG.fest_target_temp),
    fest_sniffer_low_temp: numStr(parsed.fest_sniffer_low_temp, DEFAULT_GUEST_CONFIG.fest_sniffer_low_temp),
    fest_sniffer_high_temp: numStr(parsed.fest_sniffer_high_temp, DEFAULT_GUEST_CONFIG.fest_sniffer_high_temp),
    fest_cool_trigger_temp: numStr(parsed.fest_cool_trigger_temp, DEFAULT_GUEST_CONFIG.fest_cool_trigger_temp),
    fest_cool_heating_season_trigger_temp: numStr(parsed.fest_cool_heating_season_trigger_temp, DEFAULT_GUEST_CONFIG.fest_cool_heating_season_trigger_temp),
    fest_cool_target_temp: numStr(parsed.fest_cool_target_temp, DEFAULT_GUEST_CONFIG.fest_cool_target_temp),
    fest_cool_boost_fan_temp: numStr(parsed.fest_cool_boost_fan_temp, DEFAULT_GUEST_CONFIG.fest_cool_boost_fan_temp),
    fest_cool_boost_fan_mode: String(parsed.fest_cool_boost_fan_mode || DEFAULT_GUEST_CONFIG.fest_cool_boost_fan_mode),
    fest_sniffer_humidity_pct: numStr(parsed.fest_sniffer_humidity_pct, DEFAULT_GUEST_CONFIG.fest_sniffer_humidity_pct),
    fest_sniffer_pm25_limit: numStr(parsed.fest_sniffer_pm25_limit, DEFAULT_GUEST_CONFIG.fest_sniffer_pm25_limit),
    boost_enabled: Boolean(parsed.boost_enabled),
    boost_entity_id: parsed.boost_entity_id ? String(parsed.boost_entity_id) : '',
    boost_min_outdoor_temp: numStr(parsed.boost_min_outdoor_temp, DEFAULT_GUEST_CONFIG.boost_min_outdoor_temp),
    boost_max_outdoor_aqi: numStr(parsed.boost_max_outdoor_aqi, DEFAULT_GUEST_CONFIG.boost_max_outdoor_aqi),
    sniffer_humidity_pct: numStr(parsed.sniffer_humidity_pct, DEFAULT_GUEST_CONFIG.sniffer_humidity_pct),
    sniffer_pm25_limit: numStr(parsed.sniffer_pm25_limit, DEFAULT_GUEST_CONFIG.sniffer_pm25_limit)
  };
};

const buildVentilationPayload = (formState) => {
  const schedule = {};
  for (const row of SCHEDULE_ROWS) {
    schedule[row.startKey] = parseValidatedNumber(formState.schedule[row.startKey], `${row.label} (alku)`, { isInt: true, min: 0, max: 23 });
    schedule[row.endKey] = parseValidatedNumber(formState.schedule[row.endKey], `${row.label} (loppu)`, { isInt: true, min: 0, max: 24 });
  }

  return {
    price_limit_home: parseValidatedNumber(formState.price_limit_home, 'Hintaraja: Kotona'),
    price_limit_away: parseValidatedNumber(formState.price_limit_away, 'Hintaraja: Töissä / Poissa'),
    price_limit_night: parseValidatedNumber(formState.price_limit_night, 'Hintaraja: Yö / Siirtymä'),
    price_force_on_below: parseValidatedNumber(formState.price_force_on_below, 'Halvan sähkön pakkokäynti'),
    min_on_hours: parseValidatedNumber(formState.min_on_hours, 'Minimikäyntiaika', { isInt: true, min: 1, max: 24 }),
    max_off_hours: parseValidatedNumber(formState.max_off_hours, 'Maksimisammutusaika', { isInt: true, min: 1, max: 24 }),
    min_daily_on_pct: parseValidatedNumber(formState.min_daily_on_pct, 'Vähimmäiskäyntisuhde (24h)', { min: 0, max: 100 }),
    max_humidity_pct: parseValidatedNumber(formState.max_humidity_pct, 'Kriittinen kosteusraja', { min: 20, max: 100 }),
    temp_delta_threshold: parseValidatedNumber(formState.temp_delta_threshold, 'Lämpötiladelta (3h)', { min: 0 }),
    winter_temp_limit: parseValidatedNumber(formState.winter_temp_limit, 'Talviraja (pakkassuoja)'),
    weekend_always_home: Boolean(formState.weekend_always_home),
    force_on_until: formState.force_on_until || null,
    schedule
  };
};

const buildAwayPayload = (formState) => {
  const activeFromIso = localInputValueToIso(formState.active_from, 'Aloitusaika');
  const activeUntilIso = localInputValueToIso(formState.active_until, 'Suunniteltu paluu');

  if (activeFromIso && activeUntilIso && new Date(activeUntilIso) <= new Date(activeFromIso)) {
    throw new Error('Suunnitellun paluun on oltava aloitusajan jälkeen.');
  }

  return {
    active_from: activeFromIso,
    active_until: activeUntilIso,
    return_prep_hours: parseValidatedNumber(formState.return_prep_hours, 'Paluun esivalmisteluaika', { isInt: true, min: 0, max: 48 }),
    ventilation_hours_per_day: parseValidatedNumber(formState.ventilation_hours_per_day, 'Ilmanvaihdon käyntikiintiö', { isInt: true, min: 0, max: 24 }),
    ventilation_max_off_hours: parseValidatedNumber(formState.ventilation_max_off_hours, 'Ilmanvaihdon maksimitauko', { isInt: true, min: 1, max: 24 }),
    ilp_hours_per_day: parseValidatedNumber(formState.ilp_hours_per_day, 'ILP:n lämmityskiintiö', { isInt: true, min: 0, max: 24 }),
    heating_target_temp: parseValidatedNumber(formState.heating_target_temp, 'Lämmityksen poissaololämpötila', { min: 10, max: 25 }),
    source: formState.source || 'manual',
    calendar_uid: formState.calendar_uid || null,
    dismissed_calendar_uid: formState.dismissed_calendar_uid || null
  };
};

const buildGuestPayload = (formState) => {
  const activeFromIso = localInputValueToIso(formState.active_from, 'Vierastilan aloitusaika');
  const activeUntilIso = localInputValueToIso(formState.active_until, 'Vierastilan päättymisaika');

  if (activeFromIso && activeUntilIso && new Date(activeUntilIso) <= new Date(activeFromIso)) {
    throw new Error('Vierastilan päättymisajan on oltava aloitusajan jälkeen.');
  }

  const targetTemp = parseValidatedNumber(formState.target_temp, 'Vaihe 1: Tavoitelämpötila (heat)', { min: 16, max: 24 });
  const snifferLow = parseValidatedNumber(formState.sniffer_low_temp, 'Kylmäpaikkauksen alaraja', { min: 15, max: 23 });
  const snifferHigh = parseValidatedNumber(formState.sniffer_high_temp, 'Vaihe 2: Ilmainen tasaus (fan_only)', { min: 18, max: 26 });
  const coolTrigger = parseValidatedNumber(formState.cool_trigger_temp, 'Vaihe 3: Viilennysraja (lämmin kausi)', { min: 20, max: 28 });
  const coolHeatingSeasonTrigger = parseValidatedNumber(formState.cool_heating_season_trigger_temp, 'Vaihe 3: Hätäviilennys (lämmityskausi)', { min: 21, max: 30 });
  const coolTarget = parseValidatedNumber(formState.cool_target_temp, 'Viilennyksen pyyntilämpötila', { min: 18, max: 25 });

  if (snifferHigh <= snifferLow) {
    throw new Error('Vieraat-profiilin fan_only-rajan on oltava korkeampi kuin kylmäpaikkauksen alarajan.');
  }
  if (coolTrigger <= snifferHigh) {
    throw new Error('Vieraat-profiilin viilennysrajan on oltava korkeampi kuin fan_only-rajan.');
  }
  if (coolHeatingSeasonTrigger < coolTrigger) {
    throw new Error('Lämmityskauden hätäviilennysrajan on oltava vähintään lämpimän kauden viilennysrajan tasolla.');
  }

  const festTarget = parseValidatedNumber(formState.fest_target_temp, 'Fest: Ennakoiva tavoite (heat)', { min: 16, max: 23 });
  const festLow = parseValidatedNumber(formState.fest_sniffer_low_temp, 'Fest: Kylmäpaikkauksen alaraja', { min: 15, max: 22 });
  const festHigh = parseValidatedNumber(formState.fest_sniffer_high_temp, 'Fest: Vaihe 2 tasaus (fan_only)', { min: 18, max: 25 });
  const festCoolTrigger = parseValidatedNumber(formState.fest_cool_trigger_temp, 'Fest: Viilennys (lämmin kausi)', { min: 19, max: 26 });
  const festCoolHeatingSeasonTrigger = parseValidatedNumber(formState.fest_cool_heating_season_trigger_temp, 'Fest: Viilennys (lämmityskausi)', { min: 20, max: 27 });
  const festCoolTarget = parseValidatedNumber(formState.fest_cool_target_temp, 'Fest: Viilennyksen pyynti', { min: 18, max: 24 });
  const festCoolBoostTemp = parseValidatedNumber(formState.fest_cool_boost_fan_temp, 'Fest: Puhalluksen lisätehoraja', { min: 20, max: 28 });

  if (festHigh <= festLow) {
    throw new Error('Fest-profiilin fan_only-rajan on oltava korkeampi kuin kylmäpaikkauksen alarajan.');
  }
  if (festCoolTrigger <= festHigh) {
    throw new Error('Fest-profiilin viilennysrajan on oltava korkeampi kuin fan_only-rajan.');
  }
  if (festCoolHeatingSeasonTrigger < festCoolTrigger) {
    throw new Error('Fest-profiilin lämmityskauden viilennysrajan on oltava vähintään lämpimän kauden rajan tasolla.');
  }

  const boostEntityTrimmed = String(formState.boost_entity_id ?? '').trim();
  if (formState.boost_enabled && !boostEntityTrimmed) {
    throw new Error('Anna Vallox-tehostusreleen tai HA-skriptin entity_id, kun tehostusimpulssi on käytössä.');
  }

  return {
    active_from: activeFromIso,
    active_until: activeUntilIso,
    default_duration_hours: parseValidatedNumber(formState.default_duration_hours, 'Oletuskesto', { isInt: true, min: 1, max: 24 }),
    guest_profile: formState.guest_profile === 'fest' ? 'fest' : 'standard',
    source: formState.source || 'manual',
    calendar_uid: formState.calendar_uid || null,
    dismissed_calendar_uid: formState.dismissed_calendar_uid || null,
    target_temp: targetTemp,
    sniffer_low_temp: snifferLow,
    sniffer_high_temp: snifferHigh,
    cool_trigger_temp: coolTrigger,
    cool_heating_season_trigger_temp: coolHeatingSeasonTrigger,
    cool_target_temp: coolTarget,
    cool_min_outdoor_temp: parseValidatedNumber(formState.cool_min_outdoor_temp, 'Vuodenaikavahti (FMI ulkolämpötila)', { min: -10, max: 25 }),
    ilp_heat_cool_max_thermo: parseValidatedNumber(formState.ilp_heat_cool_max_thermo, 'Patterien leikkaustaso', { min: 14, max: 22 }),
    ilp_fan_mode: String(formState.ilp_fan_mode || '1'),
    ilp_restore_fan_mode: String(formState.ilp_restore_fan_mode || 'auto'),
    fan_mode_dirty: Boolean(formState.fan_mode_dirty),
    fest_target_temp: festTarget,
    fest_sniffer_low_temp: festLow,
    fest_sniffer_high_temp: festHigh,
    fest_cool_trigger_temp: festCoolTrigger,
    fest_cool_heating_season_trigger_temp: festCoolHeatingSeasonTrigger,
    fest_cool_target_temp: festCoolTarget,
    fest_cool_boost_fan_temp: festCoolBoostTemp,
    fest_cool_boost_fan_mode: String(formState.fest_cool_boost_fan_mode || '2'),
    fest_sniffer_humidity_pct: parseValidatedNumber(formState.fest_sniffer_humidity_pct, 'Fest IV-nuuskija: Kosteusraja', { min: 30, max: 90 }),
    fest_sniffer_pm25_limit: parseValidatedNumber(formState.fest_sniffer_pm25_limit, 'Fest IV-nuuskija: PM2.5-raja', { min: 5, max: 100 }),
    boost_enabled: Boolean(formState.boost_enabled),
    boost_entity_id: boostEntityTrimmed || null,
    boost_min_outdoor_temp: parseValidatedNumber(formState.boost_min_outdoor_temp, 'Tehostuksen pakkasraja', { min: -35, max: 10 }),
    boost_max_outdoor_aqi: parseValidatedNumber(formState.boost_max_outdoor_aqi, 'Ulkoilman AQI-raja', { isInt: true, min: 10, max: 200 }),
    sniffer_humidity_pct: parseValidatedNumber(formState.sniffer_humidity_pct, 'Nuuskija: Kosteusraja (Vieraat)', { min: 30, max: 90 }),
    sniffer_pm25_limit: parseValidatedNumber(formState.sniffer_pm25_limit, 'Nuuskija: PM2.5-raja (Vieraat)', { min: 5, max: 100 })
  };
};

// Laskee selkokielisen tilayhteenvedon poissaolokortille
const getAwayStatusSummary = (isActive, awayForm) => {
  if (!isActive) {
    return 'Pois päältä. Laita "Away Mode" päälle yllä olevasta Automaatiot-listasta, ajasta päivämäärät valmiiksi tai lisää [poissa]-merkintä Apple Kalenteriin.';
  }

  const srcPrefix = awayForm.source === 'apple_calendar' ? 'Apple Kalenteri: ' : '';
  const now = new Date();
  const fromDate = awayForm.active_from ? new Date(awayForm.active_from) : null;
  const untilDate = awayForm.active_until ? new Date(awayForm.active_until) : null;
  const prepHours = Math.max(0, parseInt(awayForm.return_prep_hours, 10) || 0);
  const prepStart = untilDate && !Number.isNaN(untilDate.getTime())
    ? new Date(untilDate.getTime() - prepHours * 60 * 60 * 1000)
    : null;

  if (fromDate && !Number.isNaN(fromDate.getTime()) && now < fromDate) {
    return `${srcPrefix}Ajastettu alkamaan ${formatHelsinkiTimestamp(fromDate)}${untilDate ? `, paluu ${formatHelsinkiTimestamp(untilDate)}` : ''}.`;
  }
  if (untilDate && !Number.isNaN(untilDate.getTime()) && now >= untilDate) {
    return `${srcPrefix}Suunniteltu paluu (${formatHelsinkiTimestamp(untilDate)}) on ohitettu — järjestelmä toimii normaalitilassa.`;
  }
  if (prepStart && now >= prepStart && untilDate) {
    return `${srcPrefix}Paluun esivalmistelu käynnissä (alkoi ${formatHelsinkiTimestamp(prepStart)}, paluu ${formatHelsinkiTimestamp(untilDate)}).`;
  }
  if (untilDate && prepStart) {
    return `${srcPrefix}Poissaolo aktiivinen. Paluun esivalmistelu käynnistyy ${formatHelsinkiTimestamp(prepStart)} (paluu ${formatHelsinkiTimestamp(untilDate)}).`;
  }
  return `${srcPrefix}Poissaolo aktiivinen toistaiseksi (suunniteltua paluuaikaa ei asetettu).`;
};

// Laskee selkokielisen tilayhteenvedon vierastilakortille
const getGuestStatusSummary = (isActive, guestForm) => {
  const isFest = guestForm.guest_profile === 'fest';
  const profileLabel = isFest ? 'Fest (8+ hlö)' : 'Vieraat (1–7 hlö)';
  const effTarget = isFest ? guestForm.fest_target_temp : guestForm.target_temp;
  const effFanOnly = isFest ? guestForm.fest_sniffer_high_temp : guestForm.sniffer_high_temp;
  const effCool = isFest ? guestForm.fest_cool_trigger_temp : guestForm.cool_trigger_temp;

  if (!isActive) {
    return `Pois päältä. Valitse profiili (${profileLabel}) sekä kesto (4 h / 6 h / 8 h) ja paina Tallenna, tai lisää [vieras]-merkintä Apple Kalenteriin.`;
  }

  const srcPrefix = guestForm.source === 'apple_calendar' ? 'Apple Kalenteri: ' : '';
  const now = new Date();
  const fromDate = guestForm.active_from ? new Date(guestForm.active_from) : null;
  const untilDate = guestForm.active_until ? new Date(guestForm.active_until) : null;

  if (fromDate && !Number.isNaN(fromDate.getTime()) && now < fromDate) {
    return `${srcPrefix}${profileLabel} ajastettu alkamaan ${formatHelsinkiTimestamp(fromDate)}${untilDate ? ` (päättyy ${formatHelsinkiTimestamp(untilDate)})` : ''}. Talo jatkaa normaalitilassa siihen asti.`;
  }

  if (untilDate && !Number.isNaN(untilDate.getTime())) {
    if (now >= untilDate) {
      return `${srcPrefix}Ajastin (${formatHelsinkiTimestamp(untilDate)}) on täyttynyt — talo palautuu normaalitilaan ja ILP:n puhallus palaa tilaan "${guestForm.ilp_restore_fan_mode}".`;
    }
    return `${srcPrefix}${profileLabel} aktiivinen klo ${formatHelsinkiTimestamp(untilDate)} asti (heat ${effTarget} °C → fan_only ${effFanOnly} °C → cool ${effCool} °C, puhallus "${guestForm.ilp_fan_mode}").`;
  }

  return `${srcPrefix}${profileLabel} aktiivinen toistaiseksi (heat ${effTarget} °C → fan_only ${effFanOnly} °C → cool ${effCool} °C). Lopeta tarvittaessa painikkeesta.`;
};

export default function SettingsTab() {
  const [originalData, setOriginalData] = useState({
    switchboard: [],
    ventilationConfig: toVentilationFormState(null),
    awayConfig: toAwayFormState(null),
    guestConfig: toGuestFormState(null),
    budgetRoot: {},
    budgetKpi: {},
    budgetSim: {}
  });

  const [localData, setLocalData] = useState({
    switchboard: [],
    ventilationConfig: toVentilationFormState(null),
    awayConfig: toAwayFormState(null),
    guestConfig: toGuestFormState(null),
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
      const awayRow = switches.find((sw) => sw.automation_key === AWAY_KEY);
      const guestRow = switches.find((sw) => sw.automation_key === GUEST_KEY);

      const loadedData = {
        switchboard: switches,
        ventilationConfig: toVentilationFormState(ventRow?.config),
        awayConfig: toAwayFormState(awayRow?.config),
        guestConfig: toGuestFormState(guestRow?.config),
        budgetRoot: {
          monthly_budget_eur: bData.monthly_budget_eur,
          monthly_fee_eur: bData.monthly_fee_eur,
          transfer_fee_snt: bData.transfer_fee_snt,
          electricity_tax_snt: bData.electricity_tax_snt,
          spot_margin_snt: bData.spot_margin_snt
        },
        budgetKpi: safeParseJSON(bData.kpi_targets),
        budgetSim: safeParseJSON(bData.simulator_settings)
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

  const handleToggleSwitch = (key, currentVal) => {
    setLocalData((prev) => ({
      ...prev,
      switchboard: prev.switchboard.map((sw) =>
        sw.automation_key === key ? { ...sw, is_active: !currentVal } : sw
      )
    }));
  };

  const handleInputChange = (section, key, val) => {
    setLocalData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: val
      }
    }));
  };

  const handleVentChange = (key, val) => {
    setLocalData((prev) => ({
      ...prev,
      ventilationConfig: {
        ...prev.ventilationConfig,
        [key]: val
      }
    }));
  };

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

  const handleAwayChange = (key, val) => {
    setLocalData((prev) => ({
      ...prev,
      awayConfig: {
        ...prev.awayConfig,
        [key]: val
      }
    }));
  };

  const handleGuestChange = (key, val) => {
    setLocalData((prev) => ({
      ...prev,
      guestConfig: {
        ...prev.guestConfig,
        [key]: val
      }
    }));
  };

  const handleSetGuestProfile = (profile) => {
    handleGuestChange('guest_profile', profile === 'fest' ? 'fest' : 'standard');
  };

  const handleSetGuestDuration = (hours) => {
    const targetIso = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    setLocalData((prev) => ({
      ...prev,
      switchboard: prev.switchboard.map((sw) =>
        sw.automation_key === GUEST_KEY ? { ...sw, is_active: true } : sw
      ),
      guestConfig: {
        ...prev.guestConfig,
        active_from: '',
        active_until: isoToLocalInputValue(targetIso),
        default_duration_hours: String(hours)
      }
    }));
  };

  const handleStopGuestMode = () => {
    setLocalData((prev) => ({
      ...prev,
      switchboard: prev.switchboard.map((sw) =>
        sw.automation_key === GUEST_KEY ? { ...sw, is_active: false } : sw
      ),
      guestConfig: {
        ...prev.guestConfig,
        active_from: '',
        active_until: '',
        guest_profile: 'standard'
      }
    }));
  };

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

  const handleSave = async () => {
    if (!hasChanges) return;
    setIsSaving(true);
    setError(null);

    try {
      const ventConfigChanged =
        JSON.stringify(localData.ventilationConfig) !== JSON.stringify(originalData.ventilationConfig);
      const awayConfigChanged =
        JSON.stringify(localData.awayConfig) !== JSON.stringify(originalData.awayConfig);
      const guestConfigChanged =
        JSON.stringify(localData.guestConfig) !== JSON.stringify(originalData.guestConfig);

      const origAwaySw = originalData.switchboard.find((sw) => sw.automation_key === AWAY_KEY);
      const localAwaySw = localData.switchboard.find((sw) => sw.automation_key === AWAY_KEY);
      const awayActiveChanged =
        Boolean(localAwaySw?.is_active) !== Boolean(origAwaySw?.is_active);
      const awayChanged = awayActiveChanged || awayConfigChanged;

      const origGuestSw = originalData.switchboard.find((sw) => sw.automation_key === GUEST_KEY);
      const localGuestSw = localData.switchboard.find((sw) => sw.automation_key === GUEST_KEY);
      const guestActiveChanged =
        Boolean(localGuestSw?.is_active) !== Boolean(origGuestSw?.is_active);
      const guestChanged = guestActiveChanged || guestConfigChanged;

      // Käyttäjän käsin tekemä muutos voittaa aina kalenterin; kalenteritapahtuman käsin sammutus
      // tallentaa dismissed_calendar_uid-suojan, jottei seuraava synkronointi käännä sitä takaisin päälle.
      const applyManualOwnership = (payload, origSw, localSw, origCfg) => {
        const next = { ...payload, source: 'manual', calendar_uid: null };
        if (
          origSw?.is_active &&
          !localSw?.is_active &&
          origCfg.source === 'apple_calendar' &&
          origCfg.calendar_uid
        ) {
          next.dismissed_calendar_uid = origCfg.calendar_uid;
          next.active_from = null;
          next.active_until = null;
        }
        return next;
      };

      const ventPayload = ventConfigChanged ? buildVentilationPayload(localData.ventilationConfig) : null;
      const awayPayload = awayChanged
        ? applyManualOwnership(buildAwayPayload(localData.awayConfig), origAwaySw, localAwaySw, originalData.awayConfig)
        : null;
      const guestPayload = guestChanged
        ? applyManualOwnership(buildGuestPayload(localData.guestConfig), origGuestSw, localGuestSw, originalData.guestConfig)
        : null;

      // 1. Tallenna muuttuneet Switchboard-rivit (is_active ja/tai config samassa päivityksessä)
      for (const localSw of localData.switchboard) {
        const origSw = originalData.switchboard.find(
          (sw) => sw.automation_key === localSw.automation_key
        );
        const isActiveChanged = origSw ? localSw.is_active !== origSw.is_active : true;
        const isVentRow = localSw.automation_key === VENTILATION_KEY;
        const isAwayRow = localSw.automation_key === AWAY_KEY;
        const isGuestRow = localSw.automation_key === GUEST_KEY;

        if (
          isActiveChanged ||
          (isVentRow && ventConfigChanged) ||
          (isAwayRow && awayChanged) ||
          (isGuestRow && guestChanged)
        ) {
          const swUpdatePayload = { updated_at: new Date().toISOString() };
          if (isActiveChanged) swUpdatePayload.is_active = localSw.is_active;
          if (isVentRow && ventConfigChanged) swUpdatePayload.config = ventPayload;
          if (isAwayRow && awayChanged) swUpdatePayload.config = awayPayload;
          if (isGuestRow && guestChanged) swUpdatePayload.config = guestPayload;

          const { error: swErr } = await macbase
            .schema('homeassistant')
            .from('settings_switchboard')
            .update(swUpdatePayload)
            .eq('automation_key', localSw.automation_key);

          if (swErr) throw swErr;
        }
      }

      // 2. Tallenna muuttuneet Budget-asetukset
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

      const savedSnapshot = JSON.parse(JSON.stringify(localData));
      if (ventPayload) {
        savedSnapshot.ventilationConfig = toVentilationFormState(ventPayload);
        savedSnapshot.switchboard = savedSnapshot.switchboard.map((sw) =>
          sw.automation_key === VENTILATION_KEY ? { ...sw, config: ventPayload } : sw
        );
      }
      if (awayPayload) {
        savedSnapshot.awayConfig = toAwayFormState(awayPayload);
        savedSnapshot.switchboard = savedSnapshot.switchboard.map((sw) =>
          sw.automation_key === AWAY_KEY ? { ...sw, config: awayPayload } : sw
        );
      }
      if (guestPayload) {
        savedSnapshot.guestConfig = toGuestFormState(guestPayload);
        savedSnapshot.switchboard = savedSnapshot.switchboard.map((sw) =>
          sw.automation_key === GUEST_KEY ? { ...sw, config: guestPayload } : sw
        );
      }

      // 3. Jos vierastila muuttui, ajetaan execute_guest_mode heti (välitön reagointi / puhalluspalautus)
      if (guestChanged) {
        const { error: rpcErr } = await macbase
          .schema('homeassistant')
          .rpc('execute_guest_mode');

        if (rpcErr) {
          console.warn("Vierastilan välitön ajo epäonnistui (tallennetut asetukset astuvat voimaan seuraavalla tasatunnilla):", rpcErr);
          setError("Asetukset tallennettiin, mutta välitön execute_guest_mode()-kutsu epäonnistui. Muutos astuu voimaan viimeistään tasatunnilla.");
        } else {
          // Haetaan päivitetty rivi (esim. fan_mode_dirty tai expired-nollaus) jotta UI pysyy synkassa
          const { data: freshGuestRow } = await macbase
            .schema('homeassistant')
            .from('settings_switchboard')
            .select('*')
            .eq('automation_key', GUEST_KEY)
            .maybeSingle();

          if (freshGuestRow) {
            savedSnapshot.guestConfig = toGuestFormState(freshGuestRow.config);
            savedSnapshot.switchboard = savedSnapshot.switchboard.map((sw) =>
              sw.automation_key === GUEST_KEY ? freshGuestRow : sw
            );
          }
        }
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
  const awaySwitch = localData.switchboard.find((sw) => sw.automation_key === AWAY_KEY);
  const guestSwitch = localData.switchboard.find((sw) => sw.automation_key === GUEST_KEY);
  const origGuestSwitch = originalData.switchboard.find((sw) => sw.automation_key === GUEST_KEY);

  const ventLocal = localData.ventilationConfig;
  const ventOrig = originalData.ventilationConfig;
  const awayLocal = localData.awayConfig;
  const awayOrig = originalData.awayConfig;
  const guestLocal = localData.guestConfig;
  const guestOrig = originalData.guestConfig;

  const forceOnIso = ventLocal.force_on_until;
  const forceOnActive = forceOnIso ? new Date(forceOnIso) > new Date() : false;
  const forceOnModified = forceOnIso !== ventOrig.force_on_until;
  const weekendModified = ventLocal.weekend_always_home !== ventOrig.weekend_always_home;
  const awayFromModified = awayLocal.active_from !== awayOrig.active_from;
  const awayUntilModified = awayLocal.active_until !== awayOrig.active_until;

  const guestProfileModified = guestLocal.guest_profile !== guestOrig.guest_profile;
  const guestFromModified = guestLocal.active_from !== guestOrig.active_from;
  const guestUntilModified = guestLocal.active_until !== guestOrig.active_until;
  const guestTimerModified =
    guestFromModified ||
    guestUntilModified ||
    Boolean(guestSwitch?.is_active) !== Boolean(origGuestSwitch?.is_active) ||
    guestProfileModified;
  const guestFanModified = guestLocal.ilp_fan_mode !== guestOrig.ilp_fan_mode;
  const guestRestoreFanModified = guestLocal.ilp_restore_fan_mode !== guestOrig.ilp_restore_fan_mode;
  const guestFestBoostFanModified = guestLocal.fest_cool_boost_fan_mode !== guestOrig.fest_cool_boost_fan_mode;
  const guestBoostEnabledModified = guestLocal.boost_enabled !== guestOrig.boost_enabled;
  const guestBoostEntityModified = guestLocal.boost_entity_id !== guestOrig.boost_entity_id;

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

      {/* B. Vierastila (Guest Mode & Fest 8+) */}
      <Accordion title="Vierastila (Vieraat / Fest 8+)" iconName="Users">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Tilayhteenveto */}
          <div
            className="flex-row-gap"
            style={{
              padding: '12px 16px',
              borderRadius: '6px',
              backgroundColor: 'var(--color-bg-clean)',
              borderLeft: guestSwitch?.is_active ? '3px solid var(--color-hermes)' : '1px solid var(--color-lancia)',
              fontSize: '0.85rem',
              color: 'var(--color-text-main)'
            }}
          >
            <Clock size={16} />
            <span>{getGuestStatusSummary(Boolean(guestSwitch?.is_active), guestLocal)}</span>
          </div>

          {/* Profiilivalinta + Keston pikavalinnat (4h / 6h / 8h) + Alku- ja päättymisaika */}
          <div
            className="ui-panel"
            style={{
              padding: '16px',
              borderLeft: guestTimerModified ? '3px solid var(--color-hermes)' : '1px solid var(--color-lancia)'
            }}
          >
            {/* Profiilivalinta: Vieraat (1–7 hlö) vs. Fest (8+ hlö) */}
            <div className="flex-between" style={{ flexWrap: 'wrap', gap: '12px', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--color-bg-clean)' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '4px' }}>
                  Vierailun profiili
                </div>
                <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                  <strong>Vieraat (1–7 hlö):</strong> tasainen {guestLocal.target_temp} °C.{' '}
                  <strong>Fest (8+ hlö):</strong> ennakoiva {guestLocal.fest_target_temp} °C, patterit alas, matalampi viilennyskynnys ja herkempi ilmanvaihto.
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <Button
                  variant={guestLocal.guest_profile === 'standard' ? 'primary' : 'secondary'}
                  icon={Users}
                  onClick={() => handleSetGuestProfile('standard')}
                >
                  Vieraat (1–7 hlö)
                </Button>
                <Button
                  variant={guestLocal.guest_profile === 'fest' ? 'primary' : 'secondary'}
                  icon={Sparkles}
                  onClick={() => handleSetGuestProfile('fest')}
                >
                  Fest (8+ hlö)
                </Button>
              </div>
            </div>

            {/* Keston pikavalinnat */}
            <div className="flex-between" style={{ flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '4px' }}>
                  Käynnistä heti ajastimella
                </div>
                <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                  Valitse kesto ja vahvista yläreunan <strong>Tallenna</strong>-painikkeella. Puhallus ja profiili palautuvat automaattisesti ajan päättyessä.
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {GUEST_DURATION_OPTIONS.map((hours) => (
                  <Button
                    key={hours}
                    variant={guestSwitch?.is_active && !guestLocal.active_from && String(guestLocal.default_duration_hours) === String(hours) ? 'primary' : 'secondary'}
                    icon={Clock}
                    onClick={() => handleSetGuestDuration(hours)}
                  >
                    {hours} h
                  </Button>
                ))}
                {(guestSwitch?.is_active || guestLocal.active_from || guestLocal.active_until) && (
                  <Button variant="secondary" icon={Power} onClick={handleStopGuestMode}>
                    Lopeta nyt
                  </Button>
                )}
              </div>
            </div>

            {/* Aloitus- ja päättymisaika (myös Apple Kalenterin SCHEDULED-ajastuksille) */}
            <div style={{ borderTop: '1px solid var(--color-bg-clean)', paddingTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--spacing-grid)' }}>
              <div>
                <div className="flex-between" style={{ marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-technical)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Aloitusaika (valinnainen)
                  </label>
                  {guestLocal.active_from && (
                    <Button variant="secondary" icon={X} onClick={() => handleGuestChange('active_from', '')}>
                      Tyhjennä
                    </Button>
                  )}
                </div>
                <Input
                  type="datetime-local"
                  value={guestLocal.active_from}
                  onChange={(e) => handleGuestChange('active_from', e.target.value)}
                />
                <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '8px', lineHeight: 1.35 }}>
                  Jätä tyhjäksi, jos vierastila alkaa heti. Apple Kalenteri täyttää tämän 60 min ennakolla.
                </div>
              </div>

              <div>
                <div className="flex-between" style={{ marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-technical)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Päättymisaika (valinnainen)
                  </label>
                  {guestLocal.active_until && (
                    <Button variant="secondary" icon={X} onClick={() => handleGuestChange('active_until', '')}>
                      Tyhjennä
                    </Button>
                  )}
                </div>
                <Input
                  type="datetime-local"
                  value={guestLocal.active_until}
                  onChange={(e) => handleGuestChange('active_until', e.target.value)}
                />
                <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '8px', lineHeight: 1.35 }}>
                  Jos kenttä jätetään tyhjäksi, vierastila pysyy päällä toistaiseksi.
                </div>
              </div>
            </div>
          </div>

          {/* 3-vaiheinen lämmitys & viilennys (Vieraat 1–7 hlö) */}
          <div style={{ borderTop: '1px solid var(--color-bg-clean)', paddingTop: '16px' }}>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--color-text-main)', marginTop: 0, marginBottom: '4px' }}>
              3-vaiheinen ohjaus: heat → fan_only → cool (Vieraat 1–7 hlö)
            </h4>
            <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: 0, marginBottom: '12px' }}>
              Estää turhan kompressorijäähdytyksen: lievä ylilämpö tasataan ilmaiseksi <code>fan_only</code>-tilassa ja <code>cool</code> käynnistyy vasta kuumarajasta vuodenaikavahdin sallimana.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--spacing-grid)', marginBottom: 'var(--spacing-grid)' }}>
              {GUEST_STANDARD_HEATING_FIELDS.map((field) => {
                const isModified = guestLocal[field.key] !== guestOrig[field.key];
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
                      value={guestLocal[field.key]}
                      onChange={(e) => handleGuestChange(field.key, e.target.value)}
                    />
                    <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '8px', lineHeight: 1.35 }}>
                      {field.description}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--spacing-grid)' }}>
              <div
                className="ui-panel"
                style={{
                  padding: '16px',
                  borderLeft: guestFanModified ? '3px solid var(--color-hermes)' : '1px solid var(--color-lancia)'
                }}
              >
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-technical)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '8px' }}>
                  ILP peruspuhallus vierastilassa
                </label>
                <select
                  value={guestLocal.ilp_fan_mode}
                  onChange={(e) => handleGuestChange('ilp_fan_mode', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-lancia)',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text-main)',
                    fontSize: '0.9rem'
                  }}
                >
                  {ILP_FAN_MODE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '8px', lineHeight: 1.35 }}>
                  Mitsubishi-puhallustaso vierailun aikana (suositus: 1 = hiljaisin).
                </div>
              </div>

              <div
                className="ui-panel"
                style={{
                  padding: '16px',
                  borderLeft: guestRestoreFanModified ? '3px solid var(--color-hermes)' : '1px solid var(--color-lancia)'
                }}
              >
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-technical)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '8px' }}>
                  Palautettava puhallinnopeus
                </label>
                <select
                  value={guestLocal.ilp_restore_fan_mode}
                  onChange={(e) => handleGuestChange('ilp_restore_fan_mode', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-lancia)',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text-main)',
                    fontSize: '0.9rem'
                  }}
                >
                  {ILP_FAN_MODE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '8px', lineHeight: 1.35 }}>
                  Tila, johon ILP palautetaan automaattisesti vierastilan päättyessä (suositus: Auto).
                </div>
              </div>
            </div>
          </div>

          {/* Fest (8+ hlö) -profiilin parametrit */}
          <div style={{ borderTop: '1px solid var(--color-bg-clean)', paddingTop: '16px' }}>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--color-text-main)', marginTop: 0, marginBottom: '4px' }}>
              Fest-profiilin asetukset (8+ hlö)
            </h4>
            <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: 0, marginBottom: '12px' }}>
              Patterit pudotetaan suoraan alas ({guestLocal.ilp_heat_cool_max_thermo} °C), lämpötilatavoite lasketaan ennakkoon ja ilmanlaadun nuuskija reagoi herkemmin.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--spacing-grid)' }}>
              {GUEST_FEST_FIELDS.map((field) => {
                const isModified = guestLocal[field.key] !== guestOrig[field.key];
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
                      value={guestLocal[field.key]}
                      onChange={(e) => handleGuestChange(field.key, e.target.value)}
                    />
                    <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '8px', lineHeight: 1.35 }}>
                      {field.description}
                    </div>
                  </div>
                );
              })}

              <div
                className="ui-panel"
                style={{
                  padding: '16px',
                  borderLeft: guestFestBoostFanModified ? '3px solid var(--color-hermes)' : '1px solid var(--color-lancia)'
                }}
              >
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-technical)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '8px' }}>
                  Fest: Lisätehopuhallus kuumassa
                </label>
                <select
                  value={guestLocal.fest_cool_boost_fan_mode}
                  onChange={(e) => handleGuestChange('fest_cool_boost_fan_mode', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-lancia)',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text-main)',
                    fontSize: '0.9rem'
                  }}
                >
                  {ILP_FAN_MODE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '8px', lineHeight: 1.35 }}>
                  Puhallustaso, jos Fest-tilassa olohuone ylittää lisätehorajan ({guestLocal.fest_cool_boost_fan_temp} °C).
                </div>
              </div>
            </div>
          </div>

          {/* Ilmanvaihto ja Vallox 1h impulssi */}
          <div style={{ borderTop: '1px solid var(--color-bg-clean)', paddingTop: '16px' }}>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--color-text-main)', marginTop: 0, marginBottom: '4px' }}>
              Ilmanvaihto ja Vallox 1h tehostusimpulssi
            </h4>
            <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: 0, marginBottom: '12px' }}>
              Kalliin sähkön raja luetaan automaattisesti Ilmanvaihdon asetuksista (<strong>Hintaraja: Kotona = {ventLocal.price_limit_home} snt/kWh</strong>).
            </p>

            <div
              style={{
                borderLeft: guestBoostEnabledModified ? '3px solid var(--color-hermes)' : 'none',
                paddingLeft: guestBoostEnabledModified ? '12px' : '15px',
                marginBottom: '16px'
              }}
            >
              <Toggle
                label="Vallox 1h dry-contact tehostusimpulssi käytössä"
                description="Pidä pois päältä (kuiva-ajo), kunnes fyysinen rele tai Home Assistant -skripti on kytketty."
                isActive={guestLocal.boost_enabled}
                onToggle={() => handleGuestChange('boost_enabled', !guestLocal.boost_enabled)}
              />
            </div>

            <div
              className="ui-panel"
              style={{
                padding: '16px',
                marginBottom: 'var(--spacing-grid)',
                opacity: guestLocal.boost_enabled ? 1 : 0.7,
                borderLeft: guestBoostEntityModified ? '3px solid var(--color-hermes)' : '1px solid var(--color-lancia)'
              }}
            >
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-technical)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '8px' }}>
                Tehostuksen entity_id (Home Assistant)
              </label>
              <Input
                type="text"
                value={guestLocal.boost_entity_id}
                onChange={(e) => handleGuestChange('boost_entity_id', e.target.value)}
                placeholder="esim. script.vallox_boost_1h tai switch.vallox_boost"
              />
              <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '8px', lineHeight: 1.35 }}>
                Tukee domain-tyyppejä <code>script.*</code>, <code>button.*</code> ja <code>switch.*</code>.
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--spacing-grid)' }}>
              {GUEST_VENTILATION_FIELDS.map((field) => {
                const isModified = guestLocal[field.key] !== guestOrig[field.key];
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
                      value={guestLocal[field.key]}
                      onChange={(e) => handleGuestChange(field.key, e.target.value)}
                    />
                    <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '8px', lineHeight: 1.35 }}>
                      {field.description}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Accordion>

      {/* C. Poissaolotila (Away Mode) */}
      <Accordion title="Poissaolotila (Away Mode)" iconName="Plane">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            className="flex-row-gap"
            style={{
              padding: '12px 16px',
              borderRadius: '6px',
              backgroundColor: 'var(--color-bg-clean)',
              borderLeft: awaySwitch?.is_active ? '3px solid var(--color-hermes)' : '1px solid var(--color-lancia)',
              fontSize: '0.85rem',
              color: 'var(--color-text-main)'
            }}
          >
            <Clock size={16} />
            <span>{getAwayStatusSummary(Boolean(awaySwitch?.is_active), awayLocal)}</span>
          </div>

          {/* Alku- ja paluuaika */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--spacing-grid)' }}>
            <div
              className="ui-panel"
              style={{
                padding: '16px',
                borderLeft: awayFromModified ? '3px solid var(--color-hermes)' : '1px solid var(--color-lancia)'
              }}
            >
              <div className="flex-between" style={{ marginBottom: '8px' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--color-text-technical)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Aloitusaika (valinnainen)
                </label>
                {awayLocal.active_from && (
                  <Button variant="secondary" icon={X} onClick={() => handleAwayChange('active_from', '')}>
                    Tyhjennä
                  </Button>
                )}
              </div>
              <Input
                type="datetime-local"
                value={awayLocal.active_from}
                onChange={(e) => handleAwayChange('active_from', e.target.value)}
              />
              <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '8px', lineHeight: 1.35 }}>
                Jätä tyhjäksi, jos poissaolo alkaa heti kytkimen kääntämisestä.
              </div>
            </div>

            <div
              className="ui-panel"
              style={{
                padding: '16px',
                borderLeft: awayUntilModified ? '3px solid var(--color-hermes)' : '1px solid var(--color-lancia)'
              }}
            >
              <div className="flex-between" style={{ marginBottom: '8px' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--color-text-technical)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Suunniteltu paluu
                </label>
                {awayLocal.active_until && (
                  <Button variant="secondary" icon={X} onClick={() => handleAwayChange('active_until', '')}>
                    Tyhjennä
                  </Button>
                )}
              </div>
              <Input
                type="datetime-local"
                value={awayLocal.active_until}
                onChange={(e) => handleAwayChange('active_until', e.target.value)}
              />
              <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '8px', lineHeight: 1.35 }}>
                Poissaolo päättyy automaattisesti tähän aikaan. Esivalmistelu käynnistyy ennen paluuta.
              </div>
            </div>
          </div>

          {/* Poissaolon numeroparametrit */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--spacing-grid)' }}>
            {AWAY_NUMERIC_FIELDS.map((field) => {
              const isModified = awayLocal[field.key] !== awayOrig[field.key];
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
                    value={awayLocal[field.key]}
                    onChange={(e) => handleAwayChange(field.key, e.target.value)}
                  />
                  <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '8px', lineHeight: 1.35 }}>
                    {field.description}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Accordion>

      {/* D. Ilmanvaihdon asetukset */}
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

      {/* E. Talous ja Hinnat */}
      <Accordion title="Talouden perusasetukset" iconName="Wallet">
        {renderInputGrid('budgetRoot', localData.budgetRoot, originalData.budgetRoot)}
      </Accordion>

      {/* F. Tekoäly ja Simulaattori */}
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