import AdsManager from './AdsManager';

/**
 * ====== Ads (Public Facade) ======
 *
 * ده الملف الوحيد اللي لازم أي لعبة أو صفحة تستورد منه. الدوال المتاحة:
 *
 *   Ads.initialize()
 *   Ads.showBanner(options)
 *   Ads.showInterstitial()
 *   Ads.showRewarded({ kind, context, adUnit? })
 *   Ads.destroy()
 *   Ads.isAvailable()
 *
 * showRewarded لازم ليها `kind` دايمًا - واحدة من:
 *   'resources' | 'double_reward' | 'daily_double' | 'hourly_gift' | 'speedup_construction'
 * و`context` حسب النوع:
 *   - resources             → { resource: 'gold' | 'wood' | 'stone' }
 *   - double_reward         → { battleId }
 *   - speedup_construction  → { buildingId }
 *   - daily_double          → مفيش context إضافي مطلوب
 *   - hourly_gift           → مفيش context إضافي مطلوب
 * راجع backend/src/modules/ads/rewardKinds.config.js لتفاصيل كل نوع
 * وقيمه الافتراضية. النتيجة الراجعة:
 *   { success, reward, kind, sessionId, grantedSummary } عند النجاح
 *   { success: false, reason } عند الفشل
 *
 * ولا حاجة تانية. الألعاب ممنوع تستورد أي حاجة من ads/providers/* أو
 * ads/AdsManager.js مباشرة.
 */
const Ads = {
  initialize: () => AdsManager.initialize(),
  showBanner: (options) => AdsManager.showBanner(options),
  showInterstitial: () => AdsManager.showInterstitial(),
  showRewarded: (options) => AdsManager.showRewarded(options),
  destroy: () => AdsManager.destroy(),
  isAvailable: () => AdsManager.isAvailable(),
};

export default Ads;
