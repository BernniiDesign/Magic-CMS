// frontend/src/components/EnchantmentTooltip.tsx

import { useEffect } from 'react';
import { wotlkdbService } from '../services/wotlkdb.service';

interface EnchantmentTooltipProps {
  enchantmentId: number;
  type?: 'gem' | 'enchant' | 'prismatic';
  children?: React.ReactNode;
  className?: string;
}

export function EnchantmentTooltip({ 
  enchantmentId, 
  type = 'enchant',
  children,
  className = ''
}: EnchantmentTooltipProps) {
  
  useEffect(() => {
    // ✅ Inyectar script al montar (si no está ya)
    wotlkdbService.injectTooltipScript()
      .then(() => {
        // ✅ Refrescar tooltips después de 100ms
        setTimeout(() => {
          wotlkdbService.refreshTooltips();
        }, 100);
      })
      .catch(err => console.error('❌ Tooltip script failed:', err));
  }, [enchantmentId]);

  const buildEnchantmentURL = (): string => {
    // ✅ URL correcta según tipo
    if (type === 'gem' || type === 'prismatic') {
      return `https://wotlkdb.com/?enchantment=${enchantmentId}`;
    }
    return `https://wotlkdb.com/?enchantment=${enchantmentId}`;
  };

  return (
    <a 
      href={buildEnchantmentURL()}
      className={className}
      target="_blank"
      rel="noopener noreferrer"
      // ✅ CRÍTICO: Atributos data-wotlkdb para tooltips
      data-wotlkdb="enchantment"
      data-wotlkdb-id={enchantmentId}
      data-wotlkdb-domain="es"  // ✅ Forzar dominio español
    >
      {children || `Enchantment ${enchantmentId}`}
    </a>
  );
}