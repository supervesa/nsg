import React from 'react';

export default function SmallWidgetsRow({ widgets, data }) {
  if (!widgets || widgets.length === 0) return null;

  return (
    <div style={{ 
      // Työpöydällä flex, mobiilissa grid, jotta ne taittuvat nätisti
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
      gap: '12px', 
      marginBottom: '24px' 
    }}>
      {widgets.map((widget) => {
        const WidgetComp = widget.Component;
        return <WidgetComp key={widget.id} data={data} />;
      })}
    </div>
  );
}