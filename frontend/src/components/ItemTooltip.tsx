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
  children,
  className = ''
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
  }, [itemId, enchantItemId, gemItemIds, prismaticItemId, randomProperty]);

  /**
   * ✅ CONSTRUCCIÓN DE URL CORRECTA
   */
  const buildURL = (): string => {
    const params: string[] = [`item=${itemId}`];
    
    if (enchantItemId && enchantItemId > 0) {
      params.push(`ench=${enchantItemId}`);
    }
    
    const validGems = gemItemIds.filter(g => g && g > 0);
    if (validGems.length > 0) {
      params.push(`gems=${validGems.join(':')}`);
    }

    if (prismaticItemId && prismaticItemId > 0) {
      // En WotLKDB, prismatic va como gem extra
      if (validGems.length > 0) {
        params[params.length - 1] = `gems=${[...validGems, prismaticItemId].join(':')}`;
      } else {
        params.push(`gems=${prismaticItemId}`);
      }
    }
    
    if (randomProperty && randomProperty !== 0) {
      params.push(`rand=${randomProperty}`);
    }

    return `https://wotlkdb.com/?${params.join('&')}`;
  };

  return (
    <a 
      href={buildURL()}
      className={className}
      target="_blank"
      rel="noopener noreferrer"
      data-wowhead={`item=${itemId}${enchantItemId ? `&ench=${enchantItemId}` : ''}${gemItemIds.length ? `&gems=${gemItemIds.join(':')}` : ''}`}
    >
      {children || `Item ${itemId}`}
    </a>
  );
}