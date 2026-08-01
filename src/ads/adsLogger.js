import { adsConfig } from './adsConfig';

/**
 * ====== Ads Logger (Frontend) ======
 * لوجات مبنيّة بادئة بـ [Ads] - رسائل debug بس بتظهر لو adsConfig.debug=true
 * (القيمة دي جايه من ADS_DEBUG في .env بتاع الباك إند، راجع adsConfig.js).
 */
export const adsLog = {
  info(event, meta = {}) {
    console.log(`[Ads] ${event}`, meta);
  },
  debug(event, meta = {}) {
    if (!adsConfig.debug) return;
    console.log(`[Ads:debug] ${event}`, meta);
  },
  warn(event, meta = {}) {
    console.warn(`[Ads] ${event}`, meta);
  },
  error(event, meta = {}) {
    console.error(`[Ads] ${event}`, meta);
  },
};
