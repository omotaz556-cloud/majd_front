import { adsConfig } from './adsConfig';
import { adsLog } from './adsLogger';
import GoogleAdManagerProvider from './providers/GoogleAdManagerProvider';
import MockAdsProvider from './providers/MockAdsProvider';
import { startRewardSession, completeRewardSession } from './adsApi';

/**
 * ====== AdsManager ======
 *
 * الواجهة الوحيدة اللي أي صفحة أو لعبة لازم تتعامل معاها للإعلانات.
 * الألعاب أبداً ما بتكلم جوجل مباشرة ولا حتى تعرف هي شغالة بأي مزوّد -
 * كل اللي بتشوفه هو:
 *
 *   Ads.initialize()
 *   Ads.showBanner(options)
 *   Ads.showInterstitial()
 *   Ads.showRewarded()
 *   Ads.destroy()
 *   Ads.isAvailable()
 *
 * إضافة مزوّد جديد (Unity Ads / GameDistribution / CrazyGames / Poki)
 * بتتم بس عن طريق إضافة كلاس جديدة بتنفّذ AdsProvider في providers/، وإضافة
 * سطر واحد هنا في _createProvider(). من غير أي تعديل في أي مكان تاني.
 */
class AdsManagerClass {
  constructor() {
    this._provider = null;
    this._initialized = false;
    this._lastInterstitialAt = 0;
  }

  _createProvider() {
    switch (adsConfig.provider) {
      case 'google-ad-manager':
        return new GoogleAdManagerProvider();
      case 'mock':
        return new MockAdsProvider();
      // ====== نقطة التوسّع للمزودين المستقبليين ======
      // case 'unity-ads':
      //   return new UnityAdsProvider();
      // case 'gamedistribution':
      //   return new GameDistributionProvider();
      // case 'crazygames':
      //   return new CrazyGamesProvider();
      // case 'poki':
      //   return new PokiProvider();
      default:
        adsLog.warn('Unknown ADS_PROVIDER, falling back to mock', { provider: adsConfig.provider });
        return new MockAdsProvider();
    }
  }

  /**
   * ====== AdsBootstrap ======
   * بيتنادى مرة واحدة عند إقلاع التطبيق. لو ADS_ENABLED=false، بيفشل بأمان
   * (graceful) من غير ما يرمي أي error - أي محاولة استخدام لاحقة هترجع
   * نتيجة "غير متاح" بهدوء.
   */
  async initialize() {
    if (this._initialized) return;

    if (!adsConfig.enabled) {
      adsLog.info('Ads disabled (ADS_ENABLED=false) - skipping initialization');
      return;
    }

    try {
      this._provider = this._createProvider();
      await this._provider.initialize();
      this._initialized = true;
      adsLog.info('Ads initialized', {
        provider: adsConfig.provider,
        testMode: adsConfig.testMode,
      });
    } catch (err) {
      adsLog.error('Ads initialization failed', { error: err.message });
      this._initialized = false;
      this._provider = null;
    }
  }

  isAvailable() {
    return adsConfig.enabled && this._initialized && !!this._provider && this._provider.isAvailable();
  }

  /**
   * ====== Banner ======
   */
  async showBanner(options) {
    if (!this.isAvailable()) return { shown: false };
    try {
      const result = await this._provider.showBanner(options);
      return result;
    } catch (err) {
      adsLog.error('Ad failed (banner)', { error: err.message });
      return { shown: false };
    }
  }

  async destroyBanner(containerId) {
    if (!this._provider) return;
    try {
      await this._provider.destroyBanner?.(containerId);
    } catch (err) {
      adsLog.error('Failed to destroy banner', { error: err.message });
    }
  }

  /**
   * ====== Interstitial (مع Cooldown/Frequency limiter) ======
   */
  async showInterstitial() {
    if (!this.isAvailable()) return { shown: false, reason: 'unavailable' };

    const secondsSinceLast = (Date.now() - this._lastInterstitialAt) / 1000;
    if (secondsSinceLast < adsConfig.interstitialCooldownSeconds) {
      adsLog.debug('Interstitial skipped (cooldown active)', {
        secondsSinceLast,
        cooldown: adsConfig.interstitialCooldownSeconds,
      });
      return { shown: false, reason: 'cooldown' };
    }

    try {
      const result = await this._provider.showInterstitial();
      if (result.shown) {
        this._lastInterstitialAt = Date.now();
        adsLog.info('Interstitial shown');
      }
      return result;
    } catch (err) {
      adsLog.error('Ad failed (interstitial)', { error: err.message });
      return { shown: false, reason: 'error' };
    }
  }

  /**
   * ====== Rewarded ======
   *
   * التدفق الكامل والآمن:
   *   1) نطلب جلسة مكافأة من الباك إند (reward/start) - بيرجع sessionId +
   *      signedToken موقّعين من السيرفر. `kind` بيحدد نوع المكافأة
   *      ('resources' | 'double_reward' | 'daily_double') و`context` بيحمل
   *      أي بيانات إضافية لازمة لل kind ده
   *      (مثلاً { resource: 'gold' } أو { battleId }) - راجع
   *      backend/src/modules/ads/rewardKinds.config.js للقيم المتاحة.
   *   2) نعرض الإعلان الفعلي من المزوّد
   *   3) لو الإعلان اتشاف فعلاً، نبلّغ الباك إند (reward/complete) مع نفس
   *      الـ sessionId/signedToken عشان يتحقق وينفّذ المكافأة حسب kind
   *
   * الفرونت إند أبداً ما بيمنح أي رصيد أو استحقاق بنفسه - ده كله مسؤولية
   * السيرفر. أي صفحة/كومبوننت في اللعبة بينادي Ads.showRewarded({ kind,
   * context }) بس - مفيش أي نداء مباشر لـ reward/start أو reward/complete
   * من غير ما يعدّي من هنا.
   */
  async showRewarded({ adUnit, kind, context } = {}) {
    if (!this.isAvailable()) {
      return { success: false, reason: 'unavailable' };
    }

    if (!kind) {
      adsLog.error('showRewarded called without a reward kind');
      return { success: false, reason: 'missing_kind' };
    }

    let session;
    try {
      adsLog.info('Reward requested', { kind });
      session = await startRewardSession({ adUnit, kind, context });
    } catch (err) {
      adsLog.error('Failed to start reward session', { error: err.message, kind });
      return { success: false, reason: 'session_start_failed' };
    }

    let adResult;
    try {
      adResult = await this._provider.showRewarded();
    } catch (err) {
      adsLog.error('Ad failed (rewarded)', { error: err.message });
      return { success: false, reason: 'ad_failed' };
    }

    if (!adResult.watched) {
      adsLog.info('Reward rejected (ad not fully watched)');
      return { success: false, reason: 'not_watched' };
    }

    try {
      adsLog.debug('Reward verified with provider, notifying backend', { sessionId: session.sessionId });
      const result = await completeRewardSession({
        sessionId: session.sessionId,
        signedToken: session.signedToken,
        providerPayload: adResult.providerPayload,
      });
      adsLog.info('Reward granted', { sessionId: session.sessionId, kind: result.kind, reward: result.reward });
      return {
        success: true,
        reward: result.reward,
        kind: result.kind,
        sessionId: session.sessionId,
        grantedSummary: result.grantedSummary,
      };
    } catch (err) {
      adsLog.error('Reward rejected by backend', { error: err.message, kind });
      return { success: false, reason: 'backend_rejected' };
    }
  }

  /**
   * ====== Destroy ======
   */
  async destroy() {
    if (!this._provider) return;
    try {
      await this._provider.destroy();
    } finally {
      this._initialized = false;
      this._provider = null;
    }
  }
}

// ====== Singleton ======
// الألعاب والصفحات بتستورد الـ instance ده بس - مفيش داعي تعمل `new` بنفسك
const AdsManager = new AdsManagerClass();

export default AdsManager;
