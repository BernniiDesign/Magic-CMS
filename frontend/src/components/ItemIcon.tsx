// frontend/src/components/ItemIcon.tsx

import { useState } from 'react';

interface ItemIconProps {
  icon: string;          // Ya viene con extensión desde backend
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
  0: 'opacity-60',                    // Poor
  1: '',                              // Common
  2: 'ring-2 ring-green-500/50',     // Uncommon
  3: 'ring-2 ring-blue-500/50',      // Rare
  4: 'ring-2 ring-purple-500/50',    // Epic
  5: 'ring-2 ring-orange-500/50',    // Legendary
  6: 'ring-2 ring-yellow-500/50',    // Artifact
  7: 'ring-2 ring-cyan-400/50',      // Heirloom
};

export function ItemIcon({
  icon,
  name,
  quality,
  size = 'large',
  className = '',
}: ItemIconProps) {
  const [iconError, setIconError] = useState(false);
  const config = SIZE_CONFIG[size];
  
  // ✅ Limpiar nombre del icono (quitar extensión para URL)
  const iconName = icon
    .replace('.jpg', '')
    .replace('.png', '')
    .toLowerCase();
  
  // ✅ URL simple: siempre WoW Zamimg
  const iconUrl = iconError
    ? `https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg`
    : `https://wow.zamimg.com/images/wow/icons/large/${iconName}.jpg`;

  const qualityClass = QUALITY_CLASSES[quality] || '';

  return (
    <div className={`relative inline-block ${config.className} ${className}`}>
      <img
        src={iconUrl}
        alt={name}
        className={`${config.className} rounded-sm ${qualityClass}`}
        onError={() => {
          if (!iconError) {
            setIconError(true);
          }
        }}
      />
    </div>
  );
}