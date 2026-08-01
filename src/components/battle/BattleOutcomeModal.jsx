import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Skull, Coins, RotateCw, Home, X } from 'lucide-react';
import AdvertisementButton from '../../ads/components/AdvertisementButton';
import { RESOURCE_META, RESOURCE_ORDER } from '../../utils/resourceMeta';
import { useSound } from '../ui/SoundProvider';
import { toastCoins } from '../ui/toast';

/**
 * ====== BattleOutcomeModal ======
 *
 * البوب أب اللي بيظهر لحظة ما معركة اللاعب (كمهاجم) تتحسم - نصر أو هزيمة.
 *
 * نصر (win):
 *   - "اجمع المكافأة" (إغلاق البوب أب عادي - الغنيمة اتضافت بالفعل)
 *   - "شاهد إعلان → ضاعف الغنيمة" (reward kind: double_reward) - بيعدّي من
 *     AdvertisementButton (نفس زرار الإعلان المكافئ المستخدم في كل اللعبة -
 *     اللي بدوره فوق useRewardedAd → Ads.showRewarded() → RewardSession على
 *     الباك إند). الكومبوننت ده أبداً ما بيمنح أي مكافأة بنفسه ولا بيكلم أي
 *     reward API مباشرة.
 *
 * هزيمة (loss):
 *   - "ارجع للقلعة"
 *   - "حاول تاني"
 *
 * Props:
 *   open        : bool
 *   outcome     : 'win' | 'loss'
 *   battleId    : الـ battle_id (مش march_id) - مطلوب لـ double_reward
 *   lootTotal   : إجمالي قيمة الغنيمة (لو موجودة) - لعرض/تعطيل زرار المضاعفة
 *   opponentName: اسم الخصم للعرض بس
 *   onClose     : بينادى لما اللاعب يقفل البوب أب (نصر: "اجمع المكافأة"،
 *                 هزيمة: "ارجع للقلعة")
 *   onTryAgain  : بينادى لما اللاعب يضغط "حاول تاني" بعد هزيمة
 */
export default function BattleOutcomeModal({
  open,
  outcome,
  battleId,
  lootTotal = 0,
  opponentName,
  onClose,
  onTryAgain,
}) {
  const { sounds } = useSound();
  const [doubledAmounts, setDoubledAmounts] = useState(null);

  const isWin = outcome === 'win';

  useEffect(() => {
    if (!open) return;
    if (isWin) sounds.win?.();
    else sounds.lose?.();
  }, [open, isWin, sounds]);

  // ====== كل مرة يتفتح البوب أب لمعركة جديدة، نصفّر حالة الإجراءات المحلية
  // (عرض بس - مش استهلاك استحقاقات فعلي) عشان معركة سابقة ما تأثرش على
  // العرض هنا. ======
  useEffect(() => {
    if (open) {
      setDoubledAmounts(null);
    }
  }, [open, battleId]);

  if (!open) return null;

  const hasLoot = lootTotal > 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          transition={{ type: 'spring', damping: 22, stiffness: 260 }}
          className={`relative mx-4 w-full max-w-sm overflow-hidden rounded-2xl border p-6 text-center shadow-2xl ${
            isWin ? 'border-gold/40 bg-ink-800' : 'border-alert/30 bg-ink-800'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="focus-ring absolute left-3 top-3 rounded-lg p-1 text-bone/40 hover:text-bone"
          >
            <X size={18} />
          </button>

          <div
            className={`mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full ${
              isWin ? 'bg-gold/10 text-gold shadow-glow-gold' : 'bg-alert/10 text-alert'
            }`}
          >
            {isWin ? <Trophy size={32} /> : <Skull size={32} />}
          </div>

          <h3 className="text-xl font-bold text-bone">{isWin ? 'انتصار!' : 'هزيمة'}</h3>
          <p className="mt-1 text-sm text-bone/60">
            {opponentName
              ? isWin
                ? `كسبت المعركة ضد ${opponentName}`
                : `خسرت المعركة ضد ${opponentName}`
              : isWin
                ? 'كسبت المعركة'
                : 'خسرت المعركة'}
          </p>

          {isWin && hasLoot && !doubledAmounts && (
            <p className="mt-3 flex items-center justify-center gap-1.5 text-sm text-gold">
              <Coins size={15} />
              إجمالي الغنيمة: {Math.floor(lootTotal).toLocaleString('en-US')}
            </p>
          )}

          {isWin && doubledAmounts && (
            <div className="mt-3 rounded-lg border border-teal/30 bg-teal/10 p-3 text-sm text-teal">
              <p className="font-bold">تم مضاعفة الغنيمة!</p>
              <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2 text-xs">
                {RESOURCE_ORDER.filter((key) => Number(doubledAmounts[key]) > 0).map((key) => {
                  const meta = RESOURCE_META[key];
                  const Icon = meta.icon;
                  return (
                    <span key={key} className="flex items-center gap-1">
                      <Icon size={12} style={{ color: meta.color }} />+
                      {Math.floor(doubledAmounts[key]).toLocaleString('en-US')}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-col gap-2.5">
            {isWin && (
              <>
                {hasLoot && !doubledAmounts && (
                  <AdvertisementButton
                    kind="double_reward"
                    context={{ battleId }}
                    label="شاهد إعلان → ضاعف الغنيمة"
                    successLabel="تم مضاعفة الغنيمة"
                    onRewardCredited={(result) => {
                      // ====== *** فيكس: rewardSession.service.js بيرجع
                      // grantedSummary.doubled لـ double_reward (مش .granted -
                      // ده خاص بـ daily_double بس) - كان بيرجع undefined دايمًا
                      // هنا فعرض "تم مضاعفة الغنيمة" فاضي من غير أي أرقام. ******
                      const granted = result?.grantedSummary?.doubled || null;
                      setDoubledAmounts(granted || {});
                      sounds.reward?.();
                      toastCoins('تم مضاعفة غنيمة المعركة!');
                    }}
                  />
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="focus-ring w-full rounded-lg border border-gold/40 bg-gold/10 py-2.5 text-sm font-bold text-gold hover:border-gold/60"
                >
                  اجمع المكافأة
                </button>
              </>
            )}

            {!isWin && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="focus-ring flex w-full items-center justify-center gap-2 rounded-lg border border-ink-600 bg-ink-700/40 py-2.5 text-sm font-bold text-bone hover:border-bone/30"
                >
                  <Home size={15} />
                  ارجع للقلعة
                </button>

                <button
                  type="button"
                  onClick={() => onTryAgain?.(battleId)}
                  className="focus-ring flex w-full items-center justify-center gap-2 rounded-lg border border-gold/30 bg-gold/10 py-2.5 text-sm font-bold text-gold hover:border-gold/50"
                >
                  <RotateCw size={15} />
                  حاول تاني
                </button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
