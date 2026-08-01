import client from '../api/client';

/**
 * ====== Ads Config (Frontend) ======
 *
 * بنفس فلسفة config.js الموجودة أصلاً في المشروع (GET /api/config): الفرونت
 * إند مايحتفظش بنسخته الخاصة من معرّفات Google (Publisher ID, Network Code,
 * Ad Unit IDs) في .env بتاعه - ده هيعني مصدرين للحقيقة لازم يتزامنوا يدوياً.
 * بدل كده، بيجيبهم مرة واحدة من الباك إند (GET /api/ads/config) عند
 * الإقلاع، واللي بيقرأهم هو من env vars بتاعته (راجع backend/src/modules/
 * ads/ads.config.js) - فمكان التحكم الوحيد الحقيقي يفضل .env بتاع الباك إند.
 *
 * لحد ما يتم جلب الإعدادات، بيتم استخدام قيم افتراضية آمنة (mock/معطّل)
 * عشان التطبيق ميحاولش يهيّئ إعلانات حقيقية بأرقام فاضية.
 */

export const adsConfig = {
  enabled: false,
  provider: 'mock',
  debug: false,
  testMode: true,
  google: {
    networkCode: 'TEST_NETWORK',
    publisherId: 'pub-test',
    appId: 'test-app',
    bannerAdUnit: 'test-banner',
    interstitialAdUnit: 'test-interstitial',
    rewardedAdUnit: 'test-rewarded',
  },
  // Cooldown/frequency limiter للإنترستيشيال (بالثواني)
  interstitialCooldownSeconds: 60,
  _loaded: false,
};

let loadPromise = null;

/**
 * ====== loadAdsConfig ======
 * بتجيب الإعدادات الفعلية من الباك إند وتحدّث adsConfig في مكانها (نفس
 * الـ object reference) عشان أي كود عامل import للـ adsConfig يشوف القيم
 * المحدثة تلقائياً من غير حاجة لإعادة الاستيراد. بتتنادى مرة واحدة بس
 * (نتيجة الاستدعاءات اللي بعد كده بترجع نفس الـ promise).
 */
export function loadAdsConfig() {
  if (loadPromise) return loadPromise;

  loadPromise = client
    .get('/ads/config')
    .then(({ data }) => {
      adsConfig.enabled = !!data.enabled;
      adsConfig.provider = (data.provider || 'mock').trim().toLowerCase();
      adsConfig.debug = !!data.debug;
      adsConfig.testMode = !!data.testMode;
      if (data.google) {
        adsConfig.google.networkCode = data.google.networkCode || adsConfig.google.networkCode;
        adsConfig.google.publisherId = data.google.publisherId || adsConfig.google.publisherId;
        adsConfig.google.bannerAdUnit = data.google.bannerAdUnit || adsConfig.google.bannerAdUnit;
        adsConfig.google.interstitialAdUnit =
          data.google.interstitialAdUnit || adsConfig.google.interstitialAdUnit;
        adsConfig.google.rewardedAdUnit = data.google.rewardedAdUnit || adsConfig.google.rewardedAdUnit;
      }
      adsConfig._loaded = true;
      return adsConfig;
    })
    .catch((err) => {
      console.warn('[Ads] Failed to load ads config from backend, ads stay disabled', err.message);
      adsConfig.enabled = false;
      adsConfig._loaded = true;
      return adsConfig;
    });

  return loadPromise;
}
