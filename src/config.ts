/** Fáza 1: vlastné account_id sa nastavuje cez .env.local (VITE_ACCOUNT_ID). */
export const ACCOUNT_ID: string = import.meta.env.VITE_ACCOUNT_ID ?? ''

export const OPENDOTA_BASE = 'https://api.opendota.com/api'
export const STEAM_CDN = 'https://cdn.cloudflare.steamstatic.com'
