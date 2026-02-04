// backend/src/services/wotlkdb-resolver.service.ts

import axios from 'axios';
import * as cheerio from 'cheerio';

interface EnchantmentResolution {
  enchantmentId: number;
  itemId: number | null;
  name: string;
  type: 'gem' | 'enchant' | 'unknown';
}

/**
 * Servicio para resolver Enchantment IDs a Item IDs usando WotLKDB
 * 
 * Problema: TrinityCore guarda enchantment IDs (de spell_item_enchantment)
 * Solución: Hacer scraping a WotLKDB para obtener el item real
 */
class WotLKDBResolverService {
  private cache: Map<number, EnchantmentResolution> = new Map();
  private baseUrl = 'https://wotlkdb.com';

  /**
   * Resolver un enchantment ID a item ID
   * 
   * @param enchantmentId - ID del enchantment (ej: 3539)
   * @returns Item ID y metadata
   */
  async resolveEnchantment(enchantmentId: number): Promise<EnchantmentResolution> {
    // Verificar caché
    if (this.cache.has(enchantmentId)) {
      console.log(`✅ [WotLKDB] Cache hit para enchantment ${enchantmentId}`);
      return this.cache.get(enchantmentId)!;
    }

    console.log(`🔍 [WotLKDB] Resolviendo enchantment ${enchantmentId}...`);

    try {
      // Hacer request a WotLKDB
      const url = `${this.baseUrl}/?enchantment=${enchantmentId}`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html',
        },
        timeout: 5000,
      });

      // Parsear HTML con Cheerio
      const $ = cheerio.load(response.data);

      // Buscar el link del item
      // Formato: <a href="?item=40136">Balanced Dreadstone</a>
      let itemId: number | null = null;
      let name = '';
      let type: 'gem' | 'enchant' | 'unknown' = 'unknown';

      // Buscar en el contenido principal
      $('a[href*="?item="]').each((_, element) => {
        const href = $(element).attr('href');
        const text = $(element).text().trim();
        
        if (href && text) {
          const match = href.match(/\?item=(\d+)/);
          if (match && !itemId) {
            itemId = parseInt(match[1], 10);
            name = text;
            
            // Determinar tipo según contexto
            // Las gemas suelen tener quality class (q0-q7)
            const className = $(element).attr('class') || '';
            if (className.includes('q')) {
              type = 'gem';
            } else {
              type = 'enchant';
            }
            
            console.log(`✅ [WotLKDB] Encontrado: ${name} (Item ID: ${itemId})`);
          }
        }
      });

      // Si no encontramos nada, buscar en scripts/datos JSON embebidos
      if (!itemId) {
        // WotLKDB a veces tiene datos en scripts tipo: g_items[40136] = {...}
        const scriptContent = $('script').text();
        const itemMatch = scriptContent.match(/g_items\[(\d+)\]/);
        
        if (itemMatch) {
          itemId = parseInt(itemMatch[1], 10);
          type = 'gem'; // Usualmente son gemas
          console.log(`✅ [WotLKDB] Encontrado en script: Item ID ${itemId}`);
        }
      }

      const result: EnchantmentResolution = {
        enchantmentId,
        itemId,
        name: name || `Enchantment ${enchantmentId}`,
        type,
      };

      // Guardar en caché
      this.cache.set(enchantmentId, result);

      return result;

    } catch (error: any) {
      console.error(`❌ [WotLKDB] Error resolviendo enchantment ${enchantmentId}:`, error.message);
      
      // Retornar resultado vacío
      const result: EnchantmentResolution = {
        enchantmentId,
        itemId: null,
        name: `Enchantment ${enchantmentId}`,
        type: 'unknown',
      };
      
      return result;
    }
  }

  /**
   * Resolver múltiples enchantments en paralelo
   */
  async resolveMultiple(enchantmentIds: number[]): Promise<EnchantmentResolution[]> {
    const uniqueIds = [...new Set(enchantmentIds)].filter(id => id > 0);
    
    console.log(`🔍 [WotLKDB] Resolviendo ${uniqueIds.length} enchantments...`);
    
    const promises = uniqueIds.map(id => this.resolveEnchantment(id));
    const results = await Promise.all(promises);
    
    return results;
  }

  /**
   * Limpiar caché (útil para testing)
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ [WotLKDB] Caché limpiado');
  }

  /**
   * Obtener estadísticas del caché
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([id, data]) => ({
        enchantmentId: id,
        itemId: data.itemId,
        name: data.name,
      })),
    };
  }
}

export default new WotLKDBResolverService();