// frontend/src/components/ItemTooltip.tsx

import { useEffect } from 'react';

interface ItemTooltipProps {
  itemId: number;
  type?: 'item' | 'spell' | 'enchantment';  // ← NUEVO: tipo de tooltip
  
  // Props específicas para items equipados (solo cuando type='item')
  enchantItemId?: number;
  gemItemIds?: number[];
  prismaticItemId?: number;
  randomProperty?: number;
  
  children?: React.ReactNode;
  className?: string;
}

/**
 * ✅ COMPONENTE FINAL - USA ITEM IDS RESUELTOS
 * Soporta items, spells y enchantments de WotLKDB
 */
export function ItemTooltip({ 
  itemId,
  type = 'item',  // ← por defecto es item
  enchantItemId, 
  gemItemIds = [],
  prismaticItemId,
  randomProperty,
  children,
  className
}: ItemTooltipProps) {
  
  useEffect(() => {
    // Inyectar script de WotLKDB
    if (!document.querySelector('script[src*="wotlkdb.com"]')) {
      const script = document.createElement('script');
      script.src = 'https://wotlkdb.com/static/widgets/power.js?locale=es';
      script.async = true;
      document.head.appendChild(script);
    }

    // Refrescar tooltips después de cargar
    const timer = setTimeout(() => {
      if ((window as any).$WowheadPower) {
        (window as any).$WowheadPower.refreshLinks();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [itemId, type, enchantItemId, gemItemIds, prismaticItemId, randomProperty]);

  /**
   * ✅ CONSTRUCCIÓN DE URL CORRECTA
   * Soporta:
   *   - ?item=12345
   *   - ?spell=48441
   *   - ?enchantment=3539
   */
  const buildURL = (): string => {
    // Para spell y enchantment, URL simple
    if (type === 'spell') {
      return `https://wotlkdb.com/?spell=${itemId}`;
    }
    if (type === 'enchantment') {
      return `https://wotlkdb.com/?enchantment=${itemId}`;
    }

    // Para items, soporta mods (enchant, gems, etc)
    const params: string[] = [`item=${itemId}`];
    
    if (enchantItemId) {
      params.push(`ench=${enchantItemId}`);
    }
    
    const validGems = gemItemIds.filter(id => id > 0);
    if (validGems.length > 0) {
      params.push(`gems=${validGems.join(':')}`);
    }
    
    if (prismaticItemId) {
      params.push(`prismatic=${prismaticItemId}`);
    }
    
    if (randomProperty) {
      params.push(`rand=${randomProperty}`);
    }

    return `https://wotlkdb.com/?${params.join('&')}`;
  };

  /**
   * data-wowhead attribute para activar el tooltip
   */
  const getDataAttr = (): string => {
    if (type === 'spell') return `spell=${itemId}`;
    if (type === 'enchantment') return `enchantment=${itemId}`;
    return `item=${itemId}`;
  };

  return (
    <a 
      href={buildURL()}
      data-wowhead={getDataAttr()}
      className={className}
      rel="noopener noreferrer"
    >
      {children}
    </a>
  );
}