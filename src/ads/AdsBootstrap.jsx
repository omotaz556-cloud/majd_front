import { useEffect } from 'react';
import Ads from './Ads';
import { adsConfig, loadAdsConfig } from './adsConfig';
import { adsLog } from './adsLogger';

/**
 * ====== AdsBootstrap ======
 *
 * بيتحط مرة واحدة في جذر التطبيق (main.jsx). عند إقلاع التطبيق:
 *   - بيجيب الإعدادات الفعلية من الباك إند (GET /api/ads/config)
 *   - بيتحقق من المتغيرات الأساسية
 *   - بيهيّئ المزوّد (Google Ad Manager أو Mock حسب ADS_PROVIDER)
 *   - بيطبع لوجات مفيدة
 *   - لو ADS_ENABLED=false، بيفشل بأمان (graceful) من غير أي خطأ في الواجهة
 *
 * مبيرندرش أي UI - عنصر "صامت" غرضه بس تشغيل التهيئة مرة واحدة.
 */
function validateConfig() {
  const problems = [];

  if (adsConfig.enabled && adsConfig.provider === 'google-ad-manager') {
    if (!adsConfig.google.networkCode) problems.push('GOOGLE_AD_MANAGER_NETWORK_CODE is missing');
    if (!adsConfig.google.publisherId) problems.push('GOOGLE_PUBLISHER_ID is missing');
  }

  if (problems.length) {
    adsLog.warn('Ads config validation found issues (continuing with placeholders)', { problems });
  }

  return problems;
}

export default function AdsBootstrap() {
  useEffect(() => {
    let cancelled = false;

    loadAdsConfig().then(() => {
      if (cancelled) return;

      if (!adsConfig.enabled) {
        adsLog.info('AdsBootstrap: ads are disabled, nothing to initialize');
        return;
      }

      validateConfig();
      adsLog.info('AdsBootstrap: starting ads initialization', {
        provider: adsConfig.provider,
        testMode: adsConfig.testMode,
      });

      Ads.initialize();
    });

    return () => {
      cancelled = true;
      Ads.destroy();
    };
  }, []);

  return null;
}
