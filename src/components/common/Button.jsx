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
  className = '',
  style = {},
  onClick,
  ...props
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
      className={`${variantClass} smooth-transition ${className}`}
      style={inlineStyle}
      disabled={isDisabled}
      onClick={onClick}
      {...props}
    >
      {/* Lataussymboli pyörii, jos isLoading on true */}
      {isLoading ? (
        <Loader2 size={size === 'sm' ? 14 : 18} className="animate-spin" />
      ) : (
        /* Muuten näytetään haluttu ikoni, jos sellainen on annettu */
        Icon && <Icon size={size === 'sm' ? 14 : 18} />
      )}
      
      {/* Itse painikkeen teksti */}
      <span>{children}</span>
    </button>
  );
}