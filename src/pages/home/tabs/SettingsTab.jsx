import React, { useState, useEffect } from 'react';
import { macbase } from '../../../config/supabaseClient';
import { Settings, Cpu, Wallet, Save, RefreshCcw, Loader2, AlertCircle } from 'lucide-react';
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
    // Jos tietokanta palautti stringifioidun stringin (kaksinkertainen enkoodaus), puretaan kerran vielä
    if (typeof parsed === 'string') return JSON.parse(parsed);
    return parsed;
  } catch (e) {
    console.error("Virhe JSON-parsinnassa:", e, data);
    return {};
  }
};

export default function SettingsTab() {
  // Alkuperäinen data tietokannasta (read-only, käytetään "Undo"-palautuksiin)
  const [originalData, setOriginalData] = useState({
    switchboard: [],
    budgetRoot: {},
    budgetKpi: {},
    budgetSim: {}
  });

  // Muokattava tila (Local State)
  const [localData, setLocalData] = useState({
    switchboard: [],
    budgetRoot: {},
    budgetKpi: {},
    budgetSim: {}
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // Haetaan data kantaan kerran sivun latautuessa
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

      // Parsitaan JSON-kentät uudella turvallisella funktiolla
      const kpi = safeParseJSON(bData.kpi_targets);
      const sim = safeParseJSON(bData.simulator_settings);

      const loadedData = {
        switchboard: switches,
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

      // Tallennetaan sekä alkuperäinen että lokaali muokattava tila
      setOriginalData(JSON.parse(JSON.stringify(loadedData))); // Deep copy
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
    setLocalData(prev => ({
      ...prev,
      switchboard: prev.switchboard.map(sw => 
        sw.automation_key === key ? { ...sw, is_active: !currentVal } : sw
      )
    }));
  };

  // Käsittelee numerokentän muutoksen lokaaliin tilaan
  const handleInputChange = (section, key, val) => {
    setLocalData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: val
      }
    }));
  };

  // Onko tehty muutoksia (verrataan lokaalia tilaa alkuperäiseen)
  const hasChanges = JSON.stringify(originalData) !== JSON.stringify(localData);

  // Palauttaa kaikki asetukset tietokannasta haettuihin alkuperäisiin arvoihin (Undo)
  const handleUndo = () => {
    setLocalData(JSON.parse(JSON.stringify(originalData)));
  };

  // Tallentaa VAIN MUUTTUNEET arvot tietokantaan
  const handleSave = async () => {
    if (!hasChanges) return;
    setIsSaving(true);
    setError(null);

    try {
      // 1. Tallenna muuttuneet Switchboard-avaimet
      const changedSwitches = localData.switchboard.filter((localSw, idx) => 
        localSw.is_active !== originalData.switchboard[idx].is_active
      );

      for (const sw of changedSwitches) {
        const { error: swErr } = await macbase.schema('homeassistant')
          .from('settings_switchboard')
          .update({ is_active: sw.is_active, updated_at: new Date().toISOString() })
          .eq('automation_key', sw.automation_key);
        if (swErr) throw swErr;
      }

      // 2. Tallenna muuttuneet Budget-asetukset
      const originalBudgetObj = JSON.stringify({ root: originalData.budgetRoot, kpi: originalData.budgetKpi, sim: originalData.budgetSim });
      const localBudgetObj = JSON.stringify({ root: localData.budgetRoot, kpi: localData.budgetKpi, sim: localData.budgetSim });
      
      if (originalBudgetObj !== localBudgetObj) {
        // Rakennetaan päivitettävä objekti vain juuritason kentistä, jos ne muuttuivat
        const updatePayload = { updated_at: new Date().toISOString() };
        
        Object.keys(localData.budgetRoot).forEach(key => {
            if(localData.budgetRoot[key] !== originalData.budgetRoot[key]) {
                updatePayload[key] = localData.budgetRoot[key];
            }
        });

        // JSON-kentät päivitetään kokonaisuudessaan, jos niiden sisällä on muutoksia
        if (JSON.stringify(localData.budgetKpi) !== JSON.stringify(originalData.budgetKpi)) {
            updatePayload.kpi_targets = localData.budgetKpi;
        }
        if (JSON.stringify(localData.budgetSim) !== JSON.stringify(originalData.budgetSim)) {
            updatePayload.simulator_settings = localData.budgetSim;
        }

        if (Object.keys(updatePayload).length > 1) { // 1 = vain updated_at
            const { error: bgErr } = await macbase.schema('homeassistant')
            .from('budget_settings')
            .update(updatePayload)
            .eq('system_id', 'main_house');
            if (bgErr) throw bgErr;
        }
      }

      // Tallennus onnistui, päivitetään alkuperäinen tila vastaamaan tallennettua lokaalia
      setOriginalData(JSON.parse(JSON.stringify(localData)));

    } catch (err) {
      console.error("Virhe tallennettaessa:", err);
      setError("Asetusten tallennus epäonnistui.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted flex-center"><Loader2 className="animate-spin" size={20} style={{ marginRight: '8px' }}/> Ladataan asetuksia...</div>;
  }

  // Yhteinen renderöijä JSON-objektien arvoille
  const renderInputGrid = (sectionName, dataObj, originalObj) => {
    // Jos data on täysin tyhjä, näytetään siitä selkeä ilmoitus
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
          // Piilotetaan monimutkaiset listat (esim. reserve_multipliers taulukot)
          if (value !== null && typeof value === 'object') return null; 

          const isModified = originalObj && value !== originalObj[key];
          
          return (
            <div key={key} className="ui-panel" style={{ 
              padding: '16px', 
              borderLeft: isModified ? '3px solid var(--color-hermes)' : '1px solid var(--color-lancia)' 
            }}>
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-layout)' }}>
      
      {/* Sivun Header & Tallennuspainikkeet */}
      <div className="flex-between" style={{ flexWrap: 'wrap', gap: '16px', backgroundColor: 'var(--color-surface)', padding: 'var(--padding-panel)', borderRadius: '8px', border: '1px solid var(--color-lancia)', boxShadow: 'var(--shadow-subtle)' }}>
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
        <div className="text-error flex-row-gap"><AlertCircle size={16} /> {error}</div>
      )}

      {/* A. Automaation Kytkimet */}
      <Accordion title="Automaatiot (On / Off)" iconName="Cpu" defaultOpen={true}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {localData.switchboard.length === 0 ? (
            <div className="text-muted" style={{ fontSize: '0.85rem', padding: '8px' }}>Ei kytkimiä saatavilla.</div>
          ) : (
            localData.switchboard.map((sw, idx) => {
               const isModified = sw.is_active !== originalData.switchboard[idx].is_active;
               return (
                 <div key={sw.automation_key} style={{ 
                   borderLeft: isModified ? '3px solid var(--color-hermes)' : 'none',
                   paddingLeft: isModified ? '12px' : '15px' // Kompensoidaan reunan leveyttä
                 }}>
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

      {/* B. Talous ja Hinnat */}
      <Accordion title="Talouden perusasetukset" iconName="Wallet">
         {renderInputGrid('budgetRoot', localData.budgetRoot, originalData.budgetRoot)}
      </Accordion>

      {/* C. Tekoäly ja Simulaattori */}
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