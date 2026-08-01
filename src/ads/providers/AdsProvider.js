/**
 * ====== AdsProvider (Interface) ======
 *
 * العقد اللي أي مزوّد إعلانات لازم ينفّذه (GoogleAdManagerProvider,
 * MockAdsProvider, ومستقبلاً UnityAdsProvider / GameDistributionProvider /
 * CrazyGamesProvider / PokiProvider). AdsManager بيتعامل مع أي provider
 * من خلال الواجهة دي بس - أبداً مش بيعرف تفاصيل أي مزوّد بعينه.
 *
 * كل الدوال async عشان تدعم تحميل سكريبتات خارجية، شبكة، ...إلخ من غير ما
 * تعطّل الـ UI thread.
 *
 * أي provider جديد لازم يورّث الكلاس ده وينفّذ كل method - لو method معينة
 * مش مدعومة من المزوّد (مثلاً بعض المزودين مش بيدعموا rewarded)، يرجّع
 * `{ available: false }` بدل ما يرمي error، عشان AdsManager يقدر يتعامل مع
 * غياب الميزة بسلاسة.
 */
class AdsProvider {
  /**
   * تهيئة المزوّد (تحميل السكريبتات، إعداد الحساب، إلخ)
   * @returns {Promise<void>}
   */
  async initialize() {
    throw new Error('AdsProvider.initialize() must be implemented by subclass');
  }

  /**
   * عرض بانر في عنصر DOM معيّن
   * @param {{ containerId: string, position: 'top'|'bottom'|'inline', adUnit?: string }} options
   * @returns {Promise<{ shown: boolean }>}
   */
  async showBanner(_options) {
    throw new Error('AdsProvider.showBanner() must be implemented by subclass');
  }

  /**
   * عرض إعلان انتقالي (بين مراحل، قبل بدء لعبة، إلخ)
   * @returns {Promise<{ shown: boolean }>}
   */
  async showInterstitial() {
    throw new Error('AdsProvider.showInterstitial() must be implemented by subclass');
  }

  /**
   * عرض إعلان مكافئ. لازم يرجّع تفاصيل تكفي الـ AdsManager يبلّغ الباك إند
   * @returns {Promise<{ watched: boolean, providerPayload?: any }>}
   */
  async showRewarded() {
    throw new Error('AdsProvider.showRewarded() must be implemented by subclass');
  }

  /**
   * تنظيف/تدمير أي عناصر أو listeners تبع المزوّد (عادة عند unmount)
   * @returns {Promise<void>}
   */
  async destroy() {
    throw new Error('AdsProvider.destroy() must be implemented by subclass');
  }

  /**
   * هل المزوّد جاهز ومهيّأ فعلاً؟
   * @returns {boolean}
   */
  isAvailable() {
    throw new Error('AdsProvider.isAvailable() must be implemented by subclass');
  }
}

export default AdsProvider;
