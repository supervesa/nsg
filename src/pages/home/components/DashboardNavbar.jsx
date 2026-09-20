import React, { useState, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';
import Dropdown from '../../../components/common/Dropdown';

const renderIcon = (iconName, size = 18) => {
  const IconComponent = LucideIcons[iconName];
  if (!IconComponent) return <LucideIcons.HelpCircle size={size} />;
  return <IconComponent size={size} />;
};

export default function DashboardNavbar({ tabs, activeTabId, setActiveTabId }) {
  // Yksinkertainen ikkunakoon seuranta mobiiliversion kytkemistä varten
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (tabs.length === 0) return null;

  if (isMobile) {
    // MOBIILINÄKYMÄ: Käytetään yhteistä Dropdown-komponenttia
    const dropdownOptions = tabs.map(tab => ({
      value: tab.id,
      label: tab.title,
      icon: tab.icon
    }));

    return (
      <div style={{ marginBottom: '24px' }}>
        <Dropdown 
          options={dropdownOptions}
          value={activeTabId}
          onChange={setActiveTabId}
        />
      </div>
    );
  }

  // TYÖPÖYTÄNÄKYMÄ: Perinteinen vaakasuuntainen valikko
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid var(--color-lancia)', marginBottom: '24px' }}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTabId(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px',
              background: 'none', border: 'none',
              borderBottom: isActive ? '2px solid var(--color-electric)' : '2px solid transparent',
              color: isActive ? 'var(--color-electric)' : 'var(--color-text-technical)',
              fontWeight: isActive ? 600 : 500, fontSize: '0.875rem', cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {renderIcon(tab.icon, 18)}
            {tab.title}
          </button>
        );
      })}
    </div>
  );
}