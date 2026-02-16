// frontend/src/components/ItemTooltip.tsx

import { useEffect } from 'react';

interface ItemTooltipProps {
  itemId: number;
  enchantItemId?: number;
  gemItemIds?: number[];
  prismaticItemId?: number;
  randomProperty?: number;
  children?: React.ReactNode;
  className?: string;
}

/**
 * ✅ COMPONENTE FINAL - USA ITEM IDS RESUELTOS
 */
export function ItemTooltip({ 
  itemId, 
  enchantItemId, 
  gemItemIds = [],
  prismaticItemId,
  randomProperty,
  children}: ItemTooltipProps) {
  
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
  }, [itemId, enchantItemId, gemItemIds, prismaticItemId, randomProperty]);

  /**
   * ✅ CONSTRUCCIÓN DE URL CORRECTA
   */
  const buildURL = (): string => {
    const params: string[] = [`item=${itemId}`];
    
    // Enchant permanente
    if (enchantItemId) {
      params.push(`ench=${enchantItemId}`);
    }
    
    // Gemas (filtrar nulls)
    const validGems = gemItemIds.filter(id => id > 0);
    if (validGems.length > 0) {
      params.push(`gems=${validGems.join(':')}`);
    }
    
    // Prismatic gem
    if (prismaticItemId) {
      params.push(`prismatic=${prismaticItemId}`);
    }
    
    if (randomProperty) {
      params.push(`rand=${randomProperty}`);
    }

    return `https://wotlkdb.com/?${params.join('&')}`;
  };

  return (
    <a 
      href={buildURL()}
      data-wowhead={`item=${itemId}`}
      rel="noopener noreferrer"
    >
      {children}
    </a>
  );
}