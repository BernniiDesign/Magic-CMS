// backend/src/services/wotlkdb-resolver.service.ts

import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';

interface CacheEntry {
  itemId: number | null;
  name: string;
  type: 'gem' | 'enchant' | 'unknown';
  timestamp: number;
  ttl: number;
}

interface EnchantmentResolution {
  enchantmentId: number;
  itemId: number | null;
  name: string;
  type: 'gem' | 'enchant' | 'unknown';
}

interface QueueItem {
  enchantmentId: number;
  resolve: (value: EnchantmentResolution) => void;
  reject: (reason: any) => void;
  retries: number;
}

class WotLKDBResolverService {
  private cache: Map<number, CacheEntry> = new Map();
  private inFlightRequests: Map<number, Promise<EnchantmentResolution>> = new Map();
  private requestQueue: QueueItem[] = [];
  private isProcessingQueue = false;
  
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 500;
  private readonly MAX_CONCURRENT = 3;
  private currentConcurrent = 0;
  
  private readonly USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
  ];
  
  private readonly CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
  private readonly MAX_RETRIES = 3;
  private readonly TIMEOUT = 10000;
  
  private axiosInstance: AxiosInstance;
  private bannedUntil: number = 0;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: 'https://wotlkdb.com',
      timeout: this.TIMEOUT,
      headers: {
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    this.loadPersistentCache();
  }

  private async loadPersistentCache(): Promise<void> {
    try {
      const { authDB } = await import('../config/database');
      
      await authDB.execute(`
        CREATE TABLE IF NOT EXISTS wotlkdb_cache (
          enchantment_id INT PRIMARY KEY,
          item_id INT,
          name VARCHAR(255),
          type ENUM('gem', 'enchant', 'unknown'),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_updated (updated_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      const [rows]: any = await authDB.execute(`
        SELECT enchantment_id, item_id, name, type, 
               UNIX_TIMESTAMP(updated_at) * 1000 as timestamp
        FROM wotlkdb_cache 
        WHERE updated_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
      `);

      rows.forEach((row: any) => {
        this.cache.set(row.enchantment_id, {
          itemId: row.item_id,
          name: row.name,
          type: row.type,
          timestamp: row.timestamp,
          ttl: this.CACHE_TTL,
        });
      });

      console.log(`✅ [WotLKDB] Caché persistente cargado: ${rows.length} entradas`);
    } catch (error) {
      console.error('❌ [WotLKDB] Error cargando caché persistente:', error);
    }
  }

  /**
   * ✅ FIX: Método que faltaba - Obtener desde caché persistente
   */
  private async getFromPersistentCache(
    enchantmentId: number
  ): Promise<EnchantmentResolution | null> {
    try {
      const { authDB } = await import('../config/database');
      
      const [rows]: any = await authDB.execute(`
        SELECT enchantment_id, item_id, name, type
        FROM wotlkdb_cache
        WHERE enchantment_id = ?
          AND updated_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
        LIMIT 1
      `, [enchantmentId]);

      if (rows.length === 0) {
        return null;
      }

      const row = rows[0];
      return {
        enchantmentId: row.enchantment_id,
        itemId: row.item_id,
        name: row.name,
        type: row.type,
      };
    } catch (error) {
      console.error('❌ [WotLKDB] Error leyendo caché persistente:', error);
      return null;
    }
  }

  private async saveToPersistentCache(
    enchantmentId: number,
    resolution: EnchantmentResolution
  ): Promise<void> {
    try {
      const { authDB } = await import('../config/database');
      
      await authDB.execute(`
        INSERT INTO wotlkdb_cache (enchantment_id, item_id, name, type)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          item_id = VALUES(item_id),
          name = VALUES(name),
          type = VALUES(type),
          updated_at = CURRENT_TIMESTAMP
      `, [
        enchantmentId,
        resolution.itemId,
        resolution.name,
        resolution.type,
      ]);
    } catch (error) {
      console.error('❌ [WotLKDB] Error guardando en caché:', error);
    }
  }

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      const waitTime = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  private getRandomUserAgent(): string {
    return this.USER_AGENTS[Math.floor(Math.random() * this.USER_AGENTS.length)];
  }

  private checkBanStatus(): void {
    if (Date.now() < this.bannedUntil) {
      const remainingMs = this.bannedUntil - Date.now();
      throw new Error(`WotLKDB temporarily banned. Retry in ${Math.ceil(remainingMs / 1000)}s`);
    }
  }

  async resolveEnchantment(enchantmentId: number): Promise<EnchantmentResolution> {
    if (!enchantmentId || enchantmentId < 1) {
      return {
        enchantmentId,
        itemId: null,
        name: `Unknown`,
        type: 'unknown',
      };
    }

    // 1. Check memory cache
    const cached = this.cache.get(enchantmentId);
    if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
      // ✅ CRÍTICO: Re-scrape si itemId es null
      if (cached.itemId === null) {
        console.warn(`⚠️ [WotLKDB] Cache tiene itemId=null para ${enchantmentId}, re-scraping...`);
        this.cache.delete(enchantmentId);
      } else {
        console.log(`✅ [WotLKDB] Cache HIT para enchantment ${enchantmentId} → Item ${cached.itemId}`);
        return {
          enchantmentId,
          itemId: cached.itemId,
          name: cached.name,
          type: cached.type,
        };
      }
    }

    // 2. Check DB cache (solo si no está en memoria o es inválido)
    const dbCached = await this.getFromPersistentCache(enchantmentId);
    if (dbCached && dbCached.itemId !== null) {
      // Hidratar memoria
      this.cache.set(enchantmentId, {
        itemId: dbCached.itemId,
        name: dbCached.name,
        type: dbCached.type,
        timestamp: Date.now(),
        ttl: this.CACHE_TTL,
      });
      return dbCached;
    }

    // 3. Queue scraping si no está en cache válido
    const inFlight = this.inFlightRequests.get(enchantmentId);
    if (inFlight) {
      console.log(`⏳ [WotLKDB] Request ya en proceso para ${enchantmentId}`);
      return inFlight;
    }

    const promise = new Promise<EnchantmentResolution>((resolve) => {
      this.requestQueue.push({
        enchantmentId,
        resolve,
        reject: () => {},
        retries: 0,
      });
    });

    this.inFlightRequests.set(enchantmentId, promise);
    
    if (!this.isProcessingQueue) {
      this.processQueue();
    }

    return promise;
  }

  private async processQueue(): Promise<void> {
    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      if (this.currentConcurrent >= this.MAX_CONCURRENT) {
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }

      const item = this.requestQueue.shift();
      if (!item) continue;

      this.currentConcurrent++;

      this.processSingleRequest(item).finally(() => {
        this.currentConcurrent--;
      });

      await this.waitForRateLimit();
    }

    this.isProcessingQueue = false;
  }

  private async processSingleRequest(item: QueueItem): Promise<void> {
    const { enchantmentId, resolve, retries } = item;

    try {
      this.checkBanStatus();

      console.log(`🔍 [WotLKDB] Scraping enchantment ${enchantmentId} (attempt ${retries + 1})`);

      const response = await this.axiosInstance.get(`/?enchantment=${enchantmentId}`, {
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Referer': 'https://wotlkdb.com/',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        },
      });

      if (response.status === 429 || response.data.includes('rate limit')) {
        this.bannedUntil = Date.now() + 60000;
        throw new Error('Rate limited by WotLKDB');
      }

      const $ = cheerio.load(response.data);

      let itemId: number | null = null;
      let name = '';
      let type: 'gem' | 'enchant' | 'unknown' = 'unknown';

      // ========== ESTRATEGIA 1: Links directos a items ==========
      $('a[href*="?item="]').each((_, element) => {
        const href = $(element).attr('href');
        const text = $(element).text().trim();
        
        if (href && text && !itemId) {
          const match = href.match(/\?item=(\d+)/);
          if (match) {
            itemId = parseInt(match[1], 10);
            name = text;
            
            const className = $(element).attr('class') || '';
            if (className.match(/\bq\d/)) {
              type = 'gem';
            } else {
              type = 'enchant';
            }
            
            console.log(`✅ [WotLKDB] Estrategia 1: ${enchantmentId} → Item ${itemId} (${name}) [${type}]`);
          }
        }
      });

      // ========== ESTRATEGIA 2: JavaScript g_items array ==========
      if (!itemId) {
        const scripts = $('script:not([src])').toArray();
        
        for (const script of scripts) {
          const scriptContent = $(script).html() || '';
          
          const itemMatch = scriptContent.match(/g_(?:items|gems)\[(\d+)\]/);
          
          if (itemMatch) {
            itemId = parseInt(itemMatch[1], 10);
            type = 'gem';
            
            const nameMatch = scriptContent.match(
              new RegExp(`"name_enus"\\s*:\\s*"([^"]+)"`)
            );
            name = nameMatch ? nameMatch[1] : `Gem ${itemId}`;
            
            console.log(`✅ [WotLKDB] Estrategia 2: ${enchantmentId} → Item ${itemId} (${name}) [JS]`);
            break;
          }
        }
      }

      // ========== ESTRATEGIA 3: Meta tags ==========
      if (!itemId) {
        const ogTitle = $('meta[property="og:title"]').attr('content');
        if (ogTitle) {
          const itemMatch = ogTitle.match(/Item\s+(\d+)/i);
          if (itemMatch) {
            itemId = parseInt(itemMatch[1], 10);
            name = ogTitle.split('-')[0].trim();
            type = 'enchant';
            
            console.log(`✅ [WotLKDB] Estrategia 3: ${enchantmentId} → Item ${itemId} (${name}) [Meta]`);
          }
        }
      }

      // ========== DEBUG: Guardar HTML si falló ==========
      if (!itemId && process.env.NODE_ENV === 'development') {
        console.error(`❌ [WotLKDB] No se pudo extraer itemId de enchantment ${enchantmentId}`);
        
        const fs = require('fs');
        const path = require('path');
        const debugPath = path.join(__dirname, '../../debug');
        
        if (!fs.existsSync(debugPath)) {
          fs.mkdirSync(debugPath, { recursive: true });
        }
        
        fs.writeFileSync(
          path.join(debugPath, `wotlkdb-${enchantmentId}.html`),
          response.data,
          'utf-8'
        );
        console.log(`📝 [WotLKDB] HTML guardado en debug/wotlkdb-${enchantmentId}.html`);
      }

      const result: EnchantmentResolution = {
        enchantmentId,
        itemId,
        name: name || `Enchantment ${enchantmentId}`,
        type,
      };

      // Guardar en cache
      this.cache.set(enchantmentId, {
        itemId,
        name: result.name,
        type,
        timestamp: Date.now(),
        ttl: itemId ? this.CACHE_TTL : 60000, // Cache corto si falló
      });

      await this.saveToPersistentCache(enchantmentId, result);

      this.inFlightRequests.delete(enchantmentId);
      resolve(result);

      console.log(`✅ [WotLKDB] Resuelto: ${enchantmentId} → Item ${itemId || 'NULL'}`);

    } catch (error: any) {
      console.error(`❌ [WotLKDB] Error resolviendo ${enchantmentId}:`, error.message);

      if (retries < this.MAX_RETRIES) {
        const backoff = Math.pow(2, retries) * 1000;
        console.log(`🔄 [WotLKDB] Retry ${retries + 1}/${this.MAX_RETRIES} en ${backoff}ms`);
        
        setTimeout(() => {
          this.requestQueue.unshift({
            ...item,
            retries: retries + 1,
          });
          
          if (!this.isProcessingQueue) {
            this.processQueue();
          }
        }, backoff);
      } else {
        const fallback: EnchantmentResolution = {
          enchantmentId,
          itemId: null,
          name: `Enchantment ${enchantmentId}`,
          type: 'unknown',
        };

        this.inFlightRequests.delete(enchantmentId);
        resolve(fallback);
      }
    }
  }

  async resolveMultiple(enchantmentIds: number[]): Promise<EnchantmentResolution[]> {
    const uniqueIds = [...new Set(enchantmentIds)].filter(id => id > 0);
    
    console.log(`🔍 [WotLKDB] Resolviendo batch de ${uniqueIds.length} enchantments`);
    
    const promises = uniqueIds.map(id => this.resolveEnchantment(id));
    const results = await Promise.allSettled(promises);
    
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          enchantmentId: uniqueIds[index],
          itemId: null,
          name: `Enchantment ${uniqueIds[index]}`,
          type: 'unknown' as const,
        };
      }
    });
  }

  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ [WotLKDB] Caché limpiado');
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      inFlight: this.inFlightRequests.size,
      queued: this.requestQueue.length,
      bannedUntil: this.bannedUntil > Date.now() 
        ? new Date(this.bannedUntil).toISOString() 
        : null,
    };
  }
}

export default new WotLKDBResolverService();