// frontend/src/services/wotlkdb.service.ts

interface WotLKDBConfig {
  baseUrl: string;
  locale: string;
  cacheTTL: number;
}

class WotLKDBService {
  private config: WotLKDBConfig = {
    baseUrl: 'https://wotlkdb.com',
    locale: 'es',
    cacheTTL: 3600
  };

  private scriptInjected = false;

  async injectTooltipScript(): Promise<void> {
    return new Promise((resolve) => {  // ✅ Quitar reject si no se usa
      if (this.scriptInjected) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      
      script.src = import.meta.env.DEV 
        ? `/wotlkdb/power.js?locale=${this.config.locale}`
        : `${this.config.baseUrl}/static/widgets/power.js?locale=${this.config.locale}`;
      
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        console.log('✅ [WotLKDB] Tooltips cargados en español');
        
        if (typeof window.$WowheadPower !== 'undefined') {
          this.configureTooltips();
        }
        
        this.scriptInjected = true;
        resolve();
      };
      
      script.onerror = (error) => {
        console.error('❌ [WotLKDB] Error cargando tooltips:', error);
        resolve(); // ✅ No rechazar, solo resolver
      };
      
      document.head.appendChild(script);
    });
  }

  private configureTooltips(): void {
    if (typeof window.$WowheadPower !== 'undefined') {
      window.$WowheadPower.init();
    }
    
    if (!window.wotlkdb_tooltips) {
      window.wotlkdb_tooltips = {
        config: { locale: this.config.locale }
      };
    } else {
      window.wotlkdb_tooltips.config.locale = this.config.locale;
    }

    console.log('✅ [WotLKDB] Tooltips configurados:', {
      locale: this.config.locale,
      baseUrl: this.config.baseUrl
    });
  }

  /**
   * ✅ NUEVO: Refrescar tooltips después de cambios dinámicos en el DOM
   */
  refreshTooltips(): void {
    if (typeof window.$WowheadPower !== 'undefined' && window.$WowheadPower.refreshLinks) {
      window.$WowheadPower.refreshLinks();
      console.log('🔄 [WotLKDB] Tooltips refrescados');
    } else {
      console.warn('⚠️ [WotLKDB] $WowheadPower no disponible para refresh');
    }
  }

  // ... resto del código
}

export const wotlkdbService = new WotLKDBService();

declare global {
  interface Window {
    $WowheadPower?: {
      init: () => void;
      refreshLinks: () => void;
    };
    wotlkdb_tooltips?: {
      config: {
        locale: string;
      };
    };
  }
}