import AdsProvider from './AdsProvider';
import { adsLog } from '../adsLogger';

const MOCK_AD_DURATION_MS = 2000;

/**
 * ====== MockAdsProvider ======
 * مزوّد وهمي بالكامل - من غير أي اتصال شبكة حقيقي أو حساب Google Ad
 * Manager. مفيد وقت التطوير قبل ما العميل يخلّص حسابه، وبيحاكي نفس
 * التوقيتات والأحداث اللي المزوّد الحقيقي هيرجّعها (رجوع Promise بعد تأخير
 * بسيط) عشان الكود اللي بيستخدم Ads.* منتقلش لأي مفاجآت وقت التبديل
 * لـ Google Ad Manager.
 */
class MockAdsProvider extends AdsProvider {
  constructor() {
    super();
    this._ready = false;
  }

  async initialize() {
    this._ready = true;
    adsLog.info('Mock ads provider initialized (no real ad network)');
  }

  isAvailable() {
    return this._ready;
  }

  async showBanner({ containerId, position }) {
    adsLog.info('Mock banner "loaded"', { containerId });
    const el = document.getElementById(containerId);
    if (el) {
      el.dataset.mockAd = 'banner';
      // ====== محتوى مرئي فعلي للبانر الوهمي ======
      // قبل كده الموك كان بس بيحط data-mock-ad على الـ div من غير أي محتوى
      // مرئي - يعني الـ container كان "بيحمّل" منطقيًا (adsLog + data
      // attribute) بس مبيبانش بالعين خالص (لا لون ولا نص)، فكان صعب تتأكد
      // بصريًا إن مكان/مقاس البانر صح قبل التبديل لـ Google الحقيقي. دلوقتي
      // بيحقن placeholder واضح بنفس ارتفاع الـ container (min-h-[50px]).
      el.innerHTML = `
        <div style="
          display:flex;align-items:center;justify-content:center;
          width:100%;min-height:50px;
          background:repeating-linear-gradient(45deg,#2a2a2a,#2a2a2a 10px,#3a3a3a 10px,#3a3a3a 20px);
          border:1px dashed #888;border-radius:6px;
          color:#ccc;font-family:sans-serif;font-size:12px;
          box-sizing:border-box;padding:8px;
        ">
          [MOCK AD] ${position || 'banner'} — ${containerId}
        </div>
      `;
    }
    return { shown: true };
  }

  async destroyBanner(containerId) {
    const el = document.getElementById(containerId);
    if (el) {
      delete el.dataset.mockAd;
      el.innerHTML = '';
    }
  }

  async showInterstitial() {
    adsLog.info('Mock interstitial shown');
    await new Promise((resolve) => setTimeout(resolve, MOCK_AD_DURATION_MS));
    return { shown: true };
  }

  async showRewarded() {
    adsLog.info('Mock rewarded ad shown');
    await new Promise((resolve) => setTimeout(resolve, MOCK_AD_DURATION_MS));
    return { watched: true, providerPayload: { mock: true } };
  }

  async destroy() {
    this._ready = false;
  }
}

export default MockAdsProvider;