import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Button({
  children,
  variant = 'primary', // Vaihtoehdot: 'primary', 'secondary', 'success', 'danger'
  size = 'md',         // Vaihtoehdot: 'sm', 'md', 'lg'
  fullWidth = false,
  isLoading = false,
  disabled = false,
  icon: Icon,
  iconPosition = 'left', // KORJAUS: Napataan tämä kiinni täällä!
  className = '',
  style = {},
  onClick,
  ...props // Nyt iconPosition on siivottu pois, eikä se valu HTML-napille
}) {

  // 1. Valitaan perusluokka nsg-style.css -teemasta
  let variantClass = '';
  let inlineStyle = { ...style };

  switch (variant) {
    case 'primary':
      // Tavallinen huomioväri (Hermes Oranssi)
      variantClass = 'btn-primary'; 
      break;
      
    case 'secondary':
      // Hillitty ääriviivapainike
      variantClass = 'btn-secondary'; 
      break;
      
    case 'success':
      // NÄYTTÄVÄ: Käytetään btn-primaryä, mutta ylikirjoitetaan väri Saab-vihreäksi
      // Lisätään myös hehkuva varjo! Tämä sopii "Valmis! Avaa tästä" -nappiin.
      variantClass = 'btn-primary';
      inlineStyle.backgroundColor = 'var(--color-saab)';
      inlineStyle.boxShadow = '0 4px 15px rgba(0, 204, 102, 0.35)';
      break;
      
    case 'danger':
      // KILL SWITCH: Vaarallinen toiminto (Rosso Punainen)
      variantClass = 'btn-secondary';
      inlineStyle.color = 'var(--color-rosso)';
      inlineStyle.borderColor = 'var(--color-rosso)';
      inlineStyle.backgroundColor = 'rgba(195, 0, 47, 0.05)';
      break;
      
    default:
      variantClass = 'btn-primary';
  }

  // 2. Määritetään koot 
  const iconSize = size === 'sm' ? 14 : 18; // Määritetään ikonin koko kerran
  
  if (size === 'sm') {
    inlineStyle.padding = '6px 12px';
    inlineStyle.fontSize = '0.75rem';
  } else if (size === 'lg') {
    inlineStyle.padding = '14px 24px';
    inlineStyle.fontSize = '1rem';
  }

  // 3. Flexbox-asetukset, jotka takaavat asettelun vaikkei Tailwind toimisi
  inlineStyle.display = fullWidth ? 'flex' : 'inline-flex';
  inlineStyle.alignItems = 'center';
  inlineStyle.justifyContent = 'center';
  inlineStyle.gap = '8px';
  
  if (fullWidth) inlineStyle.width = '100%';

  const isDisabled = disabled || isLoading;

  return (
    <button
      className={`${variantClass} smooth-transition ${className}`.trim()}
      style={inlineStyle}
      disabled={isDisabled}
      onClick={onClick}
      {...props}
    >
      {/* 1. Lataussymboli pyörii, jos isLoading on true (korvaa vasemman ikonin) */}
      {isLoading && (
        <Loader2 size={iconSize} className="animate-spin" />
      )}

      {/* 2. Vasen ikoni (näytetään vain jos ei ladata ja positio on vasen) */}
      {!isLoading && Icon && iconPosition === 'left' && (
        <Icon size={iconSize} />
      )}
      
      {/* 3. Itse painikkeen teksti */}
      {children && <span>{children}</span>}

      {/* 4. Oikea ikoni (näytetään vain jos ei ladata ja positio on oikea) */}
      {!isLoading && Icon && iconPosition === 'right' && (
        <Icon size={iconSize} />
      )}
    </button>
  );
}