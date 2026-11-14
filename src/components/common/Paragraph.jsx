import React from 'react';

export default function Paragraph({ 
  text, 
  children, 
  variant = 'default', // Vaihtoehdot: 'default', 'muted', 'highlight'
  highlightColor       // Esim. 'var(--color-saab)' - luo tyylikkään reunuksen
}) {
  const content = children || text;
  const isHighlight = variant === 'highlight' || highlightColor;
  
  const containerStyle = isHighlight ? {
    backgroundColor: 'var(--color-surface)',
    padding: '16px 20px',
    borderRadius: '8px',
    borderLeft: `4px solid ${highlightColor || 'var(--color-electric)'}`,
    boxShadow: 'var(--shadow-subtle)'
  } : {};

  const textStyle = {
    margin: 0,
    fontSize: variant === 'muted' ? '0.9rem' : '0.95rem',
    color: variant === 'muted' ? 'var(--color-text-muted)' : 'var(--color-text-main)',
    lineHeight: '1.65',
    whiteSpace: 'pre-wrap' // Erittäin tärkeä AI-teksteille: säilyttää rivinvaihdot!
  };

  return (
    <div style={containerStyle}>
      <p style={textStyle}>
        {content}
      </p>
    </div>
  );
}