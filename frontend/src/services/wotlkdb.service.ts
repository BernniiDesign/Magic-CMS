// frontend/src/services/wotlkdb.service.ts

interface WotLKDBConfig {
  baseUrl: string;
  locale: 'es' | 'en' | 'de' | 'fr' | 'ru';
  cacheTTL: number;
}

interface ItemData {
  id: number;
  name: string;
  quality: number;
  icon: string;
  gems: number[];
  enchantments: {
    id: number;
    slot: number;
  }[];
  randomProperties?: number;
}

interface CachedItem {
  id: number;
  data: ItemData;
  timestamp: number;
}

// Extender Window para incluir wotlkdb_tooltips
declare global {
  interface Window {
    wotlkdb_tooltips?: {
      config: {
        locale: string;
      };
    };
  }
}

class WotLKDBService {
  private config: WotLKDBConfig = {
    baseUrl: 'https://wotlkdb.com',
    locale: 'es',
    cacheTTL: 3600
  };

  /**
   * Inyectar script de tooltips con fallback
   */
  injectTooltipScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.wotlkdb_tooltips) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    
    // Usar script local en desarrollo
    script.src = import.meta.env.DEV 
      ? '/wotlkdb/power.js'  // Archivo local
      : `${this.config.baseUrl}/static/widgets/power.js`;
    
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      if (window.wotlkdb_tooltips) {
        window.wotlkdb_tooltips.config.locale = this.config.locale;
      }
      resolve();
    };
    
    script.onerror = () => {
      console.warn('⚠️ [WotLKDB] Tooltips unavailable');
      resolve(); // No bloquear la app
    };
    
    document.head.appendChild(script);
  });
}

  /**
   * Obtener datos de item
   */
  async getItemData(itemId: number): Promise<ItemData | null> {
    try {
      const cached = await this.getCachedItem(itemId);
      if (cached) return cached;

      const response = await fetch(`${this.config.baseUrl}/?item=${itemId}`, {
        headers: {
          'Accept': 'text/html'
        }
      });

      if (!response.ok) return null;

      const html = await response.text();
      const itemData = this.parseItemFromHTML(html, itemId);
      
      if (itemData) {
        await this.cacheItem(itemId, itemData);
      }
      
      return itemData;
    } catch (error) {
      console.error('❌ [WotLKDB] Error fetching item:', itemId, error);
      return null;
    }
  }

  private parseItemFromHTML(html: string, itemId: number): ItemData | null {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const scriptTags = doc.querySelectorAll('script');
    let itemData: ItemData | null = null;

    scriptTags.forEach(script => {
      const content = script.textContent || '';
      const match = content.match(/g_items\[(\d+)\]\s*=\s*({[^}]+})/);
      if (match && parseInt(match[1]) === itemId) {
        try {
          itemData = JSON.parse(match[2]);
        } catch (e) {
          console.error('❌ Failed to parse item data');
        }
      }
    });

    return itemData;
  }

  private async cacheItem(itemId: number, data: ItemData): Promise<void> {
    try {
      const db = await this.openDB();
      const tx = db.transaction('items', 'readwrite');
      const store = tx.objectStore('items');
      
      const cacheEntry: CachedItem = {
        id: itemId,
        data,
        timestamp: Date.now()
      };
      
      store.put(cacheEntry);
      
      // Esperar a que la transacción se complete
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (error) {
      console.error('❌ [WotLKDB] Error caching item:', error);
    }
  }

  private async getCachedItem(itemId: number): Promise<ItemData | null> {
    try {
      const db = await this.openDB();
      const tx = db.transaction('items', 'readonly');
      const store = tx.objectStore('items');
      
      // Obtener el resultado correctamente tipado
      const result = await new Promise<CachedItem | undefined>((resolve, reject) => {
        const request = store.get(itemId);
        request.onsuccess = () => resolve(request.result as CachedItem | undefined);
        request.onerror = () => reject(request.error);
      });
      
      if (!result) return null;
      
      // Verificar TTL
      const age = (Date.now() - result.timestamp) / 1000;
      if (age > this.config.cacheTTL) {
        // Cache expirado, eliminar
        await this.deleteCachedItem(itemId);
        return null;
      }
      
      return result.data;
    } catch (error) {
      console.error('❌ [WotLKDB] Error getting cached item:', error);
      return null;
    }
  }

  private async deleteCachedItem(itemId: number): Promise<void> {
    try {
      const db = await this.openDB();
      const tx = db.transaction('items', 'readwrite');
      const store = tx.objectStore('items');
      
      store.delete(itemId);
      
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (error) {
      console.error('❌ [WotLKDB] Error deleting cached item:', error);
    }
  }

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('WotLKDB_Cache', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('items')) {
          db.createObjectStore('items', { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Limpiar cache completo (útil para mantenimiento)
   */
  async clearCache(): Promise<void> {
    try {
      const db = await this.openDB();
      const tx = db.transaction('items', 'readwrite');
      const store = tx.objectStore('items');
      
      store.clear();
      
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      
      console.log('✅ [WotLKDB] Cache cleared successfully');
    } catch (error) {
      console.error('❌ [WotLKDB] Error clearing cache:', error);
    }
  }

  /**
   * Obtener estadísticas del cache
   */
  async getCacheStats(): Promise<{ total: number; expired: number }> {
    try {
      const db = await this.openDB();
      const tx = db.transaction('items', 'readonly');
      const store = tx.objectStore('items');
      
      const allItems = await new Promise<CachedItem[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result as CachedItem[]);
        request.onerror = () => reject(request.error);
      });
      
      const now = Date.now();
      const expired = allItems.filter(item => {
        const age = (now - item.timestamp) / 1000;
        return age > this.config.cacheTTL;
      }).length;
      
      return {
        total: allItems.length,
        expired
      };
    } catch (error) {
      console.error('❌ [WotLKDB] Error getting cache stats:', error);
      return { total: 0, expired: 0 };
    }
  }
}

export const wotlkdbService = new WotLKDBService();