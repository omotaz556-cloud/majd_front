import { useEffect } from 'react';
import { PlayCircle, Loader2, CheckCircle2, Tv, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRewardedAd } from '../hooks/useRewardedAd';

/**
 * ====== AdvertisementButton ======
 *
 * الزرار الوحيد لأي "إجراء إعلان مكافئ" في المنصة كلها - مضاعفة غنيمة
 * معركة، مكافآت المتجر، مضاعفة المكافأة اليومية، وأي إعلان مكافئ مستقبلي.
 * رقيقة فوق useRewardedAd (اللي بدوره فوق Ads.showRewarded() بس). دايمًا
 * بتستخدم تدفق:
 *
 *   User Action → AdsProvider → الإعلان يخلص → RewardSession.complete() →
 *   المكافأة تتمنح على السيرفر
 *
 * الكومبوننت ده أبداً ما بيمنح أي مكافأة بنفسه ولا بيفترض نجاح العملية -
 * بس بيعكس حالة useRewardedAd (idle/loading/success/error/unavailable).
 *
 * ====== هوية بصرية واحدة موحّدة (لازم تتطابق في كل الاستخدامات) ======
 * نفس الأيقونة (PlayCircle) دايمًا - مفيش أيقونة مخصصة لكل استخدام، عشان
 * اللاعب يتعرف على "زرار إعلان مكافئ" بصريًا من أول نظرة في أي مكان في
 * اللعبة. نفس الألوان (gold للحالة العادية، teal للنجاح، alert للخطأ)،
 * نفس الخط، نفس الـ padding/spacing، نفس الـ hover، نفس حالة التحميل، ونفس
 * حالة التعطيل - في كل مرة تستخدم فيها الكومبوننت ده.
 *
 * ====== resettable (Shop reward cards fix) ======
 * افتراضيًا (resettable=false)، حالة "نجاح" بتفضل معروضة للأبد بعد أول
 * مشاهدة - ده الصح لإجراءات لمرة واحدة بس (مضاعفة غنيمة معركة بعينها - نفس
 * المعركة مش المفروض تتكرر). لكن مكافآت زي "شاهد إعلان عشان تاخد موارد"
 * (المتجر) إجراء متكرر بطبيعته - اللاعب المفروض يقدر يشاهد إعلان تاني
 * وتاني من غير ما يعمل refresh للصفحة. لو resettable=true، بعد ما حالة
 * النجاح تتعرض لـ autoResetMs (افتراضي 1.5 ثانية)، الكومبوننت بيرجع لحالة
 * idle تلقائيًا (زرار "شاهد إعلان" يظهر تاني).
 *
 * Props:
 *   kind             : reward kind (راجع backend/src/modules/ads/rewardKinds.config.js)
 *   context           : بيانات إضافية خاصة بالـ kind (مثلاً { battleId })
 *   label             : نص الزرار في حالة idle
 *   successLabel      : نص الحالة بعد النجاح
 *   onRewardCredited  : بينادى بعد ما المكافأة تتمنح فعليًا على السيرفر
 *   disabled          : تعطيل يدوي إضافي (فوق حالة loading الداخلية)
 *   resettable        : لو true، يرجع idle تلقائيًا بعد النجاح (لإجراءات متكررة)
 *   autoResetMs       : مدة عرض حالة النجاح قبل الرجوع لـ idle (لو resettable)
 */
export default function AdvertisementButton({
  kind,
  context,
  label = 'شاهد إعلان',
  successLabel = 'تم!',
  onRewardCredited,
  disabled = false,
  resettable = false,
  autoResetMs = 1500,
}) {
  const { state, watchAd, reset, errorReason } = useRewardedAd({
    onRewardCredited: (result) => onRewardCredited?.(result),
  });

  const isBusy = state === 'loading';
  const isDone = state === 'success';

  // ====== لو resettable، بعد ما ندخل حالة success نرجّع idle تلقائيًا بعد
  // autoResetMs - عشان الزرار يفضل قابل لإعادة الاستخدام من غير أي إجراء
  // إضافي من المستخدم. بيتنضف (clearTimeout) لو الكومبوننت اتشال أو الحالة
  // اتغيرت قبل ما التايمر يخلص. ======
  useEffect(() => {
    if (!resettable || state !== 'success') return undefined;
    const timer = setTimeout(() => {
      reset();
    }, autoResetMs);
    return () => clearTimeout(timer);
  }, [resettable, state, autoResetMs, reset]);

  if (isDone) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-teal/30 bg-teal/10 px-4 py-2.5 text-sm font-bold text-teal"
      >
        <CheckCircle2 size={16} />
        {successLabel}
      </motion.div>
    );
  }

  return (
    <div className="w-full">
      <motion.button
        type="button"
        whileHover={!isBusy && !disabled ? { y: -1 } : {}}
        whileTap={!isBusy && !disabled ? { scale: 0.97 } : {}}
        onClick={() => watchAd({ kind, context })}
        disabled={isBusy || disabled}
        className="focus-ring flex w-full items-center justify-center gap-2 rounded-lg border border-gold/30 bg-gold/10 px-4 py-2.5 text-sm font-bold text-gold disabled:opacity-60"
      >
        <AnimatePresence mode="wait">
          {isBusy ? (
            <motion.span
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <Tv size={15} className="animate-pulse" />
              <Loader2 size={15} className="animate-spin" />
              جاري عرض الإعلان...
            </motion.span>
          ) : (
            <motion.span key="idle" className="flex items-center gap-2">
              <PlayCircle size={15} />
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {state === 'error' && (
        <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-alert">
          <span>
            {errorReason === 'unavailable' || errorReason === 'missing_kind'
              ? 'الإعلانات غير متاحة حالياً'
              : 'تعذر إتمام العملية، حاول تاني'}
          </span>
          <button
            type="button"
            onClick={reset}
            className="focus-ring flex items-center gap-1 text-bone/60 hover:text-bone"
          >
            <RotateCcw size={12} />
            إعادة
          </button>
        </div>
      )}
      {state === 'unavailable' && (
        <p className="mt-1.5 text-xs text-bone/50">الإعلانات غير متاحة حالياً</p>
      )}
    </div>
  );
}
