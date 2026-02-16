// frontend/src/components/EnchantmentTooltip.tsx

import { useEffect } from 'react';
import { wotlkdbService } from '../services/wotlkdb.service';

interface EnchantmentTooltipProps {
  enchantmentId: number;
  type?: 'gem' | 'enchant' | 'prismatic';
  children?: React.ReactNode;
  className?: string;
}

/**
 * ✅ COMPONENTE PARA TOOLTIPS DE ENCHANTMENTS/GEMAS
 * 
 * Usa enchantment IDs directamente (no item IDs)
 * WotLKDB renderiza el tooltip automáticamente con data-wotlkdb="enchantment"
 */
export function EnchantmentTooltip({ 
  enchantmentId, 
  type = 'enchant',
  children,
  className = ''
}: EnchantmentTooltipProps) {
  
  useEffect(() => {
    wotlkdbService.injectTooltipScript()
      .then(() => {
        setTimeout(() => {
          wotlkdbService.refreshTooltips();
        }, 100);
      })
      .catch((err: Error) => console.error('❌ [EnchantmentTooltip] Script failed:', err));
  }, [enchantmentId]);

  /**
   * ✅ URL para enchantments/gemas
   * Formato: https://wotlkdb.com/?enchantment=3539
   */
  const buildEnchantmentURL = (): string => {
    return `https://wotlkdb.com/?enchantment=${enchantmentId}`;
  };

  return (
    <a 
      href={buildEnchantmentURL()}
      className={className}
      target="_blank"
      rel="noopener noreferrer"
      // ✅ CRÍTICO: data-wotlkdb para enchantments
      data-wotlkdb="enchantment"
      data-wotlkdb-id={enchantmentId}
      data-wotlkdb-domain="es"
    >
      {children || `Enchantment ${enchantmentId}`}
    </a>
  );
}