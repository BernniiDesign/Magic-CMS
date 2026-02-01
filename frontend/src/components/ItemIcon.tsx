import { useMemo } from 'react';

interface ItemIconProps {
  icon: string; // Nombre del archivo (con o sin .jpg)
  name: string;
  quality: number;
  size?: 'tiny' | 'small' | 'medium' | 'large';
  showBorder?: boolean;
  className?: string;
}

const QUALITY_BORDERS: Record<number, string> = {
  0: 'default',   // Poor (gray) - usa default
  1: 'default',   // Common (white) - usa default
  2: 'uncommon',  // Uncommon (green)
  3: 'rare',      // Rare (blue)
  4: 'epic',      // Epic (purple)
  5: 'legendary', // Legendary (orange)
  6: 'artifact',  // Artifact (gold)
  7: 'heirloom',  // Heirloom (cyan)
};

const SIZE_CONFIG = {
  tiny: { iconDir: 'tiny', borderDir: 'small', className: 'w-6 h-6' },
  small: { iconDir: 'small', borderDir: 'medium', className: 'w-10 h-10' },
  medium: { iconDir: 'medium', borderDir: 'large', className: 'w-14 h-14' },
  large: { iconDir: 'large', borderDir: 'large', className: 'w-20 h-20' },
};

export function ItemIcon({
  icon,
  name,
  quality,
  size = 'small',
  showBorder = true,
  className = '',
}: ItemIconProps) {
  const config = SIZE_CONFIG[size];
  const borderType = QUALITY_BORDERS[quality] || 'default';
  
  // Asegurar que el nombre del icono tenga .jpg
  const iconFileName = useMemo(() => {
    return icon.endsWith('.jpg') ? icon : `${icon}.jpg`;
  }, [icon]);

  const iconUrl = `https://wotlkdb.com/static/images/wow/icons/${config.iconDir}/${iconFileName}`;
  const borderUrl = `https://wotlkdb.com/static/images/Icon/${config.borderDir}/border/${borderType}.png`;

  return (
    <div className={`relative inline-block ${config.className} ${className}`}>
      {/* Icono del item */}
      <img
        src={iconUrl}
        alt={name}
        className={`${config.className} rounded-sm`}
        onError={(e) => {
          // Fallback a icono de interrogación
          e.currentTarget.src = `https://wotlkdb.com/static/images/wow/icons/${config.iconDir}/inv_misc_questionmark.jpg`;
        }}
      />
      
      {/* Borde de calidad superpuesto */}
      {showBorder && (
        <img
          src={borderUrl}
          alt=""
          className={`absolute inset-0 ${config.className} pointer-events-none`}
          onError={(e) => {
            // Si falla el borde de calidad, usar default
            e.currentTarget.src = `https://wotlkdb.com/static/images/Icon/${config.borderDir}/border/default.png`;
          }}
        />
      )}
    </div>
  );
}