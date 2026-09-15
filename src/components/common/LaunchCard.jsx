import React from 'react';
import * as LucideIcons from 'lucide-react';
import Button from './Button';

export default function LaunchCard({ 
  title, 
  description, 
  iconName, 
  buttonText, 
  onLaunch, 
  isGenerating, 
  error,
  readyUrl,     // TILA 2: Lippu on valmis
  isActive,     // TILA 3: Istunto on aktiivinen
  onActivate,   // Funktio Tila 2:n avaamiseen (käyttää lipun)
  onReturn      // Funktio Tila 3:n avaamiseen (menee suoraan evästeellä)
}) {
  const Icon = LucideIcons[iconName] || LucideIcons.Rocket;

  const cardStyle = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    padding: '24px'
  };

  return (
    <div className="ui-panel" style={cardStyle}>
      
      {/* Yläosa: Ikoni ja Otsikko */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div style={{ 
          backgroundColor: 'var(--color-text-main)', 
          color: 'var(--color-surface)', 
          padding: '8px', 
          borderRadius: '6px',
          display: 'flex'
        }}>
          <Icon size={24} />
        </div>
        <h3 className="text-title" style={{ margin: 0 }}>{title}</h3>
      </div>
      
      {/* Keskiosa: Kuvaus */}
      <p className="text-muted" style={{ flexGrow: 1, marginBottom: '24px' }}>
        {description}
      </p>

      {error && (
        <div className="text-error">
          {error}
        </div>
      )}

      {/* Alaosa: Kolmivaiheinen Painikelogiikka */}
      <div style={{ marginTop: 'auto' }}>
        {isActive ? (
          /* VAIHE 3: Istunto auki, palataan suoraan ilman uutta lippua */
          <Button 
            variant="secondary" 
            fullWidth={true} 
            icon={LucideIcons.ExternalLink}
            onClick={onReturn}
          >
            Istunto aktiivinen – Palaa palveluun
          </Button>
        ) : readyUrl ? (
          /* VAIHE 2: Lippu haettu, avataan ja aktivoidaan istunto */
          <Button 
            variant="success" 
            fullWidth={true} 
            icon={LucideIcons.CheckCircle}
            onClick={onActivate}
          >
            Lippu noudettu! Avaa tästä
          </Button>
        ) : (
          /* VAIHE 1: Alkutila, haetaan lippu */
          <Button 
            variant="primary" 
            fullWidth={true} 
            isLoading={isGenerating}
            onClick={onLaunch}
            icon={LucideIcons.Power}
          >
            {buttonText}
          </Button>
        )}
      </div>

    </div>
  );
}