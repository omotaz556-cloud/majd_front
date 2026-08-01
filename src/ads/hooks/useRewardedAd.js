import { useState, useCallback } from 'react';
import Ads from '../Ads';

/**
 * ====== useRewardedAd ======
 * Hook بيغلّف تدفق "شاهد إعلان مكافئ" بالكامل (loading/success/error/
 * unavailable states) عشان أي زرار أو مكوّن في أي لعبة يقدر يستخدمه من
 * غير ما يعيد كتابة نفس المنطق. الحالة المتاحة:
 *
 *   const { state, reward, grantedSummary, errorReason, watchAd } = useRewardedAd();
 *   watchAd({ kind: 'resources', context: { resource: 'gold' } })
 *
 * `kind` إجباري دايمًا (واحدة من reward kinds الموجودة في
 * backend/src/modules/ads/rewardKinds.config.js) و`context` حسب النوع.
 * الـ hook ده بس UI-state wrapper فوق Ads.showRewarded() - مفيش أي نداء
 * مباشر لأي API إعلانات هنا، وكل التحقق/المنح الفعلي بيحصل في السيرفر.
 *
 * state: 'idle' | 'loading' | 'success' | 'error' | 'unavailable'
 */
export function useRewardedAd({ onRewardCredited } = {}) {
  const [state, setState] = useState('idle');
  const [reward, setReward] = useState(null);
  const [grantedSummary, setGrantedSummary] = useState(null);
  const [errorReason, setErrorReason] = useState(null);

  const watchAd = useCallback(
    async (options) => {
      if (!Ads.isAvailable()) {
        setState('unavailable');
        return;
      }

      if (!options?.kind) {
        setErrorReason('missing_kind');
        setState('error');
        return;
      }

      setState('loading');
      const result = await Ads.showRewarded(options);

      if (!result.success) {
        setErrorReason(result.reason);
        setState('error');
        return;
      }

      setReward(result.reward);
      setGrantedSummary(result.grantedSummary || null);

      // ====== الإعلان اتشاف والـ RewardSession اتكمّلت على السيرفر بنجاح -
      // بس ده لسه مش نفس حاجة "العملية خلصت بنجاح" لكل نوع مكافأة. بعض
      // الأنواع محتاجة خطوة إضافية بعد المنح (تحديث حالة العرض محليًا - راجع
      // BattleOutcomeModal). لو onRewardCredited بيرجع Promise، بننتظرها
      // الأول - ولو رفضت (throw)، الحالة بترجع 'error' بدل ما تفضل 'success'
      // وهمي. المستدعي هو اللي يقرر يعرض توست الخطأ (زي ما هو شغال حاليًا).
      // لو onRewardCredited مش Promise (نوع مكافأة بسيط زي resources)،
      // السلوك زي بالظبط الأول - success فورًا. ======
      try {
        await onRewardCredited?.(result);
        setState('success');
      } catch (err) {
        setErrorReason('post_processing_failed');
        setState('error');
      }
    },
    [onRewardCredited]
  );

  const reset = useCallback(() => {
    setState('idle');
    setReward(null);
    setGrantedSummary(null);
    setErrorReason(null);
  }, []);

  return { state, reward, grantedSummary, errorReason, watchAd, reset };
}
