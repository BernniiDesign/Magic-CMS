// frontend/src/services/itemCache.service.ts
interface ItemData {
  entry: number;
  [key: string]: any;
}

class ItemCacheService {
  private db: IDBDatabase | null = null;
  
  async init() {
    const request = indexedDB.open('WoWItemCache', 1);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      db.createObjectStore('items', { keyPath: 'entry' });
    };
    this.db = await new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result);
    });
  }
  
  async getItem(entry: number): Promise<ItemData | null> {
    // Implementación con TTL de 24h
    if (!this.db) return null;
    const transaction = this.db.transaction('items', 'readonly');
    const store = transaction.objectStore('items');
    return new Promise((resolve) => {
      const request = store.get(entry);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  }
}