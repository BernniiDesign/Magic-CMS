// frontend/src/config/wotlkdb.config.ts

export const WOTLKDB_CONFIG = {
  baseUrl: 'https://wotlkdb.com',
  locale: 'es' as const,
  cacheTTL: 3600,
  
  qualityColors: {
    0: '#9d9d9d', // Poor
    1: '#ffffff', // Common
    2: '#1eff00', // Uncommon
    3: '#0070dd', // Rare
    4: '#a335ee', // Epic
    5: '#ff8000', // Legendary
    6: '#e6cc80', // Artifact
    7: '#00ccff', // Heirloom
  } as const,
  
  // Items comunes a pre-cargar (opcional)
  prefetchItems: [
    50736, // Heaven's Fall, Kryss of a Thousand Lies
  ] as const,
} as const;

export type WotLKDBLocale = typeof WOTLKDB_CONFIG.locale;
export type ItemQuality = keyof typeof WOTLKDB_CONFIG.qualityColors;