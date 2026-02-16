// frontend/src/services/wotlkdb.service.ts

/**
 * Servicio para manejar tooltips de WotLKDB en el frontend
 */
class WotLKDBService {
  private scriptInjected = false;
  private scriptUrl = 'https://wotlkdb.com/static/widgets/power.js';

  /**
   * Inyectar el script de tooltips de WotLKDB
   */
  async injectTooltipScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Si ya está inyectado, resolver inmediatamente
      if (this.scriptInjected) {
        console.log('✅ [WotLKDB] Script ya está cargado');
        resolve();
        return;
      }

      // Verificar si el script ya existe en el DOM
      const existingScript = document.querySelector(`script[src="${this.scriptUrl}"]`);
      if (existingScript) {
        this.scriptInjected = true;
        console.log('✅ [WotLKDB] Script ya existe en el DOM');
        resolve();
        return;
      }

      console.log('🔄 [WotLKDB] Inyectando script de tooltips...');

      // Crear y agregar el script
      const script = document.createElement('script');
      script.src = this.scriptUrl;
      script.async = true;
      script.charset = 'utf-8';

      script.onload = () => {
        this.scriptInjected = true;
        console.log('✅ [WotLKDB] Script cargado exitosamente');
        resolve();
      };

      script.onerror = (error) => {
        console.error('❌ [WotLKDB] Error cargando script:', error);
        reject(new Error('Failed to load WotLKDB tooltip script'));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Refrescar tooltips (llamar después de que nuevos elementos con data-wotlkdb aparezcan)
   */
  refreshTooltips(): void {
    if (typeof window !== 'undefined' && (window as any).$WowheadPower) {
      try {
        (window as any).$WowheadPower.refreshLinks();
        console.log('✅ [WotLKDB] Tooltips refrescados');
      } catch (error) {
        console.warn('⚠️ [WotLKDB] Error refrescando tooltips:', error);
      }
    } else {
      console.warn('⚠️ [WotLKDB] $WowheadPower no disponible aún');
    }
  }

  /**
   * Limpiar script (útil para testing)
   */
  cleanup(): void {
    const script = document.querySelector(`script[src="${this.scriptUrl}"]`);
    if (script) {
      script.remove();
      this.scriptInjected = false;
      console.log('🗑️ [WotLKDB] Script removido');
    }
  }
}

export const wotlkdbService = new WotLKDBService();