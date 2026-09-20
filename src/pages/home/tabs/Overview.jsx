import React, { useMemo } from 'react';

export const meta = {
  id: 'overview',
  title: 'Yleiskatsaus',
  icon: 'Home',
  order: 1
};

// Skannataan widgets-kansio suoraan täältä
const widgetModules = import.meta.glob('../widgets/*.jsx', { eager: true });

export default function Overview({ data }) {
  // Parsitaan widgetit ja suodatetaan vain ne, joilla on ISO KORTTI (NormalWidget)
  const normalWidgets = useMemo(() => {
    return Object.keys(widgetModules)
      .map(path => {
        const mod = widgetModules[path];
        return {
          Component: mod.NormalWidget, // Etsitään vain NormalWidget export
          meta: mod.meta || { order: 99 },
          id: path
        };
      })
      .filter(w => w.Component) // Pudotetaan pois ne, joilla ei ole isoa korttia
      .sort((a, b) => a.meta.order - b.meta.order);
  }, []);

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
      gap: '24px' 
    }}>
      {normalWidgets.length > 0 ? (
        normalWidgets.map((widget) => {
          const WidgetComp = widget.Component;
          return <WidgetComp key={widget.id} data={data} />;
        })
      ) : (
        <div className="ui-panel" style={{ gridColumn: '1 / -1', padding: '32px', textAlign: 'center' }}>
          <p className="text-muted">Luo ensimmäinen widgetti src/pages/home/widgets/ -kansioon.</p>
        </div>
      )}
    </div>
  );
}