// frontend/src/components/ItemTooltip.tsx

import { useEffect } from 'react';
import { wotlkdbService } from '../services/wotlkdb.service';

interface ItemTooltipProps {
  itemId: number;
  enchantId?: number;
  gems?: number[];
  randomEnchant?: number;
  children?: React.ReactNode;
  className?: string;
}

export function ItemTooltip({ 
  itemId, 
  enchantId, 
  gems = [], 
  randomEnchant,
  children,
  className 
}: ItemTooltipProps) {
  useEffect(() => {
    // Inyectar script de tooltips al montar el componente
    wotlkdbService.injectTooltipScript()
      .catch((err: Error) => console.error('❌ Tooltip script failed:', err));
  }, []);

  const buildItemURL = (): string => {
    const params = new URLSearchParams();
    params.set('item', itemId.toString());
    
    if (enchantId) {
      params.set('ench', enchantId.toString());
    }
    
    if (gems.length > 0) {
      params.set('gems', gems.join(':'));
    }
    
    if (randomEnchant) {
      params.set('rand', randomEnchant.toString());
    }

    return `https://wotlkdb.com/?${params.toString()}`;
  };

  return (
    <a 
      href={buildItemURL()}
      className={className}
      target="_blank"
      rel="noopener noreferrer"
      data-wotlkdb="item"
      data-wotlkdb-id={itemId}
      {...(enchantId && { 'data-wotlkdb-enchant': enchantId })}
      {...(gems.length > 0 && { 'data-wotlkdb-gems': gems.join(':') })}
      {...(randomEnchant && { 'data-wotlkdb-rand': randomEnchant })}
    >
      {children || `Item ${itemId}`}
    </a>
  );
}