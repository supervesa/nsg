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
  readyUrl,
  isActive,
  onActivate,
  onReturn
}) {
  const Icon = LucideIcons[iconName] || LucideIcons.Rocket;

  const cardStyle = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    padding: '24px',
    boxSizing: 'border-box', // TÄRKEÄ MUUTOS: Varmistaa, että padding ei kasvata kortin ulkomittoja
    minHeight: '250px' // TÄRKEÄ MUUTOS: Asettaa korteille minimikorkeuden, jotta ne pysyvät tasakokoisina, vaikka tekstiä olisi vähemmän
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
          display: 'flex',
          flexShrink: 0 // Estää ikonia kutistumasta
        }}>
          <Icon size={24} />
        </div>
        <h3 className="text-title" style={{ margin: 0, wordBreak: 'break-word' }}>{title}</h3>
      </div>
      
      {/* Keskiosa: Kuvaus */}
      <p className="text-muted" style={{ flexGrow: 1, marginBottom: '24px', minHeight: '60px' }}> {/* Lisätty minHeight tekstiin */}
        {description}
      </p>

      {error && (
        <div className="text-error" style={{ marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Alaosa: Kolmivaiheinen Painikelogiikka */}
      <div style={{ marginTop: 'auto', flexShrink: 0 }}> {/* flexShrink: 0 estää nappia kutistumasta */}
        {isActive ? (
          <Button 
            variant="secondary" 
            fullWidth={true} 
            icon={LucideIcons.ExternalLink}
            onClick={onReturn}
          >
            Istunto aktiivinen – Palaa palveluun
          </Button>
        ) : readyUrl ? (
          <Button 
            variant="success" 
            fullWidth={true} 
            icon={LucideIcons.CheckCircle}
            onClick={onActivate}
          >
            Lippu noudettu! Avaa tästä
          </Button>
        ) : (
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