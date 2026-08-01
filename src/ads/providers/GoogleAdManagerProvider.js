import AdsProvider from './AdsProvider';
import { adsConfig } from '../adsConfig';
import { adsLog } from '../adsLogger';

const GPT_SCRIPT_SRC = 'https://securepubads.g.doubleclick.net/tag/js/gpt.js';

function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * ====== GoogleAdManagerProvider ======
 *
 * تنفيذ AdsProvider باستخدام Google Publisher Tag (GPT) - مكتبة جوجل
 * الرسمية لعرض إعلانات Ad Manager على الويب. ده مختلف تماماً عن AdMob SDK
 * (اللي بتاع الموبايل)، ومناسب للمنصة دي لأنها ويب بالكامل.
 *
 * كل الـ ad unit paths بتتبني من متغيرات البيئة (لا يوجد أي قيمة مكتوبة
 * بشكل ثابت في الكود) بالشكل:
 *   /networkCode/publisherId-adUnit
 * لما العميل يخلّص حساب Ad Manager بتاعه، الشكل بالظبط للـ ad unit path
 * هيتحدد من الداشبورد بتاعه، وهيتحط في .env - الكود هنا عام وبيقبل أي قيمة.
 */
class GoogleAdManagerProvider extends AdsProvider {
  constructor() {
    super();
    this._ready = false;
    this._slots = new Map(); // containerId -> googletag slot
    this._interstitialSlot = null;
    this._rewardedSlot = null;
  }

  _buildAdUnitPath(adUnit) {
    return `/${adsConfig.google.networkCode}/${adsConfig.google.publisherId}-${adUnit}`;
  }

  async initialize() {
    if (this._ready) return;

    await loadScriptOnce(GPT_SCRIPT_SRC);

    window.googletag = window.googletag || { cmd: [] };

    await new Promise((resolve) => {
      window.googletag.cmd.push(() => {
        window.googletag.pubads().enableSingleRequest();
        if (adsConfig.testMode) {
          // بيفعّل إعلانات تجريبية بس - مفيدة وقت التطوير قبل ما تتحط أرقام حقيقية
          window.googletag.pubads().set('adsense_background_color', 'transparent');
        }
        window.googletag.pubads().collapseEmptyDivs();
        window.googletag.enableServices();
        resolve();
      });
    });

    this._ready = true;
    adsLog.info('Google Ad Manager (GPT) initialized', {
      networkCode: adsConfig.google.networkCode,
      testMode: adsConfig.testMode,
    });
  }

  isAvailable() {
    return this._ready && typeof window !== 'undefined' && !!window.googletag;
  }

  async showBanner({ containerId, adUnit, size = [[320, 50], [728, 90]] }) {
    if (!this.isAvailable()) return { shown: false };

    const adUnitPath = this._buildAdUnitPath(adUnit || adsConfig.google.bannerAdUnit);

    return new Promise((resolve) => {
      window.googletag.cmd.push(() => {
        const slot = window.googletag.defineSlot(adUnitPath, size, containerId);
        if (!slot) {
          adsLog.warn('Banner slot could not be defined', { containerId, adUnitPath });
          resolve({ shown: false });
          return;
        }
        slot.addService(window.googletag.pubads());
        this._slots.set(containerId, slot);
        window.googletag.display(containerId);
        adsLog.info('Banner loaded', { containerId, adUnitPath });
        resolve({ shown: true });
      });
    });
  }

  async destroyBanner(containerId) {
    const slot = this._slots.get(containerId);
    if (!slot || !this.isAvailable()) return;
    window.googletag.cmd.push(() => {
      window.googletag.destroySlots([slot]);
    });
    this._slots.delete(containerId);
  }

  async showInterstitial() {
    if (!this.isAvailable()) return { shown: false };

    const adUnitPath = this._buildAdUnitPath(adsConfig.google.interstitialAdUnit);

    // ====== Listener leak fix ======
    // كل مرة كانت الدالة دي بتتنادى، بتعمل addEventListener جديد على
    // pubads() (نفس الـ singleton) من غير ما تشيل القديم - على مدى وقت
    // اللعب، الكولباكات دي بتتراكم (كل واحد بيتنفذ لكل إعلان جديد كمان،
    // مش بس اللي اتسجل له)، وده كمان بيسرّب مرجع للـ slot القديم نفسه.
    // الحل: (1) نهدم أي interstitial slot سابق قبل ما نعرّف واحد جديد،
    // (2) نمسك مرجع لدالة الـ listener ونشيلها بمجرد ما تتنفذ مرة واحدة
    // (removeEventListener) بدل ما تفضل مسجلة للأبد.
    if (this._interstitialSlot) {
      window.googletag.cmd.push(() => {
        window.googletag.destroySlots([this._interstitialSlot]);
      });
      this._interstitialSlot = null;
    }

    return new Promise((resolve) => {
      window.googletag.cmd.push(() => {
        const slot = window.googletag.defineOutOfPageSlot(
          adUnitPath,
          window.googletag.enums.OutOfPageFormat.INTERSTITIAL
        );

        if (!slot) {
          adsLog.warn('Interstitial slot not supported/could not be defined', { adUnitPath });
          resolve({ shown: false });
          return;
        }

        slot.addService(window.googletag.pubads());
        this._interstitialSlot = slot;

        const onSlotOnload = (event) => {
          if (event.slot !== slot) return;
          adsLog.info('Interstitial shown', { adUnitPath });
          window.googletag.pubads().removeEventListener('slotOnload', onSlotOnload);
        };
        window.googletag.pubads().addEventListener('slotOnload', onSlotOnload);

        window.googletag.display(slot);
        resolve({ shown: true });
      });
    });
  }

  async showRewarded() {
    if (!this.isAvailable()) return { watched: false };

    const adUnitPath = this._buildAdUnitPath(adsConfig.google.rewardedAdUnit);

    // ====== Listener leak fix (زي showInterstitial فوق بالظبط) ======
    // نهدم أي rewarded slot سابق قبل ما نعرّف واحد جديد - من غيرها، كل
    // مشاهدة إعلان مكافئ جديدة كانت بتسيب slot قديم + 3 event listeners
    // (rewardedSlotReady/rewardedSlotGranted/rewardedSlotClosed) معلّقين
    // على pubads() للأبد، فبعد كذا إعلان مكافئ كل كولباك بيتنفذ عدة مرات
    // لنفس الحدث (unrelated slots بتتفلتر بـ event.slot === slot، بس
    // الكولباكات القديمة نفسها لسه شغالة وبتستهلك ذاكرة/معالجة من غير داعي).
    if (this._rewardedSlot) {
      window.googletag.cmd.push(() => {
        window.googletag.destroySlots([this._rewardedSlot]);
      });
      this._rewardedSlot = null;
    }

    return new Promise((resolve) => {
      window.googletag.cmd.push(() => {
        const slot = window.googletag.defineOutOfPageSlot(
          adUnitPath,
          window.googletag.enums.OutOfPageFormat.REWARDED
        );

        if (!slot) {
          adsLog.warn('Rewarded slot not supported/could not be defined', { adUnitPath });
          resolve({ watched: false });
          return;
        }

        slot.addService(window.googletag.pubads());
        this._rewardedSlot = slot;

        let rewarded = false;
        let providerPayload = null;

        // ====== نمسك مرجع كل دالة listener بنفسها عشان نقدر نشيلها بالضبط
        // (removeEventListener) لما الإعلان يقفل - الثلاثة كلهم بيتشالوا مع
        // بعض في onSlotClosed، عشان مفيش سيناريو يخلّي واحد فيهم يفضل معلّق
        // من غير التانيين. ======
        const removeAllRewardedListeners = () => {
          window.googletag.pubads().removeEventListener('rewardedSlotReady', onSlotReady);
          window.googletag.pubads().removeEventListener('rewardedSlotGranted', onSlotGranted);
          window.googletag.pubads().removeEventListener('rewardedSlotClosed', onSlotClosed);
        };

        const onSlotReady = (event) => {
          if (event.slot === slot) {
            event.makeRewardedVisible();
          }
        };

        const onSlotGranted = (event) => {
          if (event.slot === slot) {
            rewarded = true;
            providerPayload = event.payload || null;
            adsLog.info('Rewarded ad reward granted by provider', { adUnitPath });
          }
        };

        const onSlotClosed = (event) => {
          if (event.slot !== slot) return;
          adsLog.info('Rewarded ad closed', { adUnitPath, rewarded });
          removeAllRewardedListeners();
          resolve({ watched: rewarded, providerPayload });
        };

        window.googletag.pubads().addEventListener('rewardedSlotReady', onSlotReady);
        window.googletag.pubads().addEventListener('rewardedSlotGranted', onSlotGranted);
        window.googletag.pubads().addEventListener('rewardedSlotClosed', onSlotClosed);

        window.googletag.display(slot);
      });
    });
  }

  async destroy() {
    if (!this.isAvailable()) return;

    window.googletag.cmd.push(() => {
      const slotsToDestroy = [...this._slots.values()];
      if (this._interstitialSlot) slotsToDestroy.push(this._interstitialSlot);
      if (this._rewardedSlot) slotsToDestroy.push(this._rewardedSlot);
      if (slotsToDestroy.length) {
        window.googletag.destroySlots(slotsToDestroy);
      }
    });

    this._slots.clear();
    this._interstitialSlot = null;
    this._rewardedSlot = null;
    this._ready = false;
  }
}

export default GoogleAdManagerProvider;
