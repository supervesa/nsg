import React, { useState, useEffect, useMemo } from 'react';
import { macbase } from '../../../config/supabaseClient';
import WidgetSmall from '../../../components/common/WidgetSmall';
import WidgetNormal from '../../../components/common/WidgetNormal';
import Accordion from '../../../components/common/Accordion';
import MetricBlock from '../../../components/common/MetricBlock';
import Badge from '../../../components/common/Badge';
import Paragraph from '../../../components/common/Paragraph';
import { Clock, SlidersHorizontal } from 'lucide-react';

export const meta = {
  order: 10,
  title: 'Talon tila',
  id: 'house_mode'
};

const MODE_KEYS = [
  'guest_mode_active',
  'away_mode',
  'smart_heating_schedule',
  'ventilation_smart_control'
];

// Jaettu välimuisti, jotta SmallWidget ja NormalWidget eivät tee tuplahakuja
const switchboardStore = {
  rows: null,
  promise: null,
  lastFetched: 0,
  listeners: new Set()
};

const fetchSwitchboardRows = async (force = false) => {
  const now = Date.now();
  if (!force && switchboardStore.rows && now - switchboardStore.lastFetched < 55000) {
    return switchboardStore.rows;
  }
  if (switchboardStore.promise) return switchboardStore.promise;

  switchboardStore.promise = macbase
    .schema('homeassistant')
    .from('settings_switchboard')
    .select('automation_key, is_active, config, updated_at')
    .in('automation_key', MODE_KEYS)
    .then(({ data, error }) => {
      if (!error && Array.isArray(data)) {
        switchboardStore.rows = data;
        switchboardStore.lastFetched = Date.now();
        switchboardStore.listeners.forEach((fn) => fn(data));
      }
      return switchboardStore.rows || [];
    })
    .catch((err) => {
      console.error('Talon tila -widgetin haku epäonnistui:', err);
      return switchboardStore.rows || [];
    })
    .finally(() => {
      switchboardStore.promise = null;
    });

  return switchboardStore.promise;
};

const useSwitchboardRows = (data) => {
  const propRows = data?.switchboard || data?.settingsSwitchboard || null;
  const [fetchedRows, setFetchedRows] = useState(switchboardStore.rows || []);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const tick = setInterval(() => setNowMs(Date.now()), 60000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (Array.isArray(propRows) && propRows.length > 0) return undefined;

    const listener = (rows) => setFetchedRows(rows);
    switchboardStore.listeners.add(listener);
    fetchSwitchboardRows(false);

    const refresh = setInterval(() => fetchSwitchboardRows(true), 60000);
    return () => {
      switchboardStore.listeners.delete(listener);
      clearInterval(refresh);
    };
  }, [propRows]);

  const rows = Array.isArray(propRows) && propRows.length > 0 ? propRows : fetchedRows;
  return { rows, nowMs };
};

const safeParseJSON = (raw) => {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
  } catch {
    return {};
  }
};

const parseMs = (iso) => {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? null : ms;
};

// Sitova välilyönti (\u00A0) estää yksikön putoamisen uudelle riville
const formatRemaining = (ms, compact = false) => {
  if (ms === null || ms === undefined) return null;
  if (ms <= 0) return '0\u00A0min';

  const totalMin = Math.ceil(ms / 60000);
  if (totalMin < 60) {
    return compact ? `${totalMin}m` : `${totalMin}\u00A0min`;
  }

  const totalHours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (totalHours < 24) {
    if (compact) return mins > 0 ? `${totalHours}h\u00A0${mins}m` : `${totalHours}h`;
    return mins > 0 ? `${totalHours}\u00A0h ${mins}\u00A0min` : `${totalHours}\u00A0h`;
  }

  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (compact) return hours > 0 ? `${days}pv\u00A0${hours}h` : `${days}pv`;
  return hours > 0 ? `${days}\u00A0pv ${hours}\u00A0h` : `${days}\u00A0pv`;
};

const formatFiTime = (ms) => {
  if (!ms) return '-';
  return new Date(ms).toLocaleString('fi-FI', {
    timeZone: 'Europe/Helsinki',
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatSourceLabel = (source) => (source === 'apple_calendar' ? 'Apple Kalenteri' : 'Manuaali');

const evaluateModeRow = (row, nowMs, type) => {
  const isSwitchOn = Boolean(row?.is_active);
  const cfg = safeParseJSON(row?.config);
  const fromMs = parseMs(cfg.active_from);
  const untilMs = parseMs(cfg.active_until);
  const updatedMs = parseMs(row?.updated_at);
  const source = cfg.source || 'manual';

  let state = 'INACTIVE';
  let prepStartMs = null;

  if (isSwitchOn) {
    if (untilMs !== null && nowMs >= untilMs) {
      state = 'EXPIRED';
    } else if (fromMs !== null && nowMs < fromMs) {
      state = 'SCHEDULED';
    } else if (type === 'away' && untilMs !== null) {
      const prepHours = Math.max(0, Number(cfg.return_prep_hours ?? 4));
      if (prepHours > 0) {
        prepStartMs = untilMs - prepHours * 3600000;
      }
      state = prepStartMs !== null && nowMs >= prepStartMs ? 'RETURN_PREP' : 'ACTIVE';
    } else {
      state = 'ACTIVE';
    }
  }

  let effectiveStartMs = fromMs;
  if (effectiveStartMs === null && untilMs !== null && (state === 'ACTIVE' || state === 'RETURN_PREP')) {
    if (type === 'guest') {
      const defaultH = Number(cfg.default_duration_hours || 6);
      const byDuration = untilMs - defaultH * 3600000;
      effectiveStartMs = updatedMs && updatedMs < untilMs ? Math.min(updatedMs, byDuration) : byDuration;
    } else if (updatedMs && updatedMs < untilMs) {
      effectiveStartMs = updatedMs;
    }
  }

  let progressPct = null;
  let prepZonePct = null;
  if (
    (state === 'ACTIVE' || state === 'RETURN_PREP') &&
    effectiveStartMs !== null &&
    untilMs !== null &&
    untilMs > effectiveStartMs
  ) {
    const total = untilMs - effectiveStartMs;
    const elapsed = Math.max(0, Math.min(total, nowMs - effectiveStartMs));
    progressPct = Math.round((elapsed / total) * 100);

    if (type === 'away' && prepStartMs !== null && prepStartMs > effectiveStartMs && prepStartMs < untilMs) {
      prepZonePct = Math.round(((untilMs - prepStartMs) / total) * 100);
    }
  }

  const remainingMs =
    (state === 'ACTIVE' || state === 'RETURN_PREP') && untilMs !== null
      ? Math.max(0, untilMs - nowMs)
      : null;

  const startsInMs =
    state === 'SCHEDULED' && fromMs !== null
      ? Math.max(0, fromMs - nowMs)
      : null;

  return {
    type,
    state,
    isSwitchOn,
    cfg,
    source,
    fromMs,
    untilMs,
    prepStartMs,
    effectiveStartMs,
    progressPct,
    prepZonePct,
    remainingMs,
    startsInMs
  };
};

// Ratkaisee talon aktiivisen päätilan samalla prioriteetilla kuin Supabasen SQL-funktiot
const resolveHouseMode = (rows, nowMs) => {
  const byKey = {};
  (rows || []).forEach((r) => {
    byKey[r.automation_key] = r;
  });

  const guest = evaluateModeRow(byKey.guest_mode_active, nowMs, 'guest');
  const away = evaluateModeRow(byKey.away_mode, nowMs, 'away');
  const heatingOn = Boolean(byKey.smart_heating_schedule?.is_active);
  const ventOn = Boolean(byKey.ventilation_smart_control?.is_active);

  const scheduledList = [];
  if (guest.state === 'SCHEDULED') {
    const isFest = String(guest.cfg.guest_profile || 'standard').toLowerCase() === 'fest';
    scheduledList.push({
      label: isFest ? 'Fest 8+' : 'Vieraat',
      fromMs: guest.fromMs,
      untilMs: guest.untilMs,
      startsInMs: guest.startsInMs,
      source: guest.source
    });
  }
  if (away.state === 'SCHEDULED') {
    scheduledList.push({
      label: 'Poissa',
      fromMs: away.fromMs,
      untilMs: away.untilMs,
      startsInMs: away.startsInMs,
      source: away.source
    });
  }
  scheduledList.sort((a, b) => (a.fromMs || Infinity) - (b.fromMs || Infinity));
  const nextScheduled = scheduledList[0] || null;

  // 1. PRIORITEETTI: Vierastila / Fest
  if (guest.state === 'ACTIVE') {
    const isFest = String(guest.cfg.guest_profile || 'standard').toLowerCase() === 'fest';
    const label = isFest ? 'Fest 8+' : 'Vieraat';
    const targetTemp = isFest ? (guest.cfg.fest_target_temp ?? 19.5) : (guest.cfg.target_temp ?? 20.5);
    const coolTrigger = isFest ? (guest.cfg.fest_cool_trigger_temp ?? 22.0) : (guest.cfg.cool_trigger_temp ?? 23.0);
    const fanMode = guest.cfg.ilp_fan_mode || '1';
    const remFull = formatRemaining(guest.remainingMs, false);
    const remCompact = formatRemaining(guest.remainingMs, true);

    return {
      key: isFest ? 'fest' : 'guest',
      label,
      fullTitle: isFest ? 'Fest-tila (8+ hlö)' : 'Vierastila (1–7 hlö)',
      smallValue: remCompact ? `${label} · ${remCompact}` : label,
      iconName: isFest ? 'Sparkles' : 'Users',
      color: isFest ? 'var(--color-rosso)' : 'var(--color-hermes)',
      isActive: true,
      isSpecial: true,
      subLabel: guest.untilMs ? 'JÄLJELLÄ' : 'KESTO',
      subValue: remFull || 'Toistaiseksi',
      shortLine: guest.untilMs
        ? `Päättyy ${formatFiTime(guest.untilMs)}`
        : `${formatSourceLabel(guest.source)} · toistaiseksi`,
      summaryText: isFest
        ? `Fest-profiili (8+ hlö) ohjaa taloa: patterit on leikattu alas, pohjatavoite on ${targetTemp} °C, viilennyskynnys ${coolTrigger} °C ja ilmanvaihdon nuuskija reagoi herkästi.`
        : `Vierastila pitää tasaisen ${targetTemp} °C mukavuuslämmön hiljaisella ILP-puhalluksella (taso ${fanMode}) ja käyttää ilmanvaihdossa kotona-hintarajaa.`,
      progressPct: guest.progressPct,
      prepZonePct: null,
      prepStartMs: null,
      startMs: guest.effectiveStartMs,
      untilMs: guest.untilMs,
      source: guest.source,
      params: [
        { label: 'Profiili', value: isFest ? 'Fest 8+' : 'Standard', accent: isFest ? 'var(--color-rosso)' : 'var(--color-hermes)' },
        { label: 'Lämpötavoite', value: `${targetTemp}\u00A0°C`, accent: 'var(--color-electric)' },
        { label: 'Viilennysraja', value: `${coolTrigger}\u00A0°C`, accent: 'var(--color-electric)' },
        { label: 'ILP puhallus', value: `Taso ${fanMode}`, accent: 'var(--color-text-main)' }
      ],
      guest,
      away,
      nextScheduled
    };
  }

  // 2. PRIORITEETTI: Poissaolotila (Away / Return Prep)
  if (away.state === 'ACTIVE' || away.state === 'RETURN_PREP') {
    const isPrep = away.state === 'RETURN_PREP';
    const label = isPrep ? 'Paluu' : 'Poissa';
    const targetTemp = away.cfg.heating_target_temp ?? 17.0;
    const ilpHours = away.cfg.ilp_hours_per_day ?? 6;
    const ventHours = away.cfg.ventilation_hours_per_day ?? 6;
    const prepHours = away.cfg.return_prep_hours ?? 4;
    const remFull = formatRemaining(away.remainingMs, false);
    const remCompact = formatRemaining(away.remainingMs, true);

    return {
      key: isPrep ? 'return_prep' : 'away',
      label,
      fullTitle: isPrep ? 'Paluun esivalmistelu' : 'Poissaolotila (Away)',
      smallValue: remCompact ? `${label} · ${remCompact}` : label,
      iconName: 'Plane',
      color: isPrep ? 'var(--color-saab)' : 'var(--color-electric)',
      isActive: true,
      isSpecial: true,
      subLabel: away.untilMs ? 'JÄLJELLÄ' : 'KESTO',
      subValue: remFull || 'Toistaiseksi',
      shortLine: away.untilMs
        ? `Paluu ${formatFiTime(away.untilMs)}`
        : `${formatSourceLabel(away.source)} · toistaiseksi`,
      summaryText: isPrep
        ? `Paluun esivalmistelu (${prepHours} h ennen paluuta) on käynnissä: talo lämpiää ja tuulettuu takaisin normaalitasolle ennen saapumista.`
        : `Säästöpudotus on päällä: lämmitystavoite on ${targetTemp} °C, ILP lämmittää päivän ${ilpHours} halvinta tuntia ja ilmanvaihto käy ${ventHours} h / vrk halvimmissa blokeissa.`,
      progressPct: away.progressPct,
      prepZonePct: away.prepZonePct,
      prepStartMs: away.prepStartMs,
      startMs: away.effectiveStartMs,
      untilMs: away.untilMs,
      source: away.source,
      params: [
        { label: 'Lämpötavoite', value: `${targetTemp}\u00A0°C`, accent: 'var(--color-electric)' },
        { label: 'ILP-kiintiö', value: `${ilpHours}\u00A0h/vrk`, accent: 'var(--color-saab)' },
        { label: 'IV-kiintiö', value: `${ventHours}\u00A0h/vrk`, accent: 'var(--color-saab)' },
        { label: 'Esivalmistelu', value: `${prepHours}\u00A0h`, accent: 'var(--color-hermes)' }
      ],
      guest,
      away,
      nextScheduled
    };
  }

  // 3. OLETUS: Normaalitila (24h automaatio)
  const startsInFull = nextScheduled ? formatRemaining(nextScheduled.startsInMs, false) : null;
  return {
    key: 'normal',
    label: 'Normi',
    fullTitle: 'Normaalitila',
    smallValue: 'Normi',
    iconName: 'Home',
    color: 'var(--color-saab)',
    isActive: true,
    isSpecial: false,
    subLabel: nextScheduled ? 'SEURAAVA' : 'AUTOMAATIO',
    subValue: nextScheduled ? `${nextScheduled.label} (${startsInFull})` : '24h-ohjaus',
    shortLine: nextScheduled
      ? `${nextScheduled.label} alkaa ${formatFiTime(nextScheduled.fromMs)}`
      : 'Normaali 24h lämmitys- ja IV-ohjaus',
    summaryText: nextScheduled
      ? `Talo toimii normaalissa 24h-ohjauksessa. Seuraava ajastettu tila (${nextScheduled.label}) käynnistyy ${formatFiTime(nextScheduled.fromMs)} (${formatSourceLabel(nextScheduled.source)}).`
      : 'Talo toimii normaalissa pörssisähkö- ja sääohjatussa 24h-tilassa. Poissaolo- tai vierastilaa ei ole käynnissä eikä ajastettuna.',
    progressPct: null,
    prepZonePct: null,
    prepStartMs: null,
    startMs: null,
    untilMs: null,
    source: 'auto',
    params: [
      { label: 'Lämmitys 24h', value: heatingOn ? 'Päällä' : 'Pois', accent: heatingOn ? 'var(--color-saab)' : 'var(--color-text-muted)' },
      { label: 'IV-ohjaus', value: ventOn ? 'Päällä' : 'Pois', accent: ventOn ? 'var(--color-saab)' : 'var(--color-text-muted)' },
      ...(nextScheduled
        ? [{ label: `Seuraava: ${nextScheduled.label}`, value: formatFiTime(nextScheduled.fromMs), accent: 'var(--color-hermes)' }]
        : [])
    ],
    guest,
    away,
    nextScheduled
  };
};

// Reunukseton, puhdas edistymispalkki (Away-tilassa esivalmistelujakso näkyy pehmeänä loppuvyöhykkeenä)
function ModeProgressBar({ percent, color, prepZonePct = null, height = 6 }) {
  if (percent === null || percent === undefined) return null;
  const clamped = Math.max(0, Math.min(100, percent));
  // Kun tila on juuri alkanut (0–2 %), näytetään hienovarainen 3 % alkupilkku jotta palkki erottuu aktiiviseksi
  const visualWidth = clamped === 0 ? 3 : Math.max(3, clamped);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: `${height}px`,
        backgroundColor: 'rgba(148, 163, 184, 0.22)',
        borderRadius: '999px',
        overflow: 'hidden'
      }}
    >
      {prepZonePct !== null && prepZonePct > 0 && (
        <div
          title="Paluun esivalmistelujakso"
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: `${Math.min(40, Math.max(4, prepZonePct))}%`,
            backgroundColor: 'rgba(249, 115, 22, 0.22)'
          }}
        />
      )}
      <div
        style={{
          position: 'relative',
          width: `${visualWidth}%`,
          height: '100%',
          backgroundColor: color,
          borderRadius: '999px',
          transition: 'width 0.4s ease'
        }}
      />
    </div>
  );
}

// --- YLÄRIVIN PIENI WIDGET ---
export function SmallWidget({ data }) {
  const { rows, nowMs } = useSwitchboardRows(data);
  const mode = useMemo(() => resolveHouseMode(rows, nowMs), [rows, nowMs]);

  return (
    <WidgetSmall
      title="Talon tila"
      value={mode.smallValue}
      iconName={mode.iconName}
      isActive={mode.isActive}
      statusColor={mode.color}
    />
  );
}

// --- YLEISKATSAUKSEN ISO KORTTI (KLIKATTAVA) ---
export function NormalWidget({ data }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { rows, nowMs } = useSwitchboardRows(data);
  const mode = useMemo(() => resolveHouseMode(rows, nowMs), [rows, nowMs]);

  const formatSubModeMetric = (sub, activeLabel) => {
    if (sub.state === 'ACTIVE' || sub.state === 'RETURN_PREP') {
      const rem = formatRemaining(sub.remainingMs, false);
      return {
        main: sub.state === 'RETURN_PREP' ? 'Esivalmistelu' : activeLabel,
        subText: sub.untilMs ? `Jäljellä ${rem} (${formatFiTime(sub.untilMs)})` : 'Päällä toistaiseksi',
        color: sub.type === 'guest' ? 'var(--color-hermes)' : 'var(--color-electric)'
      };
    }
    if (sub.state === 'SCHEDULED') {
      return {
        main: 'Ajastettu',
        subText: `Alkaa ${formatFiTime(sub.fromMs)}`,
        color: 'var(--color-hermes)'
      };
    }
    return {
      main: 'Pois',
      subText: 'Ei aktiivista ajastusta',
      color: 'var(--color-text-muted)'
    };
  };

  const awayMetric = formatSubModeMetric(mode.away, 'Aktiivinen');
  const guestIsFest = String(mode.guest.cfg.guest_profile || 'standard').toLowerCase() === 'fest';
  const guestMetric = formatSubModeMetric(mode.guest, guestIsFest ? 'Fest 8+' : 'Vieraat');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-grid)', height: isExpanded ? 'auto' : '100%' }}>
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ cursor: 'pointer', height: '100%', position: 'relative' }}
        title="Klikkaa nähdäksesi tilan aikataulun, edistymisen ja ajastukset"
      >
        <WidgetNormal
          title="Talon tila"
          value={mode.label}
          unit=""
          description={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
              <span>{mode.shortLine}</span>
              {mode.progressPct !== null && (
                <ModeProgressBar
                  percent={mode.progressPct}
                  color={mode.color}
                  prepZonePct={mode.prepZonePct}
                  height={5}
                />
              )}
            </div>
          }
          subLabel={mode.subLabel}
          subValue={mode.subValue}
          iconName={mode.iconName}
          isActive={mode.isActive}
        />
      </div>

      {isExpanded && (
        <div className="ui-panel smooth-transition" style={{ padding: 'var(--padding-panel)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Tilannekatsaus */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-technical)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                {mode.fullTitle}
              </div>
              <Badge label={mode.isSpecial ? formatSourceLabel(mode.source) : 'Automaatio'} isActive={mode.isSpecial} />
            </div>

            <Paragraph>{mode.summaryText}</Paragraph>

            {/* Aikajana ja edistymispalkki */}
            {mode.progressPct !== null && (
              <div
                style={{
                  backgroundColor: 'var(--color-bg-clean)',
                  padding: '14px 16px',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: 'var(--color-text-main)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Clock size={14} className="text-muted" />
                    <span>Jäljellä</span>
                    <strong style={{ color: mode.color }}>{mode.subValue}</strong>
                  </span>
                  <span
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: 'var(--color-text-technical)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {mode.progressPct}{'\u00A0'}%
                  </span>
                </div>

                <ModeProgressBar
                  percent={mode.progressPct}
                  color={mode.color}
                  prepZonePct={mode.prepZonePct}
                  height={8}
                />

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    paddingTop: '2px',
                    fontSize: '0.75rem'
                  }}
                >
                  <div>
                    <div style={{ color: 'var(--color-text-muted)', marginBottom: '2px' }}>Alkoi</div>
                    <div style={{ color: 'var(--color-text-main)', fontWeight: 600 }}>{formatFiTime(mode.startMs)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: 'var(--color-text-muted)', marginBottom: '2px' }}>Päättyy</div>
                    <div style={{ color: 'var(--color-text-main)', fontWeight: 600 }}>{formatFiTime(mode.untilMs)}</div>
                  </div>
                </div>

                {mode.prepStartMs && (
                  <div
                    style={{
                      borderTop: '1px solid rgba(148, 163, 184, 0.2)',
                      paddingTop: '8px',
                      fontSize: '0.75rem',
                      color: 'var(--color-text-muted)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '8px'
                    }}
                  >
                    <span>Esivalmistelu alkaa</span>
                    <strong style={{ color: 'var(--color-hermes)', fontWeight: 600 }}>{formatFiTime(mode.prepStartMs)}</strong>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Aktiiviset parametrit: rauhallinen 2-sarakkeinen ruudukko */}
          <div style={{ borderTop: '1px solid var(--color-bg-clean)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <SlidersHorizontal size={15} className="text-saab" />
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-technical)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Aktiiviset parametrit
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
              {mode.params.map((item) => (
                <div
                  key={item.label}
                  style={{
                    padding: '10px 12px',
                    backgroundColor: 'var(--color-bg-clean)',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px'
                  }}
                >
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    {item.label}
                  </span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: item.accent, whiteSpace: 'nowrap' }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Kaikki tilakytkimet & tulevat ajastukset */}
          <Accordion title="Ajastukset ja Kytkimet" iconName="Calendar">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 'var(--spacing-grid)',
                margin: 'calc(var(--padding-panel) * -0.5) 0'
              }}
            >
              <MetricBlock
                title="Poissaolotila"
                mainValue={awayMetric.main}
                subValue={awayMetric.subText}
                iconName="Plane"
                valueColor={awayMetric.color}
              />

              <MetricBlock
                title="Vierastila"
                mainValue={guestMetric.main}
                subValue={guestMetric.subText}
                iconName={guestIsFest ? 'Sparkles' : 'Users'}
                valueColor={guestMetric.color}
              />
            </div>
          </Accordion>
        </div>
      )}
    </div>
  );
}