import React from 'react';
import * as LucideIcons from 'lucide-react';

export default function WidgetGraph({
  title,
  iconName,
  topRightElement, // Esim. Total kWh arvo oikeaan yläkulmaan
  graphContent,    // Itse graafi (esim. Recharts)
  listContent      // Lista (esim. tuntien erittely)
}) {
  const Icon = LucideIcons[iconName] || LucideIcons.BarChart2;

  return (
    <div className="ui-panel smooth-transition" style={{
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box',
      padding: '24px',
      gap: '24px',
      height: '100%'
    }}>
      
      {/* 1. HEADER-ALUE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            backgroundColor: 'var(--color-bg-clean)', 
            color: 'var(--color-text-main)', 
            padding: '8px', 
            borderRadius: '6px',
            display: 'flex'
          }}>
            <Icon size={24} />
          </div>
          <h3 className="text-title" style={{ margin: 0 }}>{title}</h3>
        </div>
        
        {/* Oikean yläkulman elementti (esim. 2.20 kWh yhteissumma) */}
        {topRightElement && (
          <div style={{ textAlign: 'right' }}>
            {topRightElement}
          </div>
        )}
      </div>

      {/* 2. SISÄLTÖALUE (Graafi ja Lista) */}
      <div style={{ 
        display: 'grid', 
        gap: '24px',
        // Jos listContent on olemassa, jaetaan 2fr (graafi) 1fr (lista). Muuten 1fr (koko leveys).
        gridTemplateColumns: listContent ? 'repeat(auto-fit, minmax(300px, 1fr))' : '1fr',
        alignItems: 'start',
        flex: 1
      }}>
        
        {/* Graafialue (Saa kasvaa isommaksi jos jaettu tila) */}
        {graphContent && (
          <div style={{ 
            minHeight: '250px', 
            height: '100%', 
            gridColumn: listContent ? '1 / lg:span 2' : '1 / -1',
            // Tämä flex-asetus auttaa esim. Rechartsia täyttämään tilan oikein
            display: 'flex', 
            flexDirection: 'column' 
          }}>
            {graphContent}
          </div>
        )}

        {/* Listaalue */}
        {listContent && (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '12px',
            maxHeight: '350px', // Estää listaa kasvamasta liian pitkäksi (scrollaus)
            overflowY: 'auto',
            paddingRight: '4px' // Scrollbarille hieman tilaa
          }}>
            {listContent}
          </div>
        )}
        
      </div>
    </div>
  );
}