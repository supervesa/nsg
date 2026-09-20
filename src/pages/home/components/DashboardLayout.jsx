import React, { useState, useMemo } from 'react';
import DashboardNavbar from './DashboardNavbar';
import SmallWidgetsRow from './SmallWidgetsRow';

// Skannataan kansiot automaattisesti
const widgetModules = import.meta.glob('../widgets/*.jsx', { eager: true });
const tabModules = import.meta.glob('../tabs/*.jsx', { eager: true });

export default function DashboardLayout({ data }) {
  
  // 1. Parsitaan widgetit
  const smallWidgets = useMemo(() => {
    return Object.keys(widgetModules)
      .map(path => {
        const mod = widgetModules[path];
        return {
          Component: mod.SmallWidget,
          meta: mod.meta || { order: 99 },
          id: path
        };
      })
      .filter(w => w.Component)
      .sort((a, b) => a.meta.order - b.meta.order);
  }, []);

  // 2. Parsitaan välilehdet
  const tabs = useMemo(() => {
    return Object.keys(tabModules)
      .map(path => {
        const mod = tabModules[path];
        return {
          id: mod.meta?.id || path.replace('../tabs/', '').replace('.jsx', '').toLowerCase(),
          title: mod.meta?.title || 'Nimetön välilehti',
          icon: mod.meta?.icon || 'Layout',
          order: mod.meta?.order || 99,
          Component: mod.default,
        };
      })
      .sort((a, b) => a.order - b.order);
  }, []);

  const [activeTabId, setActiveTabId] = useState(tabs.length > 0 ? tabs[0].id : null);
  const ActiveTabComponent = tabs.find(t => t.id === activeTabId)?.Component;

  return (
    <div>
      {/* Komponentti 1: Ylärivin data-pillerit */}
      <SmallWidgetsRow widgets={smallWidgets} data={data} />

      {/* Komponentti 2: Responsiivinen navigaatio (Dropdown tai nauha) */}
      <DashboardNavbar tabs={tabs} activeTabId={activeTabId} setActiveTabId={setActiveTabId} />

      {/* Komponentti 3: Aktiivisen välilehden sisältö */}
      <div>
        {ActiveTabComponent ? (
          <ActiveTabComponent data={data} />
        ) : (
          <div className="ui-panel" style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Ei ladattavia välilehtiä. Luo .jsx tiedosto tabs-kansioon.
          </div>
        )}
      </div>
    </div>
  );
}