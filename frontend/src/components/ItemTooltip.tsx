// frontend/src/components/ItemTooltip.tsx

import { useEffect } from 'react';
import wotlkdbService from '../services/wotlkdb.service';

interface ItemTooltipProps {
  itemId: number;
  enchantItemId?: number;    // ✅ AHORA ES ITEM ID (no enchantment ID)
  gemItemIds?: number[];     // ✅ AHORA ES ARRAY DE ITEM IDs (no enchantment IDs)
  randomProperty?: number;
  children?: React.ReactNode;
  className?: string;
}

/**
 * ✅ COMPONENTE ACTUALIZADO - USA ITEM IDs EN VEZ DE ENCHANTMENT IDs
 * 
 * WotLKDB tooltip parameters:
 * - item=ID           → Item principal
 * - ench=ITEM_ID      → Item del enchantment (ej: item=38373 = Executioner scroll)
 * - gems=ID1:ID2:ID3  → Items de las gemas (ej: item=40136 = Balanced Dreadstone)
 * - rand=X            → Random suffix/property
 */
export function ItemTooltip({ 
  itemId, 
  enchantItemId, 
  gemItemIds = [], 
  randomProperty,
  children,
  className 
}: ItemTooltipProps) {
  useEffect(() => {
    try {
      wotlkdbService.injectTooltipScript();
      console.log('✅ [ItemTooltip] WotLKDB script loaded');
      setTimeout(() => {
        wotlkdbService.refreshTooltips();
      }, 100);
    } catch (err) {
      console.error('❌ [ItemTooltip] Script failed:', err);
    }
  }, [itemId, enchantItemId, gemItemIds, randomProperty]);

  /**
   * ✅ CONSTRUCCIÓN DE URL USANDO ITEM IDs
   */
  const buildWotLKDBUrl = (): string => {
    const params = new URLSearchParams();
    params.set('item', itemId.toString());
    
    // Enchantment (ahora es item ID del enchant)
    if (enchantItemId && enchantItemId > 0) {
      params.set('ench', enchantItemId.toString());
    }
    
    // Gemas (ahora son item IDs de las gemas)
    if (gemItemIds && gemItemIds.length > 0) {
      const validGems = gemItemIds.filter(g => g && g > 0);
      if (validGems.length > 0) {
        params.set('gems', validGems.join(':'));
      }
    }
    
    // Random property/suffix
    if (randomProperty && randomProperty !== 0) {
      params.set('rand', randomProperty.toString());
    }

    return `https://wotlkdb.com/?${params.toString()}`;
  };

  /**
   * ✅ DATA ATTRIBUTES USANDO ITEM IDs
   */
  const buildDataAttributes = () => {
    const attrs: Record<string, string> = {
      'data-wotlkdb': 'item',
      'data-wotlkdb-id': itemId.toString(),
    };

    if (enchantItemId && enchantItemId > 0) {
      attrs['data-wotlkdb-ench'] = enchantItemId.toString();
    }

    if (gemItemIds && gemItemIds.length > 0) {
      const validGems = gemItemIds.filter(g => g && g > 0);
      if (validGems.length > 0) {
        attrs['data-wotlkdb-gems'] = validGems.join(':');
      }
    }

    if (randomProperty && randomProperty !== 0) {
      attrs['data-wotlkdb-rand'] = randomProperty.toString();
    }

    return attrs;
  };

  return (
    <a 
      href={buildWotLKDBUrl()}
      className={className}
      target="_blank"
      rel="noopener noreferrer"
      {...buildDataAttributes()}
    >
      {children || `Item ${itemId}`}
    </a>
  );
}