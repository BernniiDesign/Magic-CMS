// frontend/src/components/ItemIcon.tsx

import { useState, useMemo } from 'react';

interface ItemIconProps {
  icon: string;          // De DB: "inv_sword_153" o "displayid_64396"
  displayid?: number;    // Opcional: para construcción de URL
  name: string;
  quality: number;
  size?: 'tiny' | 'small' | 'medium' | 'large';
  className?: string;
}

const SIZE_CONFIG = {
  tiny: { wowhead: 'tiny', className: 'w-6 h-6' },
  small: { wowhead: 'small', className: 'w-10 h-10' },
  medium: { wowhead: 'medium', className: 'w-14 h-14' },
  large: { wowhead: 'large', className: 'w-20 h-20' },
};

const QUALITY_CLASSES: Record<number, string> = {
  0: 'opacity-60',                    // Poor (gray)
  1: '',                              // Common (white) - sin borde especial
  2: 'ring-2 ring-green-500/50',     // Uncommon (green)
  3: 'ring-2 ring-blue-500/50',      // Rare (blue)
  4: 'ring-2 ring-purple-500/50',    // Epic (purple)
  5: 'ring-2 ring-orange-500/50',    // Legendary (orange)
  6: 'ring-2 ring-yellow-500/50',    // Artifact (gold)
  7: 'ring-2 ring-cyan-400/50',      // Heirloom (cyan)
};

export function ItemIcon({
  icon,
  displayid,
  name,
  quality,
  size = 'small',
  className = '',
}: ItemIconProps) {
  const [iconError, setIconError] = useState(false);
  const config = SIZE_CONFIG[size];
  
  // Determinar URL del icono
  const iconUrl = useMemo(() => {
    // Si el icono viene con flag "displayid_XXX", usar displayid directamente
    if (icon.startsWith('displayid_')) {
      const displayIdFromFlag = icon.replace('displayid_', '');
      return `https://wow.zamimg.com/modelviewer/live/previews/item=${displayIdFromFlag}.png`;
    }
    
    // Si hay displayid explícito y el icono de DB falló
    if (iconError && displayid) {
      return `https://wow.zamimg.com/modelviewer/live/previews/item=${displayid}.png`;
    }
    
    // Icono normal desde DB (quitar .jpg si existe)
    const iconName = icon.replace('.jpg', '').replace('.png', '');
    return `https://wow.zamimg.com/images/wow/icons/${config.wowhead}/${iconName}.jpg`;
  }, [icon, displayid, iconError, config.wowhead]);

  const qualityClass = QUALITY_CLASSES[quality] || '';

  return (
    <div className={`relative inline-block ${config.className} ${className}`}>
      <img
        src={iconUrl}
        alt={name}
        className={`${config.className} rounded-sm ${qualityClass}`}
        onError={(e) => {
          if (!iconError) {
            setIconError(true);
            
            // Segundo fallback: icono genérico
            if (!displayid) {
              e.currentTarget.src = `https://wow.zamimg.com/images/wow/icons/${config.wowhead}/inv_misc_questionmark.jpg`;
            }
          } else {
            // Último recurso
            e.currentTarget.src = `https://wow.zamimg.com/images/wow/icons/${config.wowhead}/inv_misc_questionmark.jpg`;
          }
        }}
      />
    </div>
  );
}