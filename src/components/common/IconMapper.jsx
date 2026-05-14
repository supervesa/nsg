import React from 'react';
// Tuodaan ikonit (lisää tänne uusia, jos keksit uusia moduuleja myöhemmin)
import { Image, Dumbbell, Briefcase, LayoutGrid } from 'lucide-react';

const iconMap = {
  'Image': Image,
  'Dumbbell': Dumbbell,
  'Briefcase': Briefcase,
};

function IconMapper({ name, size = 20, className = '' }) {
  // Jos nimeä ei löydy, näytetään oletuksena 'LayoutGrid'
  const IconComponent = iconMap[name] || LayoutGrid; 
  
  return <IconComponent size={size} className={className} />;
}

export default IconMapper;